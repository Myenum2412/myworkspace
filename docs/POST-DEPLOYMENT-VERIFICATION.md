# Post-Deployment Verification Checklist

## Run this checklist after every production deployment.

### 1. Health & Availability

- [ ] `GET /api/health` returns `{"status":"ok"}`
- [ ] Frontend loads at `https://yourdomain.com` (HTTP 200)
- [ ] All backend pods/replicas are healthy
- [ ] All frontend pods/replicas are healthy
- [ ] No 5xx errors in logs (`docker compose logs backend | grep "status.*5[0-9][0-9]"`)

### 2. Authentication

- [ ] Login page loads without errors
- [ ] Valid credentials → successful login
- [ ] Invalid credentials → 401 with error message
- [ ] Rate limiting returns 429 after too many attempts
- [ ] Session persists across page reloads
- [ ] Logout clears session and redirects

### 3. Core Features

- [ ] Dashboard loads with correct data
- [ ] File upload works (small + large files)
- [ ] File download works
- [ ] File sharing generates valid link
- [ ] Search returns results
- [ ] User settings can be saved
- [ ] Notifications appear correctly

### 4. WebSocket / Real-time

- [ ] Socket.IO connection established (`/api/socketio`)
- [ ] Real-time notifications arrive
- [ ] No WebSocket errors in console
- [ ] Reconnection after disconnect works

### 5. Background Jobs

- [ ] RabbitMQ queues are declared and healthy
- [ ] Agenda jobs are scheduled
- [ ] Email sending works (if configured)
- [ ] Session cleanup cron runs

### 6. Cache & Performance

- [ ] Redis is connected (`GET /api/health` shows Redis status)
- [ ] Cache hit ratio normal (>50%)
- [ ] API response times < 500ms for common endpoints
- [ ] No memory leaks (memory stable after 5 minutes)

### 7. Security

- [ ] HTTPS enforced (HTTP → HTTPS redirect)
- [ ] HSTS header present (`curl -sI https://yourdomain.com | grep -i hsts`)
- [ ] CSP header present
- [ ] CORS header allows configured origins
- [ ] JWT token expires and refresh works
- [ ] Rate limits active (auth, upload, search, API)

### 8. Monitoring & Observability

- [ ] Prometheus `/api/metrics` returns valid metrics
- [ ] Prometheus targets are up
- [ ] Grafana dashboard shows current data
- [ ] Sentry error tracking active (no DSN errors)
- [ ] Logs are flowing to configured destinations
- [ ] Alerts are in active mode (not silenced)

### 9. Integration Checks

- [ ] MongoDB replicaset healthy (if configured)
- [ ] Object storage (R2/S3) uploads work
- [ ] CDN serves static assets (if configured)
- [ ] Email delivery works (SMTP or Resend)

### 10. Rollback Readiness

- [ ] Previous image tag saved: `cat /tmp/myworkspace-previous-tag`
- [ ] Rollback command available: `make rollback`
- [ ] Latest backup confirmed: `ls -lt /backups/mongodb/ | head -3`

---

## Quick Validation Script

```bash
# Run all checks automatically
bash scripts/verify-deployment.sh
```

## Continuous Monitoring After Deploy

| Time | Check | Tool |
|------|-------|------|
| +1 min | Health endpoint | Uptime monitor |
| +5 min | Error rate < threshold | Prometheus alert |
| +15 min | No incident reports | Sentry + logs |
| +1 hour | Memory/CPU stable | Grafana dashboard |
| +24 hours | User-reported issues | Support channel |
