# Scaling Strategy

## Current Architecture

| Component | Capacity | Scaling Strategy |
|-----------|----------|------------------|
| Backend (Express) | 3 replicas (5 prod) | Horizontal (stateless) |
| Frontend (Next.js) | 3 replicas (4 prod) | Horizontal (stateless) |
| MongoDB | Atlas M10+ | Vertical + read replicas |
| Redis | Single instance | Redis Cluster or ElastiCache |
| RabbitMQ | Single instance | Clustered deployment |
| Caddy/Nginx | Single instance | Load balancer fronting multiple |
| R2 (object storage) | Unlimited | Automatic (Cloudflare) |

---

## Horizontal Scaling (Application Tier)

### Kubernetes (recommended)

HPA config in `k8s/base/hpa.yaml`:

| Deployment | Min | Max | CPU Threshold | Memory Threshold |
|------------|-----|-----|---------------|------------------|
| Backend | 3 | 10 | 70% | 80% |
| Frontend | 3 | 8 | 70% | — |

### Stateless Design

Both backend and frontend are stateless:
- **Sessions**: Stored in Redis (not in-memory)
- **File uploads**: Streamed to R2 (not local disk)
- **Cache**: Tiered (L1: in-memory with bounded eviction, L2: Redis)
- **Queues**: RabbitMQ with persistent messages

### Autoscaling Triggers

| Metric | Backend | Frontend |
|--------|---------|----------|
| CPU > 70% for 3 min | Scale up | Scale up |
| Memory > 80% for 3 min | Scale up | — |
| API latency p95 > 2s | Scale up | — |
| Request queue depth | Scale up | — |

---

## Vertical Scaling (Data Tier)

### MongoDB

| Stage | Instance | RAM | Storage | Connections |
|-------|----------|-----|---------|-------------|
| Starter | M10 | 2GB | 20GB | 100 |
| Growth | M20 | 4GB | 40GB | 200 |
| Scale | M30+ | 8GB+ | 100GB+ | 500+ |

Add read replicas for query-heavy workloads. Enable Atlas Search for full-text search.

### Redis

Monitor `used_memory_rss / maxmemory`. Plan for cluster sharding when:
- Memory > 10GB
- Throughput > 100K ops/sec
- Need high availability (sentinel or cluster mode)

### RabbitMQ

Monitor queue depth and message rates. Cluster when:
- Queue depth > 100K
- Message rate > 10K/sec
- Need HA (mirrored queues)

---

## Caching Strategy

### Current Cache Layers

| Layer | Technology | TTL | Size | Location |
|-------|-----------|-----|------|----------|
| L1: App Cache | NodeCache (in-memory) | 60s–5min | 1000 entries | Per pod |
| L2: Session Cache | Redis | Session TTL | Configurable | Central |
| L3: API Cache | Varnish/Nginx | 2min–1d | 10GB–100GB | Reverse proxy |
| L4: CDN Cache | Cloudflare | 1y (immutable) | Unlimited | Edge |

### Cache Warming

On deploy or cache flush, warm critical data:
- Dashboard bootstrap data
- Organization settings
- User permissions

```bash
curl -X POST https://yourdomain.com/api/admin/cache/warm \
  -H "Authorization: Bearer <admin-token>"
```

---

## Database Scaling

### Read Replicas

When read throughput exceeds write throughput by > 5:1:
1. Enable MongoDB Atlas read replicas
2. Configure backend to use `readPreference=secondaryPreferred`
3. Update `MONGODB_URI`:

```
mongodb+srv://user:pass@cluster.mongodb.net/myworkspace?readPreference=secondaryPreferred
```

### Sharding

Not currently required. Re-evaluate when:
- Single collection > 100GB
- Write throughput > 10K/sec
- Index size exceeds RAM

---

## Rate Limiting

| Endpoint | Window | Requests | After Redis promotion |
|----------|--------|----------|-----------------------|
| `/api/auth/*` | 15 min | 20 | Distributed |
| `/api/client-auth/*` | 15 min | 20 | Distributed |
| `/api/files/*` | 15 min | 50 | Distributed |
| `/api/shares/*` | 15 min | 100 | Distributed |
| `/api/search/*` | 1 min | 100 | Distributed |
| `/api/*` (general) | 15 min | 600 | Distributed |

Rate limits are per-IP. Redis-backed store ensures consistency across replicas via `promoteRateLimitersToRedis()`.

---

## Cost Projections

| Component | Starter (100 users) | Growth (1K users) | Scale (10K users) |
|-----------|-------------------|-------------------|-------------------|
| Backend | 1 × $20 | 3 × $40 | 10 × $80 |
| Frontend | 1 × $20 | 3 × $40 | 8 × $80 |
| MongoDB | M10 ~$60 | M20 ~$120 | M30 ~$400 |
| Redis | Included | ElastiCache ~$30 | Cluster ~$100 |
| RabbitMQ | Included | CloudAMQP ~$50 | Cluster ~$200 |
| R2 Storage | Free tier | ~$10 | ~$50 |
| CDN | Free | ~$20 | ~$100 |
| Monitoring | Free | Grafana ~$30 | Datadog ~$200 |
| **Total** | **~$100/mo** | **~$340/mo** | **~$1,210/mo** |
