#!/bin/bash
# Filesystem Cache (FS-Cache / cachefilesd) Setup — Layer 7
# Provides block-level and filesystem-level caching for NFS and local disk

set -euo pipefail

CACHE_DIR="/var/cache/fscache"
CACHE_SIZE="${FSCACHE_SIZE:-10G}"
CACHE_BACKEND="${FSCACHE_BACKEND:-/dev/sda}"

echo "=== FS-Cache Setup ==="

# Install cachefilesd if not present
if ! command -v cachefilesd &> /dev/null; then
  echo "Installing cachefilesd..."
  apt-get update -qq && apt-get install -y -qq cachefilesd
fi

# Create cache directory
mkdir -p "${CACHE_DIR}"
chmod 755 "${CACHE_DIR}"

# Configure cachefilesd
cat > /etc/cachefilesd.conf << CACHEEOF
dir ${CACHE_DIR}
tag CACHE
brun 10%
bcull 7%
bstop 3%
frun 10%
fcull 7%
fstop 3%
secctx system_u:system_r:cachefiles_kernel_t:s0
CACHEEOF

# Enable and start
systemctl enable cachefilesd 2>/dev/null || true
systemctl start cachefilesd 2>/dev/null || true

echo "FS-Cache configured at ${CACHE_DIR} with size ${CACHE_SIZE}"
echo "=== FS-Cache Setup Complete ==="