#!/bin/bash
# PM2 deployment script for MyWorkspace backend
# Usage: ./scripts/deploy-pm2.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
DEPLOY_LOG="/var/log/myworkspace/deploy-$(date +%Y%m%d_%H%M%S).log"

log() { echo "[$(date +%Y-%m-%dT%H:%M:%S%z)] $*" | tee -a "$DEPLOY_LOG"; }
error() { log "ERROR: $*"; }
fail() { error "$*"; exit 1; }

# ── Phase 1: Pre-deployment checks ──
log "=== Phase 1: Pre-deployment checks ==="

command -v pm2 &>/dev/null || fail "PM2 not found"
command -v node &>/dev/null || fail "Node.js not found"

cd "$PROJECT_DIR"

# ── Phase 2: Pull latest code ──
log "=== Phase 2: Pulling latest code ==="
git pull origin main

# ── Phase 3: Install dependencies and build ──
log "=== Phase 3: Building backend ==="
cd backend
rm -rf node_modules dist
NODE_OPTIONS="--max-old-space-size=2048" npm ci
NODE_OPTIONS="--max-old-space-size=2048" npm run build
cd ..

# ── Phase 4: Restart PM2 processes ──
log "=== Phase 4: Restarting PM2 processes ==="
pm2 restart myworkspace-backend || {
  log "Backend not running, starting fresh..."
  pm2 start ecosystem.config.cjs --only myworkspace-backend
}
pm2 save

# ── Phase 5: Health check ──
log "=== Phase 5: Health check ==="
sleep 5
for i in $(seq 1 30); do
  if curl -sf http://localhost:4000/api/health > /dev/null 2>&1; then
    log "Backend healthy after ${i}s"
    break
  fi
  if [ "$i" -eq 30 ]; then fail "Backend failed to start within 30s"; fi
  sleep 1
done

# ── Phase 6: Restart Caddy if needed ──
log "=== Phase 6: Checking Caddy ==="
if systemctl is-active --quiet caddy; then
  log "Caddy is running"
else
  log "Starting Caddy..."
  sudo systemctl start caddy
fi

log "=== DEPLOYMENT COMPLETE ==="
log "Backend: http://localhost:4000"
log "Frontend: http://localhost:3000"
log "Time: $(date)"
log "Log: $DEPLOY_LOG"
