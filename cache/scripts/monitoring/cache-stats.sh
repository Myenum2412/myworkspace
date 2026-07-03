#!/bin/bash
set -euo pipefail

# ============================================================
# Cache Stats Monitoring Script - MyWorkSpace
# Real-time monitoring for all cache layers:
#   Valkey (hit rate, memory, clients, uptime)
#   Nginx (cache status from access log)
#   Varnish (hit rate, object count, memory)
#   ATS (cache hit ratio)
#   System (disk cache usage, memory)
# ============================================================

SCRIPT_NAME=$(basename "$0")
VERSION="1.0.0"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
BOLD='\033[1m'
NC='\033[0m'

# ---------------------------------------------------------------------------
# Defaults
# ---------------------------------------------------------------------------
WATCH_INTERVAL="${WATCH_INTERVAL:-5}"
OUTPUT_MODE="${OUTPUT_MODE:-table}"   # table | json
VALKEY_HOST="${VALKEY_HOST:-127.0.0.1}"
VALKEY_PORT="${VALKEY_PORT:-6379}"
VALKEY_PASSWORD="${VALKEY_PASSWORD:-}"
VALKEY_CLI="${VALKEY_CLI:-valkey-cli}"
NGINX_ACCESS_LOG="${NGINX_ACCESS_LOG:-/var/log/nginx/access.log}"
NGINX_CACHE_DIRS="${NGINX_CACHE_DIRS:-/var/cache/nginx}"
VARNISHADM="${VARNISHADM:-varnishadm}"
VARNISHSTAT="${VARNISHSTAT:-varnishstat}"
TRAFFIC_CTL="${TRAFFIC_CTL:-traffic_ctl}"
DISK_CACHE_DIRS="${DISK_CACHE_DIRS:-/var/cache/trafficserver /var/cache/nginx}"
WATCH_MODE=false
JSON_OUTPUT=false

# ---------------------------------------------------------------------------
# Usage
# ---------------------------------------------------------------------------
usage() {
  cat <<EOF
Cache Stats Monitoring Script v${VERSION}

Usage: $SCRIPT_NAME [options]

Options:
  --watch [n]           Watch mode, refresh every N seconds (default: 5).
  --json                Output in JSON format for programmatic use.
  --table               Output in table format (default).
  --valkey-host <host>  Valkey host (default: 127.0.0.1).
  --valkey-port <port>  Valkey port (default: 6379).
  --password <pass>     Valkey password.
  --nginx-log <path>    Nginx access log path (default: /var/log/nginx/access.log).
  --help                Show this help.
EOF
  exit 0
}

# ---------------------------------------------------------------------------
# Parse arguments
# ---------------------------------------------------------------------------
while [[ $# -gt 0 ]]; do
  case "$1" in
    --watch) WATCH_MODE=true; WATCH_INTERVAL="${2:-5}"; [[ $# -gt 1 && "$2" =~ ^[0-9]+$ ]] && shift 2 || shift ;;
    --json) JSON_OUTPUT=true; OUTPUT_MODE="json"; shift ;;
    --table) OUTPUT_MODE="table"; JSON_OUTPUT=false; shift ;;
    --valkey-host) VALKEY_HOST="$2"; shift 2 ;;
    --valkey-port) VALKEY_PORT="$2"; shift 2 ;;
    --password) VALKEY_PASSWORD="$2"; shift 2 ;;
    --nginx-log) NGINX_ACCESS_LOG="$2"; shift 2 ;;
    --help|-h) usage ;;
    *) echo "Unknown option: $1"; usage ;;
  esac
done

# ---------------------------------------------------------------------------
# Helper functions
# ---------------------------------------------------------------------------
colorize_pct() {
  local val="$1"
  if (( $(echo "$val < 50" | bc -l 2>/dev/null || echo 0) )); then
    echo -e "${RED}${val}%${NC}"
  elif (( $(echo "$val < 80" | bc -l 2>/dev/null || echo 0) )); then
    echo -e "${YELLOW}${val}%${NC}"
  else
    echo -e "${GREEN}${val}%${NC}"
  fi
}

colorize_mem() {
  local used="$1"
  local total="$2"
  if [[ -z "$total" || "$total" == "0" ]]; then
    echo "${used}/${total}"
    return
  fi
  local pct
  pct=$(echo "scale=1; $used * 100 / $total" | bc 2>/dev/null || echo "0")
  if (( $(echo "$pct > 90" | bc -l 2>/dev/null || echo 0) )); then
    echo -e "${RED}${used}/${total}${NC}"
  elif (( $(echo "$pct > 70" | bc -l 2>/dev/null || echo 0) )); then
    echo -e "${YELLOW}${used}/${total}${NC}"
  else
    echo -e "${GREEN}${used}/${total}${NC}"
  fi
}

fmt_bytes() {
  local bytes="$1"
  if [[ -z "$bytes" || "$bytes" == "0" ]]; then echo "0B"; return; fi
  if (( bytes < 1024 )); then echo "${bytes}B"
  elif (( bytes < 1048576 )); then echo "$(( bytes / 1024 ))K"
  elif (( bytes < 1073741824 )); then echo "$(( bytes / 1048576 ))M"
  else echo "$(( bytes / 1073741824 ))G"
  fi
}

fmt_duration() {
  local secs="$1"
  if [[ -z "$secs" ]]; then echo "0s"; return; fi
  local days=$(( secs / 86400 ))
  local hours=$(( (secs % 86400) / 3600 ))
  local mins=$(( (secs % 3600) / 60 ))
  if (( days > 0 )); then echo "${days}d${hours}h"; else echo "${hours}h${mins}m"; fi
}

safe_get() {
  local val="${1:-}"
  echo "${val:-0}"
}

# ---------------------------------------------------------------------------
# Valkey stats
# ---------------------------------------------------------------------------
get_valkey_stats() {
  local json_out="$1"

  if ! command -v "$VALKEY_CLI" &>/dev/null; then
    if [[ "$json_out" == "true" ]]; then
      echo '{"status":"unavailable","error":"valkey-cli not found"}'
    fi
    return 1
  fi

  local cli_args=(-h "$VALKEY_HOST" -p "$VALKEY_PORT")
  [[ -n "$VALKEY_PASSWORD" ]] && cli_args+=(-a "$VALKEY_PASSWORD")

  local info
  info=$("$VALKEY_CLI" "${cli_args[@]}" INFO ALL 2>/dev/null || true)

  if [[ -z "$info" ]]; then
    if [[ "$json_out" == "true" ]]; then
      echo '{"status":"unavailable","error":"cannot connect"}'
    fi
    return 1
  fi

  local uptime keys_total keyspace_hits keyspace_misses hit_rate
  local used_memory used_memory_rss maxmemory connected_clients

  uptime=$(echo "$info" | grep "^uptime_in_seconds:" | cut -d: -f2 | tr -d '\r' || echo "0")
  keys_total=$(echo "$info" | grep "^keyspace=" | cut -d= -f2 | cut -d, -f1 | cut -d: -f2 2>/dev/null || echo "0")
  keys_total=${keys_total:-0}
  keyspace_hits=$(echo "$info" | grep "^keyspace_hits:" | cut -d: -f2 | tr -d '\r' || echo "0")
  keyspace_misses=$(echo "$info" | grep "^keyspace_misses:" | cut -d: -f2 | tr -d '\r' || echo "0")

  local total_ops=$(( keyspace_hits + keyspace_misses ))
  if [[ "$total_ops" -gt 0 ]]; then
    hit_rate=$(echo "scale=1; $keyspace_hits * 100 / $total_ops" | bc 2>/dev/null || echo "0")
  else
    hit_rate="0"
  fi

  used_memory=$(echo "$info" | grep "^used_memory:" | cut -d: -f2 | tr -d '\r' || echo "0")
  used_memory_rss=$(echo "$info" | grep "^used_memory_rss:" | cut -d: -f2 | tr -d '\r' || echo "0")
  maxmemory=$(echo "$info" | grep "^maxmemory:" | cut -d: -f2 | tr -d '\r' || echo "0")
  connected_clients=$(echo "$info" | grep "^connected_clients:" | cut -d: -f2 | tr -d '\r' || echo "0")

  # DB keys count
  local db_keys=0
  while IFS= read -r line; do
    if [[ "$line" =~ ^db[0-9]+: ]]; then
      local k
      k=$(echo "$line" | grep -oP 'keys=\K[0-9]+' || echo "0")
      db_keys=$(( db_keys + k ))
    fi
  done <<< "$(echo "$info" | grep "^db")"

  if [[ "$json_out" == "true" ]]; then
    cat <<JSONEOF
{
  "status": "ok",
  "uptime_seconds": $uptime,
  "uptime_human": "$(fmt_duration "$uptime")",
  "keys_total": $db_keys,
  "keyspace_hits": $keyspace_hits,
  "keyspace_misses": $keyspace_misses,
  "hit_rate": $hit_rate,
  "used_memory": $used_memory,
  "used_memory_human": "$(fmt_bytes "$used_memory")",
  "used_memory_rss": $used_memory_rss,
  "used_memory_rss_human": "$(fmt_bytes "$used_memory_rss")",
  "maxmemory": $maxmemory,
  "maxmemory_human": "$(fmt_bytes "$maxmemory")",
  "connected_clients": $connected_clients
}
JSONEOF
  else
    echo -e "${BOLD}Valkey Stats${NC}"
    echo -e "  Uptime:       ${CYAN}$(fmt_duration "$uptime")${NC}"
    echo -e "  Keys:         ${CYAN}$db_keys${NC}"
    echo -e "  Hit Rate:     $(colorize_pct "$hit_rate")"
    echo -e "  Memory:       $(colorize_mem "$(fmt_bytes "$used_memory")" "$(fmt_bytes "$maxmemory")")"
    echo -e "  Clients:      ${CYAN}$connected_clients${NC}"
  fi
}

# ---------------------------------------------------------------------------
# Nginx stats from access log
# ---------------------------------------------------------------------------
get_nginx_stats() {
  local json_out="$1"

  if [[ ! -f "$NGINX_ACCESS_LOG" ]]; then
    if [[ "$json_out" == "true" ]]; then
      echo '{"status":"unavailable","error":"access log not found"}'
    fi
    return 1
  fi

  # Parse the last 10k lines for recent cache stats
  local lines
  lines=$(tail -10000 "$NGINX_ACCESS_LOG" 2>/dev/null || echo "")

  if [[ -z "$lines" ]]; then
    if [[ "$json_out" == "true" ]]; then
      echo '{"status":"unavailable","error":"empty access log"}'
    fi
    return 1
  fi

  local total hits misses bypass stale revalidated
  total=$(echo "$lines" | wc -l)
  hits=$(echo "$lines" | grep -oP '"cache_status":"\KHIT' | wc -l)
  misses=$(echo "$lines" | grep -oP '"cache_status":"\KMISS' | wc -l)
  bypass=$(echo "$lines" | grep -oP '"cache_status":"\KBYPASS' | wc -l)
  stale=$(echo "$lines" | grep -oP '"cache_status":"\KSTALE' | wc -l)
  revalidated=$(echo "$lines" | grep -oP '"cache_status":"\KREVALIDATED' | wc -l) 2>/dev/null || revalidated=0

  local hit_rate=0
  local cacheable=$(( hits + misses + stale + revalidated ))
  if [[ "$cacheable" -gt 0 ]]; then
    hit_rate=$(echo "scale=1; ($hits + $stale + $revalidated) * 100 / $cacheable" | bc 2>/dev/null || echo "0")
  fi

  # Check disk cache sizes
  local cache_size=""
  if [[ -d "$NGINX_CACHE_DIRS" ]]; then
    cache_size=$(du -sh "$NGINX_CACHE_DIRS" 2>/dev/null | cut -f1 || echo "N/A")
  fi

  if [[ "$json_out" == "true" ]]; then
    cat <<JSONEOF
{
  "status": "ok",
  "samples": $total,
  "hits": $hits,
  "misses": $misses,
  "bypass": $bypass,
  "stale": $stale,
  "revalidated": $revalidated,
  "hit_rate": $hit_rate,
  "disk_cache_size": "${cache_size:-N/A}"
}
JSONEOF
  else
    echo -e "${BOLD}Nginx Cache Stats${NC}"
    echo -e "  Samples:      ${CYAN}$total${NC} (last 10k requests)"
    echo -e "  HIT:          ${GREEN}$hits${NC}"
    echo -e "  MISS:         ${RED}$misses${NC}"
    echo -e "  BYPASS:       ${YELLOW}$bypass${NC}"
    echo -e "  STALE:        ${MAGENTA}$stale${NC}"
    echo -e "  Hit Rate:     $(colorize_pct "$hit_rate")"
    echo -e "  Disk Cache:   ${CYAN}${cache_size:-N/A}${NC}"
  fi
}

# ---------------------------------------------------------------------------
# Varnish stats
# ---------------------------------------------------------------------------
get_varnish_stats() {
  local json_out="$1"

  if ! command -v "$VARNISHSTAT" &>/dev/null; then
    if [[ "$json_out" == "true" ]]; then
      echo '{"status":"unavailable","error":"varnishstat not found"}'
    fi
    return 1
  fi

  local stats
  stats=$("$VARNISHSTAT" -1 2>/dev/null || true)

  if [[ -z "$stats" ]]; then
    if [[ "$json_out" == "true" ]]; then
      echo '{"status":"unavailable","error":"cannot connect to varnish"}'
    fi
    return 1
  fi

  local hit_rate main_cache_hit main_cache_miss
  local object_count memory_usage uptime

  main_cache_hit=$(echo "$stats" | awk '/^MAIN.cache_hit / {print $2}' | head -1 || echo "0")
  main_cache_miss=$(echo "$stats" | awk '/^MAIN.cache_miss / {print $2}' | head -1 || echo "0")
  main_cache_hit=${main_cache_hit:-0}
  main_cache_miss=${main_cache_miss:-0}

  local total_cache=$(( main_cache_hit + main_cache_miss ))
  if [[ "$total_cache" -gt 0 ]]; then
    hit_rate=$(echo "scale=1; $main_cache_hit * 100 / $total_cache" | bc 2>/dev/null || echo "0")
  else
    hit_rate="0"
  fi

  object_count=$(echo "$stats" | awk '/^MAIN.n_object / {print $2}' | head -1 || echo "0")
  memory_usage=$(echo "$stats" | awk '/^MAIN.s_mem / {print $2}' | head -1 || echo "0")
  uptime=$(echo "$stats" | awk '/^MAIN.uptime / {print $2}' | head -1 || echo "0")

  if [[ "$json_out" == "true" ]]; then
    cat <<JSONEOF
{
  "status": "ok",
  "cache_hit": $main_cache_hit,
  "cache_miss": $main_cache_miss,
  "hit_rate": $hit_rate,
  "object_count": ${object_count:-0},
  "memory_usage": ${memory_usage:-0},
  "memory_usage_human": "$(fmt_bytes "${memory_usage:-0}")",
  "uptime_seconds": ${uptime:-0},
  "uptime_human": "$(fmt_duration "${uptime:-0}")"
}
JSONEOF
  else
    echo -e "${BOLD}Varnish Stats${NC}"
    echo -e "  Uptime:       ${CYAN}$(fmt_duration "${uptime:-0}")${NC}"
    echo -e "  Objects:      ${CYAN}${object_count:-0}${NC}"
    echo -e "  Hit Rate:     $(colorize_pct "$hit_rate")"
    echo -e "  Memory:       ${CYAN}$(fmt_bytes "${memory_usage:-0}")${NC}"
  fi
}

# ---------------------------------------------------------------------------
# ATS (TrafficServer) stats
# ---------------------------------------------------------------------------
get_ats_stats() {
  local json_out="$1"

  if ! command -v "$TRAFFIC_CTL" &>/dev/null; then
    if [[ "$json_out" == "true" ]]; then
      echo '{"status":"unavailable","error":"traffic_ctl not found"}'
    fi
    return 1
  fi

  local server_status
  server_status=$("$TRAFFIC_CTL" server status 2>/dev/null || true)

  if [[ -z "$server_status" ]]; then
    if [[ "$json_out" == "true" ]]; then
      echo '{"status":"unavailable","error":"cannot connect to ATS"}'
    fi
    return 1
  fi

  local cache_hits cache_misses hit_rate
  cache_hits=$("$TRAFFIC_CTL" metric get proxy.process.cache_total_hits 2>/dev/null | awk '{print $2}' || echo "0")
  cache_misses=$("$TRAFFIC_CTL" metric get proxy.process.cache_total_misses 2>/dev/null | awk '{print $2}' || echo "0")

  cache_hits=${cache_hits:-0}
  cache_misses=${cache_misses:-0}

  local total=$(( cache_hits + cache_misses ))
  if [[ "$total" -gt 0 ]]; then
    hit_rate=$(echo "scale=1; $cache_hits * 100 / $total" | bc 2>/dev/null || echo "0")
  else
    hit_rate="0"
  fi

  # Additional metrics
  local ram_cache_hits ram_cache_misses
  ram_cache_hits=$("$TRAFFIC_CTL" metric get proxy.process.cache_ram_cache_hits 2>/dev/null | awk '{print $2}' || echo "0")
  ram_cache_misses=$("$TRAFFIC_CTL" metric get proxy.process.cache_ram_cache_misses 2>/dev/null | awk '{print $2}' || echo "0")

  local ats_uptime
  ats_uptime=$("$TRAFFIC_CTL" metric get proxy.node.proc.uptime 2>/dev/null | awk '{print $2}' || echo "0")

  if [[ "$json_out" == "true" ]]; then
    cat <<JSONEOF
{
  "status": "ok",
  "server_status": "${server_status}",
  "cache_hits": $cache_hits,
  "cache_misses": $cache_misses,
  "hit_rate": $hit_rate,
  "ram_cache_hits": ${ram_cache_hits:-0},
  "ram_cache_misses": ${ram_cache_misses:-0},
  "uptime_seconds": ${ats_uptime:-0},
  "uptime_human": "$(fmt_duration "${ats_uptime:-0}")"
}
JSONEOF
  else
    echo -e "${BOLD}TrafficServer (ATS) Stats${NC}"
    echo -e "  Status:       ${CYAN}${server_status}${NC}"
    echo -e "  Uptime:       ${CYAN}$(fmt_duration "${ats_uptime:-0}")${NC}"
    echo -e "  Hit Rate:     $(colorize_pct "$hit_rate")"
    echo -e "  RAM Hits:     ${GREEN}${ram_cache_hits:-0}${NC}"
    echo -e "  RAM Misses:   ${RED}${ram_cache_misses:-0}${NC}"
  fi
}

# ---------------------------------------------------------------------------
# System disk cache stats
# ---------------------------------------------------------------------------
get_system_stats() {
  local json_out="$1"

  local total_size=""
  local system_mem_total system_mem_used system_mem_pct

  if [[ -n "$DISK_CACHE_DIRS" ]]; then
    IFS=' ' read -ra dirs <<< "$DISK_CACHE_DIRS"
    local total_bytes=0
    for dir in "${dirs[@]}"; do
      if [[ -d "$dir" ]]; then
        local size
        size=$(du -sb "$dir" 2>/dev/null | cut -f1 || echo "0")
        total_bytes=$(( total_bytes + size ))
      fi
    done
    total_size="$(fmt_bytes "$total_bytes")"
  fi

  # System memory
  if [[ -f /proc/meminfo ]]; then
    system_mem_total=$(grep "^MemTotal:" /proc/meminfo | awk '{print $2}')
    system_mem_total=$(( system_mem_total * 1024 ))
    system_mem_used=$(grep "^Active:" /proc/meminfo | awk '{print $2}')
    system_mem_used=$(( system_mem_used * 1024 ))
    if [[ "$system_mem_total" -gt 0 ]]; then
      system_mem_pct=$(echo "scale=1; $system_mem_used * 100 / $system_mem_total" | bc 2>/dev/null || echo "0")
    fi
  fi

  if [[ "$json_out" == "true" ]]; then
    cat <<JSONEOF
{
  "disk_cache_size": "${total_size:-N/A}",
  "system_memory_total": ${system_mem_total:-0},
  "system_memory_total_human": "$(fmt_bytes "${system_mem_total:-0}")",
  "system_memory_used": ${system_mem_used:-0},
  "system_memory_used_human": "$(fmt_bytes "${system_mem_used:-0}")",
  "system_memory_usage_pct": ${system_mem_pct:-0}
}
JSONEOF
  else
    echo -e "${BOLD}System Cache Stats${NC}"
    echo -e "  Disk Cache:   ${CYAN}${total_size:-N/A}${NC}"
    echo -e "  System Mem:   $(colorize_mem "$(fmt_bytes "${system_mem_used:-0}")" "$(fmt_bytes "${system_mem_total:-0}")")"
  fi
}

# ---------------------------------------------------------------------------
# JSON output - collect all
# ---------------------------------------------------------------------------
collect_all_json() {
  echo "{"
  echo "  \"timestamp\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\","
  echo "  \"valkey\": $(get_valkey_stats "true"),"
  echo "  \"nginx\": $(get_nginx_stats "true"),"
  echo "  \"varnish\": $(get_varnish_stats "true"),"
  echo "  \"ats\": $(get_ats_stats "true"),"
  echo "  \"system\": $(get_system_stats "true")"
  echo "}"
}

# ---------------------------------------------------------------------------
# Table output
# ---------------------------------------------------------------------------
print_table() {
  # Clear screen for watch mode
  [[ "$WATCH_MODE" == true ]] && clear

  local ts
  ts=$(date '+%Y-%m-%d %H:%M:%S')

  echo -e "${BOLD}${CYAN}==============================================${NC}"
  echo -e "${BOLD}${CYAN}  MyWorkSpace Cache Stats - $ts${NC}"
  echo -e "${BOLD}${CYAN}==============================================${NC}"
  echo ""

  # Get all stats
  local valkey_output nginx_output varnish_output ats_output system_output
  valkey_output=$(get_valkey_stats "false" 2>/dev/null || echo -e "${RED}  Valkey: Unavailable${NC}")
  nginx_output=$(get_nginx_stats "false" 2>/dev/null || echo -e "${RED}  Nginx: Unavailable${NC}")
  varnish_output=$(get_varnish_stats "false" 2>/dev/null || echo -e "${RED}  Varnish: Unavailable${NC}")
  ats_output=$(get_ats_stats "false" 2>/dev/null || echo -e "${RED}  ATS: Unavailable${NC}")
  system_output=$(get_system_stats "false" 2>/dev/null || echo -e "${RED}  System: Unavailable${NC}")

  echo -e "$valkey_output"
  echo ""
  echo -e "$nginx_output"
  echo ""
  echo -e "$varnish_output"
  echo ""
  echo -e "$ats_output"
  echo ""
  echo -e "$system_output"

  echo ""
  echo -e "${CYAN}----------------------------------------------${NC}"
  echo -e "  Refresh: every ${WATCH_INTERVAL}s | Press Ctrl+C to exit"
  echo -e "${CYAN}----------------------------------------------${NC}"
}

# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
main() {
  if [[ "$OUTPUT_MODE" == "json" ]]; then
    collect_all_json
    return
  fi

  if [[ "$WATCH_MODE" == true ]]; then
    while true; do
      print_table
      sleep "$WATCH_INTERVAL"
    done
  else
    print_table
  fi
}

main "$@"
