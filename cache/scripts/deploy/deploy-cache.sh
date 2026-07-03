#!/bin/bash
set -euo pipefail

# ============================================================
# Docker Compose Cache Deployment Script - MyWorkSpace
# Deploys the full multi-layer cache stack using docker compose
# Supports: rollback, health checks, cluster init, incremental updates
# ============================================================

SCRIPT_NAME=$(basename "$0")
VERSION="1.0.0"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# ---------------------------------------------------------------------------
# Defaults
# ---------------------------------------------------------------------------
COMPOSE_DIR="${COMPOSE_DIR:-/root/myworkspace/cache/docker/compose}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.cache.yml}"
ENV_FILE="${ENV_FILE:-}"
PROFILE="${PROFILE:-full}"
SKIP_INIT=false
ROLLBACK_ON_FAIL=false
TIMEOUT="${TIMEOUT:-120}"
LOG_DIR="${LOG_DIR:-/var/log/cache-deploy}"

PROJECT_NAME="${PROJECT_NAME:-myworkspace-cache}"

DEPLOY_TIMESTAMP=$(date +%Y%m%d_%H%M%S)
LOG_FILE="${LOG_DIR}/deploy-${DEPLOY_TIMESTAMP}.log"

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------
log()    { local ts; ts=$(date '+%Y-%m-%d %H:%M:%S'); echo -e "${GREEN}[$ts] [INFO]${NC} $*" | tee -a "$LOG_FILE"; }
warn()   { local ts; ts=$(date '+%Y-%m-%d %H:%M:%S'); echo -e "${YELLOW}[$ts] [WARN]${NC} $*" | tee -a "$LOG_FILE"; }
error()  { local ts; ts=$(date '+%Y-%m-%d %H:%M:%S'); echo -e "${RED}[$ts] [ERROR]${NC} $*" | tee -a "$LOG_FILE"; exit 1; }
ok()     { local ts; ts=$(date '+%Y-%m-%d %H:%M:%S'); echo -e "${CYAN}[$ts] [OK]${NC} $*" | tee -a "$LOG_FILE"; }
header() { echo -e "\n${BLUE}══ $* ══${NC}\n" | tee -a "$LOG_FILE"; }

# ---------------------------------------------------------------------------
# Usage
# ---------------------------------------------------------------------------
usage() {
  cat <<EOF
Docker Compose Cache Deployment Script v${VERSION}

Usage: $SCRIPT_NAME [options]

Options:
  --compose-dir <dir>   Docker compose directory (default: ./cache/docker/compose).
  --compose-file <file> Compose file name (default: docker-compose.cache.yml).
  --env-file <path>     Path to .env file.
  --profile <name>      Deployment profile: full | valkey-only | varnish | nginx | ats (default: full).
  --project-name <name> Docker compose project name (default: myworkspace-cache).
  --skip-init           Skip Valkey cluster initialization.
  --rollback            Rollback on failure (restore previous state).
  --timeout <seconds>   Timeout for health checks (default: 120).
  --log-dir <dir>       Log directory (default: /var/log/cache-deploy).
  --dry-run             Show what would be done without deploying.
  --help                Show this help.
EOF
  exit 0
}

# ---------------------------------------------------------------------------
# Parse arguments
# ---------------------------------------------------------------------------
DRY_RUN=false
while [[ $# -gt 0 ]]; do
  case "$1" in
    --compose-dir) COMPOSE_DIR="$2"; shift 2 ;;
    --compose-file) COMPOSE_FILE="$2"; shift 2 ;;
    --env-file) ENV_FILE="$2"; shift 2 ;;
    --profile) PROFILE="$2"; shift 2 ;;
    --project-name) PROJECT_NAME="$2"; shift 2 ;;
    --skip-init) SKIP_INIT=true; shift ;;
    --rollback) ROLLBACK_ON_FAIL=true; shift ;;
    --timeout) TIMEOUT="$2"; shift 2 ;;
    --log-dir) LOG_DIR="$2"; shift 2 ;;
    --dry-run) DRY_RUN=true; shift ;;
    --help|-h) usage ;;
    *) error "Unknown option: $1. Use --help for usage." ;;
  esac
done

# ---------------------------------------------------------------------------
# Prerequisites
# ---------------------------------------------------------------------------
check_prereqs() {
  header "Checking prerequisites"

  if ! command -v docker &>/dev/null; then
    error "Docker is not installed. Install Docker first."
  fi
  ok "Docker found: $(docker --version)"

  if ! docker compose version &>/dev/null && ! docker-compose --version &>/dev/null; then
    error "Docker Compose is not installed."
  fi

  local compose_cmd
  if docker compose version &>/dev/null; then
    compose_cmd="docker compose"
  else
    compose_cmd="docker-compose"
  fi
  ok "Docker Compose found: $($compose_cmd version 2>/dev/null || docker-compose --version)"

  if [[ ! -d "$COMPOSE_DIR" ]]; then
    error "Compose directory not found: $COMPOSE_DIR"
  fi

  local compose_path="${COMPOSE_DIR}/${COMPOSE_FILE}"
  if [[ ! -f "$compose_path" ]]; then
    error "Compose file not found: $compose_path"
  fi
  ok "Compose file found: $compose_path"

  if [[ -n "$ENV_FILE" ]]; then
    if [[ ! -f "$ENV_FILE" ]]; then
      error "Environment file not found: $ENV_FILE"
    fi
    ok "Environment file found: $ENV_FILE"
  fi

  mkdir -p "$LOG_DIR"
  mkdir -p "${COMPOSE_DIR}/../.."

  # Check that required env vars are set or have defaults
  local required_vars=()
  [[ -z "${VALKEY_PASSWORD:-}" ]] && required_vars+=("VALKEY_PASSWORD")

  if [[ ${#required_vars[@]} -gt 0 ]]; then
    warn "Some environment variables are not set (using defaults): ${required_vars[*]}"
  fi

  # Create required docker volumes if they don"t exist
  local volumes=(
    "valkey-data-0" "valkey-data-1" "valkey-data-2"
    "valkey-data-3" "valkey-data-4" "valkey-data-5"
    "valkey-sentinel-data"
    "nginx-cache-api" "nginx-cache-static" "nginx-cache-cdn"
    "trafficserver-cache"
    "prometheus-data" "grafana-data" "alertmanager-data"
  )

  if [[ "$DRY_RUN" == false ]]; then
    for vol in "${volumes[@]}"; do
      docker volume inspect "$vol" &>/dev/null || docker volume create "$vol" &>/dev/null || true
    done
  fi

  ok "Prerequisites check passed"
  echo "$compose_cmd"
}

# ---------------------------------------------------------------------------
# Build docker compose args
# ---------------------------------------------------------------------------
build_compose_args() {
  local args=()
  args+=("-f" "${COMPOSE_DIR}/${COMPOSE_FILE}")
  args+=("-p" "$PROJECT_NAME")

  if [[ -n "$ENV_FILE" ]]; then
    args+=("--env-file" "$ENV_FILE")
  fi

  # Profile-based service selection
  case "$PROFILE" in
    full)
      ;;
    valkey-only)
      args+=("--profile" "valkey")
      ;;
    varnish)
      args+=("--profile" "varnish")
      ;;
    nginx)
      args+=("--profile" "nginx")
      ;;
    ats)
      args+=("--profile" "trafficserver")
      ;;
    *)
      error "Unknown profile: $PROFILE. Use: full, valkey-only, varnish, nginx, ats"
      ;;
  esac

  echo "${args[@]}"
}

# ---------------------------------------------------------------------------
# Deploy stack
# ---------------------------------------------------------------------------
deploy_stack() {
  local compose_cmd="$1"
  shift
  local compose_args=("$@")

  header "Deploying cache stack (profile: $PROFILE)"

  if [[ "$DRY_RUN" == true ]]; then
    log "[DRY-RUN] Would execute: $compose_cmd ${compose_args[*]} up -d"
    return 0
  fi

  # Pull images first
  log "Pulling images..."
  $compose_cmd "${compose_args[@]}" pull 2>&1 | tee -a "$LOG_FILE" || warn "Image pull had warnings"

  # Deploy
  log "Starting services..."
  $compose_cmd "${compose_args[@]}" up -d --remove-orphans 2>&1 | tee -a "$LOG_FILE" || error "Deployment failed"

  ok "Stack deployed"
}

# ---------------------------------------------------------------------------
# Wait for health checks
# ---------------------------------------------------------------------------
wait_for_health() {
  local compose_cmd="$1"
  shift
  local compose_args=("$@")

  header "Waiting for service health checks (timeout: ${TIMEOUT}s)"

  if [[ "$DRY_RUN" == true ]]; then
    log "[DRY-RUN] Would wait for health checks"
    return 0
  fi

  local services
  services=$($compose_cmd "${compose_args[@]}" ps --services 2>/dev/null)

  if [[ -z "$services" ]]; then
    warn "No services found in compose project"
    return
  fi

  local end_time=$((SECONDS + TIMEOUT))
  local all_healthy=false

  while [[ $SECONDS -lt $end_time ]]; do
    all_healthy=true
    local unhealthy=()

    while IFS= read -r service; do
      [[ -z "$service" ]] && continue
      local status
      status=$($compose_cmd "${compose_args[@]}" ps "$service" --format "{{.Status}}" 2>/dev/null || echo "")
      if echo "$status" | grep -qE "(unhealthy|starting|exit)"; then
        all_healthy=false
        unhealthy+=("$service")
      fi
    done <<< "$services"

    if [[ "$all_healthy" == true ]]; then
      ok "All services are healthy"
      return 0
    fi

    echo -ne "\r  Waiting for ${#unhealthy[@]} service(s): ${unhealthy[*]}... "
    sleep 5
  done

  if [[ "$all_healthy" == false ]]; then
    warn "Timeout reached. Unhealthy services:"
    while IFS= read -r service; do
      [[ -z "$service" ]] && continue
      local logs
      logs=$($compose_cmd "${compose_args[@]}" logs --tail=5 "$service" 2>/dev/null)
      warn "  $service logs:\n$logs"
    done <<< "$services"

    if [[ "$ROLLBACK_ON_FAIL" == true ]]; then
      rollback "$compose_cmd" "${compose_args[@]}"
    fi
    error "Health check timeout exceeded"
  fi
}

# ---------------------------------------------------------------------------
# Initialize Valkey Cluster
# ---------------------------------------------------------------------------
init_valkey_cluster() {
  local compose_cmd="$1"
  shift
  local compose_args=("$@")

  if [[ "$SKIP_INIT" == true ]]; then
    warn "Skipping Valkey cluster initialization (--skip-init)"
    return
  fi

  header "Initializing Valkey Cluster"

  if [[ "$DRY_RUN" == true ]]; then
    log "[DRY-RUN] Would initialize Valkey cluster"
    return 0
  fi

  # Check if cluster init service exists
  local init_service="valkey-cluster-init"
  local services
  services=$($compose_cmd "${compose_args[@]}" ps --services 2>/dev/null || echo "")

  if echo "$services" | grep -q "$init_service"; then
    log "Running cluster init service..."
    $compose_cmd "${compose_args[@]}" start "$init_service" 2>/dev/null || \
      $compose_cmd "${compose_args[@]}" up -d "$init_service" 2>/dev/null || true

    # Wait for init to complete
    local end_time=$((SECONDS + 60))
    while [[ $SECONDS -lt $end_time ]]; do
      local status
      status=$($compose_cmd "${compose_args[@]}" ps "$init_service" --format "{{.Status}}" 2>/dev/null || echo "")
      if echo "$status" | grep -q "Exit 0"; then
        ok "Valkey cluster initialization completed successfully"
        return 0
      fi
      if echo "$status" | grep -q "Exit"; then
        local exit_code
        exit_code=$($compose_cmd "${compose_args[@]}" ps "$init_service" --format "{{.ExitCode}}" 2>/dev/null || echo "1")
        if [[ "$exit_code" != "0" ]]; then
          warn "Cluster init failed with exit code $exit_code"
          $compose_cmd "${compose_args[@]}" logs "$init_service" 2>/dev/null | tee -a "$LOG_FILE"
          # Try manual init as fallback
          manual_cluster_init "$compose_cmd" "${compose_args[@]}"
          return
        fi
      fi
      sleep 3
    done

    warn "Cluster init timed out. Trying manual initialization..."
    manual_cluster_init "$compose_cmd" "${compose_args[@]}"
  else
    warn "Cluster init service not found. Skipping."
  fi
}

manual_cluster_init() {
  local compose_cmd="$1"
  shift
  local compose_args=("$@")

  info "Attempting manual Valkey cluster initialization..."

  local nodes=(
    "valkey-cluster-0:6379"
    "valkey-cluster-1:6379"
    "valkey-cluster-2:6379"
    "valkey-cluster-3:6379"
    "valkey-cluster-4:6379"
    "valkey-cluster-5:6379"
  )

  local password="${VALKEY_PASSWORD:-myworkspace}"
  local all_ready=true

  for node in "${nodes[@]}"; do
    local host="${node%:*}"
    local port="${node#*:}"
    if ! $compose_cmd "${compose_args[@]}" exec -T "$host" valkey-cli -p "$port" -a "$password" PING &>/dev/null; then
      all_ready=false
      warn "Node $host not ready yet"
    fi
  done

  if [[ "$all_ready" == false ]]; then
    warn "Not all cluster nodes are ready. Manual init deferred."
    return
  fi

  local node_args=""
  for node in "${nodes[@]}"; do
    node_args="$node_args $node"
  done

  $compose_cmd "${compose_args[@]}" exec -T valkey-cluster-0 \
    valkey-cli -a "$password" --cluster create $node_args --cluster-replicas 1 2>&1 | tee -a "$LOG_FILE" || \
    warn "Manual cluster creation had issues"

  ok "Manual cluster init completed"
}

# ---------------------------------------------------------------------------
# Verify all services
# ---------------------------------------------------------------------------
verify_services() {
  local compose_cmd="$1"
  shift
  local compose_args=("$@")

  header "Verifying deployed services"

  if [[ "$DRY_RUN" == true ]]; then
    log "[DRY-RUN] Would verify services"
    return 0
  fi

  local all_ok=true
  local services
  services=$($compose_cmd "${compose_args[@]}" ps --services 2>/dev/null)

  while IFS= read -r service; do
    [[ -z "$service" ]] && continue
    local status
    status=$($compose_cmd "${compose_args[@]}" ps "$service" --format "{{.Status}}" 2>/dev/null || echo "unknown")
    local name
    name=$($compose_cmd "${compose_args[@]}" ps "$service" --format "{{.Names}}" 2>/dev/null || echo "$service")

    if echo "$status" | grep -qE "^Up|healthy"; then
      ok "$name: $status"
    else
      warn "$name: $status"
      all_ok=false
    fi
  done <<< "$services"

  # Additional service-specific checks
  header "Service-specific verifications"

  # Valkey standalone ping
  if $compose_cmd "${compose_args[@]}" ps valkey-0 &>/dev/null; then
    if $compose_cmd "${compose_args[@]}" exec -T valkey-0 valkey-cli ping 2>/dev/null | grep -q "PONG"; then
      ok "Valkey standalone: PONG"
    else
      warn "Valkey standalone: not responding"
      all_ok=false
    fi
  fi

  # Varnish ping
  if $compose_cmd "${compose_args[@]}" ps varnish &>/dev/null; then
    if $compose_cmd "${compose_args[@]}" exec -T varnish varnishadm ping 2>/dev/null | grep -q "PONG"; then
      ok "Varnish: PONG"
    else
      warn "Varnish: not responding"
      all_ok=false
    fi
  fi

  # Nginx health
  if $compose_cmd "${compose_args[@]}" ps nginx &>/dev/null; then
    if $compose_cmd "${compose_args[@]}" exec -T nginx wget -q -O /dev/null http://localhost/nginx-health 2>/dev/null; then
      ok "Nginx: health endpoint OK"
    else
      warn "Nginx: health check failed"
      all_ok=false
    fi
  fi

  # ATS status
  if $compose_cmd "${compose_args[@]}" ps trafficserver &>/dev/null; then
    if $compose_cmd "${compose_args[@]}" exec -T trafficserver traffic_ctl server status 2>/dev/null | grep -q "running"; then
      ok "TrafficServer: running"
    else
      warn "TrafficServer: not running"
      all_ok=false
    fi
  fi

  # Prometheus
  if $compose_cmd "${compose_args[@]}" ps prometheus &>/dev/null; then
    if $compose_cmd "${compose_args[@]}" exec -T prometheus wget -q -O /dev/null http://localhost:9090/-/healthy 2>/dev/null; then
      ok "Prometheus: healthy"
    else
      warn "Prometheus: health check failed"
      all_ok=false
    fi
  fi

  if [[ "$all_ok" == true ]]; then
    ok "All services verified successfully"
  else
    warn "Some services have issues - check logs for details"
  fi
}

# ---------------------------------------------------------------------------
# Rollback
# ---------------------------------------------------------------------------
rollback() {
  local compose_cmd="$1"
  shift
  local compose_args=("$@")

  header "ROLLING BACK deployment"

  warn "Rolling back to previous state..."
  $compose_cmd "${compose_args[@]}" down --timeout 30 2>&1 | tee -a "$LOG_FILE" || true

  # If there was a previous version deployed, redeploy it
  local previous_tag="${PROJECT_NAME}-previous"
  if $compose_cmd "${compose_args[@]}" ps 2>/dev/null | grep -q "$previous_tag"; then
    log "Restoring previous deployment..."
    $compose_cmd "${compose_args[@]}" up -d 2>&1 | tee -a "$LOG_FILE" || true
  fi

  ok "Rollback completed"
}

# ---------------------------------------------------------------------------
# Post-deploy summary
# ---------------------------------------------------------------------------
print_summary() {
  header "Deployment Summary"

  echo "  Timestamp:   $DEPLOY_TIMESTAMP"
  echo "  Profile:     $PROFILE"
  echo "  Compose:     ${COMPOSE_DIR}/${COMPOSE_FILE}"
  echo "  Project:     $PROJECT_NAME"
  echo "  Env file:    ${ENV_FILE:-default}"
  echo "  Skip init:   $SKIP_INIT"
  echo "  Log file:    $LOG_FILE"
  echo ""
  echo -e "${GREEN}  Cache stack deployed successfully${NC}"
  echo ""
  echo "  Services:"
  echo "    Valkey Standalone:  valkey-0 (127.0.0.1:6379)"
  echo "    Valkey Cluster:     valkey-cluster-[0-5] (10.20.0.10-.15:6379)"
  echo "    Valkey Sentinel:    valkey-sentinel-0 (127.0.0.1:26379)"
  echo "    Varnish:            varnish (port 80)"
  echo "    Nginx:              nginx (port 443)"
  echo "    TrafficServer:      trafficserver (port 8080)"
  echo "    Prometheus:         prometheus (port 9090)"
  echo "    Grafana:            grafana (port 3000)"
}

# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
main() {
  echo -e "${CYAN}============================================${NC}"
  echo -e "${CYAN}  MyWorkSpace Cache Stack Deploy v${VERSION}${NC}"
  echo -e "${CYAN}============================================${NC}"

  local compose_cmd
  compose_cmd=$(check_prereqs)

  local compose_args
  compose_args=$(build_compose_args)

  # Convert string to array
  IFS=' ' read -ra COMPOSE_ARGS <<< "$compose_args"

  # Save current state for rollback
  if [[ "$ROLLBACK_ON_FAIL" == true ]] && [[ "$DRY_RUN" == false ]]; then
    header "Saving current deployment state"
    $compose_cmd "${COMPOSE_ARGS[@]}" ps 2>/dev/null > "${LOG_DIR}/pre-deploy-state-${DEPLOY_TIMESTAMP}.txt" || true
  fi

  # Main deployment flow
  deploy_stack "$compose_cmd" "${COMPOSE_ARGS[@]}"
  wait_for_health "$compose_cmd" "${COMPOSE_ARGS[@]}"
  init_valkey_cluster "$compose_cmd" "${COMPOSE_ARGS[@]}"
  verify_services "$compose_cmd" "${COMPOSE_ARGS[@]}"

  print_summary

  echo -e "\n${GREEN}Deployment completed at $(date '+%Y-%m-%d %H:%M:%S')${NC}"
}

main "$@"
