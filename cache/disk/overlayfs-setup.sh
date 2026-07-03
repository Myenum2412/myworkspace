#!/usr/bin/env bash
set -euo pipefail

SSD_UPPER_DIR="${OVERLAY_UPPER_DIR:-/var/cache/overlay/upper}"
SSD_WORK_DIR="${OVERLAY_WORK_DIR:-/var/cache/overlay/work}"
LOWER_DIR="${OVERLAY_LOWER_DIR:-/var/lib/docker}"
MERGED_DIR="${OVERLAY_MERGE_DIR:-/var/cache/overlay/merged}"
MOUNT_OPTS="${OVERLAY_MOUNT_OPTS:-defaults,noatime,nodiratime}"

log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*"
}

error_exit() {
  log "ERROR: $*"
  exit 1
}

check_kernel_support() {
  log "Checking overlayfs kernel support..."
  if ! lsmod | grep -q "^overlay"; then
    modprobe overlay || error_exit "overlay module not available."
  fi
  log "overlay module loaded."
}

setup_directories() {
  log "Creating overlay directories..."
  mkdir -p "${SSD_UPPER_DIR}" "${SSD_WORK_DIR}" "${LOWER_DIR}" "${MERGED_DIR}"

  # Ensure work and upper are on the same filesystem (SSD)
  local upper_fs
  upper_fs=$(df -T "${SSD_UPPER_DIR}" | tail -1 | awk '{print $2}')
  local work_fs
  work_fs=$(df -T "${SSD_WORK_DIR}" | tail -1 | awk '{print $2}')

  if [ "${upper_fs}" != "${work_fs}" ]; then
    error_exit "Upper and work directories must be on the same filesystem.\n  Upper: ${SSD_UPPER_DIR} (${upper_fs})\n  Work: ${SSD_WORK_DIR} (${work_fs})"
  fi
  log "Directories created. Upper/work FS: ${upper_fs}"
}

mount_overlay() {
  log "Mounting overlayfs..."
  if mountpoint -q "${MERGED_DIR}" 2>/dev/null; then
    log "Already mounted at ${MERGED_DIR}. Unmounting first..."
    umount "${MERGED_DIR}" || error_exit "Failed to unmount existing overlay."
  fi

  mount -t overlay overlay \
    -o "lowerdir=${LOWER_DIR},upperdir=${SSD_UPPER_DIR},workdir=${SSD_WORK_DIR},${MOUNT_OPTS}" \
    "${MERGED_DIR}" || error_exit "Failed to mount overlayfs."

  log "Overlayfs mounted at ${MERGED_DIR}"
}

configure_fstab() {
  local fstab_entry="overlay ${MERGED_DIR} overlay lowerdir=${LOWER_DIR},upperdir=${SSD_UPPER_DIR},workdir=${SSD_WORK_DIR},${MOUNT_OPTS} 0 0"

  if ! grep -q "${MERGED_DIR}" /etc/fstab 2>/dev/null; then
    echo "${fstab_entry}" >> /etc/fstab
    log "Added to /etc/fstab: ${fstab_entry}"
  else
    log "Overlayfs entry already in /etc/fstab."
  fi
}

tune_ssd() {
  log "Tuning SSD for cache performance..."
  local upper_dev
  upper_dev=$(df "${SSD_UPPER_DIR}" | tail -1 | awk '{print $1}')

  if [ -b "${upper_dev}" ]; then
    # Disable write barriers for better performance
    # (safe for cache-only data)
    local scheduler
    scheduler=$(cat /sys/block/$(basename "${upper_dev}")/queue/scheduler 2>/dev/null || true)
    log "Current I/O scheduler for ${upper_dev}: ${scheduler}"

    # Set noop/none scheduler for SSDs
    for sched_sys in /sys/block/$(basename "${upper_dev}")/queue/scheduler; do
      if [ -w "${sched_sys}" ]; then
        echo "none" > "${sched_sys}" 2>/dev/null || true
        log "I/O scheduler set to 'none'."
      fi
    done

    # Increase read-ahead
    blockdev --setra 4096 "${upper_dev}" || true
    log "Read-ahead set to 4096 sectors."

    # Enable TRIM/discard if SSD
    if hdparm -I "${upper_dev}" 2>/dev/null | grep -qi "TRIM"; then
      log "SSD supports TRIM. Enabling discard..."
      mount -o remount,discard "${MERGED_DIR}" 2>/dev/null || true
    fi
  fi
}

verify_mount() {
  log "Verifying overlayfs mount..."
  mount | grep "${MERGED_DIR}" || error_exit "Overlay not showing in mount table."
  df -h "${MERGED_DIR}" || true
  log "Verification successful."
}

main() {
  check_kernel_support
  setup_directories
  tune_ssd
  mount_overlay
  configure_fstab
  verify_mount

  log "==================================="
  log "Overlayfs setup complete!"
  log "Lower dir: ${LOWER_DIR}"
  log "Upper dir: ${SSD_UPPER_DIR} (SSD - writable cache layer)"
  log "Work dir:  ${SSD_WORK_DIR}"
  log "Merged:    ${MERGED_DIR}"
  log "==================================="
}

main
