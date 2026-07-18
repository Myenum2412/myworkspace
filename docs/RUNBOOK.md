# Operations Runbook

## System Architecture

```
                         ┌──────────┐
                         │  Client   │
                         └────┬─────┘
                              │ HTTPS
                         ┌────▼─────┐
                         │  Caddy   │  ← TLS termination, HTTP/3, caching
                         └────┬─────┘
                              │
              ┌───────────────┼───────────────┐
              │               │               │
         ┌────▼────┐   ┌─────▼──────┐   ┌────▼────┐
         │ Frontend │   │  Backend   │   │ Static  │
         │ :3000    │   │  :4000     │   │ Assets  │
         └─────────┘   └─────┬──────┘   └─────────┘
                             │
              ┌──────────────┼──────────────┐
              │              │              │
         ┌────▼────┐   ┌────▼────┐   ┌─────▼─────┐
         │ MongoDB │   │  Redis  │   │ RabbitMQ  │
         │ :27017  │   │ :6379   │   │ :5672      │
         └─────────┘   └─────────┘   └───────────┘
```

---

## Service Management

### Docker Compose

| Command | Description |
|---------|-------------|
| `make status` | Show all service statuses |
| `make docker-up` | Start all services |
| `make docker-down` | Stop all services |
| `make docker-restart` | Restart all services |
| `make docker-logs` | Tail all service logs |

### Kubernetes

```bash
kubectl get pods -n myworkspace -w
kubectl describe pod <pod-name> -n myworkspace
kubectl logs -f deployment/myworkspace-backend -n myworkspace
kubectl exec -it <pod-name> -n myworkspace -- sh
```

---

## Health Checks

| Endpoint | Purpose | Expected |
|----------|---------|----------|
| `GET /api/health` | Application health | `{"status":"ok"}` |
| `GET /api/cache/health` | Cache layer health | Per-layer status |
| `GET /api/metrics` | Prometheus metrics | Text format |

### Automated health monitoring

```bash
# Quick check
curl -s http://localhost:4000/api/health | python3 -m json.tool

# Detailed deployment verification
make verify
```

---

## Logs

### Log Locations

| Service | Location | Format |
|---------|----------|--------|
| Backend | Docker logs / `journalctl` | JSON (Pino) |
| Frontend | Docker logs / `journalctl` | Plain text |
| Caddy | `/var/log/caddy/myworkspace.log` | JSON |
| Nginx | `/var/log/nginx/access.log` | JSON combined |

### Log Levels

Backend uses Pino with levels: `fatal` → `error` → `warn` → `info` → `debug` → `trace`

Set via `LOG_LEVEL` env var (default: `info` in production).

### Querying logs

```bash
# View backend errors
docker compose logs --tail=100 backend | grep -i error

# Watch real-time
docker compose logs -f backend

# Filter by request ID
docker compose logs backend | grep "req-12345"

# Pino log parsing
docker compose logs backend | npx pino-pretty
```

---

## Monitoring

### Prometheus Metrics

Available at `GET /api/metrics`. Key metrics:

| Metric | Type | Description |
|--------|------|-------------|
| `api_requests_total` | Counter | Request count by method, path, status |
| `api_request_duration_ms` | Histogram | Request latency distribution |
| `process_memory_heap_used_bytes` | Gauge | Heap memory usage |
| `process_memory_rss_bytes` | Gauge | RSS memory |
| `server_uptime_seconds` | Gauge | Server uptime |
| `uploads_completed_total` | Counter | File uploads completed |
| `cache_hit_count` | Counter | Cache hits |
| `db_query_duration_ms` | Histogram | Database query latency |

### Grafana Dashboard

Pre-built dashboard at `k8s/monitoring/grafana-dashboard.json`.

Panels: Request Rate, Error Rate, Latency (p50/p95/p99), CPU, Memory, Cache Hit Ratio, DB Query Duration, Upload Activity.

### Sentry

Error tracking via Sentry. Configure `SENTRY_DSN` in backend env.
- Traces sample rate: 0.1 (production)
- Profiles sample rate: 0.1

---

## Alerts

### Prometheus Alert Rules

| Alert | Condition | Severity | Response |
|-------|-----------|----------|----------|
| HighErrorRate | >5% errors in 5m | critical | Check logs, investigate errors |
| HighLatency | p95 > 2s for 5m | warning | Check DB, Redis, queue |
| HighMemoryUsage | RSS > 800MB | warning | Scale up or investigate leak |
| MongoDBDown | Scrape timeout | critical | Check MongoDB connection |
| RedisDown | Scrape timeout | critical | Check Redis connection |
| PodRestarting | >3 restarts/hr | warning | Check pod logs |
| HighCPU | >80% for 5m | warning | Scale up or optimize |
| LowCacheHitRatio | <50% for 10m | warning | Review cache warming strategy |
| DiskSpaceLow | <10% free | critical | Clean up or expand disk |

### Alert Destinations

- **Critical**: Slack #critical + PagerDuty
- **Warning**: Slack #alerts

Configure via Alertmanager (`cache/monitoring/alertmanager/alertmanager.yml`).

---

## Backup

```bash
# Manual backup
make backup

# Restore
make restore FILE=/backups/mongodb/dump_20250101_000000.gz
```

Backup contents:
- MongoDB: Full dump via `mongodump` (gzip compressed)
- Redis: RDB snapshot
- Configs: docker-compose, Caddyfile, k8s manifests

### Schedule

Backups run every 6 hours via cron:
```
0 */6 * * * /opt/myworkspace/scripts/cron-backup.sh
```

Retention: 30 days (configurable via `RETENTION_DAYS`).

See [BACKUP-RESTORE.md](./BACKUP-RESTORE.md) for detailed procedures.

---

## Maintenance

### Daily

```bash
make health        # Check health
make status        # Check all services
```

### Weekly

```bash
make rotate-logs   # Rotate application logs
```

### Monthly

```bash
docker system df   # Check Docker disk usage
docker image prune -f  # Clean unused images
```

### Quarterly

- Review and rotate secrets
- Update SSL certificates (auto-renewed)
- Review Prometheus alert rules
- Test backup restoration
- Review Sentry error trends

---

## Troubleshooting

### Service Won't Start

```bash
docker compose logs backend    # Check startup errors
docker compose exec backend sh # Inspect container
# Check env vars
docker compose exec backend env | grep -E 'MONGODB_URI|JWT_SECRET'
```

### Database Connection Issues

```bash
docker compose exec mongodb mongosh --eval "db.runCommand({ping:1})"
```

### Redis Connection Issues

```bash
docker compose exec redis redis-cli ping  # Should return PONG
```

### RabbitMQ Issues

```bash
docker compose exec rabbitmq rabbitmqctl status
docker compose exec rabbitmq rabbitmqctl list_queues
```

### High Memory Usage

```bash
docker compose logs --tail=50 backend | grep -i memory
curl -s http://localhost:4000/api/health | python3 -c "import sys,json; print(json.load(sys.stdin)['metrics']['memory'])"
```

### Slow Response Times

```bash
# Check API latency
curl -w "@config" -o /dev/null -s http://localhost:4000/api/health
# where config contains: {"connect":%{time_connect}s,"TTFB":%{time_starttransfer}s,"total":%{time_total}s}
```
