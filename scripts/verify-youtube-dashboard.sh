#!/bin/bash

# YouTube Dashboard Verification Script
# Tests that the dashboard displays YouTube statistics correctly

# Note: Don't use set -e as we want to continue even if some tests fail

echo "=========================================="
echo "YouTube Dashboard Verification"
echo "=========================================="
echo ""

# Configuration
API_URL="http://localhost:3000"
API_KEY="${API_KEY:-your-secure-api-key-here-minimum-32-characters-required}"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test counter
TESTS_PASSED=0
TESTS_FAILED=0

# Helper function to print test results
print_result() {
  if [ $1 -eq 0 ]; then
    echo -e "${GREEN}✓ PASS${NC}: $2"
    ((TESTS_PASSED++))
  else
    echo -e "${RED}✗ FAIL${NC}: $2"
    ((TESTS_FAILED++))
  fi
}

echo "1. Testing API Health"
echo "----------------------------------------"
HEALTH_RESPONSE=$(curl -s "${API_URL}/health")
if echo "$HEALTH_RESPONSE" | grep -q "healthy"; then
  print_result 0 "API is healthy"
else
  print_result 1 "API health check failed"
  echo "Response: $HEALTH_RESPONSE"
fi
echo ""

echo "2. Testing Short URL List Endpoint"
echo "----------------------------------------"
LIST_RESPONSE=$(curl -s -H "X-API-Key: ${API_KEY}" "${API_URL}/api/short-urls")
if echo "$LIST_RESPONSE" | grep -q "Authentication required"; then
  echo -e "${YELLOW}⚠ SKIPPED${NC}: API key not configured (using example key)"
  echo "To test API endpoints, set a valid API_KEY environment variable"
elif echo "$LIST_RESPONSE" | grep -q "shortUrls"; then
  print_result 0 "Short URL list endpoint accessible"
  
  # Check if response includes YouTube statistics structure
  if echo "$LIST_RESPONSE" | grep -q "youtubeStats"; then
    print_result 0 "Response includes youtubeStats field"
  else
    print_result 1 "Response missing youtubeStats field"
  fi
else
  print_result 1 "Short URL list endpoint failed"
  echo "Response: $LIST_RESPONSE"
fi
echo ""

echo "3. Checking for YouTube URLs in Database"
echo "----------------------------------------"
YOUTUBE_COUNT=$(docker compose exec -T db psql -U clicktracking -d clicktracking -c "SELECT COUNT(*) FROM short_urls WHERE \"youtubeVideoId\" IS NOT NULL;" | grep -E '^\s*[0-9]+' | tr -d ' ')

if [ "$YOUTUBE_COUNT" -gt 0 ]; then
  print_result 0 "Found $YOUTUBE_COUNT YouTube URL(s) in database"
  
  # Get a sample YouTube URL
  SAMPLE_URL=$(docker compose exec -T db psql -U clicktracking -d clicktracking -t -c "SELECT id FROM short_urls WHERE \"youtubeVideoId\" IS NOT NULL LIMIT 1;" | tr -d ' ')
  
  if [ -n "$SAMPLE_URL" ]; then
    echo ""
    echo "4. Testing URL Details Endpoint"
    echo "----------------------------------------"
    DETAILS_RESPONSE=$(curl -s -H "X-API-Key: ${API_KEY}" "${API_URL}/api/short-urls/${SAMPLE_URL}")
    
    if echo "$DETAILS_RESPONSE" | grep -q "youtubeStats"; then
      print_result 0 "URL details includes youtubeStats"
      
      # Check for engagement metrics
      if echo "$DETAILS_RESPONSE" | grep -q "engagementRate"; then
        print_result 0 "URL details includes engagementRate"
      else
        print_result 1 "URL details missing engagementRate"
      fi
      
      # Check for daily statistics
      if echo "$DETAILS_RESPONSE" | grep -q "dailyStats"; then
        print_result 0 "URL details includes dailyStats"
      else
        print_result 1 "URL details missing dailyStats"
      fi
      
      # Check for CTR
      if echo "$DETAILS_RESPONSE" | grep -q "clickThroughRate"; then
        print_result 0 "URL details includes clickThroughRate"
      else
        print_result 1 "URL details missing clickThroughRate"
      fi
    else
      print_result 1 "URL details missing youtubeStats"
    fi
  fi
else
  echo -e "${YELLOW}⚠ WARNING${NC}: No YouTube URLs found in database"
  echo "To test YouTube statistics display:"
  echo "1. Create a short URL with a YouTube source URL"
  echo "2. Wait for background fetch to complete (a few seconds)"
  echo "3. Run this script again"
  echo ""
  echo "Example:"
  echo "curl -X POST ${API_URL}/api/short-urls \\"
  echo "  -H 'Content-Type: application/json' \\"
  echo "  -H 'X-API-Key: ${API_KEY}' \\"
  echo "  -d '{\"sourceUrl\": \"https://www.youtube.com/watch?v=dQw4w9WgXcQ\"}'"
fi
echo ""

echo "5. Checking Daily Statistics Table"
echo "----------------------------------------"
DAILY_STATS_COUNT=$(docker compose exec -T db psql -U clicktracking -d clicktracking -c "SELECT COUNT(*) FROM youtube_daily_statistics;" | grep -E '^\s*[0-9]+' | tr -d ' ')

if [ "$DAILY_STATS_COUNT" -gt 0 ]; then
  print_result 0 "Found $DAILY_STATS_COUNT daily statistics record(s)"
else
  echo -e "${YELLOW}⚠ INFO${NC}: No daily statistics records yet (expected for new URLs)"
  echo "Daily statistics accumulate after the first scheduled task run"
fi
echo ""

echo "6. Verifying Database Schema"
echo "----------------------------------------"
# Check short_urls table has YouTube fields
YOUTUBE_FIELDS=$(docker compose exec -T db psql -U clicktracking -d clicktracking -c "\d short_urls" | grep -c "youtube")
if [ "$YOUTUBE_FIELDS" -ge 6 ]; then
  print_result 0 "short_urls table has YouTube fields ($YOUTUBE_FIELDS fields)"
else
  print_result 1 "short_urls table missing YouTube fields (found $YOUTUBE_FIELDS, expected 6+)"
fi

# Check youtube_daily_statistics table exists
if docker compose exec -T db psql -U clicktracking -d clicktracking -c "\d youtube_daily_statistics" > /dev/null 2>&1; then
  print_result 0 "youtube_daily_statistics table exists"
else
  print_result 1 "youtube_daily_statistics table does not exist"
fi

# Check indexes
YOUTUBE_INDEXES=$(docker compose exec -T db psql -U clicktracking -d clicktracking -c "SELECT COUNT(*) FROM pg_indexes WHERE tablename IN ('short_urls', 'youtube_daily_statistics') AND indexname LIKE '%youtube%';" | grep -E '^\s*[0-9]+' | tr -d ' ')
if [ "$YOUTUBE_INDEXES" -ge 5 ]; then
  print_result 0 "YouTube indexes exist ($YOUTUBE_INDEXES indexes)"
else
  print_result 1 "Missing YouTube indexes (found $YOUTUBE_INDEXES, expected 5+)"
fi
echo ""

echo "7. Checking Frontend Accessibility"
echo "----------------------------------------"
FRONTEND_RESPONSE=$(curl -s http://localhost:8080)
if echo "$FRONTEND_RESPONSE" | grep -q "root"; then
  print_result 0 "Frontend is accessible"
else
  print_result 1 "Frontend is not accessible"
fi

# Check if frontend config.js is accessible
CONFIG_RESPONSE=$(curl -s http://localhost:8080/config.js)
if echo "$CONFIG_RESPONSE" | grep -q "API_BASE_URL"; then
  print_result 0 "Frontend config.js is accessible"
else
  print_result 1 "Frontend config.js is not accessible"
fi
echo ""

echo "8. Verifying No API Calls on Dashboard Load"
echo "----------------------------------------"
echo "This test requires manual verification:"
echo "1. Open browser developer tools (Network tab)"
echo "2. Navigate to http://localhost:8080"
echo "3. Log in and view the dashboard"
echo "4. Verify NO requests to googleapis.com or YouTube API"
echo "5. All data should be loaded from ${API_URL}/api/short-urls"
echo ""
echo -e "${YELLOW}⚠ MANUAL TEST REQUIRED${NC}: Verify no YouTube API calls on dashboard load"
echo ""

echo "=========================================="
echo "Test Summary"
echo "=========================================="
echo -e "${GREEN}Passed: ${TESTS_PASSED}${NC}"
echo -e "${RED}Failed: ${TESTS_FAILED}${NC}"
echo ""

if [ $TESTS_FAILED -eq 0 ]; then
  echo -e "${GREEN}✓ All automated tests passed!${NC}"
  exit 0
else
  echo -e "${RED}✗ Some tests failed. Please review the output above.${NC}"
  exit 1
fi
