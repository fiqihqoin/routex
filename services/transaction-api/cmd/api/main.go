package main

import (
	"context"
	"encoding/json"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/prometheus/client_golang/prometheus/promhttp"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/redis/go-redis/v9"
	"github.com/truechain/ptms/transaction-api/internal/domain"
	"github.com/truechain/ptms/transaction-api/internal/handler"
	"github.com/truechain/ptms/transaction-api/internal/repository"
	"github.com/truechain/ptms/transaction-api/internal/service"
	"github.com/truechain/ptms/transaction-api/internal/factory"
	"github.com/truechain/ptms/transaction-api/pkg/messaging"
)

func main() {
	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	dbPool, err := pgxpool.New(ctx, os.Getenv("DATABASE_URL"))
	if err != nil {
		log.Fatalf("Unable to connect to database: %v", err)
	}
	defer dbPool.Close()

	rdb := redis.NewClient(&redis.Options{
		Addr: os.Getenv("REDIS_URL"),
	})
	defer rdb.Close()

	publisher, err := messaging.NewRabbitMQPublisher(os.Getenv("RABBITMQ_URL"))
	if err != nil {
		log.Fatalf("Unable to connect to RabbitMQ: %v", err)
	}
	defer publisher.Close()

	txRepo := repository.NewPostgresTransactionRepo(dbPool, rdb, publisher)
	cb := repository.NewRedisCircuitBreaker(rdb, publisher)
	registry := repository.NewVendorRegistry(dbPool, rdb, cb)
	routerEngine := repository.NewBasketSizeRouter(dbPool, txRepo)
	selector := repository.NewP2CAccountSelector(rdb)
	limiter := repository.NewRedisRateLimiter(rdb, dbPool)
	vendorFactory := factory.NewVendorFactory()

	registry.Load(ctx)
	routerEngine.Load(ctx)
	limiter.Load(ctx)

	txService := service.NewTransactionService(txRepo, registry, routerEngine, selector, limiter, vendorFactory, rdb, publisher, dbPool)
	eventProcessor := service.NewEventProcessor(txRepo)
	callbackConsumer, _ := service.NewCallbackConsumer(os.Getenv("RABBITMQ_URL"), txRepo)
	sweeper := service.NewReconciliationSweeper(txRepo, txService)

	// Background Tasks
	go func() {
		pubsub := rdb.Subscribe(ctx, "config:update")
		defer pubsub.Close()
		ch := pubsub.Channel()
		log.Println("Subscribed to 'config:update' for hot-reloads")
		for msg := range ch {
			log.Printf("Received config update: %s", msg.Payload)
			registry.Load(ctx)
			routerEngine.Load(ctx)
			limiter.Load(ctx)
		}
	}()
	go eventProcessor.Start(ctx)
	go callbackConsumer.Start(ctx)
	go sweeper.Start(ctx)

	txHandler := handler.NewTransactionHandler(txService)
	cbHandler := handler.NewCallbackHandler(txService)
	vendorHandler := handler.NewVendorHandler(cb, rdb, vendorFactory)

	r := chi.NewRouter()
	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)

	r.Get("/health", func(w http.ResponseWriter, r *http.Request) {
		w.Write([]byte("ok"))
	})
	r.Handle("/metrics", promhttp.Handler())

	r.Route("/api/v1", func(r chi.Router) {
		r.Post("/callbacks/{vendor_id}", cbHandler.HandleVendorCallback)
		r.Get("/vendors/{id}/health", vendorHandler.GetVendorHealth)
		r.Post("/vendors/{code}/validate", vendorHandler.ValidateCredentials)

		r.Group(func(r chi.Router) {
			r.Use(APIKeyMiddleware(dbPool, rdb))
			r.Post("/transactions", txHandler.GenerateQRIS)
			r.Get("/transactions/{id}", txHandler.GetStatus)
		})
	})

	port := os.Getenv("PORT")
	if port == "" { port = "8080" }
	srv := &http.Server{ Addr: ":" + port, Handler: r }

	go func() {
		log.Printf("PTMS Transaction API running on port %s", port)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("listen: %s\n", err)
		}
	}()

	<-ctx.Done()
	shutdownCtx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	srv.Shutdown(shutdownCtx)
}

func APIKeyMiddleware(db *pgxpool.Pool, rdb *redis.Client) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			apiKey := r.Header.Get("X-API-Key")
			if apiKey == "" {
				respondError(w, 401, "MISSING_API_KEY", "API key required")
				return
			}
			cacheKey := "apikey:" + apiKey
			userID, err := rdb.Get(r.Context(), cacheKey).Result()
			if err != nil {
				var id string
				var isActive bool
				dbErr := db.QueryRow(r.Context(),
					"SELECT id, is_active FROM ptms_users WHERE api_key = $1", apiKey,
				).Scan(&id, &isActive)
				if dbErr != nil {
					respondError(w, 403, "INVALID_API_KEY", "Invalid API key")
					return
				}
				if !isActive {
					respondError(w, 403, "USER_DISABLED", "User account is disabled")
					return
				}
				userID = id
				rdb.Set(r.Context(), cacheKey, userID, 5*time.Minute)
			}
			ctx := context.WithValue(r.Context(), domain.ContextKeyUserID, userID)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

func respondError(w http.ResponseWriter, status int, code string, message string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(map[string]interface{}{
		"error": map[string]interface{}{
			"code":    code,
			"message": message,
		},
	})
}
