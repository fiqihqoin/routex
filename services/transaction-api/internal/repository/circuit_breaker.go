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

func (cb *redisCircuitBreaker) GetState(ctx context.Context, vendorID string) (domain.CircuitState, error) {
	key := fmt.Sprintf("cb:vendor:%s:state", vendorID)
	state, err := cb.rdb.Get(ctx, key).Result()
	if err == redis.Nil {
		return domain.StateClosed, nil
	}
	if err != nil {
		return domain.StateClosed, err
	}
	return domain.CircuitState(state), nil
}

func (cb *redisCircuitBreaker) AllowRequest(ctx context.Context, vendorID string) (bool, error) {
	state, err := cb.GetState(ctx, vendorID)
	if err != nil {
		return true, nil // Fail open on Redis error
	}

	if state == domain.StateClosed {
		wasOpenKey := fmt.Sprintf("cb:vendor:%s:was-open", vendorID)
		exists, _ := cb.rdb.Exists(ctx, wasOpenKey).Result()
		if exists == 1 {
			// It was OPEN and TTL expired -> Move to Half-Open
			cb.transitionTo(ctx, vendorID, domain.StateHalfOpen)
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

func (cb *redisCircuitBreaker) RecordResult(ctx context.Context, vendorID string, success bool) error {
	state, _ := cb.GetState(ctx, vendorID)
	
	now := time.Now().Unix()
	window := 60 // seconds
	
	// 1. Record Result in Sliding Window
	counterKey := fmt.Sprintf("cb:vendor:%s:stats", vendorID)
	field := "success"
	if !success {
		field = "failure"
	}
	
	// Use HINCRBY inside a daily/hourly window bucket or just simple counters
	// For simplicity in this skeleton, we use a 60s sliding window logic simplified
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
				return cb.transitionTo(ctx, vendorID, domain.StateOpen)
			}
		}
	}

	if state == domain.StateOpen {
		// Wait for sleep window? Usually handled by TTL on OPEN state
	}

	if state == domain.StateHalfOpen {
		if success {
			// Track consecutive successes
			consecutiveKey := fmt.Sprintf("cb:vendor:%s:consecutive", vendorID)
			count, _ := cb.rdb.Incr(ctx, consecutiveKey).Result()
			if count >= 10 { // 10 consecutive successes to CLOSE
				cb.rdb.Del(ctx, consecutiveKey)
				
				// N-9: Delete was-open key when recovery is complete
				wasOpenKey := fmt.Sprintf("cb:vendor:%s:was-open", vendorID)
				cb.rdb.Del(ctx, wasOpenKey)
				
				return cb.transitionTo(ctx, vendorID, domain.StateClosed)
			}
		} else {
			// Any failure in Half-Open goes back to OPEN
			return cb.transitionTo(ctx, vendorID, domain.StateOpen)
		}
	}

	return nil
}
func (cb *redisCircuitBreaker) transitionTo(ctx context.Context, vendorID string, newState domain.CircuitState) error {
	key := fmt.Sprintf("cb:vendor:%s:state", vendorID)
	
	// F4-2: Use pipeline for atomic state transition (Get + Set) to replace deprecated GetSet
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
		log.Printf("Circuit Breaker for vendor %s transitioned: %s -> %s", vendorID, oldState, newState)

		// Update Prometheus Metric
		metrics.SetCBState(vendorID, string(newState))

		if newState == domain.StateOpen {
			// TTL for OPEN state (30 seconds before auto move to Half-Open)
			cb.rdb.Expire(ctx, key, 30*time.Second)
			wasOpenKey := fmt.Sprintf("cb:vendor:%s:was-open", vendorID)
			cb.rdb.Set(ctx, wasOpenKey, "1", 1*time.Hour)
		}

		if newState == domain.StateClosed {
			wasOpenKey := fmt.Sprintf("cb:vendor:%s:was-open", vendorID)
			cb.rdb.Del(ctx, wasOpenKey)
		}

		// Publish to RabbitMQ
		if cb.publisher != nil {
			cb.publisher.Publish(ctx, "ptms.events", "vendor.cb.transition", map[string]interface{}{
				"vendor_id": vendorID,
				"old_state": oldState,
				"new_state": newState,
				"timestamp": time.Now(),
			})
		}
	}
	
	return nil
}
