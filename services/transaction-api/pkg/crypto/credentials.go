package crypto

import (
	"crypto/aes"
	"crypto/cipher"
	"encoding/base64"
	"encoding/json"
	"errors"
	"os"
	"strings"
)

// Decrypt decrypts a base64 encoded string (nonce + ciphertext + tag) using AES-256-GCM
// and unmarshals it into a map.
func Decrypt(ciphertextStr string) (map[string]interface{}, error) {
	plaintext, err := DecryptRaw(ciphertextStr)
	if err != nil {
		return nil, err
	}

	if plaintext == "" {
		return make(map[string]interface{}), nil
	}

	var result map[string]interface{}
	if err := json.Unmarshal([]byte(plaintext), &result); err != nil {
		return nil, err
	}

	return result, nil
}

// DecryptRaw decrypts a base64 encoded string using AES-256-GCM and returns the raw plaintext string.
func DecryptRaw(ciphertextStr string) (string, error) {
	if ciphertextStr == "" {
		return "", nil
	}

	keyStr := os.Getenv("PTMS_APP_KEY")
	if strings.HasPrefix(keyStr, "base64:") {
		keyStr = keyStr[7:]
	}
	key, err := base64.StdEncoding.DecodeString(keyStr)
	if err != nil {
		return "", err
	}

	data, err := base64.StdEncoding.DecodeString(ciphertextStr)
	if err != nil {
		return "", err
	}

	block, err := aes.NewCipher(key)
	if err != nil {
		return "", err
	}

	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return "", err
	}

	nonceSize := gcm.NonceSize()
	if len(data) < nonceSize {
		return "", errors.New("ciphertext too short")
	}

	nonce, ciphertext := data[:nonceSize], data[nonceSize:]
	plaintext, err := gcm.Open(nil, nonce, ciphertext, nil)
	if err != nil {
		return "", err
	}

	return string(plaintext), nil
}
