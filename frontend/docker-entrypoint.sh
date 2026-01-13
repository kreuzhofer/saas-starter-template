#!/bin/sh
set -e

# Generate runtime configuration file
cat > /usr/share/nginx/html/config.js <<EOF
window.ENV = {
  API_BASE_URL: '${API_BASE_URL:-http://localhost:3000}',
  SHORT_URL_DOMAIN: '${SHORT_URL_DOMAIN:-}',
  API_KEY: '${API_KEY:-}'
};
EOF

echo "Generated runtime config with API_BASE_URL: ${API_BASE_URL:-http://localhost:3000}"
echo "Generated runtime config with SHORT_URL_DOMAIN: ${SHORT_URL_DOMAIN:-}"
