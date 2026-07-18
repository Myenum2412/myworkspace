#!/bin/bash
# Rollback to previous production deployment
# Usage: ./scripts/rollback.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
ROLLBACK_LOG="/var/log/myworkspace/rollback-$(date +%Y%m%d_%H%M%S).log"
PREVIOUS_TAG_FILE="/tmp/myworkspace-previous-tag"

log() { echo "[$(date +%Y-%m-%dT%H:%M:%S%z)] $*" | tee -a "$ROLLBACK_LOG"; }
error() { log "ERROR: $*"; }

log "=== Starting rollback ==="

cd "$PROJECT_DIR"

# Get previous tag
if [ -f "$PREVIOUS_TAG_FILE" ]; then
  PREVIOUS_TAG=$(cat "$PREVIOUS_TAG_FILE")
  log "Rolling back to tag: $PREVIOUS_TAG"
else
  log "WARNING: No previous tag found — rebuilding from current source"
  PREVIOUS_TAG="latest"
fi

# Rebuild with previous tag
log "Rebuilding images..."
IMAGE_TAG="$PREVIOUS_TAG" docker compose -f docker-compose.yml -f docker-compose.prod.yml build \
  --pull backend frontend 2>&1 | tee -a "$ROLLBACK_LOG"

# Restart services
log "Restarting services..."
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --force-recreate \
  backend frontend 2>&1 | tee -a "$ROLLBACK_LOG"

# Verify rollback
log "Waiting for services to become healthy..."
sleep 10

for i in $(seq 1 30); do
  BACKEND_OK=false
  FRONTEND_OK=false

  if curl -sf http://localhost:4000/api/health > /dev/null 2>&1; then
    BACKEND_OK=true
  fi
  if curl -sf http://localhost:3000 > /dev/null 2>&1; then
    FRONTEND_OK=true
  fi

  if [ "$BACKEND_OK" = true ] && [ "$FRONTEND_OK" = true ]; then
    log "Rollback successful — all services healthy"
    bash scripts/verify-deployment.sh 2>&1 | tee -a "$ROLLBACK_LOG"
    exit 0
  fi
  sleep 2
done

error "Rollback verification failed — manual intervention required"
log "Services may be degraded. Check: docker compose ps"
exit 1
