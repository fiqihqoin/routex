package repository

import (
	"context"
	"fmt"
	"log"
	"sync"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/redis/go-redis/v9"
	"github.com/truechain/ptms/transaction-api/internal/domain"
)

// Lua Script for Sliding Window Rate Limiting
const slidingWindowScript = `
local key = KEYS[1]
local limit = tonumber(ARGV[1])
local window = tonumber(ARGV[2])
local now = tonumber(ARGV[3])
local member = ARGV[4]

local window_start = now - window

-- Remove old entries
redis.call('ZREMRANGEBYSCORE', key, 0, window_start)

-- Count current entries
local count = redis.call('ZCARD', key)

if count < limit then
    redis.call('ZADD', key, now, member)
    redis.call('EXPIRE', key, math.ceil(window/1000))
    return 1
else
    return 0
end
`

// Lua Script for Daily Volume Limiting
const dailyVolumeScript = `
local key = KEYS[1]
local amount = tonumber(ARGV[1])
local limit = tonumber(ARGV[2])
local expiry = tonumber(ARGV[3])

local current = tonumber(redis.call('GET', key) or "0")

if current + amount <= limit then
    redis.call('INCRBYFLOAT', key, amount)
    redis.call('EXPIRE', key, expiry)
    return 1
else
    return 0
end
`

type redisRateLimiter struct {
	rdb *redis.Client
	db  *pgxpool.Pool
	mu  sync.RWMutex

	configs map[string]float64
	
	// Simple In-memory Fallback Storage
	localTPS    map[string][]time.Time
	localVolume map[string]float64
}

func NewRedisRateLimiter(rdb *redis.Client, db *pgxpool.Pool) domain.RateLimiter {
	return &redisRateLimiter{
		rdb:         rdb,
		db:          db,
		configs:     make(map[string]float64),
		localTPS:    make(map[string][]time.Time),
		localVolume: make(map[string]float64),
	}
}

func (rl *redisRateLimiter) Load(ctx context.Context) error {
	rows, err := rl.db.Query(ctx, "SELECT entity_type, entity_id, limit_type, limit_value FROM rate_limit_configs")
	if err != nil {
		return err
	}
	defer rows.Close()

	newConfigs := make(map[string]float64)
	for rows.Next() {
		var entityType, limitType string
		var entityID *string
		var limitValue float64
		if err := rows.Scan(&entityType, &entityID, &limitType, &limitValue); err != nil {
			return err
		}

		var key string
		if entityID == nil {
			key = entityType + ":global:" + limitType
		} else {
			key = entityType + ":" + *entityID + ":" + limitType
		}
		newConfigs[key] = limitValue
	}

	rl.mu.Lock()
	rl.configs = newConfigs
	rl.mu.Unlock()

	return nil
}

func (rl *redisRateLimiter) getLimitFor(entityType, entityID, limitType string) float64 {
	rl.mu.RLock()
	defer rl.mu.RUnlock()

	// 1. Specific limit: entityType:entityID:limitType
	if val, ok := rl.configs[entityType+":"+entityID+":"+limitType]; ok {
		return val
	}

	// 2. Global limit: entityType:global:limitType
	if val, ok := rl.configs[entityType+":global:"+limitType]; ok {
		return val
	}

	// 3. Default limits
	switch entityType {
	case "user":
		if limitType == "tps" {
			return 100
		}
		if limitType == "daily_volume" {
			return 1000000000.0
		}
	case "vendor":
		if limitType == "tps" {
			return 500
		}
	case "account":
		if limitType == "tps" {
			return 50
		}
	}

	return 0
}

func (rl *redisRateLimiter) Check(ctx context.Context, req domain.RateLimitRequest) (*domain.RateLimitResult, error) {
	// 1. Try Redis First
	allowed, err := rl.checkRedis(ctx, req)
	if err == nil {
		return allowed, nil
	}

	// 2. Fallback to In-Memory if Redis is down
	log.Printf("Redis error: %v. Falling back to in-memory rate limiting at 50%% limits", err)
	return rl.checkInMemory(req), nil
}

func (rl *redisRateLimiter) checkRedis(ctx context.Context, req domain.RateLimitRequest) (*domain.RateLimitResult, error) {
	now := time.Now().UnixNano() / 1e6 // Current time in ms

	// Get Limits from config or use defaults
	userTPS := int(rl.getLimitFor("user", req.MerchantID, "tps"))
	vendorTPS := int(rl.getLimitFor("vendor", req.VendorID, "tps"))
	accountTPS := int(rl.getLimitFor("account", req.AccountID, "tps"))
	dailyLimit := rl.getLimitFor("user", req.MerchantID, "daily_volume")

	// Check User TPS
	if !rl.runTPSCheck(ctx, fmt.Sprintf("rl:user:%s:tps", req.MerchantID), userTPS, 1000, now) {
		return &domain.RateLimitResult{Allowed: false, RetryAfter: 1, Reason: "USER_TPS_EXCEEDED"}, nil
	}

	// Check Vendor TPS
	if !rl.runTPSCheck(ctx, fmt.Sprintf("rl:vendor:%s:tps", req.VendorID), vendorTPS, 1000, now) {
		return &domain.RateLimitResult{Allowed: false, RetryAfter: 1, Reason: "VENDOR_TPS_EXCEEDED"}, nil
	}

	// Check Account TPS
	if !rl.runTPSCheck(ctx, fmt.Sprintf("rl:acc:%s:tps", req.AccountID), accountTPS, 1000, now) {
		return &domain.RateLimitResult{Allowed: false, RetryAfter: 1, Reason: "ACCOUNT_TPS_EXCEEDED"}, nil
	}

	// Check Daily Volume
	if !rl.runVolumeCheck(ctx, fmt.Sprintf("rl:user:%s:vol:daily", req.MerchantID), req.Amount, dailyLimit) {
		return &domain.RateLimitResult{Allowed: false, RetryAfter: 60, Reason: "DAILY_VOLUME_EXCEEDED"}, nil
	}

	return &domain.RateLimitResult{Allowed: true}, nil
}

func (rl *redisRateLimiter) runTPSCheck(ctx context.Context, key string, limit int, window int, now int64) bool {
	member := uuid.New().String()
	res, err := rl.rdb.Eval(ctx, slidingWindowScript, []string{key}, limit, window, now, member).Result()
	if err != nil {
		return true // Fail open on Redis script error, but caller handles connection error
	}
	return res.(int64) == 1
}

func (rl *redisRateLimiter) runVolumeCheck(ctx context.Context, key string, amount float64, limit float64) bool {
	// TTL until midnight
	now := time.Now()
	midnight := time.Date(now.Year(), now.Month(), now.Day()+1, 0, 0, 0, 0, now.Location())
	ttl := int(midnight.Sub(now).Seconds())

	res, err := rl.rdb.Eval(ctx, dailyVolumeScript, []string{key}, amount, limit, ttl).Result()
	if err != nil {
		return true
	}
	return res.(int64) == 1
}

func (rl *redisRateLimiter) checkInMemory(req domain.RateLimitRequest) (*domain.RateLimitResult) {
	now := time.Now()
	window := 1 * time.Second

	// 50% Fallback Limits
	userTPSLimit := int(rl.getLimitFor("user", req.MerchantID, "tps") * 0.5)
	dailyVolLimit := rl.getLimitFor("user", req.MerchantID, "daily_volume") * 0.5

	rl.mu.Lock()
	defer rl.mu.Unlock()

	// Check User TPS (Simplified Sliding Window)
	userKey := "local:tps:" + req.MerchantID
	rl.localTPS[userKey] = rl.filterOld(rl.localTPS[userKey], now.Add(-window))
	if len(rl.localTPS[userKey]) >= userTPSLimit {
		return &domain.RateLimitResult{Allowed: false, RetryAfter: 1, Reason: "USER_TPS_EXCEEDED_FALLBACK"}
	}
	rl.localTPS[userKey] = append(rl.localTPS[userKey], now)

	// Check Daily Volume
	volKey := "local:vol:" + req.MerchantID
	if rl.localVolume[volKey] + req.Amount > dailyVolLimit {
		return &domain.RateLimitResult{Allowed: false, RetryAfter: 60, Reason: "DAILY_VOLUME_EXCEEDED_FALLBACK"}
	}
	rl.localVolume[volKey] += req.Amount

	return &domain.RateLimitResult{Allowed: true}
}

func (rl *redisRateLimiter) filterOld(times []time.Time, threshold time.Time) []time.Time {
	var filtered []time.Time
	for _, t := range times {
		if t.After(threshold) {
			filtered = append(filtered, t)
		}
	}
	return filtered
}
