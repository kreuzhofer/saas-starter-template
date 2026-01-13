# Frontend Production Build - Localization

This document describes how translation files are handled in the production build of the frontend application.

## Overview

The frontend uses Vite as the build tool, which automatically copies files from the `public` directory to the `dist` folder during the build process. Translation files are stored in `public/locales/` and are served as static assets in production.

## Directory Structure

### Development
```
frontend/
├── public/
│   └── locales/
│       ├── en/
│       │   ├── common.json
│       │   ├── pages.json
│       │   └── errors.json
│       └── de/
│           ├── common.json
│           ├── pages.json
│           └── errors.json
└── src/
    └── i18n/
        └── config.ts  # Loads from /locales/{{lng}}/{{ns}}.json
```

### Production (dist)
```
dist/
├── locales/
│   ├── en/
│   │   ├── common.json
│   │   ├── pages.json
│   │   └── errors.json
│   └── de/
│       ├── common.json
│       ├── pages.json
│       └── errors.json
├── assets/
│   ├── index-[hash].js
│   └── index-[hash].css
└── index.html
```

## Build Process

### 1. Local Build

```bash
cd frontend
npm run build
```

This command:
1. Runs TypeScript compiler (`tsc -b`)
2. Runs Vite build
3. Automatically copies `public/locales/` to `dist/locales/`
4. Generates optimized JavaScript and CSS bundles

### 2. Verify Build

Run the test script to verify translation files are included:

```bash
cd frontend
./test-production-build.sh
```

This script checks:
- ✓ `dist/locales` directory exists
- ✓ All English translation files are present
- ✓ All German translation files are present
- ✓ File sizes are reasonable

### 3. Preview Locally

Test the production build locally:

```bash
cd frontend
npm run preview
```

Then verify translation files are served:
```bash
curl http://localhost:4173/locales/en/common.json
curl http://localhost:4173/locales/de/pages.json
```

## Docker Production Build

### Dockerfile

The frontend Dockerfile uses a multi-stage build:

```dockerfile
# Build stage
FROM node:20-slim AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Production stage
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
```

The `COPY --from=builder /app/dist` command copies the entire `dist` folder, including the `locales` directory.

### Nginx Configuration

The `nginx.conf` includes a specific location block for translation files:

```nginx
# Serve translation files with proper caching
location ~* ^/locales/.+\.json$ {
    add_header Content-Type application/json;
    add_header Cache-Control "public, max-age=3600";
    expires 1h;
}
```

This configuration:
- Sets correct `Content-Type: application/json` header
- Enables caching for 1 hour (3600 seconds)
- Applies to all JSON files in the `/locales/` path

### Build and Test Docker Container

```bash
# Build and start the frontend container
docker compose up -d --build frontend

# Check container logs
docker compose logs frontend

# Verify translation files are served
curl http://localhost:8080/locales/en/common.json
curl http://localhost:8080/locales/de/pages.json

# Check headers
curl -I http://localhost:8080/locales/en/common.json
```

Expected headers:
```
HTTP/1.1 200 OK
Content-Type: application/json
Cache-Control: public, max-age=3600
```

### Verify Files Inside Container

```bash
# List locales directory
docker compose exec frontend ls -la /usr/share/nginx/html/locales/

# List English translations
docker compose exec frontend ls -la /usr/share/nginx/html/locales/en/

# List German translations
docker compose exec frontend ls -la /usr/share/nginx/html/locales/de/
```

## i18n Configuration

The i18n configuration in `src/i18n/config.ts` uses the HTTP backend to load translations:

```typescript
backend: {
  loadPath: '/locales/{{lng}}/{{ns}}.json',
}
```

This path works in both development and production:
- **Development**: Vite dev server serves files from `public/`
- **Production**: Nginx serves files from `/usr/share/nginx/html/`

## Adding New Languages

To add a new language:

1. Create translation files:
   ```bash
   mkdir -p frontend/public/locales/fr
   cp frontend/public/locales/en/*.json frontend/public/locales/fr/
   # Translate the content in fr/*.json files
   ```

2. Update i18n configuration:
   ```typescript
   // frontend/src/i18n/config.ts
   export const supportedLanguages = ['en', 'de', 'fr'] as const;
   
   export const languageNames: Record<SupportedLanguage, string> = {
     en: 'English',
     de: 'Deutsch',
     fr: 'Français',
   };
   ```

3. Rebuild:
   ```bash
   npm run build
   docker compose up -d --build frontend
   ```

## Troubleshooting

### Translation files not found (404)

**Symptoms**: Browser console shows 404 errors for `/locales/en/common.json`

**Solutions**:
1. Verify files exist in `public/locales/`
2. Rebuild: `npm run build`
3. Check `dist/locales/` contains the files
4. For Docker: Rebuild container with `docker compose up -d --build frontend`

### Wrong Content-Type header

**Symptoms**: Translation files served as `text/plain` instead of `application/json`

**Solutions**:
1. Check nginx configuration includes the locales location block
2. Rebuild Docker container: `docker compose up -d --build frontend`
3. Verify with: `curl -I http://localhost:8080/locales/en/common.json`

### Translations not updating

**Symptoms**: Changes to translation files not reflected in production

**Solutions**:
1. Clear browser cache (translations are cached for 1 hour)
2. Rebuild the application: `npm run build`
3. For Docker: `docker compose up -d --build frontend`
4. Hard refresh in browser (Cmd+Shift+R or Ctrl+Shift+R)

### TypeScript errors during build

**Symptoms**: Build fails with TypeScript errors

**Solutions**:
1. Check for unused imports in test files
2. Ensure all types are properly defined
3. Run `npm run build` to see specific errors
4. Fix errors and rebuild

## Performance Considerations

### Caching Strategy

Translation files are cached for 1 hour:
- **Pros**: Reduces server load, faster page loads for returning users
- **Cons**: Changes take up to 1 hour to propagate

To change cache duration, update `nginx.conf`:
```nginx
Cache-Control: "public, max-age=7200"  # 2 hours
```

### Lazy Loading

The i18n configuration uses lazy loading:
- Only the active language is loaded initially
- Other languages are loaded on-demand when user switches
- Reduces initial bundle size

### Bundle Size

Translation files are NOT bundled with JavaScript:
- Served as separate JSON files
- Can be cached independently
- Reduces main bundle size

Current sizes:
- English: ~29 KB total (common + pages + errors)
- German: ~31 KB total (common + pages + errors)

## Monitoring

### Check Translation File Requests

In production, monitor nginx access logs:
```bash
docker compose logs frontend | grep locales
```

### Verify Cache Headers

```bash
curl -I http://localhost:8080/locales/en/common.json | grep -i cache
```

Expected output:
```
Cache-Control: public, max-age=3600
```

## References

- [Vite Static Asset Handling](https://vitejs.dev/guide/assets.html#the-public-directory)
- [i18next HTTP Backend](https://github.com/i18next/i18next-http-backend)
- [Nginx Location Directive](https://nginx.org/en/docs/http/ngx_http_core_module.html#location)
