#!/bin/bash

# Test script to verify Docker containers include translation files

echo "Testing Docker localization setup..."
echo ""

# Test backend locales in src/locales
echo "1. Checking backend src/locales directory..."
docker compose exec app ls -la src/locales/ || exit 1
echo "✓ Backend src/locales directory exists"
echo ""

# Test backend locales in dist/locales
echo "2. Checking backend dist/locales directory..."
docker compose exec app ls -la dist/locales/ || exit 1
echo "✓ Backend dist/locales directory exists"
echo ""

# Test backend English translations
echo "3. Checking backend English translation files..."
docker compose exec app ls src/locales/en/emails.json src/locales/en/errors.json src/locales/en/validation.json || exit 1
echo "✓ Backend English translation files exist"
echo ""

# Test backend German translations
echo "4. Checking backend German translation files..."
docker compose exec app ls src/locales/de/emails.json src/locales/de/errors.json src/locales/de/validation.json || exit 1
echo "✓ Backend German translation files exist"
echo ""

# Test frontend locales
echo "5. Checking frontend locales directory..."
docker compose exec frontend ls -la /usr/share/nginx/html/locales/ || exit 1
echo "✓ Frontend locales directory exists"
echo ""

# Test frontend English translations
echo "6. Checking frontend English translation files..."
docker compose exec frontend ls /usr/share/nginx/html/locales/en/common.json /usr/share/nginx/html/locales/en/pages.json /usr/share/nginx/html/locales/en/errors.json || exit 1
echo "✓ Frontend English translation files exist"
echo ""

# Test frontend German translations
echo "7. Checking frontend German translation files..."
docker compose exec frontend ls /usr/share/nginx/html/locales/de/common.json /usr/share/nginx/html/locales/de/pages.json /usr/share/nginx/html/locales/de/errors.json || exit 1
echo "✓ Frontend German translation files exist"
echo ""

# Test backend API with English
echo "8. Testing backend API with English..."
RESPONSE=$(curl -s -H "Accept-Language: en" http://localhost:3000/api/auth/login -X POST -H "Content-Type: application/json" -d '{"email":"test@example.com","password":"short"}')
if echo "$RESPONSE" | grep -q "Validation failed"; then
    echo "✓ Backend returns English error messages"
else
    echo "✗ Backend English translation test failed"
    echo "Response: $RESPONSE"
    exit 1
fi
echo ""

# Test backend API with German
echo "9. Testing backend API with German..."
RESPONSE=$(curl -s -H "Accept-Language: de" http://localhost:3000/api/auth/login -X POST -H "Content-Type: application/json" -d '{"email":"test@example.com","password":"short"}')
if echo "$RESPONSE" | grep -q "Validierung fehlgeschlagen"; then
    echo "✓ Backend returns German error messages"
else
    echo "✗ Backend German translation test failed"
    echo "Response: $RESPONSE"
    exit 1
fi
echo ""

# Test frontend translation files are accessible
echo "10. Testing frontend translation files are accessible..."
curl -s http://localhost:8080/locales/en/common.json | grep -q "TrackMySales" || exit 1
echo "✓ Frontend English translations are accessible"
echo ""

curl -s http://localhost:8080/locales/de/common.json | grep -q "TrackMySales" || exit 1
echo "✓ Frontend German translations are accessible"
echo ""

echo "=========================================="
echo "All Docker localization tests passed! ✓"
echo "=========================================="
