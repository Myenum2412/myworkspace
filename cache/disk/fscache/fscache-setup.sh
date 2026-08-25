#!/usr/bin/env bash
set -euo pipefail

FS_CACHE_DIR="/var/cache/fscache"
FSCACHE_CONF="/etc/cachefilesd.conf"
CACHE_SIZE_GB=100
BLOCK_SIZE=256

log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*"
}

log "Installing cachefilesd..."
if command -v apt-get &>/dev/null; then
  apt-get update && apt-get install -y cachefilesd
elif command -v yum &>/dev/null; then
  yum install -y cachefilesd
elif command -v apk &>/dev/null; then
  apk add cachefilesd
else
  log "ERROR: No package manager found. Install cachefilesd manually."
  exit 1
fi

log "Creating cache directory: ${FS_CACHE_DIR}"
mkdir -p "${FS_CACHE_DIR}"

log "Configuring cachefilesd..."
cat > "${FSCACHE_CONF}" << EOF
dir ${FS_CACHE_DIR}
tag default
brun 0%
bcull 5%
bstop 10%
frun 10%
fcull 5%
fstop 0%
bsize ${BLOCK_SIZE}
nothreads 4
EOF

log "Enabling and starting cachefilesd..."
if [ -f /etc/default/cachefilesd ]; then
  sed -i 's/^RUN=no/RUN=yes/' /etc/default/cachefilesd
fi

if systemctl --version &>/dev/null; then
  systemctl enable cachefilesd
  systemctl start cachefilesd
elif service --version &>/dev/null; then
  service cachefilesd start
fi

log "Configuring sysctl for cache performance..."
cat >> /etc/sysctl.d/99-cache-performance.conf << EOF

# FS-Cache / cachefilesd tuning
vm.dirty_ratio = 10
vm.dirty_background_ratio = 5
vm.vfs_cache_pressure = 50
vm.min_free_kbytes = 524288
EOF

sysctl --system 2>/dev/null || sysctl -p /etc/sysctl.d/99-cache-performance.conf

log "Verifying cachefilesd status..."
if [ -f /proc/fs/fscache/objects ] || [ -d /sys/module/fscache ]; then
  log "FS-Cache is available on this kernel."
  cat /proc/fs/fscache/objects 2>/dev/null || log "(proc interface may vary by kernel version)"
else
  log "WARNING: FS-Cache does not appear to be available on this kernel."
  log "Ensure the kernel has CONFIG_FSCACHE=y or CONFIG_FSCACHE=m."
fi

log "FS-Cache setup complete."
log "Cache directory: ${FS_CACHE_DIR}"
log "Cache size: ${CACHE_SIZE_GB}G"
log "Block size: ${BLOCK_SIZE}"
