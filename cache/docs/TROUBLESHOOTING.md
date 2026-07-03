# Troubleshooting Guide — MyWorkSpace Cache Infrastructure

## Valkey Connection Issues

### Cannot Connect to Valkey Standalone

**Symptoms**:
- `valkey-cli` returns `Could not connect to Redis at 127.0.0.1:6379: Connection refused`
- Application logs: `Error: connect ECONNREFUSED 127.0.0.1:6379`

**Causes & Fixes**:

| Cause | Check | Fix |
|---|---|---|
| Service not started | `docker compose ps valkey-standalone` | `docker compose up -d valkey-standalone` |
| Port not exposed | `ss -tlnp \| grep 6379` | Check port mapping in compose file |
| Firewall blocking | `iptables -L -n \| grep 6379` | Allow port: `ufw allow 6379` |
| Wrong password | `valkey-cli -a 'wrongpass' ping` | Verify `VALKEY_PASSWORD` in `.env` |
| Max clients reached | `valkey-cli info clients` | Increase `maxclients` in valkey.conf |
| Docker DNS issue | `docker exec nginx nslookup valkey-standalone` | Restart DNS: `docker compose restart` |

**Quick Test**:
```bash
# From host
valkey-cli -h 127.0.0.1 -p 6379 -a "${VALKEY_PASSWORD}" ping

# From another container
docker exec -it cache_nginx_1 sh -c \
  "apk add valkey-cli && valkey-cli -h valkey-standalone -p 6379 -a '${VALKEY_PASSWORD}' ping"
```

### Sentinel Connection Issues

**Symptoms**:
- `valkey-cli -p 26379 ping` returns no response
- Sentinel logs: `+sdown master mymaster`
- Application gets `READONLY` errors

**Diagnosis**:
```bash
# Check sentinel status
valkey-cli -p 26379 sentinel master mymaster
valkey-cli -p 26379 sentinel replicas mymaster
valkey-cli -p 26379 sentinel sentinels mymaster

# Check sentinel logs
docker compose logs valkey-sentinel-0

# Check quorum (requires 2 of 3 to agree)
valkey-cli -p 26379 sentinel ckquorum mymaster
```

**Common Fixes**:
```bash
# Reset sentinel state for a master
valkey-cli -p 26379 sentinel reset mymaster

# Force failover (if sentinel won't trigger)
valkey-cli -p 26379 sentinel failover mymaster

# If sentinel can't resolve hostname, check DNS
# sentinel resolve-hostnames must be yes in sentinel.conf
```

### Redis Exporter Connection Failed

**Symptoms**:
- Prometheus shows `valkey` target as `DOWN`
- Valkey exporter logs: `Can't connect to Redis`

**Fixes**:
```bash
# Verify exporter can connect
docker compose exec valkey-exporter sh -c \
  "wget -q -O - http://localhost:9121/metrics | grep redis_up"

# Check REDIS_ADDR env var
docker compose exec valkey-exporter env | grep REDIS

# Wrong password in REDIS_PASSWORD
docker compose exec valkey-exporter env | grep REDIS_PASSWORD
```

---

## Valkey Cluster Split-Brain Scenarios

### Identifying Split-Brain

**Symptoms**:
- `cluster info` shows `cluster_state:fail` but all nodes are up
- Some keys are unreachable (redirect errors)
- `cluster nodes` shows multiple masters for the same hash slot

**Diagnosis**:
```bash
# Check cluster state on each node
for i in 0 1 2 3 4 5; do
  echo "Node $i: $(docker compose exec valkey-cluster-$i \
    valkey-cli -a "${VALKEY_PASSWORD}" cluster info | grep cluster_state)"
done

# Check unique master count
docker compose exec valkey-cluster-0 \
  valkey-cli -a "${VALKEY_PASSWORD}" cluster nodes | grep master | wc -l

# Should be exactly 3 masters. If more, split-brain has occurred.
```

### Fixing Split-Brain

```bash
# 1. Identify the minority partition nodes
# 2. On minority nodes, shut down Valkey
docker compose stop valkey-cluster-3 valkey-cluster-4 valkey-cluster-5

# 3. On the majority partition, reset the cluster
docker compose exec valkey-cluster-0 \
  valkey-cli -a "${VALKEY_PASSWORD}" cluster reset hard

# 4. Restart minority nodes
docker compose start valkey-cluster-3 valkey-cluster-4 valkey-cluster-5

# 5. Recreate the cluster
docker compose up -d valkey-cluster-init

# 6. Verify
docker compose exec valkey-cluster-0 \
  valkey-cli -a "${VALKEY_PASSWORD}" cluster info | grep cluster_state
```

### Prevention

```conf
# Ensure cluster-node-timeout is low enough for fast detection
cluster-node-timeout 5000

# Never set cluster-require-full-coverage yes in production
cluster-require-full-coverage no

# Use cluster-replica-no-failover no to allow automatic failover
cluster-replica-no-failover no
```

### Network Partition Recovery

```bash
# After partition heals, check for orphaned masters
docker compose exec valkey-cluster-0 \
  valkey-cli -a "${VALKEY_PASSWORD}" cluster nodes | grep "master\|slave"

# If key slots are unassigned, fix manually
docker compose exec valkey-cluster-0 \
  valkey-cli -a "${VALKEY_PASSWORD}" --cluster fix \
    10.20.0.10:6379
```

---

## Sentinel Failover Problems

### Failover Not Triggering

**Symptoms**:
- Master is down but no replica promoted
- `sentinel master mymaster` shows `flags: s_down` (subjective down) but not `o_down` (objective down)

**Causes**:
| Cause | Check | Fix |
|---|---|---|
| Quorum not reached | `sentinel ckquorum mymaster` | Ensure at least 2 of 3 sentinels agree |
| Sentinel can't reach master | `sentinel master mymaster` | Check network: `ping valkey-standalone` |
| Failover timeout | `sentinel failover-timeout` | Increase timeout (default 60000ms) |
| No valid replica | `sentinel replicas mymaster` | Ensure replica has `replicaof` configured |

**Manual Failover**:
```bash
# Force an immediate failover (even if master is healthy)
valkey-cli -p 26379 sentinel failover mymaster
```

### False Failovers

**Symptoms**:
- Frequent replica promotions during normal operation
- Application sees `MASTERDOWN` or `READONLY` messages

**Causes**:
| Cause | Check | Fix |
|---|---|---|
| `down-after-milliseconds` too low | Current value | Increase to 10000 (10s) |
| Network latency spikes | `ping valkey-standalone` | Check network stability |
| Sentinel on same host | Check sentinel placement | Spread sentinels across nodes |

**Fix**:
```conf
# Increase fault detection threshold
sentinel down-after-milliseconds mymaster 10000
sentinel failover-timeout mymaster 120000
```

### Replica Sync Failures

**Symptoms**:
- `+fullresync` in logs but never completes
- Replica stays in `SYNC` state

**Diagnosis**:
```bash
# Check replica role
valkey-cli -p 6379 -a "${VALKEY_PASSWORD}" role

# Check replication info
valkey-cli -p 6379 -a "${VALKEY_PASSWORD}" INFO replication

# Check slave log
docker compose logs valkey-standalone | grep -i "repl\|sync\|rdb"
```

**Fixes**:
```bash
# Increase repl-timeout
valkey-cli -p 6379 -a "${VALKEY_PASSWORD}" CONFIG SET repl-timeout 120

# Use diskless replication
valkey-cli -p 6379 -a "${VALKEY_PASSWORD}" CONFIG SET repl-diskless-sync yes

# On replica, reset sync state
valkey-cli -p 6379 -a "${VALKEY_PASSWORD}" REPLICAOF NO ONE
valkey-cli -p 6379 -a "${VALKEY_PASSWORD}" REPLICAOF valkey-standalone 6379
```

---

## Varnish Cache Not Working

### All Requests Show MISS

**Symptoms**:
- `X-Cache: MISS` on every response
- High backend load
- Low hit rate in `varnishstat`

**Causes & Fixes**:

| Cause | Check | Fix |
|---|---|---|
| Cookies present | `curl -I http://localhost/` with Cookie header | Varnish passes on cookie presence |
| Auth headers | Check for `Authorization` header | Varnish passes on auth |
| Wrong HTTP method | POST/PUT requests | Only GET and HEAD are cached |
| Backend includes no-cache | `curl -I http://localhost/` shows `Cache-Control: no-cache` | Remove no-cache from backend |
| Storage full | `varnishstat -1 \| grep n_lru_nuked` | Increase storage or memory |
| VCL syntax error | `varnishd -C -f /etc/varnish/default.vcl` | Fix VCL compilation |

**Debugging**:
```bash
# Enable Varnish log streaming
varnishlog -g request

# Watch a specific URL
varnishlog -q "ReqURL eq '/api/dashboard'"

# Show detailed request handling
varnishlog -q "ReqURL ~ '/api/'" -g request | grep -E "ReqMethod|ReqURL|VCL_call|VCL_Action|FetchError|BerespProtocol"

# Check varnishstat counters
varnishstat -1 | grep -E "MAIN\.(cache_hit|cache_miss|pass|fetch|n_object)"
```

### Varnish PURGE Not Working

**Symptoms**:
- PURGE returns `405 Not Allowed`
- PURGE returns `200` but objects are still served

**Causes & Fixes**:
```bash
# 405 error: client IP not in purge_acl
# Check ACL in VCL:
# acl purge_acl { "localhost"; "127.0.0.1"; "10.0.0.0"/8; ... }

# Test from allowed IP
curl -X PURGE http://localhost/some-url -H "Host: myworkspace.myenum.in"

# PURGE returns 200 but old content served: BAN not working for tag-based
# Ensure X-Purge-Tag matches the tag set in beresp.http.X-Cache-Tags

# Debug BAN ladder
varnishlog -g raw -q "BAN"
varnishlog -g request -q "ReqMethod eq 'PURGE' or ReqMethod eq 'BAN'"
```

### Varnish High Memory Usage

**Symptoms**:
- Container OOM killed
- `varnishstat` shows high `SMA.s0.g_bytes`
- LRU nuking of objects (`n_lru_nuked` counter increasing)

**Fixes**:
```bash
# Check current storage usage
varnishstat -1 | grep SMA

# Reduce memory allocation (requires restart)
# Set VARNISH_MEMORY to a lower value

# Increase nuke_limit to free more aggressively
-p nuke_limit=100

# Check which objects are consuming memory
varnishstat -1 | grep -E "n_object|n_lru_nuked|n_expired"
```

### Varnish Backend Health

**Symptoms**:
- `varnishlog` shows `FetchError: backend unhealthy`
- Probes failing

**Diagnosis**:
```bash
# Check backend health
varnishadm backend.list

# Check probe results
varnishlog -g raw -q "ProbeMessage"

# Manually test backend
curl -s -o /dev/null -w "%{http_code}" http://nginx:80/api/health
```

---

## Nginx Caching Issues

### Stale Data Being Served

**Symptoms**:
- API responses are outdated even after data changes
- `X-Cache-Status: HIT` for data that should be refreshed

**Causes & Fixes**:

| Cause | Check | Fix |
|---|---|---|
| Cache TTL too long | `proxy_cache_valid 200 30s` | Reduce TTL |
| Cache not purged on write | App invalidation logic | Implement PURGE on writes |
| Inactive time not expired | `inactive=60m` | Reduce inactive time |
| Cache key collision | `proxy_cache_key` format | Include more variables in key |
| Stale-while-revalidate | `proxy_cache_use_stale` config | Check if intended behavior |

**Immediate Purge**:
```bash
# Find cache file and delete
find /var/cache/nginx/api -type f -name ":*" 2>/dev/null | head -5

# Or delete entire cache zone
docker compose exec nginx rm -rf /var/cache/nginx/api/*
docker compose exec nginx nginx -s reload

# Or use proxy_cache_purge module (if compiled)
curl -X PURGE "https://myworkspace.myenum.in/api/dashboard"
```

### Wrong Headers in Cached Responses

**Symptoms**:
- Cached responses have `Set-Cookie` headers from original request
- CORS headers wrong in cached responses

**Fixes**:
```nginx
# In Nginx config, ensure headers are stripped from cached responses
proxy_hide_header Set-Cookie;
proxy_hide_header X-Powered-By;
proxy_ignore_headers Set-Cookie X-Accel-Expires Expires Cache-Control;

# Or use proxy_cache_key with important headers
proxy_cache_key "$scheme$request_method$host$request_uri$http_accept$http_accept_encoding";
```

### Nginx Cache Not Working at All

**Symptoms**:
- `X-Cache-Status` header missing or always `MISS`
- No cache files in `/var/cache/nginx/`

**Causes & Fixes**:
```bash
# Check cache directory permissions
docker compose exec nginx ls -la /var/cache/nginx/
docker compose exec nginx stat /var/cache/nginx/api

# Check if proxy_cache is configured for the location
nginx -T 2>&1 | grep -A2 "proxy_cache.*api_cache"

# Ensure proxy_cache_lock is not causing contention
# Check for "MISS" status: increasing proxy_cache_lock_timeout may help

# Test cache with a simple request
curl -k -I "https://myworkspace.myenum.in/api/search?q=test" 2>/dev/null | grep X-Cache-Status
```

---

## ATS Not Caching

### All Requests Bypass Cache

**Symptoms**:
- `traffic_ctl` shows zero cache hits
- High origin load despite ATS being in path

**Causes & Fixes**:

| Cause | Check | Fix |
|---|---|---|
| Wrong remap rules | `curl http://localhost:8080/` | Verify `remap.config` mappings |
| Cache rules too restrictive | `cache.config` review | Expand cacheable patterns |
| Cache disabled | `traffic_ctl config match proxy.config.http.cache.http` | Set to 1 |
| ATS not receiving traffic | Check load balancer config | Route traffic to ATS:8080 |
| Disk cache full | Check `proxy.config.cache.max_disk_size` | Increase limit or clear cache |

**Diagnosis**:
```bash
# Check ATS status
traffic_ctl server status

# Check cache hit ratio
curl -s http://localhost:8080/__ats__/stats | grep proxy.node.cache_hit_ratio

# Check cache volume status
curl -s http://localhost:8080/__ats__/stats | grep proxy.node.cache.volume

# Clear cache
traffic_ctl cache clear

# Reload configuration
traffic_ctl config reload
```

### ATS High Memory Usage

**Symptoms**:
- ATS process consuming excessive RAM
- OOM killer active

**Fixes**:
```bash
# Reduce RAM cache size
# In records.config:
CONFIG proxy.config.cache.ram_cache.size INT 512M

# Reduce thread count
CONFIG proxy.config.exec_thread.limit INT 8

# Check current memory usage
traffic_ctl metric get proxy.process.cache.ram_cache.total_bytes
```

---

## FS-Cache / bcache Issues

### FS-Cache Not Working

**Symptoms**:
- `cachefilesd` not running
- `/proc/fs/fscache/objects` not found
- Cache directory always empty

**Diagnosis**:
```bash
# Check if FS-Cache is available in kernel
lsmod | grep fscache
modprobe fscache

# Check cachefilesd status
systemctl status cachefilesd
journalctl -u cachefilesd

# Check the cache directory
ls -la /var/cache/fscache/
du -sh /var/cache/fscache/
```

**Fixes**:
```bash
# If kernel module missing, recompile kernel with CONFIG_FSCACHE
# Or use different kernel (5.10+)

# Restart cachefilesd
systemctl restart cachefilesd

# Clear cache
rm -rf /var/cache/fscache/*
systemctl restart cachefilesd
```

### bcache Underperformance

**Symptoms**:
- Low cache hit ratio on bcache
- Writeback never catches up
- SSD cache not effectively used

**Diagnosis**:
```bash
# Check cache hit ratio
cat /sys/block/bcache0/bcache/stats_total/cache_hit_ratio

# Check writeback status
cat /sys/block/bcache0/bcache/writeback_rate

# Check dirty data
cat /sys/block/bcache0/bcache/dirty_data

# Check cache mode
cat /sys/block/bcache0/bcache/cache_mode
# 0=writethrough, 1=writeback, 2=writearound, 3=none
```

**Tuning**:
```bash
# Increase writeback rate for faster flushing
echo 4194304 > /sys/block/bcache0/bcache/writeback_rate  # 4 MiB/s

# Reduce congested thresholds for better utilization
echo 1000 > /sys/block/bcache0/bcache/congested_read_threshold_us
echo 10000 > /sys/block/bcache0/bcache/congested_write_threshold_us

# Switch to writeback mode for better performance
echo writeback > /sys/block/bcache0/bcache/cache_mode
```

### bcache Detachment

**Symptoms**:
- `dmesg` shows bcache errors
- `I/O error` on bcache device
- Cache device not in `/sys/fs/bcache/`

**Recovery**:
```bash
# Check dmesg for errors
dmesg | grep bcache

# Re-register devices
echo /dev/nvme0n1 > /sys/fs/bcache/register
echo /dev/sda1 > /sys/fs/bcache/register

# If device is gone, recreate from backing (data is intact)
# The backing device still has all data (in writethrough mode)
# In writeback mode, some data may be lost
```

---

## Cache Invalidation Not Propagating

### PURGE/BAN Not Reaching All Layers

**Symptoms**:
- Data updated in app but stale served from Varnish/Nginx
- PURGE returns 200 but old content still served

**Diagnosis**:
```bash
# Test PURGE directly to Varnish
curl -X PURGE -H "Host: myworkspace.myenum.in" http://localhost/purge-test

# Check if Varnish received the PURGE
varnishlog -g request -q "ReqMethod eq 'PURGE'"

# Test Nginx cache invalidation
# Nginx doesn't natively support PURGE unless configured
# Use rm on cache directory instead
```

**Fixes**:
```bash
# For Varnish: tag-based invalidation
curl -X PURGE http://localhost/some-url \
  -H "X-Purge-Tag: organization:org_123"

# For Nginx: clear entire cache zone
docker compose exec nginx rm -rf /var/cache/nginx/api/*

# For Valkey: delete keys by pattern
valkey-cli -a "${VALKEY_PASSWORD}" --scan --pattern "cache:*" | xargs valkey-cli -a "${VALKEY_PASSWORD}" del

# For ATS: clear entire cache
docker compose exec trafficserver traffic_ctl cache clear
```

### AppLayer Invalidation Not Working

**Symptoms**:
- `CacheManager.delByTag()` logs success but stale data returned
- `CacheManager.refreshPattern()` doesn't update remote cache

**Causes & Fixes**:
```bash
# Check if L2 (Valkey) connection is healthy
curl -s https://myworkspace.myenum.in/api/health | jq '.cache.remoteConnected'

# If false, L2 invalidation silently fails
# Check Valkey network and password

# Check that keys use correct namespacing
# Keys should be stored as "namespace:key"
# delByTag searches for "*tag*" pattern
```

---

## High Memory Usage

### Valkey Memory Issues

**Symptoms**:
- `used_memory_human` approaching `maxmemory`
- High eviction rate (`evicted_keys` increasing)
- OOM killer messages in logs

**Diagnosis**:
```bash
# Memory breakdown
valkey-cli -a "${VALKEY_PASSWORD}" INFO memory

# Top memory consuming keys
valkey-cli -a "${VALKEY_PASSWORD}" --bigkeys

# Check eviction rate
valkey-cli -a "${VALKEY_PASSWORD}" INFO stats | grep evicted_keys

# Check memory fragmentation
valkey-cli -a "${VALKEY_PASSWORD}" INFO memory | grep mem_fragmentation_ratio
```

**Fixes**:
```bash
# Increase maxmemory (requires restart)
CONFIG SET maxmemory 6gb

# Change eviction policy
CONFIG SET maxmemory-policy allkeys-lfu  # Better for hot-spot workloads

# Run memory defrag manually
CONFIG SET activedefrag yes
CONFIG SET active-defrag-threshold-lower 5

# Flush keys selectively
valkey-cli -a "${VALKEY_PASSWORD}" --scan --pattern "temp:*" | xargs valkey-cli -a "${VALKEY_PASSWORD}" del

# Reduce key TTLs at application level
```

### Varnish Memory Issues

**Symptoms**:
- High `SMA.s0.g_bytes`
- `n_lru_nuked` counter climbing rapidly

**Fixes**:
```bash
# Check current usage
varnishstat -1 | grep -E "SMA|n_lru|n_object"

# Reduce storage (requires restart)
# Set VARNISH_MEMORY to 1g

# Check which content consumes most
varnishstat -1 | grep "n_object"
```

### Nginx Memory Issues

**Symptoms**:
- Nginx worker RSS growing
- OOM kills on Nginx containers

**Diagnosis**:
```bash
# Check worker memory
docker compose top nginx

# Check cache size
du -sh /var/cache/nginx/*
```

**Fixes**:
```bash
# Reduce cache zone sizes in nginx.conf
proxy_cache_path /var/cache/nginx/api levels=1:2 keys_zone=api_cache:100m
    max_size=5g inactive=60m use_temp_path=off;

# Reduce worker connections
worker_connections 8192;

# Restart Nginx to free memory
docker compose restart nginx
```

---

## Slow Cache Performance

### High Latency Cache Hits

**Symptoms**:
- Cache HIT responses taking >100ms
- P95 latency above targets

**Diagnosis Tools**:
```bash
# Measure latency to each layer
time valkey-cli -a "${VALKEY_PASSWORD}" ping
time curl -s -o /dev/null http://localhost/_next/static/test.js
time curl -k -s -o /dev/null https://myworkspace.myenum.in/api/health

# Check for slow queries
valkey-cli -a "${VALKEY_PASSWORD}" SLOWLOG GET 10

# Check Nginx upstream response times in access log
tail -100 /var/log/nginx/access.log | jq '.upstream_response_time'

# System-level checks
iostat -x 1 5   # Disk I/O
vmstat 1 5       # System resources
ss -s            # Socket statistics
```

### Common Bottlenecks

| Bottleneck | Symptom | Fix |
|---|---|---|
| CPU saturation | High `%sys` in `vmstat` | Increase workers, optimize VCL |
| Network bandwidth | High `rx_bytes`/`tx_bytes` | Scale horizontally, compress |
| Disk I/O | High `iowait`, `await` > 10ms | Use SSD/NVMe, increase RAM cache |
| Memory pressure | High swap usage | Reduce cache sizes, add RAM |
| Lock contention | `proxy_cache_lock` timeouts | Disable lock on low-contention routes |
| TLS overhead | High SSL handshake rate | Increase session cache, use TLS 1.3 |
| GC pauses | Valkey latency spikes | Tune GC in Node.js, reduce keys |
| Thundering herd | Cache stampede on miss | Ensure `proxy_cache_lock` is on |

### Network Debugging

```bash
# Check connection pool
ss -s
ss -tlnp | grep -E "80|443|6379|8080"

# Check for TIME_WAIT accumulation
ss -tan state time-wait | wc -l

# Tune if > 10000 TIME_WAIT
# net.ipv4.tcp_tw_reuse = 1
# net.ipv4.tcp_fin_timeout = 10

# Check retransmissions
netstat -s | grep -i retrans

# Check TCP buffer stats
ss -t -i
```

---

## Monitoring Not Working

### Prometheus Targets Down

**Symptoms**:
- Prometheus UI shows targets in `DOWN` state
- Grafana panels show "No data"

**Diagnosis**:
```bash
# Check Prometheus targets via API
curl -s http://localhost:9090/api/v1/targets | jq '.data.activeTargets[] | {job: .labels.job, state: .health, lastError: .lastError}'

# Check Prometheus logs
docker compose logs prometheus | tail -50

# Test connectivity from Prometheus container
docker compose exec prometheus wget -q -O /dev/null --timeout=5 http://valkey-exporter:9121/metrics
docker compose exec prometheus wget -q -O /dev/null --timeout=5 http://nginx-exporter:9113/metrics
```

**Fixes**:
```bash
# Reload Prometheus config (if scrape configs changed)
curl -X POST http://localhost:9090/-/reload

# Or restart
docker compose restart prometheus

# For persistent target failures, check exporter containers
docker compose ps valkey-exporter nginx-exporter
```

### Grafana Issues

**Symptoms**:
- Grafana UI not loading
- "Datasource not found" errors
- Dashboards blank

**Diagnosis**:
```bash
# Check Grafana health
curl -s http://localhost:3000/api/health

# Check datasource config
curl -s http://localhost:3000/api/datasources -u admin:${GRAFANA_PASSWORD}

# Check Grafana logs
docker compose logs grafana | tail -50
```

**Fixes**:
```bash
# Reset admin password
docker compose exec grafana grafana-cli admin reset-admin-password newpassword

# Force provisioning reload
docker compose exec grafana curl -X POST http://localhost:3000/api/admin/provisioning/datasources/reload

# Clear database and restart
docker compose down grafana
rm -rf /data/cache/grafana/*
docker compose up -d grafana
```

### AlertManager Not Sending

**Symptoms**:
- Alerts firing in Prometheus but no notifications
- AlertManager UI shows alerts but no deliveries

**Diagnosis**:
```bash
# Check AlertManager status
curl -s http://localhost:9093/api/v2/status

# Check active alerts
curl -s http://localhost:9093/api/v2/alerts | jq '.[] | {labels, status}'

# Check AlertManager logs
docker compose logs alertmanager | tail -30
```

**Fixes**:
```bash
# Verify SMTP configuration
# Test with telnet:
telnet smtp.example.com 587

# Check Slack webhook URL
# Ensure SLACK_WEBHOOK_URL is set correctly

# Reload AlertManager config
curl -X POST http://localhost:9093/-/reload
```

---

## Common Error Messages

| Error Message | Layer | Cause | Fix |
|---|---|---|---|
| `READONLY You can't write against a read only replica` | Valkey | Writing to replica | Write to master or use Redis Sentinel |
| `CLUSTERDOWN The cluster is down` | Valkey | Cluster state failure | Check `cluster info`, reset if needed |
| `MOVED 12182 10.20.0.12:6379` | Valkey | Redirect to correct cluster node | Use cluster-aware client |
| `ASK 12182 10.20.0.12:6379` | Valkey | Slot migration in progress | Retry with ASKING |
| `Backend unhealthy` | Varnish | Backend probe failed | Check backend health endpoint |
| `Could not open storage file` | Varnish | Storage path issue | Check tmpfs or storage path |
| `no-cache` or `private` header | Varnish | Backend marked as uncacheable | Fix backend Cache-Control headers |
| `upstream timed out (110: Connection timed out)` | Nginx | Backend unresponsive | Check upstream health, increase timeouts |
| `upstream sent too big header` | Nginx | Backend response header too large | Increase `proxy_buffer_size` |
| `no live upstreams` | Nginx | All upstream servers down | Check backend, increase `max_fails` |
| `504 Gateway Time-out` | Nginx | Backend too slow | Increase `proxy_read_timeout`, optimize backend |
| `File does not exist` | ATS | Cache read error | Check disk cache health |
| `proxy.node.cache.volume.0.percent_full 100%` | ATS | Disk cache full | Increase `max_disk_size`, clear cache |

---

## Reset / Recovery Procedures

### Full Cache Reset (All Layers)

```bash
#!/bin/bash
# WARNING: Clears ALL cached data. Run during maintenance window.

echo "Clearing all cache layers..."

# Layer 2: Valkey Standalone
echo "Flushing Valkey standalone..."
valkey-cli -a "${VALKEY_PASSWORD}" FLUSHALL

# Layer 3: Valkey Cluster
echo "Flushing Valkey cluster nodes..."
for i in 0 1 2 3 4 5; do
  docker compose exec valkey-cluster-$i \
    valkey-cli -a "${VALKEY_PASSWORD}" FLUSHALL
done

# Layer 4: Varnish
echo "Banning all Varnish objects..."
docker compose exec varnish varnishadm ban 'req.url ~ .'

# Layer 5: Nginx
echo "Clearing Nginx cache directories..."
docker compose exec nginx rm -rf /var/cache/nginx/api/* /var/cache/nginx/static/* /var/cache/nginx/cdn/*

# Layer 6: ATS
echo "Clearing ATS cache..."
docker compose exec trafficserver traffic_ctl cache clear

# Layer 7: FS-Cache / bcache
echo "Clearing FS-Cache..."
systemctl stop cachefilesd
rm -rf /var/cache/fscache/*
systemctl start cachefilesd

echo "All cache layers cleared."
```

### Valkey Cluster Reset

```bash
# Full cluster teardown
docker compose down valkey-cluster valkey-cluster-init
for i in 0 1 2 3 4 5; do
  rm -rf /data/cache/valkey/${i}/*
done

# Restart cluster nodes
docker compose up -d valkey-cluster

# Wait for nodes to be ready
sleep 15

# Initialize
docker compose up -d valkey-cluster-init

# Verify
docker compose logs valkey-cluster-init
```

### Single Service Reset

```bash
# Restart with fresh state
docker compose down varnish
docker compose rm -f varnish
docker compose up -d varnish

# Or just reload configuration
docker compose exec varnish varnishadm 'vcl.load reload1 /etc/varnish/default.vcl'
docker compose exec varnish varnishadm 'vcl.use reload1'

# Nginx reload
docker compose exec nginx nginx -s reload

# ATS reload
docker compose exec trafficserver traffic_ctl config reload

# Valkey config reload (certain parameters only)
valkey-cli -a "${VALKEY_PASSWORD}" CONFIG SET maxmemory 4gb
```

### Rebuild Entire Stack

```bash
# Full teardown
docker compose down -v

# Clean all data
rm -rf /data/cache/*

# Rebuild and start
docker compose up -d

# Run cluster init
docker compose up -d valkey-cluster-init

# Verify
docker compose ps
```

### Emergency Recovery

```bash
# If containers won't start due to config errors:
# 1. Stop the stack
docker compose down

# 2. Fix config files

# 3. Remove volumes to clear corrupted data
docker compose down -v

# 4. Start clean
docker compose up -d

# 5. For individual service without volume removal:
docker compose up -d --force-recreate <service>
```
