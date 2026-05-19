package snapbi

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
	"strings"
	"time"

	"github.com/redis/go-redis/v9"
)

type AccessTokenResponse struct {
	AccessToken string `json:"accessToken"`
	ExpiresIn   string `json:"expiresIn"`
}

func GetAccessToken(ctx context.Context, rdb *redis.Client, client *http.Client, clientID, privateKey, baseURL, cacheKey string) (string, error) {
	// 1. Check Cache
	cachedToken, err := rdb.Get(ctx, cacheKey).Result()
	if err == nil && cachedToken != "" {
		return cachedToken, nil
	}

	// 2. Generate Signature
	wibLocation, _ := time.LoadLocation("Asia/Jakarta")
	timestamp := time.Now().In(wibLocation).Format("2006-01-02T15:04:05-07:00")
	stringToSign := fmt.Sprintf("%s|%s", clientID, timestamp)

	signature, err := GenerateAsymmetricSignature(stringToSign, privateKey)
	if err != nil {
		return "", err
	}

	// 3. Request Token
	reqBody := map[string]string{"grantType": "client_credentials"}
	reqBytes, _ := json.Marshal(reqBody)

	req, _ := http.NewRequestWithContext(ctx, "POST", baseURL+"/snap/v1.0/access-token/b2b", bytes.NewBuffer(reqBytes))
	req.Header.Set("X-CLIENT-KEY", clientID)
	req.Header.Set("X-TIMESTAMP", timestamp)
	req.Header.Set("X-SIGNATURE", signature)
	req.Header.Set("Content-Type", "application/json")

	resp, err := client.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		bodyBytes, _ := io.ReadAll(resp.Body)
		return "", fmt.Errorf("SNAP BI: failed to get access token, status: %d, body: %s", resp.StatusCode, string(bodyBytes))
	}

	var resData AccessTokenResponse
	if err := json.NewDecoder(resp.Body).Decode(&resData); err != nil {
		return "", err
	}

	if resData.AccessToken == "" {
		return "", errors.New("SNAP BI: empty access token returned")
	}

	// 4. Cache Token (Default to 23 hours for a 24-hour token)
	rdb.Set(ctx, cacheKey, resData.AccessToken, 23*time.Hour)

	return resData.AccessToken, nil
}

func GenerateAsymmetricSignature(stringToSign, privateKeyPEM string) (string, error) {
	block, _ := pem.Decode([]byte(privateKeyPEM))
	if block == nil {
		return "", errors.New("SNAP BI: failed to parse PEM block containing the private key")
	}

	privKey, err := x509.ParsePKCS8PrivateKey(block.Bytes)
	if err != nil {
		// Fallback to PKCS1
		privKey, err = x509.ParsePKCS1PrivateKey(block.Bytes)
		if err != nil {
			return "", fmt.Errorf("SNAP BI: failed to parse private key: %v", err)
		}
	}

	rsaPrivKey, ok := privKey.(*rsa.PrivateKey)
	if !ok {
		return "", errors.New("SNAP BI: not an RSA private key")
	}

	hashed := sha256.Sum256([]byte(stringToSign))
	signatureBytes, err := rsa.SignPKCS1v15(rand.Reader, rsaPrivKey, crypto.SHA256, hashed[:])
	if err != nil {
		return "", fmt.Errorf("SNAP BI: failed to sign token request: %v", err)
	}

	return base64.StdEncoding.EncodeToString(signatureBytes), nil
}

func GenerateSymmetricSignature(method, path, token string, body []byte, timestamp, secret string) string {
	payloadHash := sha256.Sum256(body)
	payloadHashHex := strings.ToLower(hex.EncodeToString(payloadHash[:]))
	stringToSign := fmt.Sprintf("%s:%s:%s:%s:%s", method, path, token, payloadHashHex, timestamp)

	h := hmac.New(sha512.New, []byte(secret))
	h.Write([]byte(stringToSign))
	return base64.StdEncoding.EncodeToString(h.Sum(nil))
}

func VerifyHmacSignature(payload []byte, timestamp, signature, secret string) bool {
	payloadHash := sha256.Sum256(payload)
	payloadHashHex := strings.ToLower(hex.EncodeToString(payloadHash[:]))

	stringToSign := fmt.Sprintf("CALLBACK:%s:%s", payloadHashHex, timestamp)
	h := hmac.New(sha512.New, []byte(secret))
	h.Write([]byte(stringToSign))
	expected := base64.StdEncoding.EncodeToString(h.Sum(nil))

	return hmac.Equal([]byte(expected), []byte(signature))
}
