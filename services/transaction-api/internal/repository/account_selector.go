package repository

import (
	"context"
	"fmt"
	"math/rand"
	"strconv"
	"time"

	"github.com/redis/go-redis/v9"
	"github.com/truechain/ptms/transaction-api/internal/domain"
)

type p2cAccountSelector struct {
	rdb *redis.Client
}

func NewP2CAccountSelector(rdb *redis.Client) domain.AccountSelector {
	return &p2cAccountSelector{
		rdb: rdb,
	}
}

func (s *p2cAccountSelector) SelectAccount(ctx context.Context, vendorID string, accounts []domain.MerchantVendorCredential) (*domain.MerchantVendorCredential, error) {
	n := len(accounts)
	if n == 0 {
		return nil, fmt.Errorf("no credentials available for vendor %s", vendorID)
	}
	if n == 1 {
		return &accounts[0], nil
	}

	// 1. Pick 2 random distinct credentials
	i1 := rand.Intn(n)
	i2 := rand.Intn(n - 1)
	if i2 >= i1 {
		i2++
	}

	acc1 := accounts[i1]
	acc2 := accounts[i2]

	// 2. Get Load (In-flight + Latency) from Redis
	load1 := s.getAccountLoad(ctx, acc1.ID)
	load2 := s.getAccountLoad(ctx, acc2.ID)

	// 3. Return the one with lower load
	if load1 <= load2 {
		return &acc1, nil
	}
	return &acc2, nil
}

func (s *p2cAccountSelector) getAccountLoad(ctx context.Context, credentialID string) float64 {
	inflightKey := fmt.Sprintf("stats:mvc:%s:inflight", credentialID)
	latencyKey := fmt.Sprintf("stats:mvc:%s:latency", credentialID)

	// Get in-flight count (default 0)
	inflight, _ := s.rdb.Get(ctx, inflightKey).Int64()

	// Get recent latency in ms (default 0)
	latency, _ := s.rdb.Get(ctx, latencyKey).Float64()

	// Load calculation formula: in-flight count + (latency_ms / 100)
	return float64(inflight) + (latency / 100.0)
}

func (s *p2cAccountSelector) TrackInFlight(ctx context.Context, credentialID string, delta int) error {
	key := fmt.Sprintf("stats:mvc:%s:inflight", credentialID)
	return s.rdb.IncrBy(ctx, key, int64(delta)).Err()
}

func (s *p2cAccountSelector) TrackLatency(ctx context.Context, credentialID string, latency time.Duration) error {
	key := fmt.Sprintf("stats:mvc:%s:latency", credentialID)
	// Store latency as milliseconds, expire after 5 minutes to keep it "recent"
	ms := float64(latency.Microseconds()) / 1000.0
	return s.rdb.Set(ctx, key, strconv.FormatFloat(ms, 'f', 2, 64), 5*time.Minute).Err()
}
