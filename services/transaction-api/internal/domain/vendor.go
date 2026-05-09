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

type MerchantVendorCredential struct {
	ID                string `json:"id"`
	MerchantID        string `json:"merchant_id"`
	VendorID          string `json:"vendor_id"`
	Environment       string `json:"environment"`
	Credentials       string `json:"credentials"`
	SandboxBaseURL    string `json:"sandbox_base_url"`
	ProductionBaseURL string `json:"production_base_url"`
	IsEnabled         bool   `json:"is_enabled"`
	Priority          int    `json:"priority"`
}

func (c *MerchantVendorCredential) GetBaseURL() string {
	if c.Environment == "production" {
		return c.ProductionBaseURL
	}
	return c.SandboxBaseURL
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
	GetState(ctx context.Context, vendorID string, env string) (CircuitState, error)
	AllowRequest(ctx context.Context, vendorID string, env string) (bool, error)
	RecordResult(ctx context.Context, vendorID string, env string, success bool) error
}

type Router interface {
	Load(ctx context.Context) error
	Route(ctx context.Context, amount float64, eligibleVendors []Vendor) []Vendor
}

type AccountSelector interface {
	SelectAccount(ctx context.Context, vendorID string, accounts []MerchantVendorCredential) (*MerchantVendorCredential, error)
	TrackInFlight(ctx context.Context, accountID string, delta int) error
	TrackLatency(ctx context.Context, accountID string, latency time.Duration) error
}

type VendorRegistry interface {
	Load(ctx context.Context) error
	GetEligibleVendors(ctx context.Context, merchantID string, amount float64, channel string, environment string) ([]Vendor, error)
	GetAccounts(ctx context.Context, vendorID string, environment string) ([]MerchantVendorCredential, error)
	WatchConfigUpdates(ctx context.Context)
	GetVendor(ctx context.Context, vendorID string) (Vendor, error)
}
