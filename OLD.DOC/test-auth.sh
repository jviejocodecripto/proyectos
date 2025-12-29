#!/bin/bash

echo "🧪 Testing Authentication Flow..."
echo ""

# Test 1: Request magic link
echo "Test 1: Requesting magic link for admin@example.com..."
response=$(curl -s -X POST http://localhost:3001/api/auth/request-magic-link \
  -H "Content-Type: application/json" \
  -d "{\"email\": \"admin@example.com\"}")

echo "$response" | python3 -m json.tool
echo ""

# Test 2: Get current user (should fail - not authenticated)
echo "Test 2: Getting current user (should fail)..."
curl -s http://localhost:3001/api/auth/me | python3 -m json.tool
echo ""

# Test 3: Check MailHog API for emails
echo "Test 3: Checking MailHog for emails..."
mailhog=$(curl -s http://localhost:8025/api/v2/messages | python3 -c "import sys, json; data=json.load(sys.stdin); print(f\"Total emails: {data.get('total', 0)}\")")
echo "$mailhog"
echo ""

echo "✅ Tests completed!"
echo ""
echo "Next steps:"
echo "1. Open http://localhost:3001/login in your browser"
echo "2. Enter admin@example.com"
echo "3. Check http://localhost:8025 for the magic link"
echo "4. Click the link to authenticate"
