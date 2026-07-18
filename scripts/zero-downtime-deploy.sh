#!/bin/bash
# Zero-downtime production deployment script (Docker Compose)
# Usage: ./scripts/zero-downtime-deploy.sh [image-tag]
# If no tag specified, defaults to "latest"

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
IMAGE_TAG="${1:-latest}"
DEPLOY_LOG="/var/log/myworkspace/deploy-$(date +%Y%m%d_%H%M%S).log"
PREVIOUS_TAG_FILE="/tmp/myworkspace-previous-tag"

log() { echo "[$(date +%Y-%m-%dT%H:%M:%S%z)] $*" | tee -a "$DEPLOY_LOG"; }
error() { log "ERROR: $*"; }
fail() { error "$*"; exit 1; }

# ── Phase 1: Pre-deployment checks ──
log "=== Phase 1: Pre-deployment checks ==="

command -v docker &>/dev/null || fail "Docker not found"

cd "$PROJECT_DIR"

# Validate environment
bash scripts/validate-env.sh 2>&1 | tee -a "$DEPLOY_LOG" || fail "Environment validation failed"

# Check health before deploy
log "Checking current deployment health..."
if curl -sf http://localhost:4000/api/health > /dev/null 2>&1; then
  log "Current deployment is healthy"
else
  log "WARNING: Current deployment is not responding — proceeding anyway"
fi

# Save current image tags for rollback
log "Saving current image tags for rollback..."
echo "$IMAGE_TAG" > "$PREVIOUS_TAG_FILE"

# ── Phase 2: Build ──
log "=== Phase 2: Building images ==="

export IMAGE_TAG
docker compose -f docker-compose.yml -f docker-compose.prod.yml build \
  --pull backend frontend 2>&1 | tee -a "$DEPLOY_LOG"

# ── Phase 3: Deploy with zero-downtime ──
log "=== Phase 3: Rolling update ==="

# Deploy backend first (frontend depends on API)
log "Deploying backend (rolling update)..."
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d \
  --no-deps --scale backend=1 backend 2>&1 | tee -a "$DEPLOY_LOG"

# Wait for new backend to pass health check
log "Waiting for backend health check..."
for i in $(seq 1 30); do
  if curl -sf http://localhost:4000/api/health > /dev/null 2>&1; then
    log "Backend healthy after ${i}s"
    break
  fi
  if [ "$i" -eq 30 ]; then fail "Backend failed to start within 30s"; fi
  sleep 1
done

# Scale up backend to full replicas
log "Scaling backend to full replicas..."
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d \
  --no-deps --scale backend=2 backend 2>&1 | tee -a "$DEPLOY_LOG"

sleep 5

# Deploy frontend
log "Deploying frontend (rolling update)..."
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d \
  --no-deps --scale frontend=1 frontend 2>&1 | tee -a "$DEPLOY_LOG"

# Wait for frontend health check
log "Waiting for frontend health check..."
for i in $(seq 1 30); do
  if curl -sf http://localhost:3000 > /dev/null 2>&1; then
    log "Frontend healthy after ${i}s"
    break
  fi
  if [ "$i" -eq 30 ]; then fail "Frontend failed to start within 30s"; fi
  sleep 1
done

docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d \
  --no-deps --scale frontend=2 frontend 2>&1 | tee -a "$DEPLOY_LOG"

# ── Phase 4: Post-deployment verification ──
log "=== Phase 4: Post-deployment verification ==="
bash scripts/verify-deployment.sh 2>&1 | tee -a "$DEPLOY_LOG" || {
  log "Deployment verification FAILED — initiating rollback..."
  bash scripts/rollback.sh 2>&1 | tee -a "$DEPLOY_LOG"
  fail "Rollback complete"
}

# ── Phase 5: Cleanup ──
log "=== Phase 5: Cleanup ==="
docker image prune -f 2>&1 | tee -a "$DEPLOY_LOG"

log "=== DEPLOYMENT COMPLETE ==="
log "Tag: $IMAGE_TAG"
log "Time: $(date)"
log "Log: $DEPLOY_LOG"
