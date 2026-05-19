package pakailink

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strconv"
	"time"

	"github.com/redis/go-redis/v9"
	"github.com/truechain/ptms/transaction-api/internal/providers"
	"github.com/truechain/ptms/transaction-api/internal/providers/snapbi"
)

type PakailinkCredentials struct {
	ClientID     string `json:"client_id"`
	ClientSecret string `json:"client_secret"`
	PrivateKey   string `json:"private_key"`
	MerchantID   string `json:"merchant_id"`
	StoreID      string `json:"store_id"`
	TerminalID   string `json:"terminal_id"`
	IsProduction bool   `json:"is_production"`
}

type PakailinkAdapter struct {
	baseURL string
	rdb     *redis.Client
	client  *http.Client
}

func NewPakailinkAdapter(baseURL string, rdb *redis.Client) *PakailinkAdapter {
	return &PakailinkAdapter{
		baseURL: baseURL,
		rdb:     rdb,
		client:  &http.Client{Timeout: 10 * time.Second},
	}
}

func (a *PakailinkAdapter) getBaseURL(creds PakailinkCredentials) string {
	if a.baseURL != "" {
		return a.baseURL
	}
	if creds.IsProduction {
		return "https://api.pakaidonk.id"
	}
	return "https://dev-api.pakaidonk.id"
}

func (a *PakailinkAdapter) GenerateQRIS(ctx context.Context, req providers.GenerateQRISRequest) (*providers.QRISResponse, error) {
	var creds PakailinkCredentials
	if err := json.Unmarshal([]byte(req.Credentials), &creds); err != nil {
		return nil, err
	}

	baseURL := a.getBaseURL(creds)
	cacheKey := fmt.Sprintf("pakailink:token:%s", creds.ClientID)
	accessToken, err := snapbi.GetAccessToken(ctx, a.rdb, a.client, creds.ClientID, creds.PrivateKey, baseURL, cacheKey)
	if err != nil {
		return nil, err
	}

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
		"validityPeriod": validityPeriodStr,
		"additionalInfo": map[string]interface{}{
			"callbackUrl": "https://api.caishenengine.com/api/v1/callbacks/PAKAILINK", // Fallback, usually overwritten by PTMS core logic if needed
			"type":        "statis",
		},
	}
	if creds.StoreID != "" {
		bodyMap["storeId"] = creds.StoreID
	}

	bodyBytes, _ := json.Marshal(bodyMap)
	signature := snapbi.GenerateSymmetricSignature("POST", path, accessToken, bodyBytes, timestamp, creds.ClientSecret)

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

	// PakaiLink success code: 2004700
	if resData.ResponseCode != "2004700" {
		return nil, fmt.Errorf("pakailink error: %s - %s", resData.ResponseCode, resData.ResponseMessage)
	}

	expiresAtUTC := validityPeriod.UTC()
	return &providers.QRISResponse{
		VendorTransactionID: resData.ReferenceNo,
		QRISCode:            resData.QrContent,
		RawResponse:         respBytes,
		ExpiresAt:           &expiresAtUTC,
	}, nil
}

func (a *PakailinkAdapter) CheckStatus(ctx context.Context, vendorTxID string, credentials string) (*providers.StatusResponse, error) {
	var creds PakailinkCredentials
	if err := json.Unmarshal([]byte(credentials), &creds); err != nil {
		return nil, err
	}

	baseURL := a.getBaseURL(creds)
	cacheKey := fmt.Sprintf("pakailink:token:%s", creds.ClientID)
	accessToken, err := snapbi.GetAccessToken(ctx, a.rdb, a.client, creds.ClientID, creds.PrivateKey, baseURL, cacheKey)
	if err != nil {
		return nil, err
	}

	wibLocation, _ := time.LoadLocation("Asia/Jakarta")
	now := time.Now().In(wibLocation)
	timestamp := now.Format("2006-01-02T15:04:05-07:00")
	path := "/snap/v1.0/qr/qr-mpm-status"

	bodyMap := map[string]interface{}{
		"originalPartnerReferenceNo": vendorTxID, // PakaiLink uses partnerRef for inquiry too
	}

	bodyBytes, _ := json.Marshal(bodyMap)
	signature := snapbi.GenerateSymmetricSignature("POST", path, accessToken, bodyBytes, timestamp, creds.ClientSecret)

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
		PaidTime                string `json:"paidTime"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&resData); err != nil {
		return nil, err
	}

	status := "failed"
	if resData.LatestTransactionStatus == "00" {
		status = "paid"
	} else if resData.LatestTransactionStatus == "01" || resData.LatestTransactionStatus == "03" {
		status = "pending_payment"
	}

	var paidAt *time.Time
	if resData.PaidTime != "" {
		if t, err := time.Parse(time.RFC3339, resData.PaidTime); err == nil {
			paidAt = &t
		}
	}

	return &providers.StatusResponse{
		VendorTransactionID: vendorTxID,
		Status:              status,
		PaidAt:              paidAt,
	}, nil
}

func (a *PakailinkAdapter) VerifyCallback(payload []byte, signature string, secret string) bool {
	var data map[string]interface{}
	json.Unmarshal(payload, &data)

	timestamp := ""
	if ts, ok := data["timestamp"].(string); ok {
		timestamp = ts
	} else if ts, ok := data["paidTime"].(string); ok {
		timestamp = ts
	}

	return snapbi.VerifyHmacSignature(payload, timestamp, signature, secret)
}

func (a *PakailinkAdapter) NormalizeCallback(payload []byte) (*providers.NormalizedCallback, error) {
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
	} else if rawStatus == "01" || rawStatus == "03" {
		status = "pending_payment"
	}

	paidAt := time.Now()
	if dateStr, ok := data["paidTime"].(string); ok {
		if parsed, err := time.Parse(time.RFC3339, dateStr); err == nil {
			paidAt = parsed
		}
	}

	return &providers.NormalizedCallback{
		VendorTransactionID: fmt.Sprintf("%v", data["originalReferenceNo"]),
		ReferenceID:         fmt.Sprintf("%v", data["originalPartnerReferenceNo"]),
		Status:              status,
		Amount:              amount,
		PaidAt:              paidAt,
		VendorID:            "PAKAILINK",
	}, nil
}

func (a *PakailinkAdapter) Validate(ctx context.Context, credsStr string) error {
	var creds PakailinkCredentials
	if err := json.Unmarshal([]byte(credsStr), &creds); err != nil {
		return err
	}
	baseURL := a.getBaseURL(creds)
	cacheKey := fmt.Sprintf("pakailink:validate:%s", creds.ClientID)
	_, err := snapbi.GetAccessToken(ctx, a.rdb, a.client, creds.ClientID, creds.PrivateKey, baseURL, cacheKey)
	return err
}
