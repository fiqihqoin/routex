package payok

import (
	"bytes"
	"context"
	"crypto"
	"crypto/rand"
	"crypto/rsa"
	"crypto/sha256"
	"crypto/x509"
	"encoding/base64"
	"encoding/json"
	"encoding/pem"
	"errors"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"

	"github.com/truechain/caishenengine/transaction-api/internal/providers"
)

type PayokCredentials struct {
	MerchantID         string `json:"merchant_id"`
	MerchantPrivateKey string `json:"merchant_private_key"`
	PayokPublicKey     string `json:"payok_public_key"`
}

type PayokAdapter struct {
	baseURL string
	client  *http.Client
}

func NewPayokAdapter(baseURL string) *PayokAdapter {
	if baseURL == "" {
		baseURL = "https://api-demian.com"
	}
	return &PayokAdapter{
		baseURL: strings.TrimSuffix(baseURL, "/"),
		client:  &http.Client{Timeout: 15 * time.Second},
	}
}

func (a *PayokAdapter) GenerateQRIS(ctx context.Context, req providers.GenerateQRISRequest) (*providers.QRISResponse, error) {
	var creds PayokCredentials
	if err := json.Unmarshal([]byte(req.Credentials), &creds); err != nil {
		return nil, fmt.Errorf("failed to unmarshal payok credentials: %w", err)
	}

	path := "/api-pay/payment/V3.6/order/create-api"
	
	// Create request body
	body := map[string]interface{}{
		"requestTime":       time.Now().UTC().Format("2006-01-02T15:04:05.000Z"),
		"merchantId":        creds.MerchantID,
		"paymentMethodCode": "QRIS",
		"countryCode":       "IDN",
		"merchantOrderId":   req.TransactionID,
		"amount":            req.Amount,
		"currency":          "IDR",
		"notificationUrl":   "https://api.caishenengine.com/api/v1/callbacks/PAYOK", // Usually sent by core
		"language":          "ID",
		"customer": map[string]interface{}{
			"name":     "Customer",
			"email":    "customer@email.com",
			"phone":    "08123456789",
			"deviceId": "DEVICE-" + req.TransactionID,
		},
		"goodsInfo": map[string]interface{}{
			"name": "QRIS Payment",
		},
	}

	jsonBytes, _ := json.Marshal(body)
	
	// Signature: Base64(RSA-SHA256(JSON_BODY + ENDPOINT_URL))
	signature, err := a.generateSignature(string(jsonBytes)+path, creds.MerchantPrivateKey)
	if err != nil {
		return nil, fmt.Errorf("failed to generate payok signature: %w", err)
	}

	httpReq, _ := http.NewRequestWithContext(ctx, "POST", a.baseURL+path, bytes.NewBuffer(jsonBytes))
	httpReq.Header.Set("Content-Type", "application/json;charset=utf-8")
	httpReq.Header.Set("sign", signature)

	resp, err := a.client.Do(httpReq)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	respBytes, _ := io.ReadAll(resp.Body)
	
	var resData struct {
		Code        string `json:"code"`
		Message     string `json:"message"`
		PaymentInfo struct {
			Content     string `json:"content"`
			Type        string `json:"type"`
			ExpiredTime string `json:"expiredTime"`
		} `json:"paymentInfo"`
		PlatformOrderId string `json:"platformOrderId"`
	}

	if err := json.Unmarshal(respBytes, &resData); err != nil {
		return nil, fmt.Errorf("failed to parse payok response: %w", err)
	}

	if resData.Code != "SUCCESS" {
		return nil, fmt.Errorf("payok api error: %s - %s", resData.Code, resData.Message)
	}

	// For QRIS, content is a JSON string containing qr_code
	var qrContent struct {
		QRCode string `json:"qr_code"`
		PayURL string `json:"pay_url"`
	}
	// Try to unmarshal the content if it's JSON
	if resData.PaymentInfo.Type == "json" {
		_ = json.Unmarshal([]byte(resData.PaymentInfo.Content), &qrContent)
	}

	qrisString := qrContent.QRCode
	if qrisString == "" {
		qrisString = resData.PaymentInfo.Content // Fallback to raw content
	}

	var expiresAt *time.Time
	if resData.PaymentInfo.ExpiredTime != "" {
		if t, err := time.Parse("20060102150405", resData.PaymentInfo.ExpiredTime); err == nil {
			expiresAt = &t
		}
	}

	return &providers.QRISResponse{
		VendorTransactionID: resData.PlatformOrderId,
		QRISCode:            qrisString,
		RawResponse:         respBytes,
		ExpiresAt:           expiresAt,
	}, nil
}

func (a *PayokAdapter) CheckStatus(ctx context.Context, vendorTxID string, credentials string) (*providers.StatusResponse, error) {
	var creds PayokCredentials
	if err := json.Unmarshal([]byte(credentials), &creds); err != nil {
		return nil, err
	}

	path := "/api-pay/payment/V3.6/order/query"
	body := map[string]interface{}{
		"requestTime":     time.Now().UTC().Format("2006-01-02T15:04:05.000Z"),
		"merchantId":      creds.MerchantID,
		"platformOrderId": vendorTxID,
	}

	jsonBytes, _ := json.Marshal(body)
	signature, _ := a.generateSignature(string(jsonBytes)+path, creds.MerchantPrivateKey)

	httpReq, _ := http.NewRequestWithContext(ctx, "POST", a.baseURL+path, bytes.NewBuffer(jsonBytes))
	httpReq.Header.Set("Content-Type", "application/json;charset=utf-8")
	httpReq.Header.Set("sign", signature)

	resp, err := a.client.Do(httpReq)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	var resData struct {
		Code    string `json:"code"`
		Status  string `json:"status"` // PENDING, SUCCESS, FAILED
		Amount  float64 `json:"amount"`
	}
	json.NewDecoder(resp.Body).Decode(&resData)

	status := "failed"
	if resData.Status == "SUCCESS" {
		status = "paid"
	} else if resData.Status == "PENDING" {
		status = "pending_payment"
	}

	return &providers.StatusResponse{
		VendorTransactionID: vendorTxID,
		Status:              status,
	}, nil
}

func (a *PayokAdapter) VerifyCallback(payload []byte, signature string, secret string) bool {
	// secret here is the PayokPublicKey
	return a.verifyRSASignature(string(payload), signature, secret)
}

func (a *PayokAdapter) NormalizeCallback(payload []byte) (*providers.NormalizedCallback, error) {
	var data struct {
		MerchantOrderId string  `json:"merchantOrderId"`
		PlatformOrderId string  `json:"platformOrderId"`
		Status          string  `json:"status"`
		Amount          float64 `json:"amount"`
		SuccessTime     string  `json:"successTime"`
	}

	if err := json.Unmarshal(payload, &data); err != nil {
		return nil, err
	}

	status := "failed"
	if data.Status == "SUCCESS" {
		status = "paid"
	}

	paidAt := time.Now()
	if data.SuccessTime != "" {
		if t, err := time.Parse("20060102150405", data.SuccessTime); err == nil {
			paidAt = t
		}
	}

	return &providers.NormalizedCallback{
		VendorTransactionID: data.PlatformOrderId,
		ReferenceID:         data.MerchantOrderId,
		Status:              status,
		Amount:              data.Amount,
		PaidAt:              paidAt,
		VendorID:            "PAYOK",
	}, nil
}

func (a *PayokAdapter) Validate(ctx context.Context, credentials string) error {
	var creds PayokCredentials
	if err := json.Unmarshal([]byte(credentials), &creds); err != nil {
		return err
	}
	if creds.MerchantID == "" || creds.MerchantPrivateKey == "" || creds.PayokPublicKey == "" {
		return errors.New("missing required payok credentials")
	}
	return nil
}

// Internal Helpers

func (a *PayokAdapter) generateSignature(data string, privateKeyPEM string) (string, error) {
	block, _ := pem.Decode([]byte(privateKeyPEM))
	if block == nil {
		return "", errors.New("failed to parse PEM block containing the private key")
	}

	priv, err := x509.ParsePKCS8PrivateKey(block.Bytes)
	if err != nil {
		return "", err
	}

	rsaPriv, ok := priv.(*rsa.PrivateKey)
	if !ok {
		return "", errors.New("not an RSA private key")
	}

	h := sha256.New()
	h.Write([]byte(data))
	hashed := h.Sum(nil)

	signature, err := rsa.SignPKCS1v15(rand.Reader, rsaPriv, crypto.SHA256, hashed)
	if err != nil {
		return "", err
	}

	return base64.StdEncoding.EncodeToString(signature), nil
}

func (a *PayokAdapter) verifyRSASignature(data string, signatureBase64 string, publicKeyPEM string) bool {
	block, _ := pem.Decode([]byte(publicKeyPEM))
	if block == nil {
		return false
	}

	pubInterface, err := x509.ParsePKIXPublicKey(block.Bytes)
	if err != nil {
		return false
	}

	pub, ok := pubInterface.(*rsa.PublicKey)
	if !ok {
		return false
	}

	signature, err := base64.StdEncoding.DecodeString(signatureBase64)
	if err != nil {
		return false
	}

	h := sha256.New()
	h.Write([]byte(data))
	hashed := h.Sum(nil)

	err = rsa.VerifyPKCS1v15(pub, crypto.SHA256, hashed, signature)
	return err == nil
}
