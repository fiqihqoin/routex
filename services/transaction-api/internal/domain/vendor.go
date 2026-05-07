package domain

import (
	"context"
	"time"
)

type Vendor struct {
	ID        string    `json:"id"`
	Code      string    `json:"code"`
	Name      string    `json:"name"`
	IsActive  bool      `json:"is_active"`
	CreatedAt time.Time `json:"created_at"`
}

type VendorAccount struct {
	ID          string    `json:"id"`
	VendorID    string    `json:"vendor_id"`
	AccountName string    `json:"account_name"`
	Credentials string    `json:"credentials"`
	IsActive    bool      `json:"is_active"`
}

type RoutingRule struct {
	VendorID  string  `json:"vendor_id"`
	MinAmount float64 `json:"min_amount"`
	MaxAmount float64 `json:"max_amount"`
	Priority  int     `json:"priority"` // Higher value = Higher priority
}

type VendorPenalty struct {
	VendorID         string `json:"vendor_id"`
	AccountID        string `json:"account_id"`
	EffectivePenalty int    `json:"effective_penalty"`
}

type CircuitState string

const (
	StateClosed   CircuitState = "CLOSED"
	StateOpen     CircuitState = "OPEN"
	StateHalfOpen CircuitState = "HALF_OPEN"
)

type VendorHealth struct {
	VendorID   string       `json:"vendor_id"`
	State      CircuitState `json:"state"`
	ErrorRate  float64      `json:"error_rate"`
	LastUpdate time.Time    `json:"last_update"`
}

type CircuitBreaker interface {
	GetState(ctx context.Context, vendorID string) (CircuitState, error)
	AllowRequest(ctx context.Context, vendorID string) (bool, error)
	RecordResult(ctx context.Context, vendorID string, success bool) error
}

type Router interface {
	Load(ctx context.Context) error
	Route(ctx context.Context, amount float64, eligibleVendors []Vendor) []Vendor
}

type AccountSelector interface {
	SelectAccount(ctx context.Context, vendorID string, accounts []VendorAccount) (*VendorAccount, error)
	TrackInFlight(ctx context.Context, accountID string, delta int) error
	TrackLatency(ctx context.Context, accountID string, latency time.Duration) error
}

type VendorRegistry interface {
	Load(ctx context.Context) error
	GetEligibleVendors(ctx context.Context, userID string, amount float64, channel string) ([]Vendor, error)
	GetAccounts(ctx context.Context, vendorID string) ([]VendorAccount, error)
	WatchConfigUpdates(ctx context.Context)
	GetVendor(ctx context.Context, vendorID string) (Vendor, error)
}
