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
	
	// Create request body matching Node.js SDK logic exactly
	body := map[string]interface{}{
		"paymentMethodCode": "QRIS",
		"notificationUrl":   "https://api.caishenengine.com/api/v1/callbacks/PAYOK",
		"requestTime":       time.Now().UTC().Format("2006-01-02T15:04:05.000Z"),
		"amount":            int(req.Amount),
		"merchantId":        creds.MerchantID,
		"countryCode":       "IDN",
		"currency":          "Rp",
		"language":          "ID",
		"merchantOrderId":   req.TransactionID,
		"goodsInfo": map[string]interface{}{
			"price": fmt.Sprintf("%.2f", req.Amount),
			"name":  "QRIS Payment",
			"id":    req.TransactionID,
		},
		"customer": map[string]interface{}{
			"name":     "Customer",
			"email":    "customer@email.com",
			"phone":    "08123456789",
			"city":     "Jakarta",
			"deviceId": "DEVICE-" + req.TransactionID,
		},
	}

	jsonBytes, _ := json.Marshal(body)
	fmt.Printf("[PAYOK] Request Body: %s\n", string(jsonBytes))

	// Signature: Base64(RSA-SHA256(JSON_BODY + '&' + ENDPOINT_URL))
	signature, err := a.generateSignature(string(jsonBytes)+"&"+path, creds.MerchantPrivateKey)
	if err != nil {
		return nil, fmt.Errorf("failed to generate payok signature: %w", err)
	}

	httpReq, _ := http.NewRequestWithContext(ctx, "POST", a.baseURL+path, bytes.NewBuffer(jsonBytes))
	httpReq.Header.Set("Content-Type", "application/json;charset=utf-8")
	httpReq.Header.Set("Sign", signature) // SDK uses capital 'Sign'

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

	var qrContent struct {
		QRCode string `json:"qr_code"`
		PayURL string `json:"pay_url"`
	}
	if resData.PaymentInfo.Type == "json" {
		_ = json.Unmarshal([]byte(resData.PaymentInfo.Content), &qrContent)
	}

	qrisString := qrContent.QRCode
	if qrisString == "" {
		qrisString = resData.PaymentInfo.Content
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
	// Note: PAYOK requires '&' prefix before endpoint URL
	signature, _ := a.generateSignature(string(jsonBytes)+"&"+path, creds.MerchantPrivateKey)

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
		Status  string `json:"status"`
		Amount  float64 `json:"amount"`
	}
	json.NewDecoder(resp.Body).Decode(&resData)

	status := "expired"
	if resData.Status == "SUCCESS" {
		status = "paid"
	} else if resData.Status == "PENDING" {
		status = "pending"
	}

	return &providers.StatusResponse{
		VendorTransactionID: vendorTxID,
		Status:              status,
	}, nil
}

func (a *PayokAdapter) VerifyCallback(payload []byte, signature string, secret string) bool {
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

	status := "expired"
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

func (a *PayokAdapter) generateSignature(data string, privateKeyStr string) (string, error) {
	priv, err := a.parsePrivateKey(privateKeyStr)
	if err != nil {
		return "", err
	}

	h := sha256.New()
	h.Write([]byte(data))
	hashed := h.Sum(nil)

	signature, err := rsa.SignPKCS1v15(rand.Reader, priv, crypto.SHA256, hashed)
	if err != nil {
		return "", err
	}

	return base64.StdEncoding.EncodeToString(signature), nil
}

func (a *PayokAdapter) verifyRSASignature(data string, signatureBase64 string, publicKeyStr string) bool {
	pub, err := a.parsePublicKey(publicKeyStr)
	if err != nil {
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

func (a *PayokAdapter) parsePrivateKey(keyStr string) (*rsa.PrivateKey, error) {
	keyStr = strings.TrimSpace(keyStr)
	
	block, _ := pem.Decode([]byte(keyStr))
	var der []byte
	if block != nil {
		der = block.Bytes
	} else {
		var err error
		der, err = base64.StdEncoding.DecodeString(keyStr)
		if err != nil {
			return nil, errors.New("failed to parse private key: not valid PEM or base64")
		}
	}

	if priv, err := x509.ParsePKCS8PrivateKey(der); err == nil {
		if rsaPriv, ok := priv.(*rsa.PrivateKey); ok {
			return rsaPriv, nil
		}
	}

	if priv, err := x509.ParsePKCS1PrivateKey(der); err == nil {
		return priv, nil
	}

	return nil, errors.New("failed to parse private key: unsupported format")
}

func (a *PayokAdapter) parsePublicKey(keyStr string) (*rsa.PublicKey, error) {
	keyStr = strings.TrimSpace(keyStr)
	
	block, _ := pem.Decode([]byte(keyStr))
	var der []byte
	if block != nil {
		der = block.Bytes
	} else {
		var err error
		der, err = base64.StdEncoding.DecodeString(keyStr)
		if err != nil {
			return nil, errors.New("failed to parse public key: not valid PEM or base64")
		}
	}

	if pub, err := x509.ParsePKIXPublicKey(der); err == nil {
		if rsaPub, ok := pub.(*rsa.PublicKey); ok {
			return rsaPub, nil
		}
	}

	if pub, err := x509.ParsePKCS1PublicKey(der); err == nil {
		return pub, nil
	}

	return nil, errors.New("failed to parse public key: unsupported format")
}
