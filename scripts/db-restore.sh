#!/usr/bin/env bash
set -e

# NetPulse PostgreSQL Restoration Script
BACKUP_FILE="$1"

if [ -z "${BACKUP_FILE}" ] || [ ! -f "${BACKUP_FILE}" ]; then
  echo "Usage: ./scripts/db-restore.sh <path_to_backup_file.sql.gz>"
  exit 1
fi

echo "WARNING: Restoring will overwrite existing NetPulse database records."
echo "Restoring from: ${BACKUP_FILE}"

if command -v docker &> /dev/null && docker ps | grep -q netpulse-postgres; then
  gunzip -c "${BACKUP_FILE}" | docker exec -i netpulse-postgres psql -U netpulse -d netpulse
else
  gunzip -c "${BACKUP_FILE}" | psql "${DATABASE_URL:-postgresql://netpulse:netpulse@localhost:5432/netpulse}"
fi

echo "✓ NetPulse database successfully restored from ${BACKUP_FILE}"
