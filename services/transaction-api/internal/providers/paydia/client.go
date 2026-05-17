package paydia

import (
	"bytes"
	"context"
	"crypto"
	"crypto/hmac"
	"crypto/rand"
	"crypto/rsa"
	"crypto/sha256"
	"crypto/sha512"
	"crypto/x509"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"encoding/pem"
	"errors"
	"fmt"
	"io"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/redis/go-redis/v9"
	"github.com/truechain/ptms/transaction-api/internal/providers"
)

type PaydiaCredentials struct {
	ClientID     string `json:"client_id"`
	ClientSecret string `json:"client_secret"`
	PrivateKey   string `json:"private_key"`
	MerchantID   string `json:"merchant_id"`
	StoreID      string `json:"store_id"`
	TerminalID   string `json:"terminal_id"`
	IsProduction bool   `json:"is_production"`
}

type PaydiaAdapter struct {
	baseURL string
	rdb     *redis.Client
	client  *http.Client
}

func NewPaydiaAdapter(baseURL string, rdb *redis.Client) *PaydiaAdapter {
	return &PaydiaAdapter{
		baseURL: baseURL,
		rdb:     rdb,
		client:  &http.Client{Timeout: 10 * time.Second},
	}
}

func (a *PaydiaAdapter) getBaseURL(creds PaydiaCredentials) string {
	if creds.IsProduction {
		return "https://api.paydia.id"
	}
	return "https://api.paydia.co.id"
}

func (a *PaydiaAdapter) getAccessToken(ctx context.Context, creds PaydiaCredentials) (string, error) {
	cacheKey := fmt.Sprintf("paydia:token:%s", creds.ClientID)
	cachedToken, err := a.rdb.Get(ctx, cacheKey).Result()
	if err == nil && cachedToken != "" {
		return cachedToken, nil
	}

	wibLocation, _ := time.LoadLocation("Asia/Jakarta")
	timestamp := time.Now().In(wibLocation).Format("2006-01-02T15:04:05-07:00")
	stringToSign := fmt.Sprintf("%s|%s", creds.ClientID, timestamp)

	block, _ := pem.Decode([]byte(creds.PrivateKey))
	if block == nil {
		return "", errors.New("failed to parse PEM block containing the key")
	}

	privKey, err := x509.ParsePKCS8PrivateKey(block.Bytes)
	if err != nil {
		return "", fmt.Errorf("failed to parse PKCS8 private key: %v", err)
	}

	rsaPrivKey, ok := privKey.(*rsa.PrivateKey)
	if !ok {
		return "", errors.New("not an RSA private key")
	}

	hashed := sha256.Sum256([]byte(stringToSign))
	signatureBytes, err := rsa.SignPKCS1v15(rand.Reader, rsaPrivKey, crypto.SHA256, hashed[:])
	if err != nil {
		return "", fmt.Errorf("failed to sign token request: %v", err)
	}
	rsaSignature := base64.StdEncoding.EncodeToString(signatureBytes)

	baseURL := a.getBaseURL(creds)
	reqBody := map[string]string{"grantType": "client_credentials"}
	reqBytes, _ := json.Marshal(reqBody)

	req, _ := http.NewRequestWithContext(ctx, "POST", baseURL+"/snap/v1.0/access-token/b2b", bytes.NewBuffer(reqBytes))
	req.Header.Set("X-CLIENT-KEY", creds.ClientID)
	req.Header.Set("X-TIMESTAMP", timestamp)
	req.Header.Set("X-SIGNATURE", rsaSignature)
	req.Header.Set("Content-Type", "application/json")

	resp, err := a.client.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		bodyBytes, _ := io.ReadAll(resp.Body)
		return "", fmt.Errorf("failed to get access token, status: %d, body: %s", resp.StatusCode, string(bodyBytes))
	}

	var resData struct {
		AccessToken string `json:"accessToken"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&resData); err != nil {
		return "", err
	}

	if resData.AccessToken != "" {
		a.rdb.Set(ctx, cacheKey, resData.AccessToken, 23*time.Hour)
	}

	return resData.AccessToken, nil
}

func (a *PaydiaAdapter) generateSignatureService(method, path, token string, body []byte, timestamp, secret string) string {
	payloadHash := sha256.Sum256(body)
	payloadHashHex := strings.ToLower(hex.EncodeToString(payloadHash[:]))
	stringToSign := fmt.Sprintf("%s:%s:%s:%s:%s", method, path, token, payloadHashHex, timestamp)

	h := hmac.New(sha512.New, []byte(secret))
	h.Write([]byte(stringToSign))
	return base64.StdEncoding.EncodeToString(h.Sum(nil))
}

func (a *PaydiaAdapter) GenerateQRIS(ctx context.Context, req providers.GenerateQRISRequest) (*providers.QRISResponse, error) {
	var creds PaydiaCredentials
	if err := json.Unmarshal([]byte(req.Credentials), &creds); err != nil {
		return nil, err
	}

	accessToken, err := a.getAccessToken(ctx, creds)
	if err != nil {
		return nil, err
	}

	baseURL := a.getBaseURL(creds)
	wibLocation, _ := time.LoadLocation("Asia/Jakarta")
	now := time.Now().In(wibLocation)
	timestamp := now.Format("2006-01-02T15:04:05-07:00")
	path := "/snap/v1.0/qr/qr-mpm-generate"

	validityPeriod := now.Add(15 * time.Minute)
	validityPeriodStr := validityPeriod.Format("2006-01-02T15:04:05-07:00")

	bodyMap := map[string]interface{}{
		"merchantId":         creds.MerchantID,
		"terminalId":         creds.TerminalID,
		"partnerReferenceNo": req.TransactionID,
		"amount": map[string]interface{}{
			"value":    fmt.Sprintf("%.2f", req.Amount),
			"currency": "IDR",
		},
		"feeAmount": map[string]interface{}{
			"value":    "0.00",
			"currency": "IDR",
		},
		"validityPeriod": validityPeriodStr,
		"additionalInfo": map[string]interface{}{},
	}
	if creds.StoreID != "" {
		bodyMap["storeId"] = creds.StoreID
	}

	bodyBytes, _ := json.Marshal(bodyMap)
	signature := a.generateSignatureService("POST", path, accessToken, bodyBytes, timestamp, creds.ClientSecret)

	httpReq, _ := http.NewRequestWithContext(ctx, "POST", baseURL+path, bytes.NewBuffer(bodyBytes))
	httpReq.Header.Set("Authorization", "Bearer "+accessToken)
	httpReq.Header.Set("X-TIMESTAMP", timestamp)
	httpReq.Header.Set("X-PARTNER-ID", creds.ClientID)
	httpReq.Header.Set("X-SIGNATURE", signature)
	httpReq.Header.Set("X-EXTERNAL-ID", strconv.FormatInt(now.UnixMilli(), 10))
	httpReq.Header.Set("CHANNEL-ID", "95221")
	httpReq.Header.Set("Content-Type", "application/json")

	resp, err := a.client.Do(httpReq)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	respBytes, _ := io.ReadAll(resp.Body)

	var resData struct {
		ResponseCode    string `json:"responseCode"`
		ResponseMessage string `json:"responseMessage"`
		ReferenceNo     string `json:"referenceNo"`
		QrContent       string `json:"qrContent"`
	}
	if err := json.Unmarshal(respBytes, &resData); err != nil {
		return nil, err
	}

	if resData.ResponseCode != "2005700" {
		return nil, fmt.Errorf("paydia error: %s - %s", resData.ResponseCode, resData.ResponseMessage)
	}

	expiresAtUTC := validityPeriod.UTC()
	return &providers.QRISResponse{
		VendorTransactionID: resData.ReferenceNo,
		QRISCode:            resData.QrContent,
		RawResponse:         respBytes,
		ExpiresAt:           &expiresAtUTC,
	}, nil
}

func (a *PaydiaAdapter) CheckStatus(ctx context.Context, vendorTxID string, credentials string) (*providers.StatusResponse, error) {
	var creds PaydiaCredentials
	if err := json.Unmarshal([]byte(credentials), &creds); err != nil {
		return nil, err
	}

	accessToken, err := a.getAccessToken(ctx, creds)
	if err != nil {
		return nil, err
	}

	baseURL := a.getBaseURL(creds)
	wibLocation, _ := time.LoadLocation("Asia/Jakarta")
	now := time.Now().In(wibLocation)
	timestamp := now.Format("2006-01-02T15:04:05-07:00")
	path := "/snap/v1.0/qr/qr-mpm-query"

	bodyMap := map[string]interface{}{
		"originalReferenceNo": vendorTxID,
		"merchantId":          creds.MerchantID,
	}
	if creds.StoreID != "" {
		bodyMap["externalStoreId"] = creds.StoreID
	}

	bodyBytes, _ := json.Marshal(bodyMap)
	signature := a.generateSignatureService("POST", path, accessToken, bodyBytes, timestamp, creds.ClientSecret)

	httpReq, _ := http.NewRequestWithContext(ctx, "POST", baseURL+path, bytes.NewBuffer(bodyBytes))
	httpReq.Header.Set("Authorization", "Bearer "+accessToken)
	httpReq.Header.Set("X-TIMESTAMP", timestamp)
	httpReq.Header.Set("X-PARTNER-ID", creds.ClientID)
	httpReq.Header.Set("X-SIGNATURE", signature)
	httpReq.Header.Set("X-EXTERNAL-ID", strconv.FormatInt(now.UnixMilli(), 10))
	httpReq.Header.Set("CHANNEL-ID", "95221")
	httpReq.Header.Set("Content-Type", "application/json")

	resp, err := a.client.Do(httpReq)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	var resData struct {
		LatestTransactionStatus string `json:"latestTransactionStatus"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&resData); err != nil {
		return nil, err
	}

	status := "failed"
	if resData.LatestTransactionStatus == "00" {
		status = "paid"
	} else if resData.LatestTransactionStatus == "01" {
		status = "pending_payment"
	}

	return &providers.StatusResponse{
		VendorTransactionID: vendorTxID,
		Status:              status,
	}, nil
}

func (a *PaydiaAdapter) VerifyCallback(payload []byte, signature string, secret string) bool {
	var data map[string]interface{}
	json.Unmarshal(payload, &data)

	timestamp := ""
	if ts, ok := data["timestamp"].(string); ok {
		timestamp = ts
	} else if ts, ok := data["transactionDate"].(string); ok {
		timestamp = ts
	}

	payloadHash := sha256.Sum256(payload)
	payloadHashHex := strings.ToLower(hex.EncodeToString(payloadHash[:]))

	stringToSign := fmt.Sprintf("CALLBACK:%s:%s", payloadHashHex, timestamp)
	h := hmac.New(sha512.New, []byte(secret))
	h.Write([]byte(stringToSign))
	expected := base64.StdEncoding.EncodeToString(h.Sum(nil))

	return hmac.Equal([]byte(expected), []byte(signature))
}

func (a *PaydiaAdapter) NormalizeCallback(payload []byte) (*providers.NormalizedCallback, error) {
	var data map[string]interface{}
	if err := json.Unmarshal(payload, &data); err != nil {
		return nil, err
	}

	var amount float64
	if amt, ok := data["amount"].(map[string]interface{}); ok {
		fmt.Sscanf(fmt.Sprintf("%v", amt["value"]), "%f", &amount)
	}

	status := "failed"
	rawStatus := fmt.Sprintf("%v", data["latestTransactionStatus"])
	if rawStatus == "00" {
		status = "paid"
	} else if rawStatus == "01" {
		status = "pending_payment"
	}

	paidAt := time.Now()
	if dateStr, ok := data["transactionDate"].(string); ok {
		if parsed, err := time.Parse(time.RFC3339, dateStr); err == nil {
			paidAt = parsed
		}
	}

	return &providers.NormalizedCallback{
		VendorTransactionID: fmt.Sprintf("%v", data["referenceNo"]),
		ReferenceID:         fmt.Sprintf("%v", data["originalPartnerReferenceNo"]),
		Status:              status,
		Amount:              amount,
		PaidAt:              paidAt,
	}, nil
}

func (a *PaydiaAdapter) Validate(ctx context.Context, credsStr string) error {
	var creds PaydiaCredentials
	if err := json.Unmarshal([]byte(credsStr), &creds); err != nil {
		return err
	}
	_, err := a.getAccessToken(ctx, creds)
	return err
}
