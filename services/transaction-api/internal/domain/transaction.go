package domain

import (
	"context"
	"time"
)

type TransactionStatus string

const (
	StatusPending TransactionStatus = "pending"
	StatusPaid    TransactionStatus = "paid"
	StatusExpired TransactionStatus = "expired"
)

type CreateTransactionRequest struct {
	Amount float64 `json:"amount"`
}

type Transaction struct {
	ID                     string            `json:"id"`
	TransactionID          string            `json:"transaction_id"`
	MerchantID             string            `json:"merchant_id"`
	Environment            string            `json:"environment"`
	VendorID               string            `json:"vendor_id"`
	VendorCredentialID     string            `json:"vendor_credential_id"`
	RoutingReason          string            `json:"routing_reason"`
	Amount                 float64           `json:"amount"`
	Currency               string            `json:"currency"`
	PaymentChannel         string            `json:"payment_channel"`
	Status                 TransactionStatus `json:"status"`
	IdempotencyKey         string            `json:"idempotency_key"`
	RequestHash            string            `json:"request_hash"`
	QRISCode               string            `json:"qris_code"`
	ExpiresAt              *time.Time        `json:"expires_at"`
	PaidAt                 *time.Time        `json:"paid_at"`
	ExpiredAt              *time.Time        `json:"expired_at"`
	FailedAt               *time.Time        `json:"failed_at"`
	CallbackDelivered      bool              `json:"callback_delivered"`
	ReconciliationAttempts int               `json:"reconciliation_attempts"`
	CreatedAt              time.Time         `json:"created_at"`
	UpdatedAt              *time.Time        `json:"updated_at"`
}

type EventType string

const (
	EventQRGenerated          EventType = "qr_generated"
	EventQRGenerationFailed   EventType = "qr_generation_failed"
	EventCallbackReceived     EventType = "callback_received"
	EventCallbackValidated    EventType = "callback_validated"
	EventCallbackForwarded    EventType = "callback_forwarded"
	EventCallbackDeliveryFail EventType = "callback_delivery_failed"
	EventStatusUpdated        EventType = "status_updated"
	EventExpiredStale         EventType = "expired_stale"
	EventSweeperChecked       EventType = "sweeper_checked"
)

type TransactionEvent struct {
	ID            string    `json:"id"`
	TransactionID string    `json:"transaction_id"`
	EventType     EventType `json:"event_type"`
	Payload       []byte    `json:"payload"`
	CreatedAt     time.Time `json:"created_at"`
}

type NormalizedCallback struct {
	TransactionID       string    `json:"transaction_id"`
	VendorTransactionID string    `json:"vendor_transaction_id"`
	Status              string    `json:"status"`
	Amount              float64   `json:"amount"`
	PaidAt              time.Time `json:"paid_at"`
	PaymentMethod       string    `json:"payment_method"`
	VendorID            string    `json:"vendor_id"`
}

type CallbackJob struct {
	TransactionID string             `json:"transaction_id"`
	MerchantID    string             `json:"merchant_id"`
	CallbackURL   string             `json:"callback_url"`
	WebhookSecret string             `json:"webhook_secret"`
	Data          NormalizedCallback `json:"data"`
	RetryCount    int                `json:"retry_count"`
}

type TransactionRepository interface {
	Create(ctx context.Context, tx *Transaction) error
	GetByID(ctx context.Context, transactionID string) (*Transaction, error)
	GetTransactionDetail(ctx context.Context, transactionID string, merchantID string) (*TransactionDetail, error)
	ListTransactions(ctx context.Context, req ListTransactionRequest) ([]TransactionSummary, int, error)
	UpdateReadModel(ctx context.Context, tx *Transaction) error
	StoreEvent(ctx context.Context, transactionID string, eventType EventType, data interface{}) error
	GetUnprocessedEvents(ctx context.Context, limit int) ([]TransactionEvent, error)
	MarkEventProcessed(ctx context.Context, eventID string) error
	UpdatePenalty(ctx context.Context, vendorID string, credentialID string, points int) error
	GetEffectivePenalties(ctx context.Context) (map[string]int, error)
	DisableMerchantCallback(ctx context.Context, merchantID string) error
	GetPendingForReconciliation(ctx context.Context, olderThan time.Duration, limit int) ([]Transaction, error)
	IncrementReconciliationAttempt(ctx context.Context, transactionID string, createdAt time.Time) error
	GetMerchantVendorCredentials(ctx context.Context, credentialID string) (string, error)
	
	// Webhook Management
	IncrementWebhookFailureDay(ctx context.Context, merchantID string) error
	GetWebhookConsecutiveFailureDays(ctx context.Context, merchantID string) (int, error)
	DisableMerchantWebhook(ctx context.Context, merchantID string) error
	ResetWebhookFailureDays(ctx context.Context, merchantID string) error
}

type TransactionService interface {
	GenerateQRIS(ctx context.Context, apiKey string, idempotencyKey string, req CreateTransactionRequest, rawBody []byte) (*Transaction, error)
	GetStatus(ctx context.Context, transactionID string) (*Transaction, error)
	GetTransactionDetail(ctx context.Context, transactionID string) (*TransactionDetail, error)
	ListTransactions(ctx context.Context, req ListTransactionRequest) (*ListTransactionResponse, error)
	HandleVendorCallback(ctx context.Context, vendorID string, payload []byte, signature string) error
	ReconcileStatus(ctx context.Context, transactionID string) error
}

type ListTransactionRequest struct {
	MerchantID  string
	Environment string
	Page        int
	PerPage     int
	Status      string
	VendorID    string
	DateFrom    *time.Time
	DateTo      *time.Time
	Search      string
}

type ListTransactionResponse struct {
	Data []TransactionSummary `json:"data"`
	Meta PaginationMeta       `json:"meta"`
}

type TransactionSummary struct {
	ID                  string     `json:"id"`
	TransactionID       string     `json:"transaction_id"`
	Amount              float64    `json:"amount"`
	Currency            string     `json:"currency"`
	PaymentChannel      string     `json:"payment_channel"`
	Status              string     `json:"status"`
	VendorID            string     `json:"vendor_id"`
	VendorCode          *string    `json:"vendor_code"`
	Environment         string     `json:"environment"`
	RoutingReason       *string    `json:"routing_reason"`
	VendorTransactionID *string    `json:"vendor_transaction_id,omitempty"`
	CreatedAt           time.Time  `json:"created_at"`
	PaidAt              *time.Time `json:"paid_at,omitempty"`
	ExpiredAt           *time.Time `json:"expired_at,omitempty"`
}

type TransactionDetail struct {
	TransactionSummary
	QRISCode               *string            `json:"qris_code,omitempty"`
	ExpiresAt              *time.Time         `json:"expires_at,omitempty"`
	CallbackDelivered      bool               `json:"callback_delivered"`
	ReconciliationAttempts int                `json:"reconciliation_attempts"`
	Events                 []TransactionEvent `json:"events"`
}

type PaginationMeta struct {
	Total      int  `json:"total"`
	Page       int  `json:"page"`
	PerPage    int  `json:"per_page"`
	TotalPages int  `json:"total_pages"`
	HasNext    bool `json:"has_next"`
	HasPrev    bool `json:"has_prev"`
}

type EventProcessor interface {
	Start(ctx context.Context)
}

type CallbackConsumer interface {
	Start(ctx context.Context)
}

type ReconciliationSweeper interface {
	Start(ctx context.Context)
}
