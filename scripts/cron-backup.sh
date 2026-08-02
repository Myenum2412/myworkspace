#!/bin/bash
# Production backup cron script
# Install via: crontab -e
# 0 */6 * * * /opt/myworkspace/scripts/cron-backup.sh >> /var/log/myworkspace/backup-cron.log 2>&1

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="${BACKUP_DIR:-/backups/myworkspace}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"
SLACK_WEBHOOK="${SLACK_WEBHOOK_URL:-}"
S3_BACKUP_BUCKET="${S3_BACKUP_BUCKET:-}"

log() { echo "[$(date +%Y-%m-%dT%H:%M:%S%z)] $*"; }
error() { log "ERROR: $*"; }
notify() {
  local msg="$1"
  local level="${2:-INFO}"
  log "[$level] $msg"
  if [ -n "$SLACK_WEBHOOK" ]; then
    curl -s -X POST -H "Content-type: application/json" \
      --data "{\"text\":\"[$level] MyWorkSpace Backup: $msg\"}" \
      "$SLACK_WEBHOOK" > /dev/null 2>&1 || true
  fi
}

mkdir -p "$BACKUP_DIR/{mongodb,uploads,valkey,cache}"

notify "Starting production backup" "INFO"

# ── 1. MongoDB Backup ──
log "Backing up MongoDB..."
MONGODB_URI="${MONGODB_URI:-}"
if [ -z "$MONGODB_URI" ] && [ -f "$PROJECT_DIR/.env" ]; then
  MONGODB_URI=$(grep -E '^MONGODB_URI=' "$PROJECT_DIR/.env" | cut -d= -f2-)
fi
if [ -n "$MONGODB_URI" ]; then
  mongodump \
    --uri="$MONGODB_URI" \
    --gzip \
    --archive="$BACKUP_DIR/mongodb/dump_$TIMESTAMP.gz" \
    --numParallelCollections=4
  notify "MongoDB dump: $(du -h "$BACKUP_DIR/mongodb/dump_$TIMESTAMP.gz" | cut -f1)" "INFO"
else
  error "MONGODB_URI not set — skipping MongoDB backup"
fi

# ── 2. Valkey RDB Backup (Redis-compatible data store) ──
log "Backing up Valkey..."
REDIS_URL="${VALKEY_URL:-${REDIS_URL:-redis://localhost:6379}}"
VALKEY_CLI=""
if command -v valkey-cli &>/dev/null; then
  VALKEY_CLI=valkey-cli
elif command -v redis-cli &>/dev/null; then
  VALKEY_CLI=redis-cli
fi
if [ -n "$VALKEY_CLI" ]; then
  $VALKEY_CLI -u "$REDIS_URL" --rdb "$BACKUP_DIR/valkey/dump_$TIMESTAMP.rdb" 2>/dev/null
  notify "Valkey RDB saved" "INFO"
else
  error "valkey-cli not found — skipping Valkey backup"
fi

# ── 3. Application Config Backup ──
log "Backing up configs..."
tar czf "$BACKUP_DIR/config_$TIMESTAMP.tar.gz" \
  -C "$PROJECT_DIR" \
  docker-compose.yml \
  docker-compose.prod.yml \
  Caddyfile \
  backend/.env.example \
  k8s/ 2>/dev/null || true

# ── 4. Cleanup old backups ──
log "Cleaning backups older than $RETENTION_DAYS days..."
find "$BACKUP_DIR/mongodb" -name "dump_*.gz" -mtime "+$RETENTION_DAYS" -delete
find "$BACKUP_DIR/valkey" -name "dump_*.rdb" -mtime "+$RETENTION_DAYS" -delete
find "$BACKUP_DIR" -name "config_*.tar.gz" -mtime "+$RETENTION_DAYS" -delete

# ── 5. Optional: Sync to S3-compatible storage ──
if [ -n "$S3_BACKUP_BUCKET" ]; then
  log "Syncing to S3 bucket: $S3_BACKUP_BUCKET"
  if command -v aws &>/dev/null; then
    aws s3 sync "$BACKUP_DIR" "$S3_BACKUP_BUCKET/$(date +%Y/%m/%d)" --storage-class STANDARD_IA
    notify "Backups synced to S3" "INFO"
  elif command -v rclone &>/dev/null; then
    rclone sync "$BACKUP_DIR" "$S3_BACKUP_BUCKET/$(date +%Y/%m/%d)"
    notify "Backups synced via rclone" "INFO"
  else
    error "Neither aws nor rclone found — skipping S3 sync"
  fi
fi

notify "Production backup complete" "INFO"
