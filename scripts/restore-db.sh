#!/bin/bash
# Restore database from backup
# Usage: ./scripts/restore-db.sh [backup-file]
# If no file specified, restores the latest backup

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
BACKUP_DIR="${BACKUP_DIR:-/backups/myworkspace/mongodb}"
MONGODB_URI="${MONGODB_URI:-}"

if [ -z "$MONGODB_URI" ] && [ -f "$PROJECT_DIR/backend/.env" ]; then
  MONGODB_URI=$(grep -E '^MONGODB_URI=' "$PROJECT_DIR/backend/.env" | cut -d= -f2-)
fi

if [ -z "$MONGODB_URI" ]; then
  echo "ERROR: MONGODB_URI not set"
  echo "Usage: MONGODB_URI=mongodb://... $0 [backup-file]"
  exit 1
fi

BACKUP_FILE="${1:-$(ls -t "$BACKUP_DIR"/dump_*.gz 2>/dev/null | head -1)}"

if [ -z "$BACKUP_FILE" ] || [ ! -f "$BACKUP_FILE" ]; then
  echo "ERROR: No backup file found at $BACKUP_DIR"
  echo "Usage: $0 [path-to-backup.gz]"
  ls -t "$BACKUP_DIR"/dump_*.gz 2>/dev/null || echo "No backups found"
  exit 1
fi

echo "WARNING: This will REPLACE all data in the target database."
echo "  Source: $BACKUP_FILE"
echo "  Target: $MONGODB_URI"
echo ""
read -rp "Continue? (type 'yes' to proceed): " CONFIRM
if [ "$CONFIRM" != "yes" ]; then
  echo "Aborted."
  exit 1
fi

echo "Restoring MongoDB from $BACKUP_FILE..."
mongorestore \
  --uri="$MONGODB_URI" \
  --gzip \
  --archive="$BACKUP_FILE" \
  --drop \
  --numParallelCollections=4 2>&1

echo ""
echo "Restore complete. Starting application to verify..."
echo "Run: docker compose -f docker-compose.yml -f docker-compose.prod.yml restart backend"
echo "Run: make health"
