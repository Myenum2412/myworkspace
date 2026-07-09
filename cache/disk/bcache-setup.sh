#!/bin/bash
# Block Cache (bcache) Setup — Layer 7
# Provides SSD caching for HDD backend storage

set -euo pipefail

CACHE_DEV="${BCACHE_CACHE_DEV:-/dev/nvme0n1}"
BACKEND_DEV="${BCACHE_BACKEND_DEV:-/dev/sdb}"
BCACHE_DIR="/var/cache/bcache"

echo "=== Block Cache (bcache) Setup ==="

# Load bcache kernel module
modprobe bcache 2>/dev/null || echo "Warning: bcache module not available, skipping"

# Check if bcache tools exist
if command -v make-bcache &> /dev/null; then
  echo "Formatting cache device ${CACHE_DEV}..."
  make-bcache -C "${CACHE_DEV}" -w 4k
  
  echo "Formatting backend device ${BACKEND_DEV}..."
  make-bcache -B "${BACKEND_DEV}" -w 4k
  
  # Wait for bcache devices to appear
  sleep 2
  
  # Attach cache to backend
  CACHE_UUID=$(bcache-super-show "${CACHE_DEV}" 2>/dev/null | grep -i cset.uuid | awk '{print $2}')
  if [ -n "${CACHE_UUID}" ]; then
    for bcache_dev in /sys/block/bcache*/bcache; do
      echo "${CACHE_UUID}" > "${bcache_dev}/attach" 2>/dev/null || true
    done
    echo "Cache UUID ${CACHE_UUID} attached to backend"
  fi
  
  # Create mount point
  mkdir -p "${BCACHE_DIR}"
  
  echo "bcache configured: ${CACHE_DEV} -> ${BACKEND_DEV}"
  echo "Mount point: ${BCACHE_DIR}"
else
  echo "bcache-tools not installed. To enable bcache caching:"
  echo "  apt-get install bcache-tools"
  echo "  make-bcache -C ${CACHE_DEV}"
  echo "  make-bcache -B ${BACKEND_DEV}"
fi

echo "=== Block Cache Setup Complete ==="