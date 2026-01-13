#!/bin/bash

# Database Backup Script
# Creates a timestamped backup of the PostgreSQL database

set -e

# Configuration
BACKUP_DIR="./backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/clicktracking_backup_${TIMESTAMP}.sql"

# Create backup directory if it doesn't exist
mkdir -p "${BACKUP_DIR}"

echo "Creating database backup..."
echo "Backup file: ${BACKUP_FILE}"

# Create backup using docker compose
docker compose exec -T db pg_dump -U clicktracking -d clicktracking > "${BACKUP_FILE}"

# Compress the backup
gzip "${BACKUP_FILE}"

echo "Backup completed successfully: ${BACKUP_FILE}.gz"
echo "Backup size: $(du -h "${BACKUP_FILE}.gz" | cut -f1)"

# Optional: Keep only last 7 days of backups
find "${BACKUP_DIR}" -name "clicktracking_backup_*.sql.gz" -mtime +7 -delete

echo "Old backups cleaned up (kept last 7 days)"
