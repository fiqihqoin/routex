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

// Decrypt decrypts a base64 encoded string (nonce + ciphertext + tag) using AES-256-GCM.
// The key is read from PTMS_APP_KEY environment variable.
func Decrypt(ciphertextStr string) (map[string]interface{}, error) {
	if ciphertextStr == "" {
		return make(map[string]interface{}), nil
	}

	keyStr := os.Getenv("PTMS_APP_KEY")
	if strings.HasPrefix(keyStr, "base64:") {
		keyStr = keyStr[7:]
	}
	key, err := base64.StdEncoding.DecodeString(keyStr)
	if err != nil {
		return nil, err
	}

	data, err := base64.StdEncoding.DecodeString(ciphertextStr)
	if err != nil {
		return nil, err
	}

	block, err := aes.NewCipher(key)
	if err != nil {
		return nil, err
	}

	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return nil, err
	}

	nonceSize := gcm.NonceSize()
	if len(data) < nonceSize {
		return nil, errors.New("ciphertext too short")
	}

	nonce, ciphertext := data[:nonceSize], data[nonceSize:]
	plaintext, err := gcm.Open(nil, nonce, ciphertext, nil)
	if err != nil {
		return nil, err
	}

	var result map[string]interface{}
	if err := json.Unmarshal(plaintext, &result); err != nil {
		return nil, err
	}

	return result, nil
}
