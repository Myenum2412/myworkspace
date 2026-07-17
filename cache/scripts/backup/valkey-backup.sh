#!/bin/bash
set -euo pipefail

# ============================================================
# Valkey Backup Script - MyWorkSpace Cache Architecture
# Backs up: standalone Valkey (RDB+AOF), Cluster nodes, Sentinel
# Supports: local backup, retention policy
# ============================================================

SCRIPT_NAME=$(basename "$0")
VERSION="1.0.0"

# ---------------------------------------------------------------------------
# Defaults (overridable via environment)
# ---------------------------------------------------------------------------
BACKUP_DIR="${BACKUP_DIR:-/var/backups/valkey}"

RETENTION_DAILY="${RETENTION_DAILY:-7}"
RETENTION_WEEKLY="${RETENTION_WEEKLY:-4}"
RETENTION_MONTHLY="${RETENTION_MONTHLY:-12}"

VALKEY_PASSWORD="${VALKEY_PASSWORD:-}"
VALKEY_HOST="${VALKEY_HOST:-127.0.0.1}"
VALKEY_PORT="${VALKEY_PORT:-6379}"
VALKEY_CLI="${VALKEY_CLI:-valkey-cli}"

BACKUP_TYPE="${BACKUP_TYPE:-full}"   # full | incremental
COMPRESS="${COMPRESS:-gzip}"
COMPRESS_EXT="${COMPRESS_EXT:-.gz}"
LOG_FILE="${LOG_FILE:-}"

# Cluster nodes
CLUSTER_HOSTS="${CLUSTER_HOSTS:-}"
SENTINEL_HOSTS="${SENTINEL_HOSTS:-}"

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
DATE_SUFFIX=$(date +%Y%m%d)
WEEK_NUM=$(date +%Y_W%V)
MONTH_NUM=$(date +%Y_%m)

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------
log() {
  local level="$1"
  shift
  local message="$*"
  local timestamp
  timestamp=$(date '+%Y-%m-%d %H:%M:%S')
  if [[ -n "$LOG_FILE" ]]; then
    echo "[$timestamp] [$level] $message" >> "$LOG_FILE"
  fi
  echo "[$timestamp] [$level] $message" >&2
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
Valkey Backup Script v${VERSION}

Usage: $SCRIPT_NAME [options]

Options:
  --full                Perform full backup (RDB + AOF, default).
  --incremental         Perform incremental backup (AOF only).
  --type <type>         Backup type: full | incremental.
  --dir <path>          Backup directory (default: \$BACKUP_DIR or /var/backups/valkey).
  --host <host>         Valkey host (default: 127.0.0.1).
  --port <port>         Valkey port (default: 6379).
  --password <pass>     Valkey password.
  --cluster-hosts       Comma-separated list of cluster node host:port.
  --sentinel-hosts      Comma-separated list of sentinel host:port.
  --retention-daily <n>  Keep last N daily backups (default: 7).
  --retention-weekly <n> Keep last N weekly backups (default: 4).
  --retention-monthly <n> Keep last N monthly backups (default: 12).
  --log-file <path>     Log to file.
  --help                Show this help.

Environment variables override defaults:
  BACKUP_DIR, VALKEY_PASSWORD, VALKEY_HOST,
  VALKEY_PORT, RETENTION_DAILY, RETENTION_WEEKLY, RETENTION_MONTHLY,
  BACKUP_TYPE, LOG_FILE, CLUSTER_HOSTS, SENTINEL_HOSTS
EOF
  exit 0
}

# ---------------------------------------------------------------------------
# Parse arguments
# ---------------------------------------------------------------------------
while [[ $# -gt 0 ]]; do
  case "$1" in
    --full) BACKUP_TYPE="full"; shift ;;
    --incremental) BACKUP_TYPE="incremental"; shift ;;
    --type) BACKUP_TYPE="$2"; shift 2 ;;
    --dir) BACKUP_DIR="$2"; shift 2 ;;
    --host) VALKEY_HOST="$2"; shift 2 ;;
    --port) VALKEY_PORT="$2"; shift 2 ;;
    --password) VALKEY_PASSWORD="$2"; shift 2 ;;
    --cluster-hosts) CLUSTER_HOSTS="$2"; shift 2 ;;
    --sentinel-hosts) SENTINEL_HOSTS="$2"; shift 2 ;;
    --retention-daily) RETENTION_DAILY="$2"; shift 2 ;;
    --retention-weekly) RETENTION_WEEKLY="$2"; shift 2 ;;
    --retention-monthly) RETENTION_MONTHLY="$2"; shift 2 ;;
    --log-file) LOG_FILE="$2"; shift 2 ;;
    --help|-h) usage ;;
    *) error "Unknown option: $1. Use --help for usage." ;;
  esac
done

# ---------------------------------------------------------------------------
# Prerequisites check
# ---------------------------------------------------------------------------
check_prereqs() {
  local missing=0
  for cmd in "$VALKEY_CLI" gzip mkdir rm find date dirname basename; do
    if ! command -v "$cmd" &>/dev/null; then
      error "Required command not found: $cmd"
    fi
  done

  if [[ "$BACKUP_TYPE" != "full" && "$BACKUP_TYPE" != "incremental" ]]; then
    error "BACKUP_TYPE must be 'full' or 'incremental', got '$BACKUP_TYPE'"
  fi

  mkdir -p "$BACKUP_DIR" || error "Cannot create backup directory: $BACKUP_DIR"
}

# ---------------------------------------------------------------------------
# Valkey helpers
# ---------------------------------------------------------------------------
valkey_cli() {
  local host="${1:-$VALKEY_HOST}"
  local port="${2:-$VALKEY_PORT}"
  shift 2 || true
  if [[ -n "$VALKEY_PASSWORD" ]]; then
    "$VALKEY_CLI" -h "$host" -p "$port" -a "$VALKEY_PASSWORD" "$@"
  else
    "$VALKEY_CLI" -h "$host" -p "$port" "$@"
  fi
}

valkey_cli_no_auth() {
  "$VALKEY_CLI" -h "$1" -p "$2" "$3"
}

# ---------------------------------------------------------------------------
# Backup standalone Valkey (RDB + AOF)
# ---------------------------------------------------------------------------
backup_standalone() {
  local backup_subdir="$BACKUP_DIR/standalone/$TIMESTAMP"
  mkdir -p "$backup_subdir"

  info "Backing up standalone Valkey ($VALKEY_HOST:$VALKEY_PORT)..."

  # Trigger RDB save
  info "Triggering RDB save (BGSAVE)..."
  if ! valkey_cli "$VALKEY_HOST" "$VALKEY_PORT" BGSAVE; then
    error "Failed to trigger BGSAVE on standalone Valkey"
  fi

  # Wait for RDB save to complete
  for i in {1..30}; do
    local save_in_progress
    save_in_progress=$(valkey_cli "$VALKEY_HOST" "$VALKEY_PORT" INFO persistence 2>/dev/null | grep "rdb_bgsave_in_progress" | cut -d: -f2 | tr -d '\r')
    if [[ "$save_in_progress" == "0" ]]; then
      info "RDB save completed"
      break
    fi
    if [[ "$i" -eq 30 ]]; then
      warn "RDB save still in progress after 30s, continuing..."
    fi
    sleep 1
  done

  # Get RDB file path from config
  local rdb_dir rdb_filename
  rdb_dir=$(valkey_cli "$VALKEY_HOST" "$VALKEY_PORT" CONFIG GET dir 2>/dev/null | tail -1 | tr -d '\r')
  rdb_filename=$(valkey_cli "$VALKEY_HOST" "$VALKEY_PORT" CONFIG GET dbfilename 2>/dev/null | tail -1 | tr -d '\r')
  local rdb_path="${rdb_dir}/${rdb_filename}"

  # Get AOF file path
  local aof_filename
  aof_filename=$(valkey_cli "$VALKEY_HOST" "$VALKEY_PORT" CONFIG GET appendfilename 2>/dev/null | tail -1 | tr -d '\r')
  local aof_path="${rdb_dir}/${aof_filename}"

  # Try to copy RDB
  if [[ -f "$rdb_path" ]]; then
    cp "$rdb_path" "$backup_subdir/" || warn "Could not copy RDB from $rdb_path (permission?)"
  else
    warn "RDB file not found at $rdb_path. Trying LASTSAVE-based copy..."
    # Attempt to find via Docker volume paths or fallback
    local found=0
    for try_path in /data/dump.rdb /var/lib/valkey/dump.rdb /var/lib/redis/dump.rdb /bitnami/valkey/data/dump.rdb; do
      if [[ -f "$try_path" ]]; then
        cp "$try_path" "$backup_subdir/"
        info "Copied RDB from $try_path"
        found=1
        break
      fi
    done
    if [[ "$found" -eq 0 ]]; then
      warn "RDB file not found via any known path. RDB backup skipped."
    fi
  fi

  # Copy AOF if it exists
  if [[ -f "$aof_path" ]]; then
    cp "$aof_path" "$backup_subdir/"
    info "Copied AOF from $aof_path"
  else
    for try_path in /data/appendonly.aof /var/lib/valkey/appendonly.aof /var/lib/redis/appendonly.aof /bitnami/valkey/data/appendonly.aof; do
      if [[ -f "$try_path" ]]; then
        cp "$try_path" "$backup_subdir/"
        info "Copied AOF from $try_path"
        found=1
        break
      fi
    done
    if [[ "$found" -eq 0 ]]; then
      info "AOF not found (appendonly might be disabled)"
    fi
  fi

  # Dump config
  valkey_cli "$VALKEY_HOST" "$VALKEY_PORT" CONFIG GET '*' 2>/dev/null > "$backup_subdir/valkey-config.txt" || \
    warn "Could not dump config"

  # Get INFO output for reference
  valkey_cli "$VALKEY_HOST" "$VALKEY_PORT" INFO ALL 2>/dev/null > "$backup_subdir/valkey-info.txt" || \
    warn "Could not get INFO"

  echo "$TIMESTAMP" > "$backup_subdir/backup-timestamp.txt"
  echo "$BACKUP_TYPE" > "$backup_subdir/backup-type.txt"
  echo "standalone" > "$backup_subdir/backup-mode.txt"
  echo "$VALKEY_HOST:$VALKEY_PORT" > "$backup_subdir/backup-target.txt"

  info "Standalone backup complete: $backup_subdir"
  echo "$backup_subdir"
}

# ---------------------------------------------------------------------------
# Backup Valkey Cluster nodes
# ---------------------------------------------------------------------------
backup_cluster() {
  local backup_subdir="$BACKUP_DIR/cluster/$TIMESTAMP"
  mkdir -p "$backup_subdir"

  info "Backing up Valkey Cluster..."

  local hosts=()
  IFS=',' read -ra hosts <<< "$CLUSTER_HOSTS"
  if [[ ${#hosts[@]} -eq 0 ]]; then
    info "No cluster hosts specified. Skipping cluster backup."
    return
  fi

  local node_index=0
  for node in "${hosts[@]}"; do
    local node_host="${node%:*}"
    local node_port="${node#*:}"
    node_port="${node_port:-6379}"
    local node_dir="$backup_subdir/node-$node_index"
    mkdir -p "$node_dir"

    info "  Backing up cluster node $node_host:$node_port..."

    # Trigger BGSAVE on each node
    if ! valkey_cli "$node_host" "$node_port" BGSAVE 2>/dev/null; then
      warn "  Failed to trigger BGSAVE on $node_host:$node_port"
    fi

    # Wait for save
    for i in {1..30}; do
      local sp
      sp=$(valkey_cli "$node_host" "$node_port" INFO persistence 2>/dev/null | grep "rdb_bgsave_in_progress" | cut -d: -f2 | tr -d '\r' || echo "1")
      if [[ "$sp" == "0" ]]; then
        break
      fi
      sleep 1
    done

    # Try to get RDB from known paths
    local found=0
    for try_path in /data/dump.rdb /var/lib/valkey/dump.rdb /bitnami/valkey/data/dump.rdb; do
      if [[ -f "$try_path" ]]; then
        cp "$try_path" "$node_dir/dump-node-$node_index.rdb"
        info "    Copied RDB from $try_path"
        found=1
        break
      fi
    done
    if [[ "$found" -eq 0 ]]; then
      warn "    RDB not found for node $node_host:$node_port"
    fi

    # Cluster info
    valkey_cli "$node_host" "$node_port" CLUSTER INFO 2>/dev/null > "$node_dir/cluster-info.txt" || true
    valkey_cli "$node_host" "$node_port" CLUSTER NODES 2>/dev/null > "$node_dir/cluster-nodes.txt" || true
    valkey_cli "$node_host" "$node_port" INFO ALL 2>/dev/null > "$node_dir/valkey-info.txt" || true

    ((node_index++))
  done

  # Cluster-wide backup metadata
  echo "$TIMESTAMP" > "$backup_subdir/backup-timestamp.txt"
  echo "cluster" > "$backup_subdir/backup-mode.txt"
  echo "$CLUSTER_HOSTS" > "$backup_subdir/cluster-hosts.txt"
  valkey_cli "${hosts[0]%:*}" "${hosts[0]#*:}" CLUSTER INFO 2>/dev/null > "$backup_subdir/cluster-summary.txt" || true

  info "Cluster backup complete: $backup_subdir"
  echo "$backup_subdir"
}

# ---------------------------------------------------------------------------
# Backup Sentinel configs
# ---------------------------------------------------------------------------
backup_sentinel() {
  local backup_subdir="$BACKUP_DIR/sentinel/$TIMESTAMP"
  mkdir -p "$backup_subdir"

  info "Backing up Sentinel configs..."

  local hosts=()
  IFS=',' read -ra hosts <<< "$SENTINEL_HOSTS"
  if [[ ${#hosts[@]} -eq 0 ]]; then
    info "No sentinel hosts specified. Skipping sentinel backup."
    return
  fi

  local idx=0
  for node in "${hosts[@]}"; do
    local node_host="${node%:*}"
    local node_port="${node#*:}"
    node_port="${node_port:-26379}"

    # Get sentinel info
    valkey_cli_no_auth "$node_host" "$node_port" "SENTINEL" "MASTERS" 2>/dev/null > "$backup_subdir/sentinel-${idx}-masters.txt" || true
    valkey_cli_no_auth "$node_host" "$node_port" "SENTINEL" "SLAVES" "mymaster" 2>/dev/null > "$backup_subdir/sentinel-${idx}-slaves.txt" || true
    valkey_cli_no_auth "$node_host" "$node_port" "SENTINEL" "SENTINELS" "mymaster" 2>/dev/null > "$backup_subdir/sentinel-${idx}-sentinels.txt" || true
    valkey_cli_no_auth "$node_host" "$node_port" "INFO" "ALL" 2>/dev/null > "$backup_subdir/sentinel-${idx}-info.txt" || true

    # Look for sentinel config
    for try_path in /data/sentinel.conf /etc/valkey/sentinel.conf /etc/redis/sentinel.conf /bitnami/valkey/data/sentinel.conf; do
      if [[ -f "$try_path" ]]; then
        cp "$try_path" "$backup_subdir/sentinel-${idx}-sentinel.conf"
        break
      fi
    done

    ((idx++))
  done

  echo "$TIMESTAMP" > "$backup_subdir/backup-timestamp.txt"
  echo "sentinel" > "$backup_subdir/backup-mode.txt"

  info "Sentinel backup complete: $backup_subdir"
  echo "$backup_subdir"
}

# ---------------------------------------------------------------------------
# Compress backup directory
# ---------------------------------------------------------------------------
compress_backup() {
  local src_dir="$1"
  local dest_file="${src_dir}.tar.${COMPRESS_EXT}"

  info "Compressing backup: $src_dir -> $dest_file"

  local tar_cmd="tar"
  case "$COMPRESS" in
    gzip)  tar_cmd="tar -czf" ;;
    bzip2) tar_cmd="tar -cjf" ;;
    xz)    tar_cmd="tar -cJf" ;;
    zstd)  tar_cmd="tar --zstd -cf" ;;
    none)
      info "Compression disabled, skipping."
      echo "$src_dir"
      return
      ;;
    *)
      warn "Unknown compressor '$COMPRESS', falling back to gzip"
      tar_cmd="tar -czf"
      COMPRESS_EXT=".gz"
      ;;
  esac

  # Need to tar the contents of src_dir, not the dir itself
  local parent
  parent=$(dirname "$src_dir")
  local base
  base=$(basename "$src_dir")

  (cd "$parent" && $tar_cmd "$dest_file" "$base") || error "Compression failed for $src_dir"
  rm -rf "$src_dir"

  info "Compressed to: $dest_file"
  echo "$dest_file"
}

# ---------------------------------------------------------------------------
# Retention policy
# ---------------------------------------------------------------------------
apply_retention() {
  local retention_type="$1"   # daily | weekly | monthly
  local keep_count="$2"
  local search_pattern="$3"

  info "Applying $retention_type retention (keep last $keep_count)..."

  local archives
  case "$retention_type" in
    daily)   archives=($(find "$BACKUP_DIR" -maxdepth 1 -name "*${search_pattern}*.tar.*" -o -name "*${search_pattern}*" -type d 2>/dev/null | sort)) ;;
    weekly)  archives=($(find "$BACKUP_DIR" -maxdepth 1 -name "*${search_pattern}*.tar.*" -o -name "*${search_pattern}*" -type d 2>/dev/null | sort)) ;;
    monthly) archives=($(find "$BACKUP_DIR" -maxdepth 1 -name "*${search_pattern}*.tar.*" -o -name "*${search_pattern}*" -type d 2>/dev/null | sort)) ;;
  esac

  if [[ ${#archives[@]} -le "$keep_count" ]]; then
    info "  Less than $keep_count $retention_type backups, no cleanup needed"
    return
  fi

  local to_delete=("${archives[@]:0:${#archives[@]}-keep_count}")
  for f in "${to_delete[@]}"; do
    info "  Removing old backup: $f"
    rm -rf "$f"
  done
}

enforce_retention() {
  info "Enforcing retention policy..."

  # Daily retention: keep last RETENTION_DAILY
  apply_retention "daily" "$RETENTION_DAILY" "$DATE_SUFFIX"

  # Weekly retention: keep last RETENTION_WEEKLY
  apply_retention "weekly" "$RETENTION_WEEKLY" "$WEEK_NUM"

  # Monthly retention: keep last RETENTION_MONTHLY
  apply_retention "monthly" "$RETENTION_MONTHLY" "$MONTH_NUM"
}

# ---------------------------------------------------------------------------
# Main backup flow
# ---------------------------------------------------------------------------
main() {
  info "=== Valkey Backup Script v${VERSION} ==="
  info "Backup type: $BACKUP_TYPE"
  info "Backup dir: $BACKUP_DIR"
  info "Timestamp: $TIMESTAMP"

  check_prereqs

  local archives=()

  # Step 1: Backup standalone Valkey
  local standalone_dir
  standalone_dir=$(backup_standalone)
  archives+=("$standalone_dir")

  # Step 2: Backup cluster (if hosts configured)
  if [[ -n "$CLUSTER_HOSTS" ]]; then
    local cluster_dir
    cluster_dir=$(backup_cluster)
    archives+=("$cluster_dir")
  fi

  # Step 3: Backup sentinel (if hosts configured)
  if [[ -n "$SENTINEL_HOSTS" ]]; then
    local sentinel_dir
    sentinel_dir=$(backup_sentinel)
    archives+=("$sentinel_dir")
  fi

  # Step 4: Create metadata manifest
  local manifest="$BACKUP_DIR/manifest-$TIMESTAMP.txt"
  {
    echo "Backup Timestamp: $TIMESTAMP"
    echo "Backup Type: $BACKUP_TYPE"
    echo "Valkey Host: $VALKEY_HOST:$VALKEY_PORT"
    echo "Cluster Hosts: ${CLUSTER_HOSTS:-none}"
    echo "Sentinel Hosts: ${SENTINEL_HOSTS:-none}"
    echo "---"
    for a in "${archives[@]}"; do
      echo "Archive: $a"
    done
  } > "$manifest"
  info "Manifest written: $manifest"

  # Step 5: Compress each backup directory
  local compressed_files=()
  for a in "${archives[@]}"; do
    if [[ -d "$a" ]]; then
      local compressed
      compressed=$(compress_backup "$a")
      compressed_files+=("$compressed")
    fi
  done

  # Step 6: Apply retention
  enforce_retention

  info "=== Backup completed successfully at $(date '+%Y-%m-%d %H:%M:%S') ==="
}

main "$@"
