#!/bin/bash
# Manual log rotation script
# Run via: make rotate-logs
# Or via cron: 0 0 * * * /opt/myworkspace/scripts/rotate-logs.sh

set -euo pipefail

LOG_DIRS=(
  "/var/log/myworkspace"
  "/var/log/caddy"
  "/var/log/nginx"
)

RETENTION_DAYS=${RETENTION_DAYS:-30}

for dir in "${LOG_DIRS[@]}"; do
  if [ -d "$dir" ]; then
    echo "Rotating logs in $dir..."
    find "$dir" -name "*.log.*" -mtime "+$RETENTION_DAYS" -delete 2>/dev/null || true
    find "$dir" -name "*.log" -exec sh -c 'gzip -f "$1" && mv "$1.gz" "$1.$(date +%Y%m%d).gz"' _ {} \; 2>/dev/null || true
  fi
done

# Docker log cleanup
if command -v docker &>/dev/null; then
  echo "Cleaning Docker logs..."
  docker container ls -q | xargs -I{} sh -c 'truncate -s 0 /var/lib/docker/containers/{}/{}-json.log 2>/dev/null' || true
fi

echo "Log rotation complete."
