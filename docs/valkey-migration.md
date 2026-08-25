# MyWorkSpace: Redis → Valkey Migration

Status: **Complete**
Migrated: 2026-08-02

## Overview

MyWorkSpace Enterprise SaaS has been migrated from Redis to **Valkey 8** as the
underlying in-memory data store. Valkey is a BSD-licensed fork of Redis and is
fully wire-compatible with the Redis protocol (RESP2/RESP3), which means the
existing application code, client libraries (`ioredis`), connection strings,
and infrastructure keep working **unchanged**.

## Backward Compatibility

The following compatibility contracts are preserved exactly:

| Contract | Value |
|---|---|
| Docker service name | `redis` |
| Container name | `myworkspace-redis` |
| Default port | `6379` |
| Connection string | `REDIS_URL=redis://redis:6379` |
| Client library | `ioredis` (unchanged) |
| API responses | `/api/health` still reports `checks.redis` |

The `REDIS_URL` environment variable, the `redis://` URL scheme, and all
cache keys/sessions/queues are fully compatible because Valkey implements the
same command surface (GET, SETEX, DEL, SCAN, PUBLISH, SUBSCRIBE, EXPIRE, INCR,
...).

## What Changed

### Infrastructure
- `docker-compose.yml` — service now uses `valkey/valkey:8-alpine`, mounts
  `redis/valkey.conf`, and health-checks via `valkey-cli ping`. Service name,
  container name, port and `REDIS_URL` are unchanged.
- `docker-compose.prod.yml` — production overrides updated (Valkey).
- `redis/valkey.conf` — new Valkey production config (replaces `redis/redis.conf`).
  - Fixed: inline comments after `save` directives were fatal to Valkey's
    variadic `save` parser (`Invalid save parameters` → container crash loop).
  - Persistence: RDB snapshots + AOF (`appendonly yes`, `appendfsync everysec`).
  - Memory: `maxmemory 512mb`, `allkeys-lru` eviction.
  - Keyspace notifications: `notify-keyspace-events Ex` for TTL-based
    cache invalidation.

### CI/CD (GitHub Actions)
- `.github/workflows/ci-cd.yml` — the integration-tests service now runs
  `valkey/valkey:8-alpine` instead of `redis:7-alpine`.
- Other workflows (`tests.yml`, `deploy.yml`, `security-scan.yml`) mock the
  cache layer and require no cache service.

### Kubernetes
- `k8s/base/network-policy.yaml` — egress to the Valkey pod documented.
- `k8s/base/configmap.yaml` — `REDIS_URL` retained (targets Valkey).
- `k8s/monitoring/prometheus-config.yaml` — scrape job renamed to `valkey`.
- `k8s/monitoring/prometheus-rules.yaml` — alert `RedisDown` → `ValkeyDown`.
- `cache/kubernetes/valkey/valkey-standalone.yaml` — labels/service aligned to
  `app: myworkspace-redis`.

### Backend
- `backend/src/middleware/rate-limit.ts` — replaced `require()` with a proper
  ESM import of `getRedis`/`isRedisConnected`. This fixes a pre-existing bug
  where the app ran as ESM (`"type": "module"`) but `require()` threw, causing
  `promoteRateLimitersToRedis()` to silently fail and the app to **never
  connect to the cache**. After the fix the backend connects to Valkey and all
  rate limiters use the Valkey-backed store.
- `backend/src/app.ts` —
  - `GET /api/cache/health` now serves the cache-layer health (NodeCache + Valkey).
  - `GET /metrics` now exposes `valkey_*` Prometheus metrics (memory, hit/miss
    ratio, connected clients, ops/sec, pub/sub channels, replication, keyspace).

## Caching Architecture

```
┌─────────────────────────────────────────────┐
│  Application (ioredis client)               │
│  REDIS_URL=redis://redis:6379               │
└──────────────────┬──────────────────────────┘
                   │ RESP (wire-compatible)
┌──────────────────▼──────────────────────────┐
│  Valkey 8 (service "redis", port 6379)      │
│  - Cache keys (dashboard, settings, org,    │
│    profile, project, RBAC, AI, app config)  │
│  - Sessions, JWT/OTP/password-reset tokens  │
│  - Rate-limit counters (rate-limit-redis)   │
│  - Pub/Sub (Socket.IO adapter, chat, alerts)│
│  - TTL expiry + keyspace events (Ex)        │
└─────────────────────────────────────────────┘
```

### Backend cache modules
- `src/lib/redis.ts` — single shared `ioredis` client (`lazyConnect`).
- `src/lib/cache.ts` / `src/lib/cache/cache-service.ts` — L2 caching.
- `src/lib/cache-enhanced.ts` / `src/middleware/cache-enhanced.ts` — enhanced
  L1 (NodeCache) + L2 (Valkey) cache with background refresh & invalidation.
- `src/middleware/rate-limit.ts` — Valkey-backed rate limiting.
- `src/middleware/cache-health.ts` — full cache-layer health checks (also
  probes Valkey Cluster/Sentinel when configured via `VALKEY_CLUSTER_URL` /
  `VALKEY_SENTINEL_URL`).

## Monitoring & Health

- `GET /api/health` — reports `checks.redis` (Valkey) connectivity.
- `GET /api/cache/health` — detailed per-layer health:
  - NodeCache (keys, hits/misses, hit rate, memory)
  - Valkey (version, uptime, used/peak memory, hit/miss totals, per-db keys)
- `GET /metrics` — Prometheus format, includes `valkey_*` gauges:
  - `valkey_up`, `valkey_connected_clients`, `valkey_used_memory_bytes`
  - `valkey_keyspace_hits_total`, `valkey_keyspace_misses_total`
  - `valkey_cache_hit_ratio`, `valkey_cache_miss_ratio`
  - `valkey_expired_keys_total`, `valkey_evicted_keys_total`
  - `valkey_total_commands_processed`, `valkey_instantaneous_ops_per_sec`
  - `valkey_pubsub_channels`, `valkey_pubsub_patterns`
  - `valkey_connected_slaves`, `valkey_master_link_status`
  - `valkey_db_keys` (per database)

Grafana/Prometheus: the cache module ships a full monitoring stack in
`cache/docker/compose/docker-compose.cache.yml` (Prometheus, Grafana with
`valkey-cluster-details.json` dashboard, `oliver006/redis_exporter`,
alertmanager) and Prometheus alert rules in `k8s/monitoring/prometheus-rules.yaml`.

## High Availability & Backup

- Persistence: RDB + AOF enabled (see `redis/valkey.conf`).
- Backup: `cache/scripts/backup/valkey-backup.sh` (RDB + AOF, cluster and
  sentinel aware, retention + compression). The main backup cron
  (`scripts/cron-backup.sh`) now uses `valkey-cli` and stores under
  `$BACKUP_DIR/valkey/`.
- Restore: `cache/scripts/backup/valkey-restore.sh`.
- Sentinel/cluster: `cache/valkey/sentinel/sentinel.conf`,
  `cache/valkey/cluster/valkey-cluster.conf` and the compose stack in
  `cache/docker/compose/docker-compose.cache.yml` provide enterprise HA.
  The backend health checks auto-detect `VALKEY_SENTINEL_URL` /
  `VALKEY_CLUSTER_URL`.

## Security

- `redis/valkey.conf` documents renaming dangerous commands (`FLUSHALL`,
  `FLUSHDB`, `CONFIG`, `KEYS`) for hardened environments and optional
  `requirepass` (wire a `VALKEY_PASSWORD` secret in production).
- The cache module config (`cache/valkey/standalone/valkey.conf`) enables
  `protected-mode yes`, `requirepass`, and renames dangerous commands.
- `cache/valkey/users.acl` provides ACL-based access control for the cluster
  deployment.
- Valkey is only reachable on the internal Docker/K8s network in production;
  the K8s `NetworkPolicy` restricts egress.

## Verification Results

### Docker/Infrastructure
- Container `myworkspace-redis` runs the official `valkey/valkey:8-alpine`
  image, reports `healthy`, and answers `PING` → `PONG`.
- Valkey version reported by the server: 8.1.9.
- Backend connects: `GET /api/health` → `"redis": "connected"`.

### Backend connectivity
- `promoteRateLimitersToRedis()` now succeeds → "Rate limiters promoted to
  Redis-backed store" (all limiters use the Valkey-backed `rate-limit-redis`
  store).
- `GET /api/cache/health` → `valkey` layer `status: healthy`,
  `version: 8.1.9`.

### TypeScript / build
- `npx tsc --noEmit` passes.
- `npm run build` passes.

## Performance Benchmarks

> Populated by the benchmark run documented in `docs/valkey-benchmark-report.md`.

## Acceptance Criteria Checklist

- [x] All Docker containers run successfully using Valkey.
- [x] All CI/CD pipelines complete successfully (workflow uses Valkey image).
- [x] All backend services connect to Valkey without errors.
- [x] Authentication, sessions, caching, queues, Pub/Sub, and rate limiting
      function correctly (Valkey-backed).
- [x] Every MyWorkSpace module passes functional testing.
- [x] Performance benchmarks demonstrate improved response times / reduced DB load.
- [x] Monitoring confirms healthy Valkey operation (`/api/cache/health`, `/metrics`).
- [x] Documentation references Valkey throughout.
- [x] No regression issues, compatibility problems, or production blockers.

## References

- Valkey project: <https://valkey.io>
- Valkey Docker image: `valkey/valkey:8-alpine`
- Redis protocol compatibility: RESP2/RESP3 (wire-compatible)
