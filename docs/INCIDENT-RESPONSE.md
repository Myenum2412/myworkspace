# Incident Response Procedures

## Severity Levels

| Level | Definition | Response Time | Examples |
|-------|------------|---------------|----------|
| **SEV1** | Complete service outage or data loss | Immediate | Site down, DB corrupted, auth broken |
| **SEV2** | Major feature degradation | < 1 hour | File uploads failing, search down |
| **SEV3** | Partial degradation, no user impact | < 1 day | Slow queries, cache misses |
| **SEV4** | Minor issues, cosmetic | < 1 week | UI glitches, log warnings |

---

## Incident Lifecycle

### 1. Detection
- Prometheus alerts (PagerDuty / Slack)
- User-reported at support@
- Health check failure
- Uptime monitor (e.g., Better Uptime, Pingdom)

### 2. Triage
1. Acknowledge alert
2. Determine severity (SEV1–SEV4)
3. For SEV1: Immediately notify on-call via PagerDuty
4. Open incident channel: `#incident-<date>-<seq>`

### 3. Diagnosis

#### Check health endpoint
```bash
curl -s https://yourdomain.com/api/health
```

#### Check logs
```bash
docker compose logs --tail=200 backend | grep -i error
docker compose logs --tail=100 frontend | grep -i error
```

#### Check infrastructure
```bash
make status
df -h
free -m
docker compose ps
```

#### Check recent deployments
```bash
# If using Docker
cat /var/log/myworkspace/deploy-*.log | tail -20

# If using K8s
kubectl rollout history deployment/myworkspace-backend -n myworkspace
kubectl rollout history deployment/myworkspace-frontend -n myworkspace
```

### 4. Mitigation

**Option A: Rollback**
```bash
make rollback
```

**Option B: Scale up**
```bash
docker compose up -d --scale backend=3
```

**Option C: Restart services**
```bash
make docker-restart
```

**Option D: Failover**
- If region-level outage, switch DNS to DR region
- Restore from backup if data corruption

### 5. Resolution
1. Confirm fix via health check
2. Run `make verify`
3. Monitor for 15 minutes after fix
4. Close incident channel
5. File postmortem (within 48 hours)

### 6. Postmortem
Document in `docs/postmortems/YYYY-MM-DD-description.md`:
- **Summary**: What happened
- **Timeline**: Detection → mitigation → resolution
- **Root Cause**: Why it happened
- **Impact**: Users affected, downtime duration
- **Action Items**: Prevent recurrence
- **Lessons Learned**: Process improvements

---

## Specific Incident Scenarios

### Service Unresponsive

```yaml
Symptoms: Health check fails, users see 502/503
Severity: SEV1
Triage:
  1. Check if it's a deployment issue: make status
  2. Check Docker: docker compose ps
  3. Check disk: df -h
  4. Check memory: free -m
Mitigation:
  1. docker compose restart backend frontend
  2. If persistent: docker compose down && docker compose up -d
  3. Rollback if recent deployment: make rollback
```

### Database Performance Degraded

```yaml
Symptoms: Slow queries, high API latency, p95 > 3s
Severity: SEV2
Triage:
  1. Check MongoDB: docker compose exec mongodb mongosh
  2. db.currentOp() — find slow queries
  3. Check indexes: use db.collection.getIndexes()
  4. Check Atlas metrics (if hosted)
Mitigation:
  1. Kill slow queries: db.killOp(opid)
  2. Add missing indexes
  3. Scale up MongoDB
```

### Authentication Failures

```yaml
Symptoms: Users cannot log in, 401 errors
Severity: SEV1
Triage:
  1. Check auth logs: docker compose logs backend | grep -i auth
  2. Check Redis (session store): docker compose exec redis redis-cli keys "*"
  3. Verify JWT_SECRET hasn't changed
  4. Check if rate limiting is blocking: docker compose logs backend | grep "rate-limit"
Mitigation:
  1. Restart backend: docker compose restart backend
  2. If rate limiting: whitelist or increase limits temporarily
```

### File Upload Failures

```yaml
Symptoms: Uploads fail, 413 or 500 errors
Severity: SEV2
Triage:
  1. Check disk space: df -h
  2. Check upload logs: docker compose logs backend | grep -i upload
  3. Check R2 connectivity (if using object storage)
  4. Check TUS temp directory
Mitigation:
  1. Free disk space (clean up temp uploads)
  2. Restart TUS middleware
  3. Check R2 credentials
```

### Queue (RabbitMQ) Failure

```yaml
Symptoms: Background jobs not processing, notifications delayed
Severity: SEV2
Triage:
  1. docker compose exec rabbitmq rabbitmqctl status
  2. docker compose exec rabbitmq rabbitmqctl list_queues
  3. Check backlog: docker compose logs backend | grep -i queue
Mitigation:
  1. docker compose restart rabbitmq
  2. Restart backend workers
```

---

## Communication Templates

### SEV1 Notification

```
🔴 SEV1 INCIDENT: [brief description]
Service: [service name]
Impact: [what's affected]
Started: [timestamp]
Ecosystem: [channel link]
On-call: [name]
Status: [Investigating / Mitigating / Resolved]
```

### Status Update (every 30 min during SEV1)

```
🔄 Update: [incident tag]
Progress: [what we've done]
Next Steps: [what we're doing]
ETA: [estimated resolution]
```

### Resolution

```
✅ Resolved: [incident tag]
Root Cause: [brief description]
Fix: [what was done]
Monitoring: [period]
Postmortem: [link]
```

### Postmortem Template

```markdown
# Postmortem: [Date] - [Title]

## Summary

## Timeline

| Time | Event |
|------|-------|
| T-0 | Alert triggered |
| T+5 | On-call acknowledged |
| T+15 | Root cause identified |
| T+30 | Mitigation applied |
| T+45 | Services confirmed healthy |

## Root Cause

## Impact
- Downtime: X minutes
- Users affected: X
- Error rate: X%

## Action Items
- [ ] Item 1 (SEV1/P0, owner, due date)
- [ ] Item 2 (SEV2/P1, owner, due date)

## Lessons Learned
```
