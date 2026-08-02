#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
# Backend 502 Diagnostic & Recovery Script
# Run this on the AWS server (SSH in first, then: bash fix-backend-502.sh)
# ─────────────────────────────────────────────────────────────────────────────

echo "=== PM2 Process Status ==="
pm2 status

echo ""
echo "=== Last 50 Backend Log Lines ==="
pm2 logs --nostream --lines 50 2>&1 | tail -60

echo ""
echo "=== Port 4000 Listening? ==="
ss -tlnp | grep 4000 || echo "NOTHING listening on port 4000"

echo ""
echo "=== Nginx Status ==="
sudo systemctl status nginx --no-pager -l | head -30

echo ""
echo "=== Nginx Error Log (last 20 lines) ==="
sudo tail -20 /var/log/nginx/error.log 2>/dev/null || echo "No nginx error log found"

echo ""
echo "=== Attempting PM2 Restart ==="
pm2 restart all

echo ""
echo "=== PM2 Status After Restart ==="
sleep 3
pm2 status

echo ""
echo "=== Port 4000 After Restart ==="
ss -tlnp | grep 4000 || echo "STILL nothing on port 4000 — check backend startup errors above"
