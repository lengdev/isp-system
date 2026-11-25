#!/usr/bin/env bash
set -e

# NSMISP Automated PostgreSQL Backup Script
BACKUP_DIR="${1:-./backups}"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/nsmisp_backup_${TIMESTAMP}.sql.gz"
CLEAN_DB_URL="${DATABASE_URL%%\?*}"

mkdir -p "${BACKUP_DIR}"

echo "Starting NSMISP PostgreSQL backup at $(date)..."
if command -v docker &> /dev/null && docker ps | grep -q nsmisp-postgres; then
  docker exec -t nsmisp-postgres pg_dump -U nsmisp -d nsmisp | gzip > "${BACKUP_FILE}"
else
  pg_dump "${CLEAN_DB_URL:-postgresql://nsmisp:nsmisp@localhost:5432/nsmisp}" | gzip > "${BACKUP_FILE}"
fi

echo "✓ NSMISP Backup successfully generated: ${BACKUP_FILE}"
ls -lh "${BACKUP_FILE}"
