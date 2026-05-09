package repository

import (
	"context"
	"fmt"
	"log"
	"math/rand"
	"time"

	"github.com/redis/go-redis/v9"
	"github.com/truechain/ptms/transaction-api/internal/domain"
	"github.com/truechain/ptms/transaction-api/pkg/messaging"
	"github.com/truechain/ptms/transaction-api/pkg/metrics"
)

type redisCircuitBreaker struct {
	rdb       *redis.Client
	publisher messaging.Publisher
}

func NewRedisCircuitBreaker(rdb *redis.Client, publisher messaging.Publisher) domain.CircuitBreaker {
	return &redisCircuitBreaker{
		rdb:       rdb,
		publisher: publisher,
	}
}

func (cb *redisCircuitBreaker) GetState(ctx context.Context, vendorID string, env string) (domain.CircuitState, error) {
	key := fmt.Sprintf("cb:vendor:%s:env:%s:state", vendorID, env)
	state, err := cb.rdb.Get(ctx, key).Result()
	if err == redis.Nil {
		return domain.StateClosed, nil
	}
	if err != nil {
		return domain.StateClosed, err
	}
	return domain.CircuitState(state), nil
}

func (cb *redisCircuitBreaker) AllowRequest(ctx context.Context, vendorID string, env string) (bool, error) {
	state, err := cb.GetState(ctx, vendorID, env)
	if err != nil {
		return true, nil // Fail open on Redis error
	}

	if state == domain.StateClosed {
		wasOpenKey := fmt.Sprintf("cb:vendor:%s:env:%s:was-open", vendorID, env)
		exists, _ := cb.rdb.Exists(ctx, wasOpenKey).Result()
		if exists == 1 {
			// It was OPEN and TTL expired -> Move to Half-Open
			cb.transitionTo(ctx, vendorID, env, domain.StateHalfOpen)
			return rand.Intn(100) < 5, nil
		}
	}

	switch state {
	case domain.StateClosed:
		return true, nil
	case domain.StateOpen:
		return false, nil
	case domain.StateHalfOpen:
		// Sesuai PRD: 5% traffic jadi probe
		return rand.Intn(100) < 5, nil
	default:
		return true, nil
	}
}

func (cb *redisCircuitBreaker) RecordResult(ctx context.Context, vendorID string, env string, success bool) error {
	state, _ := cb.GetState(ctx, vendorID, env)
	
	now := time.Now().Unix()
	window := 60 // seconds
	
	// 1. Record Result in Sliding Window
	counterKey := fmt.Sprintf("cb:vendor:%s:env:%s:stats", vendorID, env)
	field := "success"
	if !success {
		field = "failure"
	}
	
	cb.rdb.ZAdd(ctx, counterKey+":"+field, redis.Z{Score: float64(now), Member: now})
	cb.rdb.ZRemRangeByScore(ctx, counterKey+":"+field, "0", fmt.Sprintf("%d", now-int64(window)))
	cb.rdb.Expire(ctx, counterKey+":"+field, time.Duration(window)*time.Second)

	// 2. State Transition Logic
	if state == domain.StateClosed && !success {
		// Check Error Rate
		failures, _ := cb.rdb.ZCard(ctx, counterKey+":failure").Result()
		successes, _ := cb.rdb.ZCard(ctx, counterKey+":success").Result()
		total := failures + successes
		
		if total >= 20 { // minimum samples
			errorRate := float64(failures) / float64(total)
			if errorRate > 0.05 { // > 5%
				return cb.transitionTo(ctx, vendorID, env, domain.StateOpen)
			}
		}
	}

	if state == domain.StateHalfOpen {
		if success {
			// Track consecutive successes
			consecutiveKey := fmt.Sprintf("cb:vendor:%s:env:%s:consecutive", vendorID, env)
			count, _ := cb.rdb.Incr(ctx, consecutiveKey).Result()
			if count >= 10 { // 10 consecutive successes to CLOSE
				cb.rdb.Del(ctx, consecutiveKey)
				
				wasOpenKey := fmt.Sprintf("cb:vendor:%s:env:%s:was-open", vendorID, env)
				cb.rdb.Del(ctx, wasOpenKey)
				
				return cb.transitionTo(ctx, vendorID, env, domain.StateClosed)
			}
		} else {
			// Any failure in Half-Open goes back to OPEN
			return cb.transitionTo(ctx, vendorID, env, domain.StateOpen)
		}
	}

	return nil
}

func (cb *redisCircuitBreaker) transitionTo(ctx context.Context, vendorID string, env string, newState domain.CircuitState) error {
	key := fmt.Sprintf("cb:vendor:%s:env:%s:state", vendorID, env)
	
	pipe := cb.rdb.Pipeline()
	getCmd := pipe.Get(ctx, key)
	pipe.Set(ctx, key, string(newState), 0)
	
	if _, err := pipe.Exec(ctx); err != nil {
		return fmt.Errorf("failed to execute transition pipeline: %w", err)
	}
	
	oldState, _ := getCmd.Result()
	if oldState == "" {
		oldState = string(domain.StateClosed)
	}

	if oldState != string(newState) {
		log.Printf("Circuit Breaker for vendor %s [%s] transitioned: %s -> %s", vendorID, env, oldState, newState)

		// Update Prometheus Metric
		metrics.SetCBState(vendorID+"_"+env, string(newState))

		if newState == domain.StateOpen {
			cb.rdb.Expire(ctx, key, 30*time.Second)
			wasOpenKey := fmt.Sprintf("cb:vendor:%s:env:%s:was-open", vendorID, env)
			cb.rdb.Set(ctx, wasOpenKey, "1", 1*time.Hour)
		}

		if newState == domain.StateClosed {
			wasOpenKey := fmt.Sprintf("cb:vendor:%s:env:%s:was-open", vendorID, env)
			cb.rdb.Del(ctx, wasOpenKey)
		}

		// Publish to RabbitMQ
		if cb.publisher != nil {
			cb.publisher.Publish(ctx, "ptms.events", "vendor.cb.transition", map[string]interface{}{
				"vendor_id":   vendorID,
				"environment": env,
				"old_state":   oldState,
				"new_state":   newState,
				"timestamp":   time.Now(),
			})
		}
	}
	
	return nil
}
