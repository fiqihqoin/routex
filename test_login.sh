#!/bin/bash

echo "Testing login functionality after fixing user_id type issue..."

# Test login endpoint with merchant@test.com
echo "Attempting to login with merchant@test.com..."
curl -X POST https://localhost/portal/login \
  -k \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d '{
    "email": "merchant@test.com",
    "password": "password123"
  }' \
  -w "\nHTTP Status: %{http_code}\n" \
  -o response.json

echo "Response:"
cat response.json
echo ""

# Check if login was successful
if grep -q "Login successful" response.json; then
    echo -e "\n✅ Login successful! The user_id type issue has been fixed."
else
    echo -e "\n❌ Login failed. Check the response above for details."
fi

rm -f response.json