package midtrans_adapter

import (
	"bytes"
	"context"
	"crypto/sha512"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"

	"github.com/truechain/ptms/transaction-api/internal/providers"
)

type midtransAdapter struct {
	httpClient *http.Client
	baseURL    string
}

func NewMidtransAdapter(baseURL string) providers.VendorAdapter {
	return &midtransAdapter{
		httpClient: &http.Client{
			Timeout: 5 * time.Second,
		},
		baseURL: baseURL,
	}
}

type credentials struct {
	ServerKey    string `json:"server_key"`
	IsProduction *bool  `json:"is_production,omitempty"`
}

func (a *midtransAdapter) GenerateQRIS(ctx context.Context, req providers.GenerateQRISRequest) (*providers.QRISResponse, error) {
	var creds credentials
	if err := json.Unmarshal([]byte(req.Credentials), &creds); err != nil {
		return nil, fmt.Errorf("invalid credentials: %w", err)
	}

	baseURL := a.baseURL
	if creds.IsProduction != nil {
		if *creds.IsProduction {
			baseURL = "https://api.midtrans.com"
		} else {
			baseURL = "https://api.sandbox.midtrans.com"
		}
	}

	bodyMap := map[string]interface{}{
		"payment_type": "qris",
		"transaction_details": map[string]interface{}{
			"order_id":     req.TransactionID,
			"gross_amount": int(req.Amount),
		},
		"qris": map[string]interface{}{
			"acquirer": "gopay",
		},
	}

	bodyBytes, _ := json.Marshal(bodyMap)
	httpReq, err := http.NewRequestWithContext(ctx, "POST", baseURL+"/v2/charge", bytes.NewBuffer(bodyBytes))
	if err != nil {
		return nil, err
	}

	auth := base64.StdEncoding.EncodeToString([]byte(creds.ServerKey + ":"))
	httpReq.Header.Set("Content-Type", "application/json")
	httpReq.Header.Set("Accept", "application/json")
	httpReq.Header.Set("Authorization", "Basic "+auth)

	resp, err := a.httpClient.Do(httpReq)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	respBody, _ := io.ReadAll(resp.Body)
	var result map[string]interface{}
	if err := json.Unmarshal(respBody, &result); err != nil {
		return nil, err
	}

	if code, _ := result["status_code"].(string); code == "401" || code == "400" {
		return nil, fmt.Errorf("midtrans error: %v", result["status_message"])
	}

	qrisCode := ""
	if actions, ok := result["actions"].([]interface{}); ok && len(actions) > 0 {
		if action, ok := actions[0].(map[string]interface{}); ok {
			qrisCode = fmt.Sprintf("%v", action["url"])
		}
	}

	var expiresAt *time.Time
	if exp, ok := result["expiry_time"].(string); ok {
		t, intErr := time.Parse("2006-01-02 15:04:05", exp)
		if intErr == nil {
			expiresAt = &t
		}
	}

	return &providers.QRISResponse{
		VendorTransactionID: fmt.Sprintf("%v", result["transaction_id"]),
		QRISCode:            qrisCode,
		RawResponse:         respBody,
		ExpiresAt:           expiresAt,
	}, nil
}

func (a *midtransAdapter) Validate(ctx context.Context, credsStr string) error {
	var creds credentials
	if err := json.Unmarshal([]byte(credsStr), &creds); err != nil {
		return err
	}

	baseURL := a.baseURL
	if creds.IsProduction != nil {
		if *creds.IsProduction {
			baseURL = "https://api.midtrans.com"
		} else {
			baseURL = "https://api.sandbox.midtrans.com"
		}
	}

	httpReq, _ := http.NewRequestWithContext(ctx, "GET", baseURL+"/v2/pay/account", nil)
	auth := base64.StdEncoding.EncodeToString([]byte(creds.ServerKey + ":"))
	httpReq.Header.Set("Authorization", "Basic "+auth)

	resp, err := a.httpClient.Do(httpReq)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode == http.StatusUnauthorized {
		return fmt.Errorf("invalid server key")
	}

	return nil
}

func (a *midtransAdapter) CheckStatus(ctx context.Context, vendorTxID string, credentials string) (*providers.StatusResponse, error) {
	return nil, fmt.Errorf("check status not implemented for midtrans")
}

func (a *midtransAdapter) VerifyCallback(payload []byte, signature string, secret string) bool {
	var data map[string]interface{}
	if err := json.Unmarshal(payload, &data); err != nil {
		return false
	}

	orderID := fmt.Sprintf("%v", data["order_id"])
	statusCode := fmt.Sprintf("%v", data["status_code"])
	grossAmount := fmt.Sprintf("%v", data["gross_amount"])

	sha := sha512.New()
	sha.Write([]byte(orderID + statusCode + grossAmount + secret))
	calculated := hex.EncodeToString(sha.Sum(nil))

	return strings.EqualFold(calculated, signature)
}

func (a *midtransAdapter) NormalizeCallback(payload []byte) (*providers.NormalizedCallback, error) {
	var data map[string]interface{}
	if err := json.Unmarshal(payload, &data); err != nil {
		return nil, err
	}

	_amount := 0.0
	fmt.Sscanf(fmt.Sprintf("%v", data["gross_amount"]), "%f", &_amount)

	return &providers.NormalizedCallback{
		VendorTransactionID: fmt.Sprintf("%v", data["transaction_id"]),
		ReferenceID:         fmt.Sprintf("%v", data["order_id"]),
		Status:              strings.ToLower(fmt.Sprintf("%v", data["transaction_status"])),
		Amount:              _amount,
		PaidAt:              time.Now(),
	}, nil
}
