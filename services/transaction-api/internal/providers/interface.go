package providers

import (
	"context"
	"time"
)

type GenerateQRISRequest struct {
	TransactionID  string
	Amount         float64
	PaymentChannel string
	Credentials    string
}

type QRISResponse struct {
	VendorTransactionID string
	QRISCode            string
	RawResponse         []byte
	ExpiresAt           *time.Time
}

type StatusResponse struct {
	VendorTransactionID string
	Status              string
	PaidAt              *time.Time
}

type NormalizedCallback struct {
	VendorTransactionID string
	ReferenceID         string
	Amount              float64
	Status              string
	PaidAt              time.Time
}

type VendorAdapter interface {
	GenerateQRIS(ctx context.Context, req GenerateQRISRequest) (*QRISResponse, error)
	CheckStatus(ctx context.Context, vendorTxID string, credentials string) (*StatusResponse, error)
	VerifyCallback(payload []byte, signature string, secret string) bool
	NormalizeCallback(payload []byte) (*NormalizedCallback, error)
	
	// Validate verifies the credentials by hitting a lightweight vendor endpoint
	Validate(ctx context.Context, credentials string) error
}
