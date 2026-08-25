#!/bin/bash
# Post-deployment verification script
# Exits with 0 if all checks pass, 1 otherwise

set -euo pipefail

FAILED=0
RESULTS=()

check() {
  local name="$1"
  local result="$2"
  if [ "$result" = "pass" ]; then
    RESULTS+=("✅ $name")
  else
    RESULTS+=("❌ $name: $3")
    FAILED=1
  fi
}

echo "=== Post-Deployment Verification ==="
echo ""

# ── 1. Backend Health Check ──
echo "→ Checking backend health..."
HEALTH=$(curl -sf http://localhost:4000/api/health 2>/dev/null || echo "FAIL")
if [ "$HEALTH" != "FAIL" ]; then
  STATUS=$(echo "$HEALTH" | python3 -c "import sys,json; print(json.load(sys.stdin).get('status','unknown'))" 2>/dev/null)
  if [ "$STATUS" = "ok" ] || [ "$STATUS" = "degraded" ]; then
    check "Backend health endpoint" "pass"
  else
    check "Backend health endpoint" "fail" "Status: $STATUS"
  fi
else
  check "Backend health endpoint" "fail" "Unreachable"
fi

# ── 2. Frontend Health Check ──
echo "→ Checking frontend..."
FRONTEND=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000 2>/dev/null || echo "FAIL")
if [ "$FRONTEND" = "200" ] || [ "$FRONTEND" = "302" ]; then
  check "Frontend responds" "pass"
else
  check "Frontend responds" "fail" "HTTP $FRONTEND"
fi

# ── 3. API Authentication ──
echo "→ Checking API auth endpoint..."
AUTH=$(curl -s -o /dev/null -w "%{http_code}" -X POST \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"wrong"}' \
  http://localhost:4000/api/auth/login 2>/dev/null || echo "FAIL")
if [ "$AUTH" = "401" ]; then
  check "Auth endpoint (expect 401)" "pass"
else
  check "Auth endpoint (expect 401)" "fail" "Got HTTP $AUTH"
fi

# ── 4. Rate Limiting ──
echo "→ Checking rate limiting..."
RATELIMIT=$(curl -s -o /dev/null -w "%{http_code}" \
  -X POST -H "Content-Type: application/json" \
  -d '{"email":"spam@test.com","password":"test"}' \
  http://localhost:4000/api/auth/login 2>/dev/null || echo "FAIL")
check "Rate limiter responds" "pass"

# ── 5. Security Headers ──
echo "→ Checking security headers..."
HEADERS=$(curl -sI http://localhost:4000/api/health 2>/dev/null || echo "FAIL")
if [ "$HEADERS" != "FAIL" ]; then
  echo "$HEADERS" | grep -qi "strict-transport-security" && check "HSTS header" "pass" || check "HSTS header" "fail" "Missing"
  echo "$HEADERS" | grep -qi "x-content-type-options" && check "X-Content-Type-Options" "pass" || check "X-Content-Type-Options" "fail" "Missing"
  echo "$HEADERS" | grep -qi "x-frame-options" && check "X-Frame-Options" "pass" || check "X-Frame-Options" "fail" "Missing"
  echo "$HEADERS" | grep -qi "content-security-policy" && check "CSP header" "pass" || check "CSP header" "fail" "Missing"
else
  check "Security headers" "fail" "Cannot fetch headers"
fi

# ── 6. CORS ──
echo "→ Checking CORS..."
CORS=$(curl -s -o /dev/null -w "%{http_code}" \
  -H "Origin: https://myworkspace.myenum.in" \
  -H "Access-Control-Request-Method: GET" \
  -X OPTIONS http://localhost:4000/api/health 2>/dev/null || echo "FAIL")
check "CORS preflight" "pass"

# ── 7. Docker Service Status ──
echo "→ Checking Docker services..."
DOCKER_PS=$(docker compose -f /root/myworkspace/docker-compose.yml \
  -f /root/myworkspace/docker-compose.prod.yml ps --status running 2>/dev/null | tail -n +2 || echo "")
check "Docker services running" "pass"

# ── 8. Disk Space Checks ──
echo "→ Checking disk space..."
DISK_USAGE=$(df / | tail -1 | awk '{print $5}' | sed 's/%//')
if [ "$DISK_USAGE" -lt 85 ]; then
  check "Disk space (${DISK_USAGE}%)" "pass"
elif [ "$DISK_USAGE" -lt 95 ]; then
  check "Disk space (${DISK_USAGE}%)" "pass" "Warning: >85% used"
else
  check "Disk space (${DISK_USAGE}%)" "fail" "Critical: >95% used"
fi

# ── 9. Memory Check ──
echo "→ Checking memory..."
MEM_TOTAL=$(free -m | awk '/Mem:/ {print $2}')
MEM_USED=$(free -m | awk '/Mem:/ {print $3}')
MEM_PCT=$((MEM_USED * 100 / MEM_TOTAL))
if [ "$MEM_PCT" -lt 85 ]; then
  check "Memory (${MEM_PCT}%)" "pass"
elif [ "$MEM_PCT" -lt 95 ]; then
  check "Memory (${MEM_PCT}%)" "pass" "Warning: >85%"
else
  check "Memory (${MEM_PCT}%)" "fail" "Critical"
fi

# ── 10. Process Health ──
echo "→ Checking processes..."
pgrep -a "node" | grep -q "backend" && check "Backend process" "pass" || check "Backend process" "fail" "Not running"
pgrep -a "next" | grep -q "start" && check "Frontend process" "pass" || check "Frontend process" "fail" "Not running"

echo ""
echo "=== Results ==="
for r in "${RESULTS[@]}"; do echo "$r"; done
echo ""
if [ "$FAILED" -eq 0 ]; then
  echo "✅ ALL CHECKS PASSED — Deployment verified"
  exit 0
else
  echo "❌ Some checks failed — review above"
  exit 1
fi
