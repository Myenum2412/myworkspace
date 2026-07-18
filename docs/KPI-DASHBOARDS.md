# Production KPIs, Dashboards & Alerts — MyWorkSpace GA

---

## 1. Key Performance Indicators

### 1.1 Application Health KPIs

| KPI | Definition | Target | Warning | Critical | Measurement |
|-----|-----------|--------|---------|----------|-------------|
| Uptime | % of time API returns 2xx/3xx | ≥ 99.9% | < 99.5% | < 99.0% | External uptime monitor (60s interval) |
| API p50 latency | Median response time | < 200ms | > 500ms | > 1s | Prometheus `api_request_duration_ms` |
| API p95 latency | 95th percentile response time | < 500ms | > 1s | > 2s | Prometheus `api_request_duration_ms` |
| API p99 latency | 99th percentile response time | < 2s | > 3s | > 5s | Prometheus `api_request_duration_ms` |
| API error rate (5xx) | % of responses with 5xx status | < 0.5% | > 1% | > 5% | Prometheus `api_requests_total{status=~"5.."}` |
| API error rate (4xx) | % of responses with 4xx status (non-auth) | < 2% | > 5% | > 10% | Prometheus `api_requests_total{status=~"4.."}` |
| Active WebSocket connections | Concurrent Socket.IO connections | < 5000 | > 6000 | > 8000 | Prometheus `socket_connections_total` |
| Graceful shutdown time | Time to complete graceful shutdown | < 10s | > 20s | > 30s | Application log |

### 1.2 Resource Utilization KPIs

| KPI | Definition | Target | Warning | Critical | Measurement |
|-----|-----------|--------|---------|----------|-------------|
| CPU usage | Process CPU usage % | < 50% | > 70% | > 85% | Prometheus `process_cpu_usage_percent` |
| Memory RSS | Resident set size | < 400MB | > 600MB | > 800MB | Prometheus `process_memory_rss_bytes` |
| Heap usage | V8 heap used | < 200MB | > 350MB | > 500MB | Prometheus `process_memory_heap_used_bytes` |
| Disk usage | Filesystem usage % | < 60% | > 80% | > 90% | Node exporter `node_filesystem_avail_bytes` |
| File descriptor count | Open FDs | < 1000 | > 2000 | > 5000 | Process metrics |
| Event loop lag | Node.js event loop delay | < 10ms | > 50ms | > 100ms | `process_event_loop_lag` |

### 1.3 Database KPIs

| KPI | Definition | Target | Warning | Critical | Measurement |
|-----|-----------|--------|---------|----------|-------------|
| MongoDB connection count | Active connections | < 50 | > 100 | > 200 | `db.serverStatus().connections` |
| MongoDB query time (p95) | Query execution time | < 100ms | > 500ms | > 1s | Atlas metrics / profiling |
| MongoDB operations/sec | Read/write/update/delete | < 1000/s | > 3000/s | > 5000/s | Atlas metrics |
| MongoDB replication lag | Secondary lag | < 1s | > 5s | > 30s | Atlas metrics |
| Slow queries (> 100ms) | Count per minute | < 1/min | > 5/min | > 20/min | `db.system.profile` |
| Index miss ratio | COLLSCAN vs IXSCAN | < 5% | > 10% | > 20% | Atlas metrics |

### 1.4 Cache KPIs

| KPI | Definition | Target | Warning | Critical | Measurement |
|-----|-----------|--------|---------|----------|-------------|
| L1 cache hit ratio | NodeCache hits / (hits + misses) | > 80% | < 70% | < 50% | In-memory metrics |
| L2 cache hit ratio | Redis hits / (hits + misses) | > 85% | < 75% | < 60% | `INFO commandstats` |
| Redis memory usage | Used memory / maxmemory | < 50% | > 70% | > 85% | `INFO memory` |
| Redis evictions/sec | Keys evicted per second | 0 | > 10/s | > 50/s | `INFO stats` |
| Redis hit rate | `keyspace_hits / (hits + misses)` | > 90% | < 80% | < 60% | `INFO stats` |
| Cache stampede risk | Concurrent cache miss for same key | < 2 | > 5 | > 10 | Application metrics |

### 1.5 Queue KPIs

| KPI | Definition | Target | Warning | Critical | Measurement |
|-----|-----------|--------|---------|----------|-------------|
| Queue depth (RabbitMQ) | Ready messages | < 100 | > 1000 | > 10000 | `rabbitmq_queue_messages_ready` |
| Consumer lag | Unacked messages | < 10 | > 50 | > 200 | `rabbitmq_queue_messages_unacknowledged` |
| Message processing time | Time to process one message | < 1s | > 5s | > 30s | Application histograms |
| Dead letter queue | Messages in DLQ | 0 | > 10 | > 50 | `rabbitmq_queue_messages_dlq` |
| Publish rate | Messages published per second | < 100/s | > 500/s | > 1000/s | `rabbitmq_channel_messages_published_total` |

### 1.6 File Upload KPIs

| KPI | Definition | Target | Warning | Critical | Measurement |
|-----|-----------|--------|---------|----------|-------------|
| Upload success rate | Successful / total uploads | > 99% | < 98% | < 95% | Prometheus histograms |
| Upload throughput | MB/s aggregate | < 10MB/s | > 50MB/s | > 100MB/s | Network monitoring |
| Storage usage (R2) | Total bucket size | < 50% quota | > 75% | > 90% | R2 metrics |
| TUS completion rate | Resumable upload completion | > 95% | < 90% | < 80% | Application metrics |

### 1.7 Business KPIs

| KPI | Definition | Target | Review Frequency | Measurement |
|-----|-----------|--------|------------------|-------------|
| Daily Active Users (DAU) | Unique users per day | TBD | Daily | Analytics |
| Weekly Active Users (WAU) | Unique users per week | TBD | Weekly | Analytics |
| User activation rate | Users who complete onboarding | > 60% | Weekly | Analytics |
| Task completion rate | Tasks completed / created | > 70% | Weekly | Product analytics |
| Feature adoption | % of users using each feature | > 40% per module | Monthly | Analytics |
| NPS score | User satisfaction | > 30 | Monthly | Survey |
| Support ticket volume | Tickets per 100 users | < 5/week | Weekly | Support tool |
| First response time | Time to first response | < 1 hour | Weekly | Support tool |
| Time to resolution | Mean time to resolve | < 24 hours | Weekly | Support tool |
| Churn rate | Users who stop using | < 5% monthly | Monthly | Analytics |

---

## 2. Dashboards

### 2.1 Executive Dashboard (Business Stakeholders)

| Panel | Metric | Refresh | Source |
|-------|--------|---------|--------|
| Active Users | DAU / WAU / MAU | 5 min | Analytics |
| User Growth | New users per day (7d trend) | 5 min | Analytics |
| Task Activity | Tasks created / completed per day | 5 min | Product |
| Feature Adoption | % users per major feature | 1 hour | Analytics |
| System Health | Uptime % (current month) | 1 min | Prometheus |
| Support Volume | Tickets by severity + trend | 1 hour | Support tool |
| NPS Score | Current + trend | Daily | Survey |

### 2.2 Operations Dashboard (DevOps/SRE)

| Panel | Metric | Threshold | Alert |
|-------|--------|-----------|-------|
| API Request Rate | req/s by endpoint | — | — |
| API Error Rate | % 5xx by endpoint | > 1% | 🔴 Critical > 5% |
| API Latency (p50/p95/p99) | ms by endpoint | > 500ms p95 | 🟡 Warning > 2s |
| Memory Usage | RSS + Heap (MB) | > 600MB | 🟡 Warning > 800MB |
| CPU Usage | % | > 70% | 🟡 Warning > 85% |
| Disk Usage | % on / and /data | > 80% | 🔴 Critical > 90% |
| MongoDB Status | Connections, ops/s, replication | — | 🔴 Critical if down |
| Redis Status | Hit rate, memory, evictions | < 80% hit rate | 🟡 Warning < 50% |
| RabbitMQ Status | Queue depth, consumer lag | > 1000 depth | 🟡 Warning > 10000 |
| Cache Hit Ratio | L1 + L2 combined | > 60% hit rate | 🟡 Warning < 50% |
| Active WebSocket | Connection count | > 6000 | 🟡 Warning > 8000 |
| Graceful Shutdown | Time (ms) | > 20s | 🟡 Warning |

### 2.3 Database Performance Dashboard (DBA)

| Panel | Metric | Refresh |
|-------|--------|---------|
| Query Performance | p50/p95/p99 query time by collection | 1 min |
| Slow Query Rate | Queries > 100ms per minute | 1 min |
| Index Usage | IXSCAN vs COLLSCAN ratio | 5 min |
| Connection Pool | Active/available connections | 30s |
| Replication Lag | Seconds behind primary | 10s |
| Storage Size | Data + index size per collection | 5 min |
| Opcounters | Inserts/updates/deletes/queries per sec | 30s |
| Page Faults | Memory page faults per second | 30s |

### 2.4 Business Analytics Dashboard (Product/Management)

| Panel | Metric | Refresh |
|-------|--------|---------|
| Organization Growth | New orgs per day/week | 1 hour |
| User Onboarding Funnel | Signup → activate → create task → day 7 retained | Daily |
| Feature Heatmap | Usage % per feature across orgs | Daily |
| Time Tracking | Total hours logged per day/week | 1 hour |
| File Storage | Total storage used, growth trend | 1 hour |
| Project Completion | Projects completed vs active | Daily |
| Revenue Metrics | MRR, ARPU, churn (if billing enabled) | Daily |
| Top Orgs by Usage | Most active orgs (DAU, storage, tasks) | Daily |

---

## 3. Alert Configurations

### 3.1 Critical Alerts (PagerDuty + Slack #critical)

| Alert Name | Condition | Duration | Cooldown | Response |
|------------|-----------|----------|----------|----------|
| `HighErrorRate` | 5xx > 5% of requests | 5 min | 15 min | On-call immediately |
| `MongoDBDown` | MongoDB unreachable | 1 min | 5 min | On-call immediately |
| `RedisDown` | Redis unreachable | 1 min | 5 min | On-call immediately |
| `ServiceDown` | Health check fails | 1 min | 5 min | On-call immediately |
| `DiskSpaceLow` | Disk < 10% | 5 min | 30 min | On-call + escalate |
| `AuthFailure` | > 50 failed logins/min | 5 min | 15 min | Security team |
| `DataCorruption` | Integrity check failure | Immediate | — | Engineering + DBAs |

### 3.2 Warning Alerts (Slack #alerts)

| Alert Name | Condition | Duration | Cooldown |
|------------|-----------|----------|----------|
| `HighLatency` | p95 > 2s | 5 min | 15 min |
| `HighMemoryUsage` | RSS > 800MB | 5 min | 15 min |
| `HighCPU` | CPU > 80% | 10 min | 30 min |
| `PodRestarting` | > 3 restarts/hr | 5 min | 30 min |
| `LowCacheHitRatio` | < 50% | 15 min | 1 hour |
| `HighSocketConnections` | > 8000 | 5 min | 15 min |
| `QueueDepthHigh` | > 10000 messages | 5 min | 15 min |
| `SlowQueries` | > 20 slow queries/min | 5 min | 1 hour |
| `UploadFailures` | > 5% upload failure rate | 5 min | 15 min |
| `BackupFailure` | Backup script fails | Immediate | 1 hour |
| `RateLimitThreshold` | > 80% rate limit usage | 5 min | 30 min |

### 3.3 Info Alerts (Slack #alerts)

| Alert Name | Condition | Duration | Cooldown |
|------------|-----------|----------|----------|
| `DeploymentStarted` | New deploy detected | — | Per deploy |
| `DeploymentComplete` | Deploy finished + verified | — | Per deploy |
| `NewUserSignup` | Spike > 3x daily avg | 15 min | 1 hour |
| `CertExpiring` | SSL cert < 14 days | — | Daily |
| `MigrationPending` | DB migration not run | — | — |

---

## 4. Prometheus Recording Rules

```yaml
# Rate of requests by status
record: api:requests_rate:5m
expr: rate(api_requests_total[5m])

# Error ratio
record: api:error_ratio:5m
expr: sum(rate(api_requests_total{status=~"5.."}[5m])) / sum(rate(api_requests_total[5m]))

# Cache hit ratio
record: cache:hit_ratio:5m
expr: rate(cache_hit_count[5m]) / (rate(cache_hit_count[5m]) + rate(cache_miss_count[5m]))

# SLO burn rate (past 30d)
record: slo:error_budget_remaining
expr: 1 - (sum(rate(api_requests_total{status=~"5.."}[30d])) / sum(rate(api_requests_total[30d]))) / 0.01
```

---

## 5. SLO Targets

| Service | SLO | Error Budget (30d) | Burn Rate Alert |
|---------|-----|-------------------|-----------------|
| API availability | 99.9% | 43 minutes | Consume > 5% in 1h |
| API latency (p95 < 1s) | 99.5% | 3.6 hours | Consume > 10% in 2h |
| Upload success rate | 99.0% | 7.2 hours | Consume > 10% in 4h |
| Auth availability | 99.95% | 21 minutes | Consume > 10% in 30m |

---

## 6. Recommended Monitoring Tools

| Category | Tool | Purpose | Cost |
|----------|------|---------|------|
| Metrics | Prometheus + Grafana | Time-series metrics, dashboards | Free (OSS) |
| Logs | Loki (or ELK) | Centralized log aggregation | Free (OSS) or $0.50/GB |
| Tracing | OpenTelemetry + Jaeger | Distributed tracing | Free (OSS) |
| Error tracking | Sentry | Error aggregation + performance | Free tier |
| Uptime | Better Uptime / Pingdom | External monitoring | $20-50/mo |
| Alerting | Alertmanager + PagerDuty | Alert routing + on-call | Free + $15/user/mo |
| APM | Grafana Faro (frontend) | RUM, web vitals | Free (OSS) |
