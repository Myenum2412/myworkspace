# Configuration Reference — MyWorkSpace Cache Infrastructure

## Environment Variables (All Layers)

### Core Variables

| Variable | Default | Layer | Description |
|---|---|---|---|
| `VALKEY_PASSWORD` | `myworkspace` | 2, 3 | Valkey authentication password |
| `SESSION_CACHE_PASSWORD` | (none) | 2, 3 | Password for `sessionuser` ACL role |
| `API_CACHE_PASSWORD` | (none) | 2, 3 | Password for `apicacheuser` ACL role |
| `READONLY_PASSWORD` | (none) | 2, 3 | Password for `readonlyuser` ACL role |
| `MONITORING_PASSWORD` | (none) | 2, 3 | Password for `monitoringuser` ACL role |

### Varnish Variables

| Variable | Default | Description |
|---|---|---|
| `VARNISH_MEMORY` | `2g` | Malloc memory allocation for cache |
| `VARNISH_STORAGE` | `malloc,2g` | Storage backend (malloc, file, persistent) |
| `VARNISH_INSTANCE` | `varnish` | Instance name for identification |
| `THREAD_POOL_MIN` | `50` | Minimum worker threads |
| `THREAD_POOL_MAX` | `1000` | Maximum worker threads |
| `THREAD_POOL_TIMEOUT` | `300` | Thread idle timeout (seconds) |
| `WORKSPACE_CLIENT` | `256k` | Client request workspace size |
| `WORKSPACE_BACKEND` | `256k` | Backend response workspace size |
| `DEFAULT_TTL` | `120` | Default cache TTL (seconds) |
| `DEFAULT_GRACE` | `3600` | Default grace period (seconds) |
| `GZIP_LEVEL` | `6` | Gzip compression level (0-9) |
| `NUKE_LIMIT` | `50` | Objects to nuke when storage is full |
| `MAX_RESTARTS` | `4` | Maximum request restarts |
| `MAX_RETRIES` | `3` | Maximum backend fetch retries |

### Monitoring Variables

| Variable | Default | Description |
|---|---|---|
| `GRAFANA_PASSWORD` | `admin` | Grafana admin password |
| `SMTP_PASSWORD` | (none) | AlertManager SMTP auth password |
| `SLACK_WEBHOOK_URL` | (none) | AlertManager Slack webhook URL |
| `PAGERDUTY_ROUTING_KEY` | (none) | AlertManager PagerDuty routing key |
| `WEBHOOK_USER` | (none) | AlertManager webhook basic auth user |
| `WEBHOOK_PASSWORD` | (none) | AlertManager webhook basic auth password |

### Disk Cache Variables

| Variable | Default | Description |
|---|---|---|
| `OVERLAY_UPPER_DIR` | `/var/cache/overlay/upper` | OverlayFS upper (SSD writable layer) |
| `OVERLAY_WORK_DIR` | `/var/cache/overlay/work` | OverlayFS work directory |
| `OVERLAY_LOWER_DIR` | `/var/lib/docker` | OverlayFS lower (base filesystem) |
| `OVERLAY_MERGE_DIR` | `/var/cache/overlay/merged` | OverlayFS merge mount point |
| `BCACHE_SSD_DEV` | `/dev/nvme0n1` | bcache SSD caching device |
| `BCACHE_HDD_DEV` | `/dev/sda1` | bcache HDD backing device |
| `BCACHE_MOUNT_POINT` | `/var/cache/bcache` | bcache mount point |
| `BCACHE_CACHE_MODE` | `writeback` | bcache cache mode (writethrough, writeback, writearound, none) |

---

## Valkey Configuration

### File Locations

| Config | Path |
|---|---|
| Standalone | `valkey/standalone/valkey.conf` |
| Cluster | `valkey/cluster/valkey-cluster.conf` |
| Sentinel | `valkey/sentinel/sentinel.conf` |
| ACL Users | `valkey/users.acl` |
| Init Script | `valkey/init-cluster.sh` |
| Entrypoint | `valkey/docker-entrypoint.sh` |

### Standalone Configuration Parameters

| Parameter | Value | Description |
|---|---|---|
| `port` | `6379` | Listening port |
| `bind` | `0.0.0.0` | Bind address (containerized) |
| `protected-mode` | `yes` | Require password auth |
| `requirepass` | `${VALKEY_PASSWORD}` | Authentication password |
| `rename-command FLUSHALL` | `""` | Disable FLUSHALL (security) |
| `rename-command FLUSHDB` | `""` | Disable FLUSHDB (security) |
| `rename-command CONFIG` | `""` | Disable CONFIG (security) |
| `maxmemory` | `4gb` | Maximum memory usage |
| `maxmemory-policy` | `allkeys-lru` | Eviction policy |
| `maxmemory-samples` | `10` | LRU sample size |
| `save 900 1` | — | RDB snapshot: 1 key changed in 900s |
| `save 300 10` | — | RDB snapshot: 10 keys in 300s |
| `save 60 10000` | — | RDB snapshot: 10000 keys in 60s |
| `appendonly` | `yes` | Enable AOF persistence |
| `appendfsync` | `everysec` | AOF fsync policy |
| `auto-aof-rewrite-percentage` | `100` | AOF rewrite trigger (% growth) |
| `auto-aof-rewrite-min-size` | `64mb` | Minimum AOF size for rewrite |
| `timeout` | `300` | Connection idle timeout (s) |
| `tcp-keepalive` | `300` | TCP keepalive interval (s) |
| `tcp-backlog` | `511` | TCP listen backlog |
| `hz` | `10` | Server cron frequency |
| `dynamic-hz` | `yes` | Adaptive cron frequency |
| `activedefrag` | `yes` | Active memory defragmentation |
| `tracking-table-max-keys` | `1000000` | Client tracking table size |
| `notify-keyspace-events` | `KEA` | Keyspace notification events |
| `slowlog-log-slower-than` | `10000` | Slow log threshold (microseconds) |
| `slowlog-max-len` | `128` | Slow log max entries |
| `replica-serve-stale-data` | `yes` | Replica serves stale data during sync |
| `replica-read-only` | `yes` | Replica is read-only |
| `repl-diskless-sync` | `yes` | Diskless replication |
| `repl-diskless-sync-delay` | `5` | Diskless sync delay (s) |

### Eviction Policies

| Policy | Description | Use Case |
|---|---|---|
| `allkeys-lru` | Evict least recently used keys | General-purpose cache |
| `allkeys-lfu` | Evict least frequently used keys | Hot-spot biased workloads |
| `volatile-lru` | Evict LRU keys with TTL set | Mixed cache/persistence |
| `volatile-ttl` | Evict keys with shortest TTL | Time-sensitive cache |
| `allkeys-random` | Evict random keys | Uniform access patterns |
| `noeviction` | Return errors on OOM | Data must not be lost |

### Cluster Configuration Parameters

| Parameter | Value | Description |
|---|---|---|
| `cluster-enabled` | `yes` | Enable cluster mode |
| `cluster-config-file` | `nodes.conf` | Cluster state file |
| `cluster-node-timeout` | `5000` | Node timeout (ms) |
| `cluster-require-full-coverage` | `no` | Allow partial cluster operation |
| `cluster-migration-barrier` | `1` | Min replicas before replica migration |
| `cluster-slave-validity-factor` | `10` | Replica validity factor |
| `cluster-allow-reads-when-down` | `no` | Block reads when cluster down |
| `cluster-replica-no-failover` | `no` | Allow replica failover |
| `cluster-announce-bus-port` | `16379` | Cluster bus port |
| `maxmemory` | `2gb` | Memory per cluster node |
| `maxmemory-policy` | `allkeys-lru` | Eviction policy per node |

### Sentinel Configuration Parameters

| Parameter | Value | Description |
|---|---|---|
| `port` | `26379` | Sentinel port |
| `sentinel monitor` | `mymaster valkey-0 6379 2` | Monitored master |
| `sentinel down-after-milliseconds` | `5000` | Failure detection (ms) |
| `sentinel failover-timeout` | `60000` | Failover timeout (ms) |
| `sentinel parallel-syncs` | `1` | Concurrent replica syncs |
| `sentinel auth-pass` | `${VALKEY_PASSWORD}` | Master auth password |
| `sentinel resolve-hostnames` | `yes` | DNS resolution for hostnames |
| `sentinel announce-hostnames` | `yes` | Announce via hostnames |

### ACL User Roles

| User | Permissions | Key Pattern | Purpose |
|---|---|---|---|
| `default` | `off` | — | Disable default user |
| `appuser` | `+@all -@dangerous +@connection -@admin` | `*` | Application cache access |
| `sessionuser` | `+get +set +expire +del +exists +ttl` | `session:*` | Session data only |
| `apicacheuser` | `+get +set +expire +del +exists` | `api:*` | API cache only |
| `readonlyuser` | `+get +exists +ttl +keys +type +info` | `*` | Read-only access |
| `monitoringuser` | `+info +ping +cluster\|info +slowlog\|get +memory\|stats` | `*` | Monitoring queries |

### TLS Configuration (Production)

```conf
tls-port 6379
tls-cert-file /etc/valkey/tls/valkey.crt
tls-key-file /etc/valkey/tls/valkey.key
tls-ca-cert-file /etc/valkey/tls/ca.crt
tls-auth-clients yes
tls-replication yes
tls-cluster yes
```

---

## Varnish VCL Configuration

### File Locations

| Config | Path |
|---|---|
| Main VCL | `varnish/vcl/default.vcl` |
| API Cache Sub | `varnish/vcl/api-cache.vcl` |
| Entrypoint | `varnish/docker-entrypoint.sh` |

### Runtime Parameters

| Parameter | Flag | Default | Description |
|---|---|---|---|
| Thread pool min | `-p thread_pool_min` | `50` | Minimum worker threads |
| Thread pool max | `-p thread_pool_max` | `1000` | Maximum worker threads |
| Thread pool timeout | `-p thread_pool_timeout` | `300` | Thread idle timeout (s) |
| Workspace client | `-p workspace_client` | `256k` | Client request workspace |
| Workspace backend | `-p workspace_backend` | `256k` | Backend response workspace |
| Default TTL | `-p default_ttl` | `120` | Default cache TTL (s) |
| Default grace | `-p default_grace` | `3600` | Default grace period (s) |
| Gzip level | `-p gzip_level` | `6` | Compression level |
| Nuke limit | `-p nuke_limit` | `50` | Objects to free on full cache |
| Max restarts | `-p max_restarts` | `4` | Max request restarts |
| Max retries | `-p max_retries` | `3` | Max backend fetch retries |
| Feature | `-p feature` | `+http2` | Enable HTTP/2 |

### Subroutines

| Subroutine | Purpose | Key Actions |
|---|---|---|
| `vcl_recv` | Request handling | PURGE/BAN ACL, cache bypass logic, hash decision |
| `vcl_hash` | Cache key computation | URL + host + Accept header |
| `vcl_backend_response` | Response caching | TTL by Content-Type, Cache-Control parsing |
| `vcl_deliver` | Response delivery | X-Cache header, internal header removal |
| `vcl_hit` | Cache hit handling | Grace mode with backend health check |
| `vcl_miss` | Cache miss handling | Fetch from backend |
| `vcl_backend_error` | Backend error handling | Deliver stale if available |
| `vcl_synth` | Synthetic responses | JSON error responses |

### TTL Rules

| Content Type | TTL | Grace | Notes |
|---|---|---|---|
| `image/*` | `7d` | `24h` | All image formats |
| `application/javascript` | `7d` | `24h` | JS bundles |
| `text/css` | `7d` | `24h` | Stylesheets |
| `text/html` | `5m` | `1h` | HTML pages |
| `application/json` | `2m` | `10m` | API responses |
| Default | `30s` | — | Fallback TTL |

### ACL for PURGE/BAN

```
acl purge_acl {
  "localhost";
  "127.0.0.1";
  "10.0.0.0"/8;
  "172.16.0.0"/12;
  "192.168.0.0"/16;
}
```

### Invalidation Endpoints

| Method | Header | Effect |
|---|---|---|
| `PURGE <url>` | — | Purge single URL |
| `PURGE <url>` | `X-Purge-Tag: <tag>` | Ban all objects with tag |
| `BAN /` | `X-Ban-Pattern: <regex>` | Ban matching objects |

### Cache Bypass Rules

| Condition | Action |
|---|---|
| `req.method` not GET/HEAD | `pass` |
| URL matches `/orgmenu` or `/admin` | `pass` |
| URL matches `/api/auth` or `/api/client-auth` | `pass` |
| `Upgrade: websocket` header present | `pass` |
| `Authorization` header present | `pass` |
| `Cookie` matches `authjs`, `next-auth`, `__session` | `pass` |
| Static asset extensions | `hash` (cache) |
| API GET for cacheable endpoints | `hash` (cache) |

### Backend Configuration

```vcl
backend api_backend {
  .host = "nginx";
  .port = "80";
  .connect_timeout = 5s;
  .first_byte_timeout = 30s;
  .between_bytes_timeout = 10s;
  .max_connections = 500;
  .probe = {
    .url = "/api/health";
    .interval = 5s;
    .timeout = 3s;
    .window = 5;
    .threshold = 3;
  }
}
```

---

## Nginx Configuration

### File Locations

| Config | Path |
|---|---|
| Main config | `nginx/conf/nginx.conf` |
| MyWorkSpace site | `nginx/conf/conf.d/myworkspace.conf` |
| CDN subdomain | `nginx/conf/conf.d/cdn.conf` |
| SSL params | `nginx/conf/ssl/ssl-params.conf` |
| TLS cert | `nginx/ssl/fullchain.pem` |
| TLS key | `nginx/ssl/privkey.pem` |

### Global Settings (nginx.conf)

| Parameter | Value | Description |
|---|---|---|
| `worker_processes` | `auto` | Automatic CPU count |
| `worker_rlimit_nofile` | `65535` | Max open files per worker |
| `worker_connections` | `16384` | Max connections per worker |
| `use` | `epoll` | Event model (Linux) |
| `multi_accept` | `on` | Accept multiple connections |
| `accept_mutex` | `off` | Disable accept mutex |
| `sendfile` | `on` | Enable sendfile |
| `sendfile_max_chunk` | `512k` | Max sendfile chunk |
| `tcp_nopush` | `on` | Optimize packet sending |
| `tcp_nodelay` | `on` | Disable Nagle algorithm |
| `keepalive_timeout` | `65` | Keepalive timeout (s) |
| `keepalive_requests` | `1000` | Max requests per connection |
| `client_max_body_size` | `100m` | Max request body |
| `client_body_buffer_size` | `128k` | Body buffer size |
| `reset_timedout_connection` | `on` | Reset timed-out connections |
| `lingering_close` | `off` | Disable lingering close |
| `server_tokens` | `off` | Hide Nginx version |

### Cache Zones

| Zone | Keys Size | Max Size | Inactive | Path |
|---|---|---|---|---|
| `api_cache` | `500m` | `10g` | `60m` | `/var/cache/nginx/api` |
| `static_cache` | `500m` | `50g` | `7d` | `/var/cache/nginx/static` |
| `tus_cache` | `100m` | `5g` | `24h` | `/var/cache/nginx/tus` |
| `cdn_cache` | `500m` | `100g` | `30d` | `/var/cache/nginx/cdn` |

### Rate Limit Zones

| Zone | Rate | Size | Purpose |
|---|---|---|---|
| `auth_limit` | `20r/m` | `10m` | Authentication endpoints |
| `api_limit` | `600r/m` | `100m` | General API |
| `upload_limit` | `50r/m` | `50m` | File upload |
| `search_limit` | `100r/m` | `50m` | Search API |
| `conn_limit` | `50` | `10m` | Per-client connections |

### Upstreams

| Upstream | Method | Servers | Features |
|---|---|---|---|
| `backend_servers` | `least_conn` | `backend:4000` | `keepalive 256`, `max_fails=3` |
| `varnish_servers` | `ip_hash` | `varnish:80` | `keepalive 128`, `max_fails=3` |

### TLS Configuration

| Parameter | Value |
|---|---|
| Protocols | `TLSv1.2 TLSv1.3` |
| Session cache | `shared:SSL:50m` |
| Session timeout | `1d` |
| Session tickets | `off` |
| Stapling | `on` |
| Stapling verify | `on` |
| HTTP/2 | `on` |
| HTTP/3 (QUIC) | `on` (port 443 quic) |
| Ciphers | `ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-...` |
| Prefer server ciphers | `off` |

### Logging Format

```nginx
log_format json_combined escape=json '{
  "time": "$time_iso8601",
  "remote_addr": "$remote_addr",
  "request": "$request",
  "status": $status,
  "body_bytes_sent": $body_bytes_sent,
  "request_time": $request_time,
  "upstream_addr": "$upstream_addr",
  "upstream_status": "$upstream_status",
  "upstream_response_time": "$upstream_response_time",
  "cache_status": "$upstream_cache_status",
  "http_referrer": "$http_referer",
  "http_user_agent": "$http_user_agent",
  "http_x_forwarded_for": "$http_x_forwarded_for"
}';
```

### Location Blocks (myworkspace.conf)

| Location | Cache | Rate Limit | Special |
|---|---|---|---|
| `/` | Via Varnish | — | Default proxy |
| `/api/` | `api_cache` | `api_limit` | `proxy_cache_lock on` |
| `/api/auth/` | Bypassed | `auth_limit` | Never cached |
| `/api/search` | `api_cache` (60s) | `search_limit` | `proxy_cache_valid 200 60s` |
| `/api/dashboard` | `api_cache` (120s) | — | `proxy_cache_valid 200 120s` |
| `/api/files/upload` | Bypassed | `upload_limit` | `client_max_body_size 500m` |
| `/api/files-tus` | Bypassed | — | TUS protocol, `proxy_request_buffering off` |
| `/_next/static/` | `static_cache` (365d) | — | Immutable, `expires 365d` |
| `\.(js\|css\|...)` | STATIC | — | `expires 365d`, `Cache-Control: immutable` |
| `/nginx-health` | — | — | Health check endpoint |

### Caching Directives

| Directive | Setting | Description |
|---|---|---|
| `proxy_cache_key` | `"$scheme$request_method$host$request_uri"` | Cache key format |
| `proxy_cache_valid` | `200 30s` | Cache validity by status code |
| `proxy_cache_use_stale` | `error timeout updating http_5xx` | Serve stale on errors |
| `proxy_cache_lock` | `on` | Prevent cache stampede |
| `proxy_cache_lock_timeout` | `5s` | Lock timeout |
| `proxy_no_cache` | `$no_cache` | Bypass cache condition |
| `proxy_cache_bypass` | `$no_cache` | Bypass cache condition |

### Gzip Compression

```
gzip on;
gzip_vary on;
gzip_proxied any;
gzip_comp_level 6;
gzip_min_length 1000;
gzip_types text/plain text/css text/xml text/javascript application/json
           application/javascript application/xml application/xml+rss
           image/svg+xml image/x-icon font/ttf font/otf font/woff font/woff2;
```

### Security Headers

| Header | Value |
|---|---|
| `Strict-Transport-Security` | `max-age=63072000; includeSubDomains; preload` |
| `X-Frame-Options` | `SAMEORIGIN` |
| `X-Content-Type-Options` | `nosniff` |
| `X-XSS-Protection` | `1; mode=block` |
| `Referrer-Policy` | `strict-origin-when-cross-origin` |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=()` |

---

## Apache Traffic Server Configuration

### File Locations

| Config | Path |
|---|---|
| Records (core) | `trafficserver/conf/records.config` |
| Cache rules | `trafficserver/conf/cache.config` |
| URL remapping | `trafficserver/conf/remap.config` |

### Thread Configuration

| Parameter | Value | Description |
|---|---|---|
| `proxy.config.exec_thread.autoconfig` | `1` | Auto-configure threads |
| `proxy.config.exec_thread.autoconfig.scale` | `1.5` | Thread scaling factor |
| `proxy.config.exec_thread.limit` | `16` | Maximum threads |

### RAM Cache

| Parameter | Value | Description |
|---|---|---|
| `proxy.config.cache.ram_cache.size` | `1G` | RAM cache size |
| `proxy.config.cache.ram_cache_cutoff` | `524288` | Max object size for RAM cache (bytes) |

### Disk Cache

| Parameter | Value | Description |
|---|---|---|
| `proxy.config.cache.max_disk_size` | `100G` | Maximum disk cache |
| `proxy.config.cache.min_average_object_size` | `4096` | Minimum object size for caching (bytes) |
| `proxy.config.cache.permit_pipelining` | `1` | Allow HTTP pipelining |

### HTTP Settings

| Parameter | Value | Description |
|---|---|---|
| `proxy.config.http.server_port` | `8080` | Listening port |
| `proxy.config.http.insert_request_via_str` | `1` | Insert Via header |
| `proxy.config.http.insert_response_via_str` | `1` | Insert Via header |
| `proxy.config.http.response_server_enabled` | `1` | Insert Server header |
| `proxy.config.http.send_http11_requests` | `1` | Use HTTP/1.1 |

### Connection Timeouts

| Parameter | Value | Description |
|---|---|---|
| `keep_alive_no_activity_timeout_in` | `120` | Incoming keepalive timeout (s) |
| `keep_alive_no_activity_timeout_out` | `120` | Outgoing keepalive timeout (s) |
| `transaction_no_activity_timeout_in` | `30` | Incoming transaction timeout (s) |
| `transaction_no_activity_timeout_out` | `30` | Outgoing transaction timeout (s) |
| `accept_no_activity_timeout` | `30` | Accept timeout (s) |

### Cache Control Settings

| Parameter | Value | Description |
|---|---|---|
| `proxy.config.http.cache.http` | `1` | Enable HTTP caching |
| `proxy.config.http.cache.ignore_client_cc_max_age` | `0` | Respect client max-age |
| `proxy.config.http.cache.ignore_client_no_cache` | `0` | Respect no-cache |
| `proxy.config.http.cache.cache_urls_that_look_dynamic` | `0` | Don't cache dynamic-looking URLs |

### Cache Rules (cache.config)

| Pattern | TTL | Cache | Description |
|---|---|---|---|
| `.*\.(jpg\|jpeg\|png\|gif\|webp\|avif\|svg\|ico\|css\|js\|woff2?\|ttf\|eot\|otf)$` | `31536000` | `yes` | Static assets |
| `/_next/static/.*` | `31536000` | `yes` | Next.js build output |
| `/uploads/.*` | `604800` | `yes` | User uploads |
| `/banners/.*` | `86400` | `yes` | Banners |
| `/api/.*` | — | `no` | API (delegated to Varnish) |
| `.*\.html?$` | — | `no` | HTML (delegated to Varnish) |
| `.*` (default) | `0` | `no` | Default: no caching |

### Remap Rules (remap.config)

```
map / http://backend:4000/
map https://cdn.myworkspace.myenum.in/ http://backend:4000/
map /_next/static/ http://backend:4000/_next/static/
map /uploads/ http://backend:4000/uploads/
map /banners/ http://backend:4000/banners/
map /api/ http://backend:4000/api/  @action=allow
```

---

## FS-Cache / bcache Configuration

### File Locations

| Config | Path |
|---|---|
| FS-Cache config | `disk/fscache/cachefilesd.conf` |
| FS-Cache setup | `disk/fscache/fscache-setup.sh` |
| bcache config | `disk/bcache/bcache.conf` |
| bcache setup | `disk/bcache/bcache-setup.sh` |
| OverlayFS setup | `disk/overlayfs-setup.sh` |

### FS-Cache Parameters (cachefilesd.conf)

| Parameter | Value | Description |
|---|---|---|
| `dir` | `/var/cache/fscache` | Cache directory |
| `tag` | `default` | Cache tag |
| `brun` | `0%` | Block-level: free space before culling stops |
| `bcull` | `5%` | Block-level: free space when culling starts |
| `bstop` | `10%` | Block-level: free space when culling stops |
| `frun` | `10%` | File-level: free space before culling stops |
| `fcull` | `5%` | File-level: free space when culling starts |
| `fstop` | `0%` | File-level: free space for new objects |
| `bsize` | `256` | Block size (bytes) |
| `nothreads` | `4` | Thread count for cache processing |

### bcache Parameters

| Parameter | Value | Description |
|---|---|---|
| `congested_read_threshold_us` | `2000` | Read congestion threshold (µs) |
| `congested_write_threshold_us` | `20000` | Write congestion threshold (µs) |
| `sequential_cutoff` | `0` | Sequential I/O cutoff (0 = cache all) |
| `writeback_rate` | `1048576` | Writeback rate (1 MiB/s) |
| `writeback_rate_update_seconds` | `60` | Rate update interval (s) |
| `writeback_rate_minimum` | `8` | Minimum writeback rate |
| `writeback_rate_p_term_inverse` | `10000` | Proportional term |
| `writeback_rate_d_term` | `30` | Derivative term |
| `io_error_limit` | `0` | Error limit before detach (0 = unlimited) |
| `gc_period` | `300` | GC interval (s) |

### Cache Modes (bcache)

| Mode | Description | Use Case |
|---|---|---|
| `writethrough` | Write to both cache and backing (safe) | Default, data integrity critical |
| `writeback` | Write to cache first, flush later (fast) | High write throughput, some risk |
| `writearound` | Bypass cache for writes | Read-heavy workloads |
| `none` | Disable caching | Debugging, bypass |

---

## NodeCache / CacheManager Configuration

### File Locations

| File | Path |
|---|---|
| CacheManager | `nodecache/cache-manager.ts` |
| NodeCacheProvider | `nodecache/node-cache-provider.ts` |
| Package config | `nodecache/package.json` |

### Provider Configurations

| Provider | Namespace | TTL | Check Period | Max Keys | Use Clones |
|---|---|---|---|---|---|
| `config` | `config` | `3600s` | `600s` | `1000` | `true` |
| `query` | `query` | `300s` | `60s` | `10000` | `false` |
| `api` | `api` | `120s` | `30s` | `5000` | `false` |
| `session` | `session` | `3600s` | `300s` | `50000` | `false` |
| `auth` | `auth` | `300s` | `60s` | `10000` | `false` |
| `permission` | `permission` | `600s` | `120s` | `5000` | `false` |
| `computation` | `computation` | `60s` | `15s` | `2000` | `false` |

### CacheManager Methods

| Method | Description | Cache Layers |
|---|---|---|
| `get<T>(key, fetcher?)` | Get value, fetch if missing | L1 → L2 → fetcher |
| `set<T>(key, value, ttl?)` | Set value in all layers | L1 + L2 |
| `del(key)` | Delete key from all layers | L1 + L2 |
| `delByTag(tag)` | Delete by tag (bulk invalidation) | L1 + L2 |
| `getOrFetch<T>(key, fetcher, ttl?)` | Get or fetch with TTL | L1 → L2 → fetcher → L1+L2 |
| `refreshPattern(pattern)` | Delete keys matching pattern | L1 + L2 |

### Reconnection Strategy

| Parameter | Value |
|---|---|
| `reconnectStrategy` | `Math.min(retries * 100, 3000)` |
| `connectTimeout` | `5000ms` |
| Error handling | Silent catch, `remoteConnected` flag |

---

## Monitoring Configuration

### File Locations

| Config | Path |
|---|---|
| Prometheus config | `monitoring/prometheus/prometheus.yml` |
| Valkey alert rules | `monitoring/prometheus/valkey.yml` |
| AlertManager config | `monitoring/alertmanager/alertmanager.yml` |
| Grafana datasource | `monitoring/grafana/datasources/datasource.yml` |
| Grafana dashboard | `monitoring/grafana/dashboards/cache-overview.json` |

### Prometheus Scrape Jobs

| Job | Target | Interval | Port |
|---|---|---|---|
| `prometheus` | `localhost:9090` | `15s` | 9090 |
| `valkey` | `valkey-exporter:9121` | `10s` | 9121 |
| `nginx` | `nginx-exporter:9113` | `15s` | 9113 |
| `varnish` | `varnish:6082` | `15s` | 6082 |
| `trafficserver` | `trafficserver:8080` | `30s` | 8080 |
| `node` | `node-exporter:9100` | `15s` | 9100 |

### Alert Rules (valkey.yml)

| Alert | Condition | For | Severity |
|---|---|---|---|
| `ValkeyDown` | `redis_up == 0` | `30s` | `critical` |
| `ValkeyMemoryHigh` | memory > 90% | `5m` | `warning` |
| `ValkeyCacheHitRateLow` | hit rate < 80% | `10m` | `warning` |
| `ValkeyConnectedClientsHigh` | clients > 500 | `5m` | `warning` |

### AlertManager Routing

| Severity | Receiver | Repeat Interval | Channels |
|---|---|---|---|
| `critical` | `critical` | `5m` | Email, Slack, PagerDuty, Webhook |
| `warning` | `warning` | `30m` | Email, Slack, Webhook |
| `default` | `default` | `4h` | Email, Webhook |

### Grafana Datasource

```yaml
datasources:
  - name: Prometheus
    type: prometheus
    access: proxy
    url: http://prometheus:9090
    isDefault: yes
    jsonData:
      timeInterval: 15s
      queryTimeout: 30s
```

### Grafana Dashboard Panels

| Panel | Metric | Description |
|---|---|---|
| Valkey Cache Hit Rate | `rate(redis_keyspace_hits_total[5m]) / (rate(redis_keyspace_hits_total[5m]) + rate(redis_keyspace_misses_total[5m])) * 100` | Cache efficiency |
| Valkey Memory Usage | `redis_memory_used_bytes` vs `redis_memory_max_bytes` | Memory pressure |
| Nginx Cache Status | `rate(nginx_http_cache_total[5m])` | HIT vs MISS rate |
| Connected Clients | `redis_connected_clients` | Connection load |

---

## Tuning Parameters for Production

### Valkey Production Settings

```conf
# Memory
maxmemory 4gb
maxmemory-policy allkeys-lru
maxmemory-samples 10
hz 100                    # Increased from 10 for responsiveness
activedefrag yes
active-defrag-threshold-lower 10
active-defrag-threshold-upper 100
active-defrag-ignore-bytes 100mb
active-defrag-cycle-min 1
active-defrag-cycle-max 25

# Persistence for production
appendonly yes
appendfsync everysec
no-appendfsync-on-rewrite yes
auto-aof-rewrite-percentage 100
auto-aof-rewrite-min-size 64mb
aof-load-truncated yes
aof-use-rdb-preamble yes

# Slow log
slowlog-log-slower-than 5000  # 5ms instead of 10ms
slowlog-max-len 256

# Client output buffer
client-output-buffer-limit normal 0 0 0
client-output-buffer-limit replica 256mb 64mb 60
client-output-buffer-limit pubsub 32mb 8mb 60
```

### Varnish Production Settings

```bash
# Runtime parameters
-p thread_pool_min=200
-p thread_pool_max=5000
-p thread_pool_timeout=120
-p workspace_client=512k
-p workspace_backend=512k
-p default_ttl=120
-p default_grace=86400
-p gzip_level=6
-p nuke_limit=100
-p max_restarts=4
-p max_retries=3
-p feature=+http2
-s malloc,8g  # 8GB for production
```

### Nginx Production Settings

```nginx
worker_processes auto;
worker_rlimit_nofile 100000;

events {
    worker_connections 32768;
    use epoll;
    multi_accept on;
}

http {
    # Increase cache zones
    proxy_cache_path /var/cache/nginx/api levels=1:2 keys_zone=api_cache:1g
        max_size=20g inactive=60m use_temp_path=off;
    proxy_cache_path /var/cache/nginx/static levels=1:2 keys_zone=static_cache:1g
        max_size=100g inactive=30d use_temp_path=off;

    sendfile on;
    sendfile_max_chunk 1m;
    tcp_nopush on;
    tcp_nodelay on;

    keepalive_timeout 75;
    keepalive_requests 10000;
}
```

### ATS Production Settings

```
CONFIG proxy.config.exec_thread.autoconfig.scale FLOAT 2.0
CONFIG proxy.config.exec_thread.limit INT 32
CONFIG proxy.config.cache.ram_cache.size INT 4G
CONFIG proxy.config.cache.max_disk_size INT 500G
CONFIG proxy.config.http.keep_alive_no_activity_timeout_in INT 60
CONFIG proxy.config.http.keep_alive_no_activity_timeout_out INT 60
```

### Kernel Production Settings

```sysctl
# Network
net.core.somaxconn = 65535
net.core.netdev_max_backlog = 100000
net.ipv4.tcp_max_syn_backlog = 65535
net.ipv4.tcp_fin_timeout = 10
net.ipv4.tcp_tw_reuse = 1
net.ipv4.tcp_keepalive_time = 300
net.ipv4.tcp_keepalive_intvl = 60
net.ipv4.tcp_keepalive_probes = 5
net.ipv4.tcp_rmem = 4096 87380 16777216
net.ipv4.tcp_wmem = 4096 65536 16777216
net.core.rmem_max = 16777216
net.core.wmem_max = 16777216
net.ipv4.tcp_congestion_control = bbr
net.core.default_qdisc = fq

# Virtual memory
vm.swappiness = 10
vm.dirty_ratio = 10
vm.dirty_background_ratio = 5
vm.vfs_cache_pressure = 50
vm.min_free_kbytes = 524288
vm.max_map_count = 262144

# File system
fs.file-max = 2097152
fs.nr_open = 2097152
fs.inotify.max_user_watches = 524288
```
