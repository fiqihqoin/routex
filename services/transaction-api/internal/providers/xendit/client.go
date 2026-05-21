package xendit_adapter

import (
	"bytes"
	"context"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"

	"github.com/truechain/caishenengine/transaction-api/internal/providers"
)

type xenditAdapter struct {
	httpClient *http.Client
	baseURL    string
}

func NewXenditAdapter(baseURL string) providers.VendorAdapter {
	return &xenditAdapter{
		httpClient: &http.Client{
			Timeout: 30 * time.Second,
		},
		baseURL: baseURL,
	}
}

type credentials struct {
	SecretKey    string `json:"secret_key"`
	WebhookToken string `json:"webhook_token"`
	IsProduction *bool  `json:"is_production,omitempty"`
}

func (a *xenditAdapter) GenerateQRIS(ctx context.Context, req providers.GenerateQRISRequest) (*providers.QRISResponse, error) {
	var creds credentials
	if err := json.Unmarshal([]byte(req.Credentials), &creds); err != nil {
		return nil, fmt.Errorf("invalid credentials: %w", err)
	}

	baseURL := a.baseURL
	if creds.IsProduction != nil {
		baseURL = "https://api.xendit.co"
	}

	// Xendit requires minimum amount of 1500
	amount := int(req.Amount)
	if amount < 1500 {
		amount = 1500
	}

	// Use reference_id (per docs) not external_id
	// Add expires_at for 30 minutes
	expiresAt := time.Now().Add(30 * time.Minute)

	bodyMap := map[string]interface{}{
		"reference_id": req.TransactionID,
		"type":         "DYNAMIC",
		"currency":     "IDR",
		"amount":       amount,
		"expires_at":   expiresAt.Format(time.RFC3339),
	}

	bodyBytes, _ := json.Marshal(bodyMap)

	fmt.Printf("[Xendit] QRIS Request:\n")
	fmt.Printf("  Endpoint: %s/qr_codes\n", baseURL)
	fmt.Printf("  Body: %s\n", string(bodyBytes))

	httpReq, err := http.NewRequestWithContext(ctx, "POST", baseURL+"/qr_codes", bytes.NewBuffer(bodyBytes))
	if err != nil {
		return nil, err
	}

	// Basic Auth: secretKey: (with colon, empty password)
	auth := base64.StdEncoding.EncodeToString([]byte(creds.SecretKey + ":"))
	httpReq.Header.Set("Content-Type", "application/json")
	httpReq.Header.Set("Authorization", "Basic "+auth)
	httpReq.Header.Set("api-version", "2022-07-31") // Add API version header

	resp, err := a.httpClient.Do(httpReq)
	if err != nil {
		fmt.Printf("[Xendit] QRIS Network Error: %v\n", err)
		return nil, err
	}
	defer resp.Body.Close()

	respBody, _ := io.ReadAll(resp.Body)
	fmt.Printf("[Xendit] QRIS Response: status=%d, body=%s\n", resp.StatusCode, string(respBody))

	var result map[string]interface{}
	if err := json.Unmarshal(respBody, &result); err != nil {
		return nil, fmt.Errorf("xendit unmarshal error: %w", err)
	}

	if resp.StatusCode != http.StatusOK && resp.StatusCode != http.StatusCreated {
		return nil, fmt.Errorf("xendit error: status %d, body %s", resp.StatusCode, string(respBody))
	}

	var expiresAtPtr *time.Time
	if exp, ok := result["expires_at"].(string); ok {
		t, intErr := time.Parse(time.RFC3339, exp)
		if intErr == nil {
			expiresAtPtr = &t
		}
	}

	return &providers.QRISResponse{
		VendorTransactionID: fmt.Sprintf("%v", result["id"]),
		QRISCode:            fmt.Sprintf("%v", result["qr_string"]),
		RawResponse:         respBody,
		ExpiresAt:           expiresAtPtr,
	}, nil
}

func (a *xenditAdapter) Validate(ctx context.Context, credsStr string) error {
	var creds credentials
	if err := json.Unmarshal([]byte(credsStr), &creds); err != nil {
		return err
	}

	httpReq, _ := http.NewRequestWithContext(ctx, "GET", "https://api.xendit.co/balance", nil)
	auth := base64.StdEncoding.EncodeToString([]byte(creds.SecretKey + ":"))
	httpReq.Header.Set("Authorization", "Basic "+auth)

	resp, err := a.httpClient.Do(httpReq)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode == http.StatusUnauthorized {
		return fmt.Errorf("invalid secret key")
	}

	return nil
}

func (a *xenditAdapter) CheckStatus(ctx context.Context, vendorTxID string, credentials string) (*providers.StatusResponse, error) {
	return nil, fmt.Errorf("check status not implemented for xendit")
}

func (a *xenditAdapter) VerifyCallback(payload []byte, signature string, secret string) bool {
	return signature == secret
}

func (a *xenditAdapter) NormalizeCallback(payload []byte) (*providers.NormalizedCallback, error) {
	var data map[string]interface{}
	if err := json.Unmarshal(payload, &data); err != nil {
		return nil, err
	}

	event, _ := data["event"].(string)
	status := "pending"
	if event == "qr_code.paid" {
		status = "paid"
	}

	qris, _ := data["data"].(map[string]interface{})
	_amount := 0.0
	if qris != nil {
		fmt.Sscanf(fmt.Sprintf("%v", qris["amount"]), "%f", &_amount)
	}

	return &providers.NormalizedCallback{
		VendorTransactionID: fmt.Sprintf("%v", qris["id"]),
		ReferenceID:         fmt.Sprintf("%v", qris["reference_id"]),
		Status:              status,
		Amount:              _amount,
		PaidAt:              time.Now(),
	}, nil
}
