#!/bin/bash
set -euo pipefail

BACKUP_DIR="${1:-/tmp/myworkspace-backups}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_PATH="${BACKUP_DIR}/${TIMESTAMP}"
MONGO_URI="${MONGODB_URI:-mongodb://localhost:27017/myworkspace}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"

mkdir -p "$BACKUP_PATH"
echo "[$(date)] Starting MongoDB backup to $BACKUP_PATH..."
mongodump --uri="$MONGO_URI" --out="$BACKUP_PATH" --gzip
echo "[$(date)] Compressing..."
tar -czf "${BACKUP_PATH}.tar.gz" -C "$BACKUP_DIR" "$TIMESTAMP"
rm -rf "$BACKUP_PATH"
echo "[$(date)] Cleaning backups older than $RETENTION_DAYS days..."
find "$BACKUP_DIR" -name "*.tar.gz" -type f -mtime +$RETENTION_DAYS -delete
echo "[$(date)] Backup complete: ${BACKUP_PATH}.tar.gz"
