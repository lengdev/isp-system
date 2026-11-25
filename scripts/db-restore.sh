#!/usr/bin/env bash
set -e

# NSMISP PostgreSQL Restoration Script
BACKUP_FILE="$1"
CLEAN_DB_URL="${DATABASE_URL%%\?*}"

if [ -z "${BACKUP_FILE}" ] || [ ! -f "${BACKUP_FILE}" ]; then
  echo "Usage: ./scripts/db-restore.sh <path_to_backup_file.sql.gz>"
  exit 1
fi

echo "WARNING: Restoring will overwrite existing NSMISP database records."
echo "Restoring from: ${BACKUP_FILE}"

if command -v docker &> /dev/null && docker ps | grep -q nsmisp-postgres; then
  gunzip -c "${BACKUP_FILE}" | docker exec -i nsmisp-postgres psql -U nsmisp -d nsmisp
else
  gunzip -c "${BACKUP_FILE}" | psql "${CLEAN_DB_URL:-postgresql://nsmisp:nsmisp123@localhost:5432/nsmisp}"
fi

echo "✓ NSMISP database successfully restored from ${BACKUP_FILE}"
