#!/bin/bash
set -euo pipefail

# ============================================================
# Cache Health Check Script - MyWorkSpace
# Comprehensive health check for all cache layers:
#   Valkey (ping + cluster info)
#   Varnish (backend probe)
#   Nginx (health endpoint)
#   ATS (traffic_ctl status)
#   bcache/FS-Cache status
#   Prometheus targets
# Outputs JSON and returns appropriate exit code
# ============================================================

SCRIPT_NAME=$(basename "$0")
VERSION="1.0.0"

# ---------------------------------------------------------------------------
# Defaults
# ---------------------------------------------------------------------------
TIMEOUT="${TIMEOUT:-10}"
VALKEY_HOST="${VALKEY_HOST:-127.0.0.1}"
VALKEY_PORT="${VALKEY_PORT:-6379}"
VALKEY_CLUSTER_HOSTS="${VALKEY_CLUSTER_HOSTS:-}"
VALKEY_PASSWORD="${VALKEY_PASSWORD:-}"
VALKEY_CLI="${VALKEY_CLI:-valkey-cli}"
VARNISHADM="${VARNISHADM:-varnishadm}"
NGINX_HEALTH_URL="${NGINX_HEALTH_URL:-http://127.0.0.1/nginx-health}"
TRAFFIC_CTL="${TRAFFIC_CTL:-traffic_ctl}"
PROMETHEUS_URL="${PROMETHEUS_URL:-http://127.0.0.1:9090}"
LOG_FILE="${LOG_FILE:-}"

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------
log()    { local t; t=$(date '+%Y-%m-%d %H:%M:%S'); echo "[$t] [INFO] $*" >&2; [[ -n "$LOG_FILE" ]] && echo "[$t] [INFO] $*" >> "$LOG_FILE"; }
warn()   { local t; t=$(date '+%Y-%m-%d %H:%M:%S'); echo "[$t] [WARN] $*" >&2; [[ -n "$LOG_FILE" ]] && echo "[$t] [WARN] $*" >> "$LOG_FILE"; }
error()  { local t; t=$(date '+%Y-%m-%d %H:%M:%S'); echo "[$t] [ERROR] $*" >&2; [[ -n "$LOG_FILE" ]] && echo "[$t] [ERROR] $*" >> "$LOG_FILE"; }

# ---------------------------------------------------------------------------
# Usage
# ---------------------------------------------------------------------------
usage() {
  cat <<EOF
Cache Health Check Script v${VERSION}

Usage: $SCRIPT_NAME [options]

Options:
  --timeout <seconds>   Timeout per check in seconds (default: 10).
  --valkey-host <host>  Valkey host (default: 127.0.0.1).
  --valkey-port <port>  Valkey port (default: 6379).
  --password <pass>     Valkey password.
  --cluster-hosts       Comma-separated list of cluster node host:port.
  --nginx-url <url>     Nginx health URL (default: http://127.0.0.1/nginx-health).
  --prometheus-url <url> Prometheus URL (default: http://127.0.0.1:9090).
  --log-file <path>     Log output to file.
  --help                Show this help.

Exit codes:
  0  All services healthy
  1  Degraded (at least one service has issues)
  2  Critical failure (core cache layer is down)

Output is JSON on stdout with the full health status.
EOF
  exit 0
}

# ---------------------------------------------------------------------------
# Parse arguments
# ---------------------------------------------------------------------------
while [[ $# -gt 0 ]]; do
  case "$1" in
    --timeout) TIMEOUT="$2"; shift 2 ;;
    --valkey-host) VALKEY_HOST="$2"; shift 2 ;;
    --valkey-port) VALKEY_PORT="$2"; shift 2 ;;
    --password) VALKEY_PASSWORD="$2"; shift 2 ;;
    --cluster-hosts) VALKEY_CLUSTER_HOSTS="$2"; shift 2 ;;
    --nginx-url) NGINX_HEALTH_URL="$2"; shift 2 ;;
    --prometheus-url) PROMETHEUS_URL="$2"; shift 2 ;;
    --log-file) LOG_FILE="$2"; shift 2 ;;
    --help|-h) usage ;;
    *) echo "Unknown option: $1"; usage ;;
  esac
done

# ---------------------------------------------------------------------------
# Global result tracking
# ---------------------------------------------------------------------------
OVERALL_STATUS="healthy"
OVERALL_EXIT_CODE=0
SERVICES=()

record_service() {
  local service="$1"
  local status="$2"
  local details="${3:-}"

  SERVICES+=("$(cat <<JSONEOF
    {
      "name": "${service}",
      "status": "${status}",
      "details": "${details}"
    }
JSONEOF
  )")

  # Update overall: critical > degraded > healthy
  if [[ "$status" == "critical" ]]; then
    OVERALL_STATUS="critical"
    OVERALL_EXIT_CODE=2
  elif [[ "$status" == "degraded" && "$OVERALL_STATUS" != "critical" ]]; then
    OVERALL_STATUS="degraded"
    OVERALL_EXIT_CODE=1
  fi
}

# ---------------------------------------------------------------------------
# Check Valkey standalone
# ---------------------------------------------------------------------------
check_valkey() {
  log "Checking Valkey standalone..."

  if ! command -v "$VALKEY_CLI" &>/dev/null; then
    record_service "valkey" "critical" "valkey-cli not found"
    return 1
  fi

  local cli_args=(-h "$VALKEY_HOST" -p "$VALKEY_PORT")
  [[ -n "$VALKEY_PASSWORD" ]] && cli_args+=(-a "$VALKEY_PASSWORD")

  # PING check with timeout
  local ping_result
  ping_result=$(timeout "$TIMEOUT" "$VALKEY_CLI" "${cli_args[@]}" PING 2>/dev/null || true)

  if [[ "$ping_result" != "PONG" ]]; then
    record_service "valkey" "critical" "PING failed"
    return 1
  fi

  # ROLE check
  local role
  role=$(timeout "$TIMEOUT" "$VALKEY_CLI" "${cli_args[@]}" ROLE 2>/dev/null | head -1 | tr -d '\r' || echo "unknown")
  role=${role:-unknown}

  # Memory usage
  local maxmemory used_memory
  maxmemory=$(timeout "$TIMEOUT" "$VALKEY_CLI" "${cli_args[@]}" CONFIG GET maxmemory 2>/dev/null | tail -1 | tr -d '\r' || echo "0")
  used_memory=$(timeout "$TIMEOUT" "$VALKEY_CLI" "${cli_args[@]}" INFO memory 2>/dev/null | grep "^used_memory:" | cut -d: -f2 | tr -d '\r' || echo "0")

  local mem_pct="0"
  if [[ "${maxmemory:-0}" -gt 0 ]]; then
    mem_pct=$(echo "scale=1; ${used_memory:-0} * 100 / ${maxmemory:-1}" | bc 2>/dev/null || echo "0")
  fi

  local status="healthy"
  local detail="role=${role}, mem=${mem_pct}%"
  if (( $(echo "$mem_pct > 90" | bc -l 2>/dev/null || echo 0) )); then
    status="degraded"
    detail="role=${role}, mem=${mem_pct}% (high memory usage)"
  fi

  record_service "valkey" "$status" "$detail"
}

# ---------------------------------------------------------------------------
# Check Valkey Cluster
# ---------------------------------------------------------------------------
check_valkey_cluster() {
  log "Checking Valkey Cluster..."

  if [[ -z "$VALKEY_CLUSTER_HOSTS" ]]; then
    record_service "valkey-cluster" "healthy" "not configured, skipped"
    return 0
  fi

  local all_ok=true
  local node_statuses=""

  IFS=',' read -ra nodes <<< "$VALKEY_CLUSTER_HOSTS"
  for node in "${nodes[@]}"; do
    local node_host="${node%:*}"
    local node_port="${node#*:}"
    node_port="${node_port:-6379}"

    local cli_args=(-h "$node_host" -p "$node_port")
    [[ -n "$VALKEY_PASSWORD" ]] && cli_args+=(-a "$VALKEY_PASSWORD")

    local ping
    ping=$(timeout "$TIMEOUT" "$VALKEY_CLI" "${cli_args[@]}" PING 2>/dev/null || true)
    if [[ "$ping" != "PONG" ]]; then
      all_ok=false
      node_statuses="${node_statuses}${node}:down "
    else
      local cluster_state
      cluster_state=$(timeout "$TIMEOUT" "$VALKEY_CLI" "${cli_args[@]}" CLUSTER INFO 2>/dev/null | grep "cluster_state:" | cut -d: -f2 | tr -d '\r' || echo "unknown")
      cluster_state=${cluster_state:-unknown}
      node_statuses="${node_statuses}${node}:${cluster_state} "
    fi
  done

  if [[ "$all_ok" == true ]]; then
    record_service "valkey-cluster" "healthy" "${node_statuses}"
  else
    record_service "valkey-cluster" "critical" "some nodes down: ${node_statuses}"
  fi
}

# ---------------------------------------------------------------------------
# Check Varnish
# ---------------------------------------------------------------------------
check_varnish() {
  log "Checking Varnish..."

  if ! command -v "$VARNISHADM" &>/dev/null; then
    record_service "varnish" "degraded" "varnishadm not found"
    return 1
  fi

  local ping_result
  ping_result=$(timeout "$TIMEOUT" "$VARNISHADM" ping 2>/dev/null || true)

  if [[ "$ping_result" != "PONG" ]]; then
    # Check if varnish is running at all
    if pgrep -x varnishd &>/dev/null; then
      record_service "varnish" "degraded" "varnishd running but varnishadm ping failed"
    else
      record_service "varnish" "critical" "varnishd not running"
    fi
    return 1
  fi

  # Get backend health via varnishadm
  local backend_health
  backend_health=$(timeout "$TIMEOUT" "$VARNISHADM" backend.list 2>/dev/null || echo "unknown")

  local status="healthy"
  local detail="ping=ok"
  if echo "$backend_health" | grep -qE "(Sick|ProbeError)"; then
    status="degraded"
    detail="backend has unhealthy backends"
  fi

  record_service "varnish" "$status" "${detail}"
}

# ---------------------------------------------------------------------------
# Check Nginx
# ---------------------------------------------------------------------------
check_nginx() {
  log "Checking Nginx..."

  if ! command -v curl &>/dev/null && ! command -v wget &>/dev/null; then
    record_service "nginx" "degraded" "curl/wget not found"
    return 1
  fi

  local http_code=""
  if command -v curl &>/dev/null; then
    http_code=$(timeout "$TIMEOUT" curl -s -o /dev/null -w "%{http_code}" "$NGINX_HEALTH_URL" 2>/dev/null || echo "000")
  elif command -v wget &>/dev/null; then
    http_code=$(timeout "$TIMEOUT" wget -q -O /dev/null --server-response "$NGINX_HEALTH_URL" 2>&1 | awk '/^  HTTP/{print $2}' | tail -1 || echo "000")
  fi

  if [[ "$http_code" == "200" || "$http_code" == "000" ]]; then
    if [[ "$http_code" == "200" ]]; then
      record_service "nginx" "healthy" "HTTP ${http_code}"
    else
      # Check if process is running even if health endpoint is unavailable
      if pgrep -x nginx &>/dev/null; then
        record_service "nginx" "degraded" "nginx running but health endpoint ${http_code}"
      else
        record_service "nginx" "critical" "nginx not responding (HTTP ${http_code})"
      fi
    fi
  else
    record_service "nginx" "critical" "health endpoint returned HTTP ${http_code}"
  fi
}

# ---------------------------------------------------------------------------
# Check TrafficServer
# ---------------------------------------------------------------------------
check_trafficserver() {
  log "Checking TrafficServer (ATS)..."

  if ! command -v "$TRAFFIC_CTL" &>/dev/null; then
    record_service "trafficserver" "degraded" "traffic_ctl not found"
    return 1
  fi

  local status_output
  status_output=$(timeout "$TIMEOUT" "$TRAFFIC_CTL" server status 2>/dev/null || true)

  if [[ -z "$status_output" ]]; then
    record_service "trafficserver" "critical" "no status response"
    return 1
  fi

  # Check for running / ready in status
  if echo "$status_output" | grep -qiE "(running|ready|online)"; then
    record_service "trafficserver" "healthy" "${status_output}"
  else
    record_service "trafficserver" "degraded" "${status_output}"
  fi
}

# ---------------------------------------------------------------------------
# Check bcache / FS-Cache
# ---------------------------------------------------------------------------
check_disk_cache() {
  log "Checking disk cache (bcache/FS-Cache)..."

  local bcache_found=false
  local fscache_found=false
  local details=""

  # Check bcache
  if [[ -d /sys/fs/bcache ]]; then
    bcache_found=true
    local bcache_states=""
    while IFS= read -r -d '' dev; do
      if [[ -f "$dev" ]]; then
        local state
        state=$(cat "$dev" 2>/dev/null || echo "unknown")
        bcache_states="${bcache_states} $(basename "$(dirname "$(dirname "$dev")")"):${state}"
      fi
    done < <(find /sys/fs/bcache -maxdepth 2 -name state -type f -print0 2>/dev/null || true)
    details="${details} bcache=[${bcache_states}]"
  fi

  # Check FS-Cache / cachefilesd
  if [[ -d /proc/fs/fscache ]]; then
    fscache_found=true
    local fscache_stats
    fscache_stats=$(cat /proc/fs/fscache/stats 2>/dev/null | tr '\n' ' ' || echo "unavailable")
    details="${details} fscache=present"
  fi

  if [[ -f /var/run/cachefilesd.pid ]] || pgrep -x cachefilesd &>/dev/null; then
    fscache_found=true
    details="${details} cachefilesd=running"
  fi

  if [[ "$bcache_found" == false && "$fscache_found" == false ]]; then
    record_service "disk-cache" "healthy" "no bcache/fscache configured (expected on non-cache nodes)"
  else
    local status="healthy"
    record_service "disk-cache" "$status" "${details}"
  fi
}

# ---------------------------------------------------------------------------
# Check Prometheus targets
# ---------------------------------------------------------------------------
check_prometheus() {
  log "Checking Prometheus..."

  local prom_cmd=""
  if command -v curl &>/dev/null; then
    prom_cmd="curl -s"
  elif command -v wget &>/dev/null; then
    prom_cmd="wget -q -O -"
  else
    record_service "prometheus" "degraded" "curl/wget not found"
    return 1
  fi

  # Check Prometheus itself
  local prom_health
  prom_health=$(timeout "$TIMEOUT" $prom_cmd "${PROMETHEUS_URL}/-/healthy" 2>/dev/null || true)

  if [[ -z "$prom_health" ]]; then
    record_service "prometheus" "degraded" "prometheus endpoint not reachable"
    return 1
  fi

  # Check targets via API
  local targets
  targets=$(timeout "$TIMEOUT" $prom_cmd "${PROMETHEUS_URL}/api/v1/targets" 2>/dev/null || echo "{}")

  # Count up/down targets
  local up_count=0
  local down_count=0
  local target_details=""

  if echo "$targets" | grep -q "activeTargets"; then
    # Simple parsing - count up targets
    up_count=$(echo "$targets" | grep -o '"health":"up"' | wc -l)
    down_count=$(echo "$targets" | grep -o '"health":"down"' | wc -l)

    # Extract job names of down targets
    if [[ "$down_count" -gt 0 ]]; then
      local down_jobs
      down_jobs=$(echo "$targets" | grep -B1 '"health":"down"' | grep '"job":' | sed 's/.*"job":"\([^"]*\)".*/\1/' | tr '\n' ',' || echo "unknown")
      target_details=", down_jobs=[${down_jobs}]"
    fi
  fi

  local status="healthy"
  if [[ "$down_count" -gt 0 ]]; then
    status="degraded"
  fi

  record_service "prometheus" "$status" "up=${up_count}, down=${down_count}${target_details}"
}

# ---------------------------------------------------------------------------
# Generate JSON output
# ---------------------------------------------------------------------------
generate_json() {
  local services_json
  services_json=$(IFS=,; echo "${SERVICES[*]}")

  cat <<JSONEOF
{
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "hostname": "$(hostname 2>/dev/null || echo 'unknown')",
  "overall_status": "${OVERALL_STATUS}",
  "exit_code": ${OVERALL_EXIT_CODE},
  "services": [
$(IFS=,; echo "${SERVICES[*]}")
  ]
}
JSONEOF
}

# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
main() {
  log "=== Cache Health Check v${VERSION} ==="

  # Run all checks in parallel where possible
  check_valkey &
  pid_valkey=$!

  check_valkey_cluster &
  pid_cluster=$!

  check_varnish &
  pid_varnish=$!

  check_nginx &
  pid_nginx=$!

  check_trafficserver &
  pid_ats=$!

  check_disk_cache &
  pid_disk=$!

  check_prometheus &
  pid_prom=$!

  # Wait for all
  wait $pid_valkey $pid_cluster $pid_varnish $pid_nginx $pid_ats $pid_disk $pid_prom 2>/dev/null || true

  # Generate and emit JSON
  generate_json

  log "Overall status: ${OVERALL_STATUS} (exit code ${OVERALL_EXIT_CODE})"

  exit "$OVERALL_EXIT_CODE"
}

main "$@"
