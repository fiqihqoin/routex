package main

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
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

	routeEnv := os.Getenv("ROUTEX_ENVIRONMENT")
	if routeEnv == "" {
		routeEnv = "sandbox"
	}
	log.Printf("Starting with ROUTEX_ENVIRONMENT: %s", routeEnv)

	txService := service.NewTransactionService(
		txRepo,
		registry,
		routerEngine,
		selector,
		limiter,
		vendorFactory,
		cb,
		rdb,
		publisher,
		dbPool,
		service.Config{Environment: routeEnv},
	)
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

			var event map[string]interface{}
			if err := json.Unmarshal([]byte(msg.Payload), &event); err == nil {
				if event["type"] == "api_key_revoked" {
					if keyHash, ok := event["key_hash"].(string); ok {
						rdb.Del(ctx, "apikey:hash:"+keyHash)
						log.Printf("Invalidated cache for revoked API key: %s", keyHash[:8]+"...")
					}
					continue
				}
			}

			// Default: reload all configs
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
				respondError(w, r, 401, "MISSING_API_KEY", "API key required")
				return
			}

			// 2. Hash with SHA256
			hash := sha256.Sum256([]byte(apiKey))
			keyHash := hex.EncodeToString(hash[:])

			// 3. Check Redis cache
			cacheKey := "apikey:hash:" + keyHash
			var cachedData struct {
				MerchantID  string `json:"merchant_id"`
				Environment string `json:"environment"`
				APIKeyID    string `json:"api_key_id"`
			}

			cached, err := rdb.Get(r.Context(), cacheKey).Result()
			if err == nil {
				if err := json.Unmarshal([]byte(cached), &cachedData); err == nil {
					goto validate_env
				}
			}

			// 4. Cache miss, query DB
			{
				var merchantStatus string
				err = db.QueryRow(r.Context(),
					`SELECT ak.merchant_id, ak.environment, ak.id, m.status
					 FROM api_keys ak
					 JOIN merchants m ON m.id = ak.merchant_id
					 WHERE ak.key_hash = $1
					   AND ak.revoked_at IS NULL
					   AND (ak.expires_at IS NULL OR ak.expires_at > NOW())
					   AND m.deleted_at IS NULL
					 LIMIT 1`,
					keyHash,
				).Scan(&cachedData.MerchantID, &cachedData.Environment, &cachedData.APIKeyID, &merchantStatus)

				if err != nil {
					respondError(w, r, 401, "INVALID_API_KEY", "Invalid or revoked API key")
					return
				}

				// 6. Check merchant status
				if merchantStatus != "active" {
					respondError(w, r, 403, "MERCHANT_INACTIVE", "Account tidak aktif")
					return
				}

				// 7. Cache result
				data, _ := json.Marshal(cachedData)
				rdb.Set(r.Context(), cacheKey, data, 5*time.Minute)
			}

		validate_env:
			// 8. Validate environment match
			routexEnv := r.Header.Get("X-Routex-Environment")
			if routexEnv != "" && cachedData.Environment != routexEnv {
				msg := fmt.Sprintf("Key ini adalah %s key, gunakan %s.routex.id", 
					cachedData.Environment, cachedData.Environment)
				respondError(w, r, 403, "ENVIRONMENT_MISMATCH", msg)
				return
			}

			// 9. Update last_used_at async
			go func(keyID string) {
				db.Exec(context.Background(), "UPDATE api_keys SET last_used_at = NOW() WHERE id = $1", keyID)
			}(cachedData.APIKeyID)

			// 10. Inject to context
			ctx := context.WithValue(r.Context(), domain.ContextKeyMerchantID, cachedData.MerchantID)
			ctx = context.WithValue(ctx, domain.ContextKeyEnvironment, cachedData.Environment)
			ctx = context.WithValue(ctx, domain.ContextKeyAPIKeyID, cachedData.APIKeyID)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

func respondError(w http.ResponseWriter, r *http.Request, status int, code string, message string) {
	traceID := r.Header.Get("X-Trace-ID")
	if traceID == "" {
		traceID = "tr_" + bin2hex(12)
	}
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(map[string]interface{}{
		"error": map[string]interface{}{
			"code":     code,
			"message":  message,
			"trace_id": traceID,
		},
	})
}

func bin2hex(n int) string {
	b := make([]byte, n)
	rand.Read(b)
	return hex.EncodeToString(b)
}
