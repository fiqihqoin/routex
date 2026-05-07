package qoinhub_adapter

import (
	"bytes"
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"

	"github.com/truechain/ptms/transaction-api/internal/providers"
)

type qoinhubAdapter struct {
	httpClient *http.Client
}

func NewQoinhubAdapter() providers.VendorAdapter {
	return &qoinhubAdapter{
		httpClient: &http.Client{
			Timeout: 5 * time.Second,
		},
	}
}

type credentials struct {
	ClientID     string `json:"client_id"`
	ClientSecret string `json:"client_secret"`
	MerchantID   string `json:"merchant_id"`
	TerminalID   string `json:"terminal_id"`
}

func (a *qoinhubAdapter) GenerateQRIS(ctx context.Context, req providers.GenerateQRISRequest) (*providers.QRISResponse, error) {
	var creds credentials
	if err := json.Unmarshal([]byte(req.Credentials), &creds); err != nil {
		return nil, fmt.Errorf("invalid credentials: %w", err)
	}

	endpoint := "https://api.qoinhub.id/ordersnap/api/v1.0/qr/qr-mpm-generate"
	path := "/ordersnap/api/v1.0/qr/qr-mpm-generate"
	timestamp := time.Now().Format("2006-01-02T15:04:05-07:00")

	bodyMap := map[string]interface{}{
		"partnerReferenceNo": req.TransactionID,
		"amount": map[string]string{
			"value":    fmt.Sprintf("%.2f", req.Amount),
			"currency": "IDR",
		},
		"merchantId": creds.MerchantID,
		"terminalId": creds.TerminalID,
	}

	bodyBytes, _ := json.Marshal(bodyMap)
	
	h := sha256.New()
	h.Write(bodyBytes)
	bodyHash := hex.EncodeToString(h.Sum(nil))
	
	payloadToSign := fmt.Sprintf("POST:%s:%s:%s", path, bodyHash, timestamp)
	signature := a.generateHMAC(payloadToSign, creds.ClientSecret)

	httpReq, err := http.NewRequestWithContext(ctx, "POST", endpoint, bytes.NewBuffer(bodyBytes))
	if err != nil {
		return nil, err
	}

	httpReq.Header.Set("Content-Type", "application/json")
	httpReq.Header.Set("X-TIMESTAMP", timestamp)
	httpReq.Header.Set("X-SIGNATURE", signature)
	httpReq.Header.Set("X-PARTNER-ID", creds.ClientID)

	resp, err := a.httpClient.Do(httpReq)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	respBody, _ := io.ReadAll(resp.Body)
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("qoinhub error: status %d, body %s", resp.StatusCode, string(respBody))
	}

	var result struct {
		QRContent   string `json:"qrContent"`
		ReferenceNo string `json:"referenceNo"`
	}
	if err := json.Unmarshal(respBody, &result); err != nil {
		return nil, err
	}

	return &providers.QRISResponse{
		VendorTransactionID: result.ReferenceNo,
		QRISCode:            result.QRContent,
		RawResponse:         respBody,
	}, nil
}

func (a *qoinhubAdapter) Validate(ctx context.Context, credsStr string) error {
	_, err := a.GenerateQRIS(ctx, providers.GenerateQRISRequest{
		TransactionID:  fmt.Sprintf("VAL-%d", time.Now().Unix()),
		Amount:         1.0,
		PaymentChannel: "qris",
		Credentials:    credsStr,
	})
	return err
}

func (a *qoinhubAdapter) CheckStatus(ctx context.Context, vendorTxID string, credentials string) (*providers.StatusResponse, error) {
	return nil, fmt.Errorf("check status not implemented for qoinhub")
}

func (a *qoinhubAdapter) VerifyCallback(payload []byte, signature string, secret string) bool {
	expected := a.generateHMAC(string(payload), secret)
	return hmac.Equal([]byte(expected), []byte(signature))
}

func (a *qoinhubAdapter) NormalizeCallback(payload []byte) (*providers.NormalizedCallback, error) {
	var data map[string]interface{}
	if err := json.Unmarshal(payload, &data); err != nil {
		return nil, err
	}

	var amount float64
	if amt, ok := data["amount"].(map[string]interface{}); ok {
		fmt.Sscanf(fmt.Sprintf("%v", amt["value"]), "%f", &amount)
	}

	return &providers.NormalizedCallback{
		VendorTransactionID: fmt.Sprintf("%v", data["referenceNo"]),
		ReferenceID:         fmt.Sprintf("%v", data["partnerReferenceNo"]),
		Status:              strings.ToLower(fmt.Sprintf("%v", data["status"])),
		Amount:              amount,
		PaidAt:              time.Now(),
	}, nil
}

func (a *qoinhubAdapter) generateHMAC(message, secret string) string {
	key := []byte(secret)
	hs := hmac.New(sha256.New, key)
	hs.Write([]byte(message))
	return hex.EncodeToString(hs.Sum(nil))
}
