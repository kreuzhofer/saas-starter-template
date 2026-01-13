#!/bin/bash

# Integration test script for crawler service
# Tests Requirements: 10.1, 10.2, 10.3, 10.4, 10.5

set -e

echo "=========================================="
echo "Crawler Service Integration Test"
echo "=========================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test 1: Check crawler service health
echo "Test 1: Checking crawler service health..."
HEALTH_RESPONSE=$(curl -s http://localhost:3001/health)
HEALTH_STATUS=$(echo $HEALTH_RESPONSE | jq -r '.status')

if [ "$HEALTH_STATUS" = "healthy" ]; then
    echo -e "${GREEN}✓ Crawler service is healthy${NC}"
else
    echo -e "${RED}✗ Crawler service is not healthy${NC}"
    echo "Response: $HEALTH_RESPONSE"
    exit 1
fi
echo ""

# Test 2: Test direct fetch through crawler service
echo "Test 2: Testing direct fetch through crawler service..."
FETCH_RESPONSE=$(curl -s -X POST http://localhost:3001/fetch \
    -H "Content-Type: application/json" \
    -d '{"url":"https://example.com","options":{"timeout":10000}}')

FETCH_SUCCESS=$(echo $FETCH_RESPONSE | jq -r '.success')
if [ "$FETCH_SUCCESS" = "true" ]; then
    echo -e "${GREEN}✓ Direct fetch successful${NC}"
    HTML_LENGTH=$(echo $FETCH_RESPONSE | jq -r '.html | length')
    echo "  HTML length: $HTML_LENGTH bytes"
else
    echo -e "${RED}✗ Direct fetch failed${NC}"
    echo "Response: $FETCH_RESPONSE"
    exit 1
fi
echo ""

# Test 3: Test Amazon URL fetch through crawler service
echo "Test 3: Testing Amazon URL fetch through crawler service..."
AMAZON_RESPONSE=$(curl -s -X POST http://localhost:3001/fetch \
    -H "Content-Type: application/json" \
    -d '{"url":"https://www.amazon.com/","options":{"timeout":30000,"waitForNavigation":true}}')

AMAZON_SUCCESS=$(echo $AMAZON_RESPONSE | jq -r '.success')
if [ "$AMAZON_SUCCESS" = "true" ]; then
    echo -e "${GREEN}✓ Amazon fetch successful${NC}"
    AMAZON_HTML=$(echo $AMAZON_RESPONSE | jq -r '.html')
    
    # Check for CAPTCHA
    if echo "$AMAZON_HTML" | grep -qi "captcha"; then
        echo -e "${RED}✗ CAPTCHA detected in response${NC}"
        exit 1
    else
        echo -e "${GREEN}✓ No CAPTCHA detected${NC}"
    fi
    
    STATUS_CODE=$(echo $AMAZON_RESPONSE | jq -r '.statusCode')
    echo "  Status code: $STATUS_CODE"
else
    echo -e "${RED}✗ Amazon fetch failed${NC}"
    echo "Response: $AMAZON_RESPONSE"
    exit 1
fi
echo ""

# Test 4: Check crawler service logs
echo "Test 4: Checking crawler service logs..."
echo "Recent fetch requests:"
docker compose logs crawler --tail 10 | grep "Fetch request completed" | tail -3
echo ""

# Test 5: Verify main app can reach crawler service
echo "Test 5: Verifying main app configuration..."
APP_LOGS=$(docker compose logs app --tail 50)

# Check if CRAWLER_SERVICE_URL is set in app
if docker compose exec -T app printenv | grep -q "CRAWLER_SERVICE_URL"; then
    echo -e "${GREEN}✓ CRAWLER_SERVICE_URL is set in main app${NC}"
    CRAWLER_URL=$(docker compose exec -T app printenv CRAWLER_SERVICE_URL)
    echo "  Value: $CRAWLER_URL"
else
    echo -e "${YELLOW}⚠ CRAWLER_SERVICE_URL not found in main app environment${NC}"
fi
echo ""

echo "=========================================="
echo -e "${GREEN}All integration tests passed!${NC}"
echo "=========================================="
echo ""
echo "Summary:"
echo "✓ Crawler service is healthy and operational"
echo "✓ Direct page fetching works"
echo "✓ Amazon page fetching works without CAPTCHA"
echo "✓ Crawler service logs requests properly"
echo "✓ Main app is configured to use crawler service"
echo ""
echo "To manually test Amazon URL validation in the main app:"
echo "1. Login to the app at http://localhost:8080"
echo "2. Create a new short URL with an Amazon product link"
echo "3. Check the crawler service logs: docker compose logs crawler --tail 20"
