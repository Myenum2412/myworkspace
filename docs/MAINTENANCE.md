# Scheduled Maintenance Procedures

## Maintenance Window Policy

| Operation | Window | Expected Downtime | Frequency |
|-----------|--------|-------------------|-----------|
| App deployment | Any | Zero (rolling) | As needed |
| DB migration | Off-peak | Zero (backward compatible) | As needed |
| SSL renewal | Any | Zero | Every 60 days (auto) |
| Backup test | Off-peak | Zero | Quarterly |
| Log rotation | Any | Zero | Weekly |
| OS patches | Scheduled | 5–10 min | Monthly |
| Redis restart | Off-peak | < 1s | Quarterly |
| MongoDB upgrade | Scheduled | 5–15 min | Quarterly |
| Full DR test | Scheduled | 1–2 hrs | Annually |

---

## Routine Tasks

### Daily

```bash
# Quick health check
curl -s https://yourdomain.com/api/health | python3 -m json.tool

# Check disk usage
df -h /var/lib/docker

# Check Docker service status
docker compose ps
```

### Weekly

```bash
# Rotate logs
make rotate-logs

# Review error logs
docker compose logs --since=7d backend | grep -c '"level":50\|"level":60'
# Pino: 50=error, 60=fatal

# Check backup size
du -sh /backups/myworkspace
```

### Monthly

```bash
# Prune unused Docker resources
docker system prune -f --volumes

# Check for dangling images
docker image ls -f dangling=true -q | wc -l

# Review Sentry error trends
# Check for new errors or error spikes

# Check SSL cert expiry
echo | openssl s_client -connect yourdomain.com:443 -servername yourdomain.com 2>/dev/null | openssl x509 -noout -dates
```

### Quarterly

```bash
# Full backup verification
make backup
# Restore to isolated test environment
docker compose -f docker-compose.yml -f docker-compose.test.yml up -d
make restore FILE=/backups/mongodb/latest.gz
# Verify data integrity
docker compose exec mongodb mongosh myworkspace --eval "db.getCollectionNames().length"

# Review and update alert thresholds
# Edit: k8s/monitoring/prometheus-rules.yaml

# Test failover
# If using Kubernetes: kubectl drain node
```

---

## Maintenance Checklists

### Pre-Deployment Checklist

- [ ] Backend passes `tsc --noEmit`
- [ ] Frontend passes `tsc --noEmit`
- [ ] Backend build succeeds (`npm run build`)
- [ ] Frontend build succeeds (`npm run build`)
- [ ] All tests pass (unit + integration)
- [ ] `.env` files reviewed for new variables
- [ ] Migration script written (if schema changes)
- [ ] Backup taken
- [ ] Rollback plan confirmed

### Post-Deployment Checklist

- [ ] Health endpoint returns `ok`
- [ ] Frontend loads without errors
- [ ] Authentication works (login/logout)
- [ ] Core flows work (CRUD operations)
- [ ] File uploads work
- [ ] WebSocket connections established
- [ ] RabbitMQ queues healthy
- [ ] Cache hit rate normal
- [ ] Error rate not elevated
- [ ] Memory/CPU within normal range
- [ ] Alertmanager not firing new alerts
- [ ] All replicas up and serving

### Backup Verification Checklist

- [ ] Backup file exists and is non-empty
- [ ] Restore to test environment succeeds
- [ ] Data count matches production (`db.<collection>.countDocuments()`)
- [ ] Latest documents present
- [ ] Indexes present after restore
- [ ] Redis RDB loads without error

### SSL Certificate Checklist

- [ ] Certificate valid (>30 days to expiry)
- [ ] OCSP stapling enabled and working
- [ ] TLS 1.3 supported
- [ ] HSTS header present
- [ ] HTTP → HTTPS redirect works
- [ ] Wildcard cert covers all subdomains

---

## Upgrade Procedures

### Node.js Version Upgrade

```bash
# 1. Update Docker base images
sed -i 's/node:22-alpine/node:23-alpine/g' backend/Dockerfile frontend/Dockerfile

# 2. Update CI/CD
sed -i 's/NODE_VERSION: "22"/NODE_VERSION: "23"/' .github/workflows/*.yml

# 3. Build and test
make build
make test

# 4. Deploy to staging
# 5. Deploy to production
```

### MongoDB Version Upgrade

```bash
# 1. Take full backup
make backup

# 2. Update docker-compose.yml image tag
sed -i 's/mongo:7/mongo:8/g' docker-compose.yml

# 3. Test in staging environment
# 4. Schedule downtime window (5-15 min)
# 5. Deploy to production
# 6. Run db.setFeatureCompatibilityVersion() if required
# 7. Verify all queries still work
```

### Redis Version Upgrade

```bash
# 1. Take RDB backup
docker compose exec redis redis-cli --rdb /tmp/backup.rdb

# 2. Update docker-compose.yml
sed -i 's/redis:7-alpine/redis:8-alpine/g' docker-compose.yml

# 3. Deploy (quick restart)
make docker-restart
```

---

## Disaster Recovery

### Data Corruption Recovery

```bash
# 1. Stop application
docker compose stop backend frontend

# 2. Restore MongoDB
make restore FILE=/backups/mongodb/latest.gz

# 3. Restart and verify
docker compose start backend frontend
make verify
```

### Full Region Failover

```bash
# 1. Update DNS to DR region
# 2. Start services in DR region
make docker-up

# 3. Restore data from last backup
make restore FILE=/backups/s3/latest.gz

# 4. Verify
make verify
```

See [INCIDENT-RESPONSE.md](./INCIDENT-RESPONSE.md) for detailed incident procedures.
