# MyWorkSpace Caching Architecture

## Overview

MyWorkSpace employs a **7-layer caching architecture** designed for an AI CRM and Sales Automation SaaS platform. Each layer operates at a different level of the stack, from in-process memory to disk-based caching, providing graduated latency, capacity, and persistence characteristics.

| Layer | Technology | Role | Latency | Capacity | Persistence |
|-------|-----------|------|---------|----------|-------------|
| 1 | NodeCache (L1) | In-process local cache | <1ms | ~100MB | None |
| 2 | Valkey Standalone (L2) | In-memory key-value cache | <3ms | 4GB+ | Optional (AOF/RDB) |
| 3 | Valkey Cluster (L3) | Distributed in-memory cache | <5ms | 12GB+ (6×2GB nodes) | Optional (AOF) |
| 4 | Varnish (L4) | HTTP accelerator / reverse proxy cache | <5ms | 2GB (RAM) | Volatile |
| 5 | Nginx (L5) | Reverse proxy + CDN edge + TLS termination | <2ms | 165GB+ (disk) | Persistent |
| 6 | Apache Traffic Server (L6) | CDN / edge caching proxy | <10ms | 100GB+ (RAM+disk) | Persistent |
| 7 | Linux FS-Cache / bcache (L7) | Kernel-level disk block cache | <1ms (cache hit) | Configurable | Persistent |

---

## Request Flow Diagram

```
                        ┌─────────────────────────────────────────────────────────┐
                        │                    Client / Browser                     │
                        └────────────────────────┬────────────────────────────────┘
                                                 │
                                                 ▼
                        ┌─────────────────────────────────────────────────────────┐
                        │              Cloudflare DNS / Global LB                 │
                        └────────────────────────┬────────────────────────────────┘
                                                 │
                                                 ▼
                    ╔══════════════════════════════════════════════════════════════╗
                    ║              Layer 7: Linux FS-Cache / bcache               ║
                    ║         (Kernel-level block cache - disk I/O accelerator)   ║
                    ╚══════════════════════════════════════════════════════════════╝
                                                 │
                                                 ▼
                    ╔══════════════════════════════════════════════════════════════╗
                    ║           Layer 6: Apache Traffic Server (ATS)              ║
                    ║       (CDN edge cache - static assets, large files)         ║
                    ║        Port 8080 │ RAM: 1GB │ Disk: 100GB max               ║
                    ╚══════════════════════════════════════════════════════════════╝
                                                 │
                                                 ▼
        ┌────────────────────────────────────────────────────────────────────────────┐
        │                Layer 5: Nginx (Reverse Proxy + CDN Edge)                  │
        │                                                                            │
        │  ┌─────────────────────┐  ┌──────────────────────┐  ┌───────────────────┐ │
        │  │  myworkspace.conf   │  │     cdn.conf         │  │   TLS Termination │ │
        │  │  Port 443 (TLS)     │  │  cdn.myworkspace...  │  │   HTTP/2, HTTP/3  │ │
        │  │  HTTP/2, HTTP/3     │  │  Port 443 (TLS)      │  │   OCSP Stapling   │ │
        │  └────────┬────────────┘  └──────────┬───────────┘  └───────────────────┘ │
        │           │                          │                                     │
        │  Cache Zones: api_cache(500m/10g), static_cache(500m/50g), cdn_cache(500m/100g)│
        │  Rate Limits: auth(20r/m), api(600r/m), upload(50r/m), search(100r/m)    │
        └──────────────────────────┬────────────────────────────────────────────────┘
                                   │
                                   ▼
                    ╔══════════════════════════════════════════════════════════════╗
                    ║              Layer 4: Varnish Cache (HTTP Cache)            ║
                    ║                                                             ║
                    ║  VCL 4.1 │ Port 80 │ RAM: 2GB malloc                        ║
                    ║  Backend: nginx:80 │ Probes: /api/health every 5s           ║
                    ║                                                             ║
                    ║  Cached: static assets (7d), API GETs (2m), JSON (2m)      ║
                    ║  Bypassed: auth, admin, orgmenu, WebSocket, cookies         ║
                    ║                                                             ║
                    ║  Invalidation: PURGE (by URL), BAN (by pattern/tag)         ║
                    ╚══════════════════════════════════════════════════════════════╝
                                   │
                                   ▼
        ┌──────────────────────────────────────────────────────────────────────────┐
        │                    Layer 3: Valkey Cluster (Distributed)                 │
        │                                                                          │
        │   6 nodes (3 masters + 3 replicas) │ Port 6379 │ Cluster bus: 16379     │
        │   Maxmemory: 2GB/node │ Policy: allkeys-lru │ AOF: everysec             │
        │                                                                          │
        │   Sharding: 16384 hash slots auto-distributed across 3 masters          │
        │   Replicas: 1 per master │ Failover: automatic via cluster consensus    │
        └──────────────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
                    ╔══════════════════════════════════════════════════════════════╗
                    ║              Layer 2: Valkey Standalone (Primary)            ║
                    ║                                                             ║
                    ║  Port 6379 │ Maxmemory: 4GB │ Policy: allkeys-lru           ║
                    ║  AOF+RDB persistence │ ACLs: 5 user roles                   ║
                    ║  Sentinel HA: 3 sentinel nodes monitoring                   ║
                    ║                                                             ║
                    ║  Used for: sessions, auth tokens, permissions, config       ║
                    ╚══════════════════════════════════════════════════════════════╝
                                   │
                                   ▼
                    ╔══════════════════════════════════════════════════════════════╗
                    ║              Layer 1: NodeCache (In-Process)                ║
                    ║                                                             ║
                    ║  7 namespaced providers: config, query, api, session,       ║
                    ║  auth, permission, computation                              ║
                    ║                                                             ║
                    ║  Tag-based invalidation │ EventEmitter for evictions        ║
                    ║  TTL ranges: 60s-3600s │ Max keys: 1K-50K per provider     ║
                    ║                                                             ║
                    ║  Acts as L1 cache: checks before Valkey remote              ║
                    ╚══════════════════════════════════════════════════════════════╝
                                   │
                                   ▼
                        ┌─────────────────────────┐
                        │    Application Backend   │
                        │    (Node.js / Next.js)   │
                        └─────────────────────────┘
```

---

## Data Flow Explanation

### Read Request Flow

1. **Client request** arrives at load balancer (Cloudflare / DNS-based global LB)
2. **Layer 7 (FS-Cache/bcache)**: Kernel checks if the requested blocks are cached from disk. If the backing filesystem has cached blocks, read is served from RAM instead of disk I/O.
3. **Layer 6 (ATS)**: If the request matches a cacheable pattern (static assets: `.js`, `.css`, `.png`, `.woff2`; Next.js `/_next/static/`; uploads), ATS serves from its RAM+disk cache. ATS is configured to NOT cache API responses or HTML (delegated to Varnish). Cache hit → return immediately.
4. **Layer 5 (Nginx)**: Nginx terminates TLS, checks its proxy cache zones:
   - `api_cache` (500m keys / 10GB max): Caches API GET responses (dashboard: 120s TTL, search: 60s TTL, default: 30s TTL)
   - `static_cache` (500m keys / 50GB max): Caches static assets (365d TTL, immutable)
   - `cdn_cache` (500m keys / 100GB max): Caches CDN assets (365d TTL)
   - Cache HIT → return. Cache MISS or bypass → proxy to Varnish or backend.
5. **Layer 4 (Varnish)**: Varnish applies its VCL logic:
   - Uncacheable paths (auth, admin, orgmenu, WebSocket) → `pass` to backend
   - Static assets → strip cookies, `hash`, serve with 7d TTL + 24h grace
   - API GETs for specific endpoints → `hash`, serve with 2m TTL + 10m grace
   - Requests with auth cookies → `pass` (user-specific data)
   - On cache miss → fetch from Nginx (which fetches from backend)
6. **Layer 3 (Valkey Cluster)**: For distributed data (sessions, auth tokens, permissions), the application (via `CacheManager`) queries Valkey Cluster. Hash slot calculation determines which master node holds the key. If that node is down, the replica is promoted automatically.
7. **Layer 2 (Valkey Standalone)**: Primary in-memory cache for application data. The `CacheManager.get()` method:
   - First checks NodeCache (L1)
   - On L1 miss → checks Valkey remote (L2)
   - On L2 hit → populates L1 with TTL
   - On L2 miss → calls `fetcher()` (database query) → populates both L1 and L2
8. **Layer 1 (NodeCache)**: In-process memory cache checked first. 7 providers with separate namespaces and TTLs. On miss → falls through to L2. On hit → returns immediately (<1ms).

### Write Request Flow

1. Application writes data → updates database
2. Application calls `CacheManager.set(key, value, ttl)`:
   - Updates NodeCache (L1) immediately
   - Updates Valkey (L2/L3) asynchronously
3. Application calls `CacheManager.del(key)` or `delByTag(tag)`:
   - Deletes from NodeCache immediately
   - Sends invalidation to Valkey
   - For HTTP caches (Varnish, Nginx, ATS), sends PURGE/BAN requests via admin endpoints

---

## Cache Invalidation Strategies

### Tag-Based Invalidation

NodeCache supports tag-indexed invalidation. When a key is set with associated tags, all keys sharing a tag can be bulk-invalidated:

```
CacheManager.delByTag("organization:org_123")
// Removes all keys tagged with org_123 from L1 (NodeCache) and L2 (Valkey)
```

Varnish supports tag-based PURGE via `X-Purge-Tag` header, using `ban()` commands:

```
PURGE /any/url HTTP/1.1
X-Purge-Tag: organization:org_123
```
→ Varnish executes `ban("obj.http.X-Cache-Tags ~ organization:org_123")`

### Pattern-Based Invalidation

Varnish supports BAN requests with regex patterns:

```
BAN / HTTP/1.1
X-Ban-Pattern: req.url ~ ^/api/dashboard
```
→ Varnish executes `ban("req.url ~ ^/api/dashboard")`

NodeCache `CacheManager.refreshPattern(pattern)` deletes all keys matching the pattern from both L1 and L2.

### TTL Expiration

All layers support TTL-based expiration:

| Layer | Default TTL | Mechanism |
|-------|------------|-----------|
| NodeCache | 60-3600s (per provider) | Internal lazy expiration + checkperiod |
| Valkey | Per-key TTL | Passive (lazy) + active (sampling) expiry |
| Varnish | Per-content-type (2m-7d) | `beresp.ttl` + grace mode |
| Nginx | Per-cache-zone (30s-365d) | `proxy_cache_valid` + `inactive` |
| ATS | Per-rule (0-365d) | `ttl=` in cache.config |

### Event-Driven Invalidation

- Valkey **keyspace notifications** (`notify-keyspace-events KEA`) allow the application to subscribe to key expiration/eviction events
- NodeCache emits events: `expired`, `del`, `flush`, `hit`, `miss`, `set`, `invalidate`
- Application can listen to these events for cache coherence

---

## Cache Strategies Implemented

### Cache Aside (Lazy Loading)

```
CacheManager.get<T>(key, fetcher?)
├── Check NodeCache (L1) → hit? return
├── Check Valkey (L2) → hit? populate L1, return
└── Call fetcher() → populate L1 + L2, return
```

The application is responsible for loading data on cache miss. The cache is not aware of the database.

### Read Through

```
CacheManager.getOrFetch<T>(key, fetcher, ttl)
├── Check L1 → hit? return
├── Check L2 → hit? populate L1, return
└── Call fetcher(), write to L1 + L2 with TTL, return
```

Transparent loading on miss with automatic population.

### Write Through

```
CacheManager.set<T>(key, value, ttl)
├── Write to L1 (synchronous)
├── Write to L2 (asynchronous, with fallback)
└── Return
```

Data is written to cache simultaneously with (or before) database write. The application must write to the database separately.

### Write Behind (Write Back)

The architecture supports write-behind via the NodeCache `CacheManager`:
- Data is written to L1 immediately
- Written to L2 asynchronously
- Application-level batching can collect dirty keys for periodic database writes

### Refresh Ahead

Varnish implements refresh-ahead via **grace mode**:
- `set beresp.grace = 24h` for static assets
- `set beresp.grace = 10m` for API responses
- When `obj.ttl <= 0s && std.healthy(req.backend_hint)`, Varnish restarts the request to fetch a fresh copy while still serving the stale cached copy

Nginx implements stale-while-revalidate:
- `proxy_cache_use_stale error timeout updating http_500 http_502 http_503 http_504`
- `proxy_cache_lock on` prevents thundering herd on cache miss

### Lazy Loading

The `CacheManager.get()` method with a fetcher callback implements lazy loading:
- Data is loaded into cache only when first requested
- Subsequent requests are served from cache
- TTL controls how long data remains cached before refresh

---

## Security Model

### TLS

| Layer | TLS Support | Configuration |
|-------|------------|---------------|
| Valkey Standalone | Optional | `tls-port`, `tls-cert-file`, `tls-key-file`, `tls-ca-cert-file` |
| Valkey Cluster | Optional | Same + `tls-cluster yes`, `tls-replication yes` |
| Varnish | Via Nginx (frontend) | TLS terminated at Nginx before Varnish |
| Nginx | TLS 1.2/1.3, HTTP/2, HTTP/3 | Full cert chain, OCSP stapling, HSTS |
| ATS | Via Nginx/CDN | Edge TLS at CDN distribution point |

### RBAC via Valkey ACLs (`users.acl`)

| User | Password Env Var | Permissions | Scope |
|------|-----------------|-------------|-------|
| `appuser` | `${VALKEY_PASSWORD}` | `+@all -@dangerous +@connection -@admin` | Full cache access |
| `sessionuser` | `${SESSION_CACHE_PASSWORD}` | `+get +set +expire +del +exists +ttl` | `session:*` keys only |
| `apicacheuser` | `${API_CACHE_PASSWORD}` | `+get +set +expire +del +exists` | `api:*` keys only |
| `readonlyuser` | `${READONLY_PASSWORD}` | `+get +exists +ttl +keys +type +info` | Read-only, all keys |
| `monitoringuser` | `${MONITORING_PASSWORD}` | `+info +ping +cluster\|info +slowlog\|get +memory\|stats` | Monitoring only |

### Network Isolation

- **Docker**: `cache-network` (10.20.0.0/16) isolates all cache services. `app-network` connects Nginx to the application backend only.
- **Kubernetes**: NetworkPolicies restrict ingress/egress between cache pods. Valkey Cluster uses headless service for internal discovery.
- **Varnish ACL**: `purge_acl` restricts PURGE/BAN to private IP ranges (10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16, localhost).

### Rate Limiting

| Zone | Rate | Burst | Endpoint |
|------|------|-------|----------|
| `auth_limit` | 20 req/min | 5 | `/api/auth/*` |
| `api_limit` | 600 req/min | 100 | `/api/*` |
| `upload_limit` | 50 req/min | 10 | `/api/files/upload` |
| `search_limit` | 100 req/min | 20 | `/api/search` |
| `conn_limit` | 50 connections | — | Per-client connection limit |

---

## Performance Targets

| Metric | Target | Measurement |
|--------|--------|-------------|
| API response time (cache hit) | <50ms | p95 from client |
| Static asset delivery | <20ms | p95 from edge |
| Overall cache hit ratio | >95% | Across all layers |
| NodeCache L1 hit ratio | >80% | In-process stats |
| Valkey hit ratio | >90% | `redis_keyspace_hits / (hits + misses)` |
| Varnish hit ratio | >85% | `VARNISH_HIT / (HIT + MISS)` |
| Nginx cache hit ratio | >90% | `$upstream_cache_status` |
| ATS cache hit ratio | >80% | `proxy.node.cache_hit_ratio` |
| P99 latency added by caching | <5ms | End-to-end measurement |
| Concurrent connections | 10,000+ | Per Nginx instance |
| Cache write throughput | 10,000 ops/s | Per Valkey node |

---

## Failover and High Availability Design

### Valkey Standalone HA

- **Sentinel-based failover**: 3 sentinel nodes monitor `mymaster` (valkey-0:6379)
- `sentinel down-after-milliseconds mymaster 5000` — 5s downtime detection
- `sentinel failover-timeout mymaster 60000` — 60s failover timeout
- `sentinel parallel-syncs mymaster 1` — one replica syncs at a time
- `sentinel resolve-hostnames yes` — DNS-based node resolution in container environments

### Valkey Cluster HA

- **6 nodes**: 3 masters + 3 replicas (1 replica per master)
- **Automatic failover**: When a master is unreachable for `cluster-node-timeout 5000ms`, a replica is promoted
- **Partial coverage**: `cluster-require-full-coverage no` — cluster continues serving remaining partitions if a node fails
- **Replica migration**: `cluster-migration-barrier 1` — orphaned replicas can migrate to orphaned masters
- **Pod anti-affinity** in Kubernetes: replicas are scheduled on different nodes

### Nginx HA

- Multiple upstream servers with `max_fails=3 fail_timeout=30s` for backend health detection
- `proxy_cache_use_stale` serves stale content when backends are unavailable
- `keepalive 256` persistent connections to backends reduce connection overhead
- Multiple Nginx instances behind load balancer for horizontal scaling

### Varnish HA

- Grace mode serves stale content during backend failures
- Health probes (`/api/health` every 5s) detect backend health
- `std.healthy(req.backend_hint)` check in `vcl_hit` triggers restart for fresh content
- Multiple Varnish instances can be deployed behind the load balancer with identical VCL

### ATS HA

- RAM cache persists within container; disk cache persists across restarts via volumes
- Multiple ATS instances can serve as origin-pull CDN nodes
- Cache partitioning allows graceful degradation

### Application-Level Resilience (`CacheManager`)

- **Graceful degradation**: If Valkey (L2) is unreachable, the application falls back to NodeCache (L1) and database queries
- **Reconnection**: Exponential backoff with `reconnectStrategy: (retries) => Math.min(retries * 100, 3000)`
- **Error isolation**: Remote errors are caught silently; `remoteConnected` flag prevents cascading failures
- **L1-only mode**: If Valkey never connects, the application operates with only NodeCache

### Disk Cache (FS-Cache / bcache) HA

- FS-Cache operates at kernel level; cache data loss does not affect backing filesystem integrity
- bcache with SSD caching + HDD backing: SSD failure degrades to HDD-only I/O
- Write-through or write-back modes configurable per bcache device
