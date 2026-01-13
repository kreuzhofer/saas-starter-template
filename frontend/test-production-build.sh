#!/bin/bash

# Test script to verify production build includes translation files

echo "🔨 Building frontend for production..."
npm run build

echo ""
echo "✅ Build completed. Checking translation files..."
echo ""

# Check if dist directory exists
if [ ! -d "dist" ]; then
    echo "❌ Error: dist directory not found"
    exit 1
fi

# Check if locales directory exists in dist
if [ ! -d "dist/locales" ]; then
    echo "❌ Error: dist/locales directory not found"
    exit 1
fi

echo "✓ dist/locales directory exists"

# Check for English translations
for file in common.json pages.json errors.json; do
    if [ ! -f "dist/locales/en/$file" ]; then
        echo "❌ Error: dist/locales/en/$file not found"
        exit 1
    fi
    echo "✓ dist/locales/en/$file exists"
done

# Check for German translations
for file in common.json pages.json errors.json; do
    if [ ! -f "dist/locales/de/$file" ]; then
        echo "❌ Error: dist/locales/de/$file not found"
        exit 1
    fi
    echo "✓ dist/locales/de/$file exists"
done

echo ""
echo "📊 Translation file sizes:"
echo ""

# Show file sizes
for lang in en de; do
    echo "Language: $lang"
    for file in common.json pages.json errors.json; do
        size=$(wc -c < "dist/locales/$lang/$file" | tr -d ' ')
        echo "  - $file: $size bytes"
    done
    echo ""
done

echo "✅ All translation files are present in the production build!"
echo ""
echo "📝 To test the production build locally:"
echo "   npm run preview"
echo ""
echo "🐳 To test with Docker:"
echo "   docker compose up -d --build frontend"
echo "   docker compose logs frontend"
