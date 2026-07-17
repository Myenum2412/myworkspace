#!/bin/bash
set -euo pipefail

# ============================================================
# Valkey Restore Script - MyWorkSpace Cache Architecture
# Restores: standalone Valkey, Cluster, Sentinel
# Sources: local backup directory
# ============================================================

SCRIPT_NAME=$(basename "$0")
VERSION="1.0.0"

BACKUP_DIR="${BACKUP_DIR:-/var/backups/valkey}"

VALKEY_PASSWORD="${VALKEY_PASSWORD:-}"
VALKEY_HOST="${VALKEY_HOST:-127.0.0.1}"
VALKEY_PORT="${VALKEY_PORT:-6379}"
VALKEY_CLI="${VALKEY_CLI:-valkey-cli}"
LOG_FILE="${LOG_FILE:-}"

TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------
log() {
  local level="$1"
  shift
  local message="$*"
  local ts
  ts=$(date '+%Y-%m-%d %H:%M:%S')
  if [[ -n "$LOG_FILE" ]]; then
    echo "[$ts] [$level] $message" >> "$LOG_FILE"
  fi
  echo "[$ts] [$level] $message" >&2
}

info()  { log "INFO"  "$@"; }
warn()  { log "WARN"  "$@"; }
error() { log "ERROR" "$@"; exit 1; }
ok()    { log "OK"    "$@"; }

# ---------------------------------------------------------------------------
# Usage
# ---------------------------------------------------------------------------
usage() {
  cat <<EOF
Valkey Restore Script v${VERSION}

Usage: $SCRIPT_NAME <command> [options]

Commands:
  list                  List available backups (local or S3).
  restore               Restore from a backup.
  verify                Verify backup integrity.

Restore options:
  --backup-path <path>  Path to local backup file/directory to restore.
  --backup-date <date>  Restore most recent backup from date (YYYYMMDD).
  --latest              Restore latest available backup.
  --type <type>         Restore type: standalone | cluster | sentinel | all (default: all).
  --dir <path>          Local backup directory (default: \$BACKUP_DIR).
  --host <host>         Valkey target host (default: 127.0.0.1).
  --port <port>         Valkey target port (default: 6379).
  --password <pass>     Valkey target password.
  --no-restart          Do not restart Valkey services after restore.
  --dry-run             Show what would be done without doing it.
  --log-file <path>     Log to file.
  --help                Show this help.
EOF
  exit 0
}

# ---------------------------------------------------------------------------
# Parse arguments
# ---------------------------------------------------------------------------
COMMAND=""
BACKUP_PATH=""
BACKUP_DATE=""
RESTORE_TYPE="all"
NO_RESTART=false
DRY_RUN=false

while [[ $# -gt 0 ]]; do
  case "$1" in
    list|restore|verify) COMMAND="$1"; shift ;;
    --backup-path) BACKUP_PATH="$2"; shift 2 ;;
    --backup-date) BACKUP_DATE="$2"; shift 2 ;;
    --latest) BACKUP_DATE="latest"; shift ;;
    --type) RESTORE_TYPE="$2"; shift 2 ;;
    --dir) BACKUP_DIR="$2"; shift 2 ;;
    --host) VALKEY_HOST="$2"; shift 2 ;;
    --port) VALKEY_PORT="$2"; shift 2 ;;
    --password) VALKEY_PASSWORD="$2"; shift 2 ;;
    --no-restart) NO_RESTART=true; shift ;;
    --dry-run) DRY_RUN=true; shift ;;
    --log-file) LOG_FILE="$2"; shift 2 ;;
    --help|-h) usage ;;
    *) error "Unknown option: $1. Use --help for usage." ;;
  esac
done

if [[ -z "$COMMAND" ]]; then
  error "No command specified. Use: list | restore | verify"
fi

# ---------------------------------------------------------------------------
# Prerequisites
# ---------------------------------------------------------------------------
check_prereqs() {
  for cmd in "$VALKEY_CLI" tar gunzip find date dirname basename; do
    if ! command -v "$cmd" &>/dev/null; then
      error "Required command not found: $cmd"
    fi
  done

  mkdir -p "$BACKUP_DIR" 2>/dev/null || true
}

# ---------------------------------------------------------------------------
# List backups
# ---------------------------------------------------------------------------
cmd_list() {
  info "Available backups in $BACKUP_DIR:"
  echo ""

  if [[ -d "$BACKUP_DIR" ]]; then
    local archives
    archives=$(find "$BACKUP_DIR" -maxdepth 2 -name "*.tar.gz" -o -name "*.tar.bz2" -o -name "*.tar.xz" | sort -r)
    if [[ -z "$archives" ]]; then
      info "  No compressed backups found."
    else
      echo "  Local archives:"
      while IFS= read -r line; do
        local size
        size=$(du -h "$line" 2>/dev/null | cut -f1)
        echo "    $(basename "$line")  ($size)"
      done <<< "$archives"
    fi

    local dirs
    dirs=$(find "$BACKUP_DIR" -mindepth 2 -maxdepth 3 -name "backup-timestamp.txt" -exec dirname {} \; 2>/dev/null | sort -r)
    if [[ -n "$dirs" ]]; then
      echo ""
      echo "  Uncompressed backup directories:"
      while IFS= read -r line; do
        local size
        size=$(du -sh "$line" 2>/dev/null | cut -f1)
        echo "    $line  ($size)"
      done <<< "$dirs"
    fi
  fi

}

# ---------------------------------------------------------------------------
# Verify backup integrity
# ---------------------------------------------------------------------------
cmd_verify() {
  local target="$BACKUP_PATH"
  if [[ -z "$target" ]]; then
    error "Specify backup with --backup-path or --backup-date/--latest"
  fi

  info "Verifying backup: $target"

  if [[ -f "$target" ]]; then
    # Compressed file - check archive integrity
    info "  Testing archive integrity..."
    case "$target" in
      *.tar.gz)  gunzip -t "$target" && tar -tzf "$target" >/dev/null && ok "  Archive integrity check passed" || error "Archive corrupted: $target" ;;
      *.tar.bz2) bzip2 -t "$target" && tar -tjf "$target" >/dev/null && ok "  Archive integrity check passed" || error "Archive corrupted: $target" ;;
      *.tar.xz)  xz -t "$target" && tar -tJf "$target" >/dev/null && ok "  Archive integrity check passed" || error "Archive corrupted: $target" ;;
      *)         warn "  Unknown compression, attempting tar test..."; tar -tzf "$target" >/dev/null 2>&1 && ok "  Archive integrity check passed" || tar -tjf "$target" >/dev/null 2>&1 && ok "  Archive integrity check passed" || warn "  Could not verify archive format" ;;
    esac

    # Extract to temp and check contents
    local tmp_dir
    tmp_dir=$(mktemp -d)
    tar -xzf "$target" -C "$tmp_dir" 2>/dev/null || tar -xjf "$target" -C "$tmp_dir" 2>/dev/null || tar -xJf "$target" -C "$tmp_dir" 2>/dev/null || true

  elif [[ -d "$target" ]]; then
    local tmp_dir="$target"
    info "  Checking directory structure..."
  else
    error "Backup not found: $target"
  fi

  # Verify contents
  local errors=0
  if [[ -d "${tmp_dir:-}" ]]; then
    for required in "backup-timestamp.txt" "backup-type.txt" "backup-mode.txt"; do
      if find "$tmp_dir" -name "$required" | grep -q .; then
        info "  Found metadata: $required"
      else
        warn "  Missing metadata: $required"
        ((errors++))
      fi
    done

    # Check for data files
    local rdb_count
    rdb_count=$(find "$tmp_dir" -name "*.rdb" 2>/dev/null | wc -l)
    local aof_count
    aof_count=$(find "$tmp_dir" -name "*.aof" 2>/dev/null | wc -l)

    if [[ "$rdb_count" -gt 0 ]]; then
      info "  Found $rdb_count RDB file(s)"
    else
      warn "  No RDB files found in backup"
    fi
    if [[ "$aof_count" -gt 0 ]]; then
      info "  Found $aof_count AOF file(s)"
    fi

    # Read backup mode
    local mode_file
    mode_file=$(find "$tmp_dir" -name "backup-mode.txt" | head -1)
    if [[ -n "$mode_file" ]]; then
      local mode
      mode=$(cat "$mode_file" | tr -d '\n\r')
      info "  Backup mode: $mode"
    fi

    if [[ "$errors" -gt 0 ]]; then
      warn "  Verification completed with $errors issue(s)"
    else
      ok "  Backup verification passed"
    fi

    # Clean up temp unless it was the original dir
    if [[ "${tmp_dir:-}" != "$target" ]]; then
      rm -rf "$tmp_dir"
    fi
  fi
}

# ---------------------------------------------------------------------------
# Resolve backup path
# ---------------------------------------------------------------------------
resolve_backup() {
  local resolved=""

  if [[ -n "$BACKUP_PATH" ]]; then
    if [[ -f "$BACKUP_PATH" || -d "$BACKUP_PATH" ]]; then
      echo "$BACKUP_PATH"
      return
    fi
    error "Backup path does not exist: $BACKUP_PATH"
  fi

  # Local source
  if [[ "$BACKUP_DATE" == "latest" ]]; then
    local latest_file
    latest_file=$(find "$BACKUP_DIR" -maxdepth 2 -name "*.tar.gz" -o -name "*.tar.bz2" -o -name "*.tar.xz" 2>/dev/null | sort -r | head -1)
    if [[ -z "$latest_file" ]]; then
      latest_file=$(find "$BACKUP_DIR" -mindepth 2 -maxdepth 3 -name "backup-timestamp.txt" -exec dirname {} \; 2>/dev/null | sort -r | head -1)
    fi
    if [[ -n "$latest_file" ]]; then
      echo "$latest_file"
      return
    fi
    error "No backups found in $BACKUP_DIR"
  fi

  if [[ -n "$BACKUP_DATE" ]]; then
    local match
    match=$(find "$BACKUP_DIR" -maxdepth 2 -name "*${BACKUP_DATE}*.tar.*" 2>/dev/null | sort -r | head -1)
    if [[ -z "$match" ]]; then
      match=$(find "$BACKUP_DIR" -mindepth 2 -maxdepth 3 -path "*${BACKUP_DATE}*" -name "backup-timestamp.txt" -exec dirname {} \; 2>/dev/null | sort -r | head -1)
    fi
    if [[ -n "$match" ]]; then
      echo "$match"
      return
    fi
    error "No backup found for date: $BACKUP_DATE"
  fi

  error "No backup specified. Use --backup-path, --backup-date, or --latest"
}

# ---------------------------------------------------------------------------
# Restore helpers
# ---------------------------------------------------------------------------
stop_valkey_service() {
  local service_name="$1"
  info "  Stopping $service_name..."

  if [[ "$DRY_RUN" == true ]]; then
    info "  [DRY-RUN] Would stop $service_name"
    return
  fi

  # Try docker
  if command -v docker &>/dev/null; then
    docker stop "$service_name" 2>/dev/null && info "  Stopped docker container: $service_name" || true
  fi

  # Try systemd
  if command -v systemctl &>/dev/null; then
    systemctl stop "$service_name" 2>/dev/null && info "  Stopped systemd service: $service_name" || true
  fi

  # Try valkey-cli SHUTDOWN
  if [[ "$service_name" == valkey-* ]]; then
    valkey_cli "$VALKEY_HOST" "$VALKEY_PORT" SHUTDOWN NOSAVE 2>/dev/null || true
  fi
}

start_valkey_service() {
  local service_name="$1"
  info "  Starting $service_name..."

  if [[ "$DRY_RUN" == true ]]; then
    info "  [DRY-RUN] Would start $service_name"
    return
  fi

  if command -v docker &>/dev/null; then
    docker start "$service_name" 2>/dev/null && info "  Started docker container: $service_name" || true
  fi

  if command -v systemctl &>/dev/null; then
    systemctl start "$service_name" 2>/dev/null && info "  Started systemd service: $service_name" || true
  fi
}

wait_for_valkey() {
  local host="$1"
  local port="$2"
  local timeout="${3:-30}"

  info "  Waiting for Valkey at $host:$port (timeout: ${timeout}s)..."
  for i in $(seq 1 "$timeout"); do
    if valkey_cli "$host" "$port" PING &>/dev/null; then
      info "  Valkey at $host:$port is responding"
      return 0
    fi
    sleep 1
  done
  warn "  Timeout waiting for Valkey at $host:$port"
  return 1
}

# ---------------------------------------------------------------------------
# Restore standalone
# ---------------------------------------------------------------------------
restore_standalone() {
  local source_dir="$1"

  info "Restoring standalone Valkey from $source_dir..."

  # Find RDB file
  local rdb_file
  rdb_file=$(find "$source_dir" -name "*.rdb" | head -1)

  # Find AOF file
  local aof_file
  aof_file=$(find "$source_dir" -name "*.aof" -o -name "appendonly.aof" | head -1)

  if [[ -z "$rdb_file" && -z "$aof_file" ]]; then
    warn "  No RDB or AOF files found in backup"
    return 1
  fi

  if [[ "$DRY_RUN" == true ]]; then
    if [[ -n "$rdb_file" ]]; then
      info "  [DRY-RUN] Would restore RDB: $(basename "$rdb_file")"
    fi
    if [[ -n "$aof_file" ]]; then
      info "  [DRY-RUN] Would restore AOF: $(basename "$aof_file")"
    fi
    return 0
  fi

  # Stop Valkey service
  stop_valkey_service "valkey-0"

  # Determine data directory (try common paths)
  local data_dirs=("/data" "/var/lib/valkey" "/var/lib/redis" "/bitnami/valkey/data")
  local restored=0

  for data_dir in "${data_dirs[@]}"; do
    if [[ -d "$data_dir" ]]; then
      info "  Data directory found: $data_dir"

      # Backup current data
      local current_backup="${data_dir}/pre-restore-backup-${TIMESTAMP}"
      mkdir -p "$current_backup"
      cp "$data_dir"/*.rdb "$current_backup/" 2>/dev/null || true
      cp "$data_dir"/*.aof "$current_backup/" 2>/dev/null || true
      info "  Current data backed up to $current_backup"

      # Copy RDB
      if [[ -n "$rdb_file" ]]; then
        cp "$rdb_file" "$data_dir/dump.rdb" && info "  Restored RDB to $data_dir/dump.rdb" || warn "  Could not restore RDB to $data_dir"
      fi

      # Copy AOF
      if [[ -n "$aof_file" ]]; then
        cp "$aof_file" "$data_dir/appendonly.aof" && info "  Restored AOF to $data_dir/appendonly.aof" || warn "  Could not restore AOF to $data_dir"
      fi

      restored=1
      break
    fi
  done

  if [[ "$restored" -eq 0 ]]; then
    warn "  No known Valkey data directory found. Data files extracted to:"
    if [[ -n "$rdb_file" ]]; then
      warn "    RDB: $rdb_file"
    fi
    if [[ -n "$aof_file" ]]; then
      warn "    AOF: $aof_file"
    fi
  fi

  # Restore config backup
  local config_file
  config_file=$(find "$source_dir" -name "valkey-config.txt" | head -1)
  if [[ -n "$config_file" ]]; then
    info "  Config backup available: $config_file"
  fi

  # Start Valkey service
  if [[ "$NO_RESTART" == false ]]; then
    start_valkey_service "valkey-0"
    wait_for_valkey "$VALKEY_HOST" "$VALKEY_PORT"
  fi

  info "Standalone restore completed"
}

# ---------------------------------------------------------------------------
# Restore cluster
# ---------------------------------------------------------------------------
restore_cluster() {
  local source_dir="$1"

  info "Restoring Valkey Cluster from $source_dir..."

  local node_dirs
  node_dirs=$(find "$source_dir" -maxdepth 1 -type d -name "node-*" | sort)

  if [[ -z "$node_dirs" ]]; then
    warn "  No cluster node directories found in backup"

    # Check if there are RDB files directly
    local rdb_files
    rdb_files=$(find "$source_dir" -name "*.rdb" | sort)
    if [[ -z "$rdb_files" ]]; then
      warn "  No cluster RDB files found"
      return 1
    fi
  fi

  if [[ "$DRY_RUN" == true ]]; then
    info "  [DRY-RUN] Would restore cluster data to appropriate data dirs"
    return 0
  fi

  local idx=0
  while IFS= read -r node_dir; do
    if [[ -z "$node_dir" ]]; then
      ((idx++))
      continue
    fi

    local rdb_file
    rdb_file=$(find "$node_dir" -name "*.rdb" | head -1)

    if [[ -n "$rdb_file" ]]; then
      local container_name="valkey-cluster-${idx}"
      local data_dirs=(
        "/data"
        "/var/lib/valkey"
        "/var/lib/redis"
        "/bitnami/valkey/data"
      )

      # Try Docker copy
      if command -v docker &>/dev/null; then
        if docker ps --format '{{.Names}}' 2>/dev/null | grep -q "^${container_name}$"; then
          info "  Stopping container $container_name..."
          docker stop "$container_name" 2>/dev/null || true

          for data_dir in "${data_dirs[@]}"; do
            if docker exec "$container_name" test -d "$data_dir" 2>/dev/null; then
              info "  Copying RDB to $container_name:$data_dir"
              cat "$rdb_file" | docker exec -i "$container_name" sh -c "cat > ${data_dir}/dump.rdb" && \
                info "  Restored RDB for node $idx" || warn "  Could not copy to $container_name:$data_dir"
              break
            fi
          done

          docker start "$container_name" 2>/dev/null || true
        fi
      fi
    fi

    ((idx++))
  done <<< "$node_dirs"

  # Also restore cluster nodes info
  local cluster_info
  cluster_info=$(find "$source_dir" -name "cluster-nodes.txt" | head -1)
  if [[ -n "$cluster_info" ]]; then
    info "  Cluster nodes info available: $cluster_info"
  fi

  if [[ "$NO_RESTART" == false ]]; then
    info "  Restarting cluster containers..."
    for i in {0..5}; do
      start_valkey_service "valkey-cluster-${i}"
    done
    # Wait for first node
    wait_for_valkey "${CLUSTER_HOST_SOURCE:-127.0.0.1}" "6379" 30 || true
    # Reinitialize cluster
    info "  Note: After cluster restore, run cluster init to recreate the cluster topology"
  fi

  info "Cluster restore completed"
}

# ---------------------------------------------------------------------------
# Restore sentinel
# ---------------------------------------------------------------------------
restore_sentinel() {
  local source_dir="$1"

  info "Restoring Sentinel config from $source_dir..."

  local sentinel_configs
  sentinel_configs=$(find "$source_dir" -name "sentinel-*-sentinel.conf" | sort)

  if [[ -z "$sentinel_configs" ]]; then
    info "  No sentinel configs found in backup"
    return
  fi

  if [[ "$DRY_RUN" == true ]]; then
    info "  [DRY-RUN] Would restore sentinel configs"
    return 0
  fi

  local idx=0
  while IFS= read -r conf; do
    if [[ -z "$conf" ]]; then
      ((idx++))
      continue
    fi

    local container_name="valkey-sentinel-${idx}"
    local conf_paths=(
      "/etc/valkey/sentinel.conf"
      "/etc/redis/sentinel.conf"
      "/data/sentinel.conf"
    )

    if command -v docker &>/dev/null; then
      if docker ps --format '{{.Names}}' 2>/dev/null | grep -q "^${container_name}$"; then
        info "  Stopping $container_name..."
        docker stop "$container_name" 2>/dev/null || true

        for cp in "${conf_paths[@]}"; do
          if docker exec "$container_name" test -f "$cp" 2>/dev/null; then
            info "  Restoring sentinel config to $container_name:$cp"
            cat "$conf" | docker exec -i "$container_name" sh -c "cat > $cp" && \
              info "  Restored sentinel config" || warn "  Could not copy sentinel config"
            break
          fi
        done

        if [[ "$NO_RESTART" == false ]]; then
          docker start "$container_name" 2>/dev/null || true
        fi
      fi
    fi

    ((idx++))
  done <<< "$sentinel_configs"

  info "Sentinel restore completed"
}

# ---------------------------------------------------------------------------
# Extract archive if needed
# ---------------------------------------------------------------------------
prepare_source() {
  local target="$1"

  if [[ -d "$target" ]]; then
    echo "$target"
    return
  fi

  if [[ -f "$target" ]]; then
    local tmp_dir
    tmp_dir=$(mktemp -d)
    info "Extracting archive to $tmp_dir..."

    case "$target" in
      *.tar.gz)  tar -xzf "$target" -C "$tmp_dir" ;;
      *.tar.bz2) tar -xjf "$target" -C "$tmp_dir" ;;
      *.tar.xz)  tar -xJf "$target" -C "$tmp_dir" ;;
      *)
        # Try each format
        tar -xzf "$target" -C "$tmp_dir" 2>/dev/null || \
        tar -xjf "$target" -C "$tmp_dir" 2>/dev/null || \
        tar -xJf "$target" -C "$tmp_dir" 2>/dev/null || \
        error "Could not extract archive: $target"
        ;;
    esac

    # Find the actual extracted directory
    local extracted
    extracted=$(find "$tmp_dir" -mindepth 1 -maxdepth 2 -name "*.txt" -exec dirname {} \; 2>/dev/null | sort -u | head -1)
    if [[ -z "$extracted" ]]; then
      # Maybe the contents are directly in tmp_dir
      extracted=$(find "$tmp_dir" -mindepth 1 -type d | head -1)
      if [[ -z "$extracted" ]]; then
        extracted="$tmp_dir"
      fi
    fi

    echo "$extracted"
    return
  fi

  error "Backup target is neither file nor directory: $target"
}

# ---------------------------------------------------------------------------
# Restore command
# ---------------------------------------------------------------------------
cmd_restore() {
  local target
  target=$(resolve_backup)
  info "Resolved backup: $target"

  # Verify first
  BACKUP_PATH="$target"
  cmd_verify

  # Prepare source
  local source_dir
  source_dir=$(prepare_source "$target")
  info "Source directory: $source_dir"

  # Determine what to restore
  local mode=""
  local mode_file
  mode_file=$(find "$source_dir" -name "backup-mode.txt" | head -1)
  if [[ -n "$mode_file" ]]; then
    mode=$(cat "$mode_file" | tr -d '\n\r')
  fi

  if [[ "$RESTORE_TYPE" == "all" || "$RESTORE_TYPE" == "standalone" ]]; then
    if [[ -z "$mode" || "$mode" == "standalone" || "$RESTORE_TYPE" == "standalone" ]]; then
      restore_standalone "$source_dir"
    fi
  fi

  if [[ "$RESTORE_TYPE" == "all" || "$RESTORE_TYPE" == "cluster" ]]; then
    if [[ -z "$mode" || "$mode" == "cluster" || "$RESTORE_TYPE" == "cluster" ]]; then
      restore_cluster "$source_dir"
    fi
  fi

  if [[ "$RESTORE_TYPE" == "all" || "$RESTORE_TYPE" == "sentinel" ]]; then
    if [[ -z "$mode" || "$mode" == "sentinel" || "$RESTORE_TYPE" == "sentinel" ]]; then
      restore_sentinel "$source_dir"
    fi
  fi

  # Clean up temp dir if we extracted
  if [[ -d "$source_dir" && "$source_dir" =~ ^/tmp/ ]]; then
    rm -rf "$source_dir"
  fi

  ok "Restore completed successfully at $(date '+%Y-%m-%d %H:%M:%S')"
}

# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
main() {
  info "=== Valkey Restore Script v${VERSION} ==="
  info "Command: $COMMAND"

  check_prereqs

  case "$COMMAND" in
    list)    cmd_list ;;
    verify)  cmd_verify ;;
    restore) cmd_restore ;;
    *)       error "Unknown command: $COMMAND" ;;
  esac
}

main "$@"
