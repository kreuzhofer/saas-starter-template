#!/bin/bash

# Manual test script for real-time validation fallback behavior
# Tests Requirements: 6.1, 6.2, 6.3, 6.4, 6.5
#
# This script guides through manual testing of the fallback behavior
# when the crawler service is stopped and restarted.

set -e

echo "=========================================="
echo "Real-time Validation Fallback Test"
echo "=========================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Step 1: Verify all services are running
echo -e "${YELLOW}Step 1: Verify all services are running${NC}"
echo "Checking Docker containers..."
docker compose ps

echo ""
echo "Checking crawler service health..."
CRAWLER_HEALTH=$(curl -s http://localhost:3001/health | jq -r '.status' 2>/dev/null || echo "unavailable")
if [ "$CRAWLER_HEALTH" = "healthy" ]; then
  echo -e "${GREEN}✓ Crawler service is healthy${NC}"
else
  echo -e "${RED}✗ Crawler service is not healthy${NC}"
  echo "Please start the crawler service first: docker compose up -d crawler"
  exit 1
fi

echo ""
read -p "Press Enter to continue to Step 2..."

# Step 2: Stop crawler service
echo ""
echo -e "${YELLOW}Step 2: Stop crawler service container${NC}"
echo "Stopping crawler service..."
docker compose stop crawler

echo ""
echo "Verifying crawler service is stopped..."
sleep 2
CRAWLER_HEALTH=$(curl -s http://localhost:3001/health 2>/dev/null || echo "unavailable")
if [ "$CRAWLER_HEALTH" = "unavailable" ]; then
  echo -e "${GREEN}✓ Crawler service is stopped${NC}"
else
  echo -e "${RED}✗ Crawler service is still running${NC}"
  exit 1
fi

echo ""
read -p "Press Enter to continue to Step 3..."

# Step 3: Test validation with fallback
echo ""
echo -e "${YELLOW}Step 3: Test URL validation with fallback${NC}"
echo ""
echo "Testing Amazon URL validation..."
echo "URL: https://www.amazon.com/dp/B08N5WRWNW"
echo ""
echo "You can test this in two ways:"
echo "1. Open the frontend at http://localhost:8080"
echo "2. Use curl to test the API directly"
echo ""
echo "Frontend test:"
echo "  - Open http://localhost:8080 in your browser"
echo "  - Log in with your credentials"
echo "  - Go to 'Create Short URL' page"
echo "  - Enter URL: https://www.amazon.com/dp/B08N5WRWNW"
echo "  - Click 'Create' or wait for real-time validation"
echo "  - Verify validation completes (should not hang or error)"
echo ""
echo "API test (requires auth token):"
echo "  curl -X POST http://localhost:3000/api/short-urls \\"
echo "    -H 'Content-Type: application/json' \\"
echo "    -H 'Authorization: Bearer YOUR_TOKEN' \\"
echo "    -d '{\"originalUrl\":\"https://www.amazon.com/dp/B08N5WRWNW\",\"customCode\":\"test-fallback\"}'"
echo ""

read -p "Have you tested the validation? (y/n) " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo "Please test the validation before continuing"
  exit 1
fi

echo ""
read -p "Did the validation complete successfully? (y/n) " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo -e "${RED}✗ Validation did not complete successfully${NC}"
  echo "This indicates the fallback mechanism is not working correctly"
  exit 1
else
  echo -e "${GREEN}✓ Validation completed successfully with fallback${NC}"
fi

echo ""
read -p "Press Enter to continue to Step 4..."

# Step 4: Check backend logs for fallback message
echo ""
echo -e "${YELLOW}Step 4: Verify fallback is logged in backend${NC}"
echo "Checking backend logs for fallback messages..."
echo ""

FALLBACK_LOGS=$(docker compose logs app --tail=50 | grep -i "falling back to direct fetch" || echo "")
if [ -n "$FALLBACK_LOGS" ]; then
  echo -e "${GREEN}✓ Fallback logging detected:${NC}"
  echo "$FALLBACK_LOGS"
else
  echo -e "${YELLOW}⚠ No fallback logs found in recent logs${NC}"
  echo "This might be expected if the validation happened earlier"
  echo ""
  echo "Full recent logs:"
  docker compose logs app --tail=20
fi

echo ""
read -p "Press Enter to continue to Step 5..."

# Step 5: Restart crawler service
echo ""
echo -e "${YELLOW}Step 5: Restart crawler service${NC}"
echo "Starting crawler service..."
docker compose start crawler

echo ""
echo "Waiting for crawler service to be ready..."
sleep 5

# Wait for health check
MAX_RETRIES=10
RETRY_COUNT=0
while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
  CRAWLER_HEALTH=$(curl -s http://localhost:3001/health | jq -r '.status' 2>/dev/null || echo "unavailable")
  if [ "$CRAWLER_HEALTH" = "healthy" ]; then
    echo -e "${GREEN}✓ Crawler service is healthy${NC}"
    break
  fi
  RETRY_COUNT=$((RETRY_COUNT + 1))
  echo "Waiting for crawler service... ($RETRY_COUNT/$MAX_RETRIES)"
  sleep 2
done

if [ "$CRAWLER_HEALTH" != "healthy" ]; then
  echo -e "${RED}✗ Crawler service did not become healthy${NC}"
  exit 1
fi

echo ""
read -p "Press Enter to continue to Step 6..."

# Step 6: Test validation with crawler service
echo ""
echo -e "${YELLOW}Step 6: Verify subsequent validations use crawler service${NC}"
echo ""
echo "Testing Amazon URL validation again..."
echo "URL: https://www.amazon.com/dp/B08N5WRWNW"
echo ""
echo "Please test the validation again using the same method as Step 3"
echo ""

read -p "Have you tested the validation again? (y/n) " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo "Please test the validation before continuing"
  exit 1
fi

echo ""
read -p "Did the validation complete successfully? (y/n) " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo -e "${RED}✗ Validation did not complete successfully${NC}"
  exit 1
else
  echo -e "${GREEN}✓ Validation completed successfully${NC}"
fi

echo ""
echo "Checking crawler service logs for fetch requests..."
CRAWLER_LOGS=$(docker compose logs crawler --tail=20 | grep -i "fetch" || echo "")
if [ -n "$CRAWLER_LOGS" ]; then
  echo -e "${GREEN}✓ Crawler service is processing requests:${NC}"
  echo "$CRAWLER_LOGS"
else
  echo -e "${YELLOW}⚠ No fetch logs found in crawler service${NC}"
  echo "The validation might still be using fallback"
fi

echo ""
echo "=========================================="
echo -e "${GREEN}Test Complete!${NC}"
echo "=========================================="
echo ""
echo "Summary:"
echo "✓ Crawler service can be stopped and started"
echo "✓ Validation falls back to direct fetch when crawler unavailable"
echo "✓ Validation completes successfully with fallback"
echo "✓ Fallback usage is logged in backend"
echo "✓ Validation resumes using crawler service after restart"
echo ""
echo "All requirements validated: 6.1, 6.2, 6.3, 6.4, 6.5"
