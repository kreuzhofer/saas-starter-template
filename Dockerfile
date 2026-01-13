FROM node:20-slim AS builder

WORKDIR /app

# Install OpenSSL for Prisma
RUN apt-get update -y && apt-get install -y openssl

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build TypeScript
RUN npm run build

# Generate Prisma client
RUN npx prisma generate

# Production image
FROM node:20-slim

WORKDIR /app

# Install OpenSSL for Prisma and wget for health checks
RUN apt-get update -y && apt-get install -y openssl wget && rm -rf /var/lib/apt/lists/*

# Copy built files and dependencies
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/src/templates ./src/templates
COPY --from=builder /app/src/locales ./src/locales

# Expose port
EXPOSE 3000

# Create entrypoint script for migrations, seeding, and startup
RUN echo '#!/bin/sh\n\
set -e\n\
\n\
echo "================================="\n\
echo "Starting application initialization"\n\
echo "================================="\n\
echo ""\n\
echo "Environment:"\n\
echo "  DATABASE_URL: ${DATABASE_URL}"\n\
echo "  Working directory: $(pwd)"\n\
echo ""\n\
echo "Checking migration files..."\n\
ls -la prisma/migrations/ || echo "No migrations directory found!"\n\
echo ""\n\
echo "Running database migrations..."\n\
npx prisma migrate deploy || {\n\
  echo ""\n\
  echo "ERROR: Migration failed!"\n\
  echo "Checking migration status..."\n\
  npx prisma migrate status || true\n\
  exit 1\n\
}\n\
\n\
echo ""\n\
echo "Migrations completed successfully!"\n\
echo ""\n\
echo "Seeding database..."\n\
npx prisma db seed || {\n\
  echo ""\n\
  echo "WARNING: Seeding failed or was skipped"\n\
  echo "This is normal if the admin account already exists"\n\
}\n\
echo ""\n\
\n\
echo "Starting application..."\n\
echo "================================="\n\
exec node dist/server.js' > /app/docker-entrypoint.sh && \
    chmod +x /app/docker-entrypoint.sh

# Run migrations and start app
ENTRYPOINT ["/app/docker-entrypoint.sh"]
