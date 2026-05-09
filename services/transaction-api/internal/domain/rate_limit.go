package domain

import (
	"context"
)

type RateLimitType string

const (
	RateLimitTPS         RateLimitType = "tps"
	RateLimitDailyVolume RateLimitType = "daily_volume"
)

type RateLimitRequest struct {
	MerchantID string
	VendorID   string
	AccountID  string
	Amount     float64
}

type RateLimitResult struct {
	Allowed    bool
	RetryAfter int // seconds
	Reason     string
}

type RateLimiter interface {
	Check(ctx context.Context, req RateLimitRequest) (*RateLimitResult, error)
	Load(ctx context.Context) error
}
