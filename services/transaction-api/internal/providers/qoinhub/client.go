package qoinhub_adapter

import (
	"bytes"
	"context"
	"crypto"
	"crypto/hmac"
	"crypto/rsa"
	"crypto/sha256"
	"crypto/sha512"
	"crypto/x509"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"encoding/pem"
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
			Timeout: 30 * time.Second,
		},
	}
}

type credentials struct {
	ClientID     string `json:"client_id"`
	ClientSecret string `json:"client_secret"`
	MerchantID   string `json:"merchant_id"`
	TerminalID   string `json:"terminal_id"`
	PrivateKey   string `json:"private_key"`
	PublicKey    string `json:"public_key"`
}

func (a *qoinhubAdapter) GenerateQRIS(ctx context.Context, req providers.GenerateQRISRequest) (*providers.QRISResponse, error) {
	var creds credentials
	if err := json.Unmarshal([]byte(req.Credentials), &creds); err != nil {
		return nil, fmt.Errorf("invalid credentials: %w", err)
	}

	// Step 1: Get B2B Access Token
	accessToken, err := a.getAccessTokenB2B(ctx, creds)
	if err != nil {
		return nil, fmt.Errorf("failed to get access token: %w", err)
	}

	// Step 2: Generate QRIS with SNAP API
	endpoint := "https://api.qoinhub.id/ordersnap/api/v1.0/qr/qr-mpm-generate"
	path := "/ordersnap/api/v1.0/qr/qr-mpm-generate"

	// Use WIB timezone (Asia/Jakarta, UTC+7)
	wib := time.FixedZone("WIB", 7*3600)
	timestamp := time.Now().In(wib).Format("2006-01-02T15:04:05-07:00")

	// Set QRIS expiry time (15 minutes from now) in WIB timezone
	expiryTime := time.Now().In(wib).Add(15 * time.Minute).Format("2006-01-02T15:04:05-07:00")

	bodyMap := map[string]interface{}{
		"partnerReferenceNo": req.TransactionID,
		"amount": map[string]interface{}{
			"value":    fmt.Sprintf("%.2f", req.Amount),
			"currency": "IDR",
		},
		"validityPeriod": expiryTime,
		"additionalInfo": map[string]interface{}{
			"acquirer": 36,
			"items": []map[string]interface{}{
				{
					"id": "PRODUCT-001",
					"price": map[string]interface{}{
						"value":    fmt.Sprintf("%.2f", req.Amount),
						"currency": "IDR",
					},
					"quantity": "1",
					"name":     "Payment via Routex",
				},
			},
			"customerDetails": map[string]interface{}{
				"email":     "customer@routex.id",
				"firstName": "Routex",
				"lastName":  "User",
				"phone":     "081234567890",
			},
		},
	}

	bodyBytes, _ := json.Marshal(bodyMap)
	bodyHash := a.hashBody(bodyBytes)

	// Create HMAC signature
	stringToSign := fmt.Sprintf("POST:%s:%s:%s:%s", path, accessToken, bodyHash, timestamp)
	signature := a.generateHMAC(stringToSign, creds.ClientSecret)

	httpReq, err := http.NewRequestWithContext(ctx, "POST", endpoint, bytes.NewBuffer(bodyBytes))
	if err != nil {
		return nil, err
	}

	httpReq.Header.Set("Content-Type", "application/json")
	httpReq.Header.Set("Accept", "application/json")
	httpReq.Header.Set("Authorization", "Bearer "+accessToken)
	httpReq.Header.Set("X-TIMESTAMP", timestamp)
	httpReq.Header.Set("X-SIGNATURE", signature)
	httpReq.Header.Set("X-PARTNER-ID", creds.ClientID)
	httpReq.Header.Set("X-EXTERNAL-ID", req.TransactionID)
	httpReq.Header.Set("CHANNEL-ID", "95221")

	fmt.Printf("[Qoinhub] QRIS Request:\n")
	fmt.Printf("  Endpoint: %s\n", endpoint)
	fmt.Printf("  Timestamp: %s\n", timestamp)
	fmt.Printf("  Body Hash: %s\n", bodyHash)
	fmt.Printf("  Signature: %s...\n", signature[:50])

	resp, err := a.httpClient.Do(httpReq)
	if err != nil {
		fmt.Printf("[Qoinhub] QRIS Network Error: %v\n", err)
		return nil, err
	}
	defer resp.Body.Close()

	respBody, _ := io.ReadAll(resp.Body)
	fmt.Printf("[Qoinhub] QRIS Response: status=%d, body=%s\n", resp.StatusCode, string(respBody))

	if resp.StatusCode != http.StatusOK && resp.StatusCode != http.StatusCreated {
		return nil, fmt.Errorf("qoinhub error: status %d, body %s", resp.StatusCode, string(respBody))
	}

	var result struct {
		ResponseCode string `json:"responseCode"`
		ResponseMessage string `json:"responseMessage"`
		QRContent   string `json:"qrContent"`
		ReferenceNo string `json:"referenceNo"`
	}
	if err := json.Unmarshal(respBody, &result); err != nil {
		return nil, err
	}

	// Check for success response codes
	// 2004700 = Successful QRIS generation
	// 2005100 = Another success code (if any)
	if result.ResponseCode != "2004700" && result.ResponseCode != "2005100" && result.ResponseCode != "" {
		return nil, fmt.Errorf("qoinhub error: %s - %s", result.ResponseCode, result.ResponseMessage)
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

func (a *qoinhubAdapter) getAccessTokenB2B(ctx context.Context, creds credentials) (string, error) {
	endpoint := "https://api.qoinhub.id/ordersnap/api/v1.0/access-token/b2b"
	timestamp := time.Now().Format("2006-01-02T15:04:05-07:00")

	// Create RSA signature for B2B access token
	stringToSign := creds.ClientID + "|" + timestamp
	signature, err := a.generateRSASignature(stringToSign, creds.PrivateKey)
	if err != nil {
		fmt.Printf("[Qoinhub] RSA Signature Error: %v\n", err)
		return "", fmt.Errorf("failed to generate RSA signature: %w", err)
	}

	bodyMap := map[string]interface{}{
		"grantType": "client_credentials",
		"additionalInfo": map[string]interface{}{},
	}

	bodyBytes, _ := json.Marshal(bodyMap)
	httpReq, err := http.NewRequestWithContext(ctx, "POST", endpoint, bytes.NewBuffer(bodyBytes))
	if err != nil {
		return "", err
	}

	httpReq.Header.Set("Content-Type", "application/json")
	httpReq.Header.Set("Accept", "application/json")
	httpReq.Header.Set("X-TIMESTAMP", timestamp)
	httpReq.Header.Set("X-SIGNATURE", signature)
	httpReq.Header.Set("X-CLIENT-KEY", creds.ClientID)

	fmt.Printf("[Qoinhub] B2B Token Request:\n")
	fmt.Printf("  Endpoint: %s\n", endpoint)
	fmt.Printf("  Timestamp: %s\n", timestamp)
	fmt.Printf("  ClientID: %s\n", creds.ClientID)
	fmt.Printf("  Signature: %s...\n", signature[:50])

	resp, err := a.httpClient.Do(httpReq)
	if err != nil {
		fmt.Printf("[Qoinhub] B2B Token Network Error: %v\n", err)
		return "", err
	}
	defer resp.Body.Close()

	respBody, _ := io.ReadAll(resp.Body)
	fmt.Printf("[Qoinhub] B2B Token Response: status=%d, body=%s\n", resp.StatusCode, string(respBody))

	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("qoinhub B2B token error: status %d, body %s", resp.StatusCode, string(respBody))
	}

	var result struct {
		ResponseCode string `json:"responseCode"`
		ResponseMessage string `json:"responseMessage"`
		AccessToken  string `json:"accessToken"`
		ExpiresIn    string `json:"expiresIn"`
	}
	if err := json.Unmarshal(respBody, &result); err != nil {
		return "", err
	}

	if result.AccessToken == "" {
		return "", fmt.Errorf("empty access token: %s - %s", result.ResponseCode, result.ResponseMessage)
	}

	fmt.Printf("[Qoinhub] B2B Token Success: token=%s...\n", result.AccessToken[:20])
	return result.AccessToken, nil
}

func (a *qoinhubAdapter) generateRSASignature(message, privateKeyPEM string) (string, error) {
	// Parse PEM block
	block, _ := pem.Decode([]byte(privateKeyPEM))
	if block == nil {
		return "", fmt.Errorf("failed to parse PEM block")
	}

	// Parse private key (support both PKCS1 and PKCS8)
	var privateKey *rsa.PrivateKey
	var err error

	// Try PKCS1 first
	privateKey, err = x509.ParsePKCS1PrivateKey(block.Bytes)
	if err != nil {
		// Try PKCS8
		key, err2 := x509.ParsePKCS8PrivateKey(block.Bytes)
		if err2 != nil {
			return "", fmt.Errorf("failed to parse private key: %v", err2)
		}
		var ok bool
		privateKey, ok = key.(*rsa.PrivateKey)
		if !ok {
			return "", fmt.Errorf("not an RSA private key")
		}
	}

	// Hash the message with SHA256
	hashed := sha256.Sum256([]byte(message))

	// Sign with RSA PKCS#1 v1.5 with SHA256
	// Use crypto.SHA256 to indicate the hash algorithm used
	signature, err := rsa.SignPKCS1v15(nil, privateKey, crypto.SHA256, hashed[:])
	if err != nil {
		return "", fmt.Errorf("failed to sign: %v", err)
	}

	// Return base64 encoded signature
	return base64.StdEncoding.EncodeToString(signature), nil
}

func (a *qoinhubAdapter) hashBody(body []byte) string {
	h := sha256.New()
	h.Write(body)
	return strings.ToLower(hex.EncodeToString(h.Sum(nil)))
}

func (a *qoinhubAdapter) generateHMAC(message, secret string) string {
	key := []byte(secret)
	hs := hmac.New(sha512.New, key)
	hs.Write([]byte(message))
	return base64.StdEncoding.EncodeToString(hs.Sum(nil))
}
