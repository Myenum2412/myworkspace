#!/usr/bin/env bash
set -euo pipefail

SSD_DEV="${BCACHE_SSD_DEV:-/dev/nvme0n1}"
HDD_DEV="${BCACHE_HDD_DEV:-/dev/sda1}"
MOUNT_POINT="${BCACHE_MOUNT_POINT:-/var/cache/bcache}"
CACHE_MODE="${BCACHE_CACHE_MODE:-writeback}"

log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*"
}

error_exit() {
  log "ERROR: $*"
  exit 1
}

check_prereqs() {
  log "Checking prerequisites..."
  if ! lsmod | grep -q "^bcache"; then
    log "Loading bcache kernel module..."
    modprobe bcache || error_exit "Failed to load bcache module. Ensure CONFIG_BCACHE is enabled."
  fi

  for dev in "${SSD_DEV}" "${HDD_DEV}"; do
    [ -b "${dev}" ] || error_exit "Block device not found: ${dev}"
  done

  if command -v make-bcache &>/dev/null; then
    log "bcache-tools found."
  else
    log "Installing bcache-tools..."
    if command -v apt-get &>/dev/null; then
      apt-get update && apt-get install -y bcache-tools
    elif command -v yum &>/dev/null; then
      yum install -y bcache-tools
    elif command -v apk &>/dev/null; then
      apk add bcache-tools
    else
      error_exit "No package manager found. Install bcache-tools manually."
    fi
  fi
}

setup_bcache() {
  log "Setting up bcache..."

  # Register devices if needed
  echo "${SSD_DEV}" > /sys/fs/bcache/register 2>/dev/null || true
  echo "${HDD_DEV}" > /sys/fs/bcache/register 2>/dev/null || true

  # Check if already configured
  if ls /sys/fs/bcache/ 2>/dev/null | grep -q "[0-9a-f]"; then
    log "bcache devices are already registered."
    BCACHE_CACHE_UUID=$(ls /sys/fs/bcache/ | grep -v "^[0-9]")
  else
    # Wipe existing bcache signatures
    wipefs -a "${SSD_DEV}" 2>/dev/null || true
    wipefs -a "${HDD_DEV}" 2>/dev/null || true

    # Create bcache devices
    make-bcache -B "${HDD_DEV}" -C "${SSD_DEV}" --block=4k --bucket=512k || \
      error_exit "Failed to create bcache devices."

    # Give udev time to create device nodes
    sleep 3
  fi

  # Get UUIDs
  BCACHE_CACHE_UUID=$(bcache-super-show "${SSD_DEV}" 2>/dev/null | grep -i "cset.uuid" | awk '{print $2}') || true
  BCACHE_DEVICE=$(ls /dev/bcache* 2>/dev/null | head -1) || true

  if [ -z "${BCACHE_DEVICE}" ]; then
    # Try to find the bcache device via sysfs
    for dev in /sys/block/bcache*; do
      [ -d "${dev}" ] || continue
      BCACHE_DEVICE="/dev/$(basename ${dev})"
      break
    done
  fi

  if [ -z "${BCACHE_DEVICE}" ] || [ ! -b "${BCACHE_DEVICE}" ]; then
    error_exit "bcache device not found. Check dmesg for errors."
  fi

  log "bcache device: ${BCACHE_DEVICE}"
  log "Cache UUID: ${BCACHE_CACHE_UUID:-unknown}"

  # Attach cache if not already attached
  if [ -n "${BCACHE_CACHE_UUID}" ]; then
    BCACHE_SYSFS="/sys/block/$(basename ${BCACHE_DEVICE})/bcache"
    if [ -d "${BCACHE_SYSFS}" ]; then
      if [ ! -f "${BCACHE_SYSFS}/cache" ] || [ "$(cat ${BCACHE_SYSFS}/cache 2>/dev/null)" = "none" ]; then
        echo "${BCACHE_CACHE_UUID}" > "${BCACHE_SYSFS}/attach" 2>/dev/null || \
          error_exit "Failed to attach cache."
        log "Cache attached."
      else
        log "Cache already attached."
      fi
    fi
  fi

  # Set cache mode
  echo "${CACHE_MODE}" > "/sys/block/$(basename ${BCACHE_DEVICE})/bcache/cache_mode" 2>/dev/null || \
    log "WARNING: Could not set cache mode to ${CACHE_MODE}. Check sysfs permissions."

  log "Cache mode set to: ${CACHE_MODE}"
}

tune_bcache() {
  log "Tuning bcache parameters..."
  local bcache_sysfs="/sys/block/$(basename ${BCACHE_DEVICE})/bcache"

  if [ -d "${bcache_sysfs}" ]; then
    # Sequential cutoff: 0 = cache everything
    echo 0 > "${bcache_sysfs}/sequential_cutoff" 2>/dev/null || true

    # Writeback rate: 1 MiB/s
    echo 1048576 > "${bcache_sysfs}/writeback_rate" 2>/dev/null || true

    # Writeback rate update interval
    echo 60 > "${bcache_sysfs}/writeback_rate_update_seconds" 2>/dev/null || true

    # Congested thresholds
    echo 2000 > "${bcache_sysfs}/congested_read_threshold_us" 2>/dev/null || true
    echo 20000 > "${bcache_sysfs}/congested_write_threshold_us" 2>/dev/null || true

    log "bcache tuning applied."
  else
    log "WARNING: bcache sysfs not found at ${bcache_sysfs}"
  fi
}

create_mount_point() {
  log "Creating mount point: ${MOUNT_POINT}"
  mkdir -p "${MOUNT_POINT}"

  local fstab_entry="${BCACHE_DEVICE} ${MOUNT_POINT} ext4 defaults,noatime,nodiratime,discard 0 2"

  if ! grep -q "${MOUNT_POINT}" /etc/fstab 2>/dev/null; then
    echo "${fstab_entry}" >> /etc/fstab
    log "Added to /etc/fstab: ${fstab_entry}"
  else
    log "Mount point already in /etc/fstab."
  fi

  # Format if not already formatted
  if ! blkid "${BCACHE_DEVICE}" | grep -q "TYPE"; then
    log "Formatting bcache device..."
    mkfs.ext4 -F "${BCACHE_DEVICE}" || error_exit "Failed to format bcache device."
  fi

  mount "${MOUNT_POINT}" || error_exit "Failed to mount bcache device."
  log "Mounted at: ${MOUNT_POINT}"
}

main() {
  check_prereqs
  setup_bcache
  tune_bcache
  create_mount_point

  log "==================================="
  log "bcache setup complete!"
  log "SSD cache device: ${SSD_DEV}"
  log "HDD backing device: ${HDD_DEV}"
  log "Cache mode: ${CACHE_MODE}"
  log "Mount point: ${MOUNT_POINT}"
  log "==================================="
  bcache-super-show "${SSD_DEV}" 2>/dev/null | head -20 || true
}

main
