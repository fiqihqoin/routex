#!/bin/bash

# Configuration
BASE_URL="https://localhost"
API_PROD_URL="https://api.localhost"
EMAIL="test@merchant.com"
PASSWORD="password123"
COOKIE_FILE="cookie.txt"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo "Starting API Key Management Tests..."

# Helper function to extract JSON values
extract_json() {
    echo "$1" | sed -n "s/.*\"$2\":\"\([^\"]*\)\".*/\1/p"
}

# 0. Get CSRF Token and Login
echo -n "0. Logging in... "
curl -k -s -c $COOKIE_FILE $BASE_URL/login > /dev/null
XSRF_TOKEN=$(grep "XSRF-TOKEN" $COOKIE_FILE | awk '{print $7}' | sed 's/%3D/=/g')

LOGIN_RES=$(curl -k -s -b $COOKIE_FILE -c $COOKIE_FILE -X POST $BASE_URL/portal/login \
  -H "Accept: application/json" \
  -H "Content-Type: application/json" \
  -H "X-XSRF-TOKEN: $XSRF_TOKEN" \
  -d "{\"email\":\"$EMAIL\", \"password\":\"$PASSWORD\"}")

if [[ $LOGIN_RES == *"Login successful"* ]]; then
    echo -e "${GREEN}PASS${NC}"
else
    echo -e "${RED}FAIL${NC} ($LOGIN_RES)"
    exit 1
fi

XSRF_TOKEN=$(grep "XSRF-TOKEN" $COOKIE_FILE | awk '{print $7}' | sed 's/%3D/=/g')

# TEST 1 - Generate Sandbox Key
echo -n "TEST 1: Generating Sandbox Key... "
GEN_RES=$(curl -k -s -b $COOKIE_FILE -X POST $BASE_URL/portal/api-keys/generate \
  -H "Accept: application/json" \
  -H "Content-Type: application/json" \
  -H "X-XSRF-TOKEN: $XSRF_TOKEN" \
  -d '{"name": "Test Key One", "environment": "sandbox"}')

PLAIN_KEY=$(extract_json "$GEN_RES" "plain_key")
KEY_ID=$(extract_json "$GEN_RES" "id")

if [[ $PLAIN_KEY == ptms_sb_* ]]; then
    echo -e "${GREEN}PASS${NC} (ID: $KEY_ID)"
else
    echo -e "${RED}FAIL${NC} ($GEN_RES)"
    exit 1
fi

# TEST 2 - Use Key to generate QRIS
echo -n "TEST 2: Using Key to generate QRIS... "
TX_RES=$(curl -k -s -X POST $BASE_URL/api/v1/transactions \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $PLAIN_KEY" \
  -H "X-Idempotency-Key: test-key-mgmt-$(date +%s)" \
  -d '{"amount": 10000, "currency": "IDR", "payment_channel": "qris"}')

if [[ $TX_RES == *"qris_code"* ]]; then
    echo -e "${GREEN}PASS${NC}"
else
    echo -e "${RED}FAIL${NC} ($TX_RES)"
fi

sleep 1

# TEST 3 - Verify last_used_at
echo -n "TEST 3: Verifying last_used_at update... "
LIST_RES=$(curl -k -s -b $COOKIE_FILE $BASE_URL/portal/api-keys \
  -H "Accept: application/json")

KEY_DATA=$(echo "$LIST_RES" | grep -o "\"id\":\"$KEY_ID\"[^{}]*\"last_used_at\":\"[^\"]*\"")

if [[ -n "$KEY_DATA" && "$KEY_DATA" != *"null"* ]]; then
    echo -e "${GREEN}PASS${NC}"
else
    echo -e "${RED}FAIL${NC} (Data not found or null)"
fi

# TEST 4 - Cross-environment test (Sandbox key on Production Host)
echo -n "TEST 4: Testing environment mismatch... "
CROSS_RES=$(curl -k -s -X POST $API_PROD_URL/api/v1/transactions \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $PLAIN_KEY" \
  -H "X-Idempotency-Key: test-cross-env-$(date +%s)" \
  -d '{"amount": 10000, "currency": "IDR", "payment_channel": "qris"}')

if [[ $CROSS_RES == *"ENVIRONMENT_MISMATCH"* ]]; then
    echo -e "${GREEN}PASS${NC}"
else
    echo -e "${RED}FAIL${NC} ($CROSS_RES)"
fi

# TEST 5 - Revoke key and verify
echo -n "TEST 5: Revoking key and verifying access... "
REVOKE_RES=$(curl -k -s -b $COOKIE_FILE -X DELETE "$BASE_URL/portal/api-keys/$KEY_ID/revoke" \
  -H "Accept: application/json" \
  -H "X-XSRF-TOKEN: $XSRF_TOKEN" \
  -d '{"reason": "Test revoke"}')

sleep 2 # Propagation

TRY_RES=$(curl -k -s -X POST $BASE_URL/api/v1/transactions \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $PLAIN_KEY" \
  -H "X-Idempotency-Key: test-revoked-$(date +%s)" \
  -d '{"amount": 10000, "currency": "IDR", "payment_channel": "qris"}')

if [[ $TRY_RES == *"INVALID_API_KEY"* ]]; then
    echo -e "${GREEN}PASS${NC}"
else
    echo -e "${RED}FAIL${NC} (Request still passed)"
fi

# TEST 6 - Cannot revoke last active key
echo -n "TEST 6: Attempting to revoke last active key... "
# Clean list fetch
LIST_JSON=$(curl -k -s -b $COOKIE_FILE $BASE_URL/portal/api-keys -H "Accept: application/json")

# Find an active sandbox key ID
# Regex: find "id":"...", then some chars, then "environment":"sandbox", then some chars, then "revoked_at":null
ACTIVE_SB_ID=$(echo "$LIST_JSON" | grep -o "\"id\":\"[^\"]*\"[^{}]*\"environment\":\"sandbox\"[^{}]*\"revoked_at\":null" | head -n 1 | sed -n 's/.*"id":"\([^"]*\)".*/\1/p')

if [[ -z "$ACTIVE_SB_ID" ]]; then
    # Create one if none found
    GEN_RES3=$(curl -k -s -b $COOKIE_FILE -X POST $BASE_URL/portal/api-keys/generate \
      -H "Accept: application/json" \
      -H "Content-Type: application/json" \
      -H "X-XSRF-TOKEN: $XSRF_TOKEN" \
      -d '{"name": "Final Stand Key", "environment": "sandbox"}')
    ACTIVE_SB_ID=$(extract_json "$GEN_RES3" "id")
fi

# Try to revoke
REVOKE_FAIL_RES=$(curl -k -s -b $COOKIE_FILE -X DELETE "$BASE_URL/portal/api-keys/$ACTIVE_SB_ID/revoke" \
  -H "Accept: application/json" \
  -H "X-XSRF-TOKEN: $XSRF_TOKEN")

if [[ $REVOKE_FAIL_RES == *"last active key"* ]]; then
    echo -e "${GREEN}PASS${NC}"
else
    echo -e "${RED}FAIL${NC} ($REVOKE_FAIL_RES)"
fi

echo "All tests completed."
