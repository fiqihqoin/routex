#!/bin/bash

echo "Testing portal dashboard after fixing portal-layout component..."

# First login to get session
echo "1. Logging in..."
LOGIN_RESPONSE=$(curl -X POST https://localhost/portal/login \
  -k -s \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d '{
    "email": "merchant@test.com",
    "password": "password123"
  }' \
  -c portal_cookie.txt \
  -w "\nHTTP_STATUS:%{http_code}")

HTTP_STATUS=$(echo "$LOGIN_RESPONSE" | grep "HTTP_STATUS" | cut -d: -f2)
echo "Login HTTP Status: $HTTP_STATUS"

if [ "$HTTP_STATUS" = "200" ]; then
    echo "✅ Login successful"

    # Now access the dashboard
    echo -e "\n2. Accessing dashboard..."
    DASHBOARD_RESPONSE=$(curl -X GET https://localhost/portal \
      -k -s \
      -b portal_cookie.txt \
      -H "Accept: text/html" \
      -w "\nHTTP_STATUS:%{http_code}")

    DASH_STATUS=$(echo "$DASHBOARD_RESPONSE" | grep "HTTP_STATUS" | cut -d: -f2)
    echo "Dashboard HTTP Status: $DASH_STATUS"

    # Check for the component error
    if echo "$DASHBOARD_RESPONSE" | grep -q "Unable to locate a class or view for component"; then
        echo "❌ Component error still exists!"
        echo "Error details:"
        echo "$DASHBOARD_RESPONSE" | grep -A5 -B5 "Unable to locate"
    else
        echo "✅ Dashboard loaded successfully without component errors!"

        # Check if the page contains expected content
        if echo "$DASHBOARD_RESPONSE" | grep -q "PTMS Portal"; then
            echo "✅ Portal layout is rendering correctly"
        fi

        if echo "$DASHBOARD_RESPONSE" | grep -q "API Credentials"; then
            echo "✅ Dashboard content is loading"
        fi
    fi
else
    echo "❌ Login failed"
    echo "$LOGIN_RESPONSE"
fi

rm -f portal_cookie.txt