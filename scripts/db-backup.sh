#!/usr/bin/env bash
set -e

# NetPulse Automated PostgreSQL Backup Script
BACKUP_DIR="${1:-./backups}"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/netpulse_backup_${TIMESTAMP}.sql.gz"

mkdir -p "${BACKUP_DIR}"

echo "Starting NetPulse PostgreSQL backup at $(date)..."
if command -v docker &> /dev/null && docker ps | grep -q netpulse-postgres; then
  docker exec -t netpulse-postgres pg_dump -U netpulse -d netpulse | gzip > "${BACKUP_FILE}"
else
  pg_dump "${DATABASE_URL:-postgresql://netpulse:netpulse@localhost:5432/netpulse}" | gzip > "${BACKUP_FILE}"
fi

echo "✓ NetPulse Backup successfully generated: ${BACKUP_FILE}"
ls -lh "${BACKUP_FILE}"
