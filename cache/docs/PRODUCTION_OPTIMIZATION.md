# Production Optimization Guide — MyWorkSpace Cache Infrastructure

## Kernel Parameter Tuning (sysctl)

### Apply All Production Parameters

Create `/etc/sysctl.d/99-cache-production.conf`:

```conf
# ─────────────────────────────────────────────
# Network Stack Optimization
# ─────────────────────────────────────────────

# Maximum socket connections
net.core.somaxconn = 65535
net.core.netdev_max_backlog = 100000

# TCP settings
net.ipv4.tcp_max_syn_backlog = 65535
net.ipv4.tcp_slow_start_after_idle = 0
net.ipv4.tcp_fin_timeout = 10
net.ipv4.tcp_tw_reuse = 1
net.ipv4.tcp_tw_recycle = 0
net.ipv4.tcp_keepalive_time = 300
net.ipv4.tcp_keepalive_intvl = 60
net.ipv4.tcp_keepalive_probes = 5
net.ipv4.tcp_mtu_probing = 1

# TCP buffer sizes (min, default, max)
net.ipv4.tcp_rmem = 4096 87380 16777216
net.ipv4.tcp_wmem = 4096 65536 16777216
net.core.rmem_max = 16777216
net.core.wmem_max = 16777216
net.core.rmem_default = 262144
net.core.wmem_default = 262144

# TCP congestion control (BBR)
net.ipv4.tcp_congestion_control = bbr
net.core.default_qdisc = fq

# Enable TCP Fast Open
net.ipv4.tcp_fastopen = 3

# Connection tracking
net.netfilter.nf_conntrack_max = 1048576
net.netfilter.nf_conntrack_tcp_timeout_time_wait = 30

# ─────────────────────────────────────────────
# Virtual Memory
# ─────────────────────────────────────────────
vm.swappiness = 10
vm.dirty_ratio = 10
vm.dirty_background_ratio = 5
vm.vfs_cache_pressure = 50
vm.min_free_kbytes = 524288
vm.max_map_count = 262144
vm.overcommit_memory = 1
vm.overcommit_ratio = 80

# ─────────────────────────────────────────────
# File System
# ─────────────────────────────────────────────
fs.file-max = 2097152
fs.nr_open = 2097152
fs.inotify.max_user_watches = 524288
fs.aio-max-nr = 1048576

# ─────────────────────────────────────────────
# Kernel
# ─────────────────────────────────────────────
kernel.pid_max = 4194304
kernel.msgmax = 65536
kernel.msgmnb = 65536

# ─────────────────────────────────────────────
# Cache-specific
# ─────────────────────────────────────────────
# bcache
devices/bcache/*/congested_read_threshold_us = 1000
devices/bcache/*/congested_write_threshold_us = 10000
devices/bcache/*/sequential_cutoff = 0
devices/bcache/*/writeback_rate = 4194304
devices/bcache/*/writeback_rate_update_seconds = 30
devices/bcache/*/io_error_limit = 100
```

Apply:
```bash
sysctl --system
sysctl -p /etc/sysctl.d/99-cache-production.conf
```

### Verify Parameters

```bash
# Check active values
sysctl net.core.somaxconn
sysctl net.ipv4.tcp_congestion_control
sysctl vm.swappiness

# Check BBR is active
lsmod | grep tcp_bbr
ss -ti | grep bbr
```

---

## Network Optimization

### TCP Tuning for Cache Traffic

```bash
# Set socket buffer sizes for cache traffic
# Large buffers improve throughput for cache fill operations

# For Nginx/Varnish (proxy traffic):
# Receive: 4MB, Send: 1MB
echo 4096 87380 4194304 > /proc/sys/net/ipv4/tcp_rmem
echo 4096 65536 1048576 > /proc/sys/net/ipv4/tcp_wmem
```

### NIC Ring Buffer Sizes

```bash
# Check current ring buffer sizes
ethtool -g eth0

# Increase for high packet rates
ethtool -G eth0 rx 4096 tx 4096

# Check for packet drops
ethtool -S eth0 | grep -E "drop|error"
```

### RPS/RFS/XPS (Software IRQ Balancing)

```bash
# Enable Receive Packet Steering for multi-queue NICs
# For each queue:
echo 7 > /sys/class/net/eth0/queues/rx-0/rps_cpus  # CPU affinity mask

# Enable Receive Flow Steering
echo 32768 > /proc/sys/net/core/rps_sock_flow_entries
echo 2048 > /sys/class/net/eth0/queues/rx-0/rps_flow_cnt

# Enable Transmit Packet Steering
echo 7 > /sys/class/net/eth0/queues/tx-0/xps_cpus
```

### Network Benchmark

```bash
# Install iperf3
apt-get install -y iperf3

# Server
iperf3 -s

# Client
iperf3 -c <server-ip> -t 30 -P 4

# Test with different TCP window sizes
iperf3 -c <server-ip> -w 256k
iperf3 -c <server-ip> -w 1m

# Test UDP throughput and jitter
iperf3 -c <server-ip> -u -b 1000m
```

---

## Valkey Memory and Persistence Tuning

### Memory Optimization

```conf
# Production memory config
maxmemory 6gb                          # Increase from default 4gb
maxmemory-policy allkeys-lfu           # Better for hot-spot workloads
maxmemory-samples 10                   # LRU/LFU sample size
hz 100                                 # Increased CPU time for better accuracy
activedefrag yes
active-defrag-threshold-lower 10       # Start defrag at 10% fragmentation
active-defrag-threshold-upper 100      # Max defrag effort at 100% fragmentation
active-defrag-ignore-bytes 100mb       # Ignore below this fragmentation size
active-defrag-cycle-min 1              # Minimum CPU % for defrag
active-defrag-cycle-max 25             # Maximum CPU % for defrag
lfu-log-factor 10                      # LFU counter log factor
lfu-decay-time 1                       # LFU counter decay time (minutes)
```

### Memory Fragmentation Monitoring

```bash
# Check fragmentation ratio
valkey-cli -a "${VALKEY_PASSWORD}" INFO memory | grep mem_fragmentation_ratio

# > 1.5 means significant fragmentation
# < 1.0 means memory overallocation

# Check RSS vs allocated
valkey-cli -a "${VALKEY_PASSWORD}" INFO memory | grep -E "used_memory_rss|used_memory"
```

### Persistence Tuning

```conf
# RDB (for cold restart)
save 3600 1         # 1 key changed in 1 hour
save 300 100        # 100 keys in 5 minutes
save 60 10000       # 10000 keys in 1 minute
stop-writes-on-bgsave-error yes
rdbcompression no   # Skip compression for faster saves (bigger file)
rdbchecksum no      # Skip checksum for faster saves (less safe)

# AOF (for crash recovery)
appendonly yes
appendfsync everysec
no-appendfsync-on-rewrite yes
auto-aof-rewrite-percentage 200       # Rewrite when AOF doubles in size
auto-aof-rewrite-min-size 128mb       # Don't rewrite below this size
aof-load-truncated yes                # Load truncated AOF
aof-use-rdb-preamble yes              # Hybrid RDB+AOF for faster startup
```

### Big Key Analysis

```bash
# Run big key scan (sample 100 random keys per type)
valkey-cli -a "${VALKEY_PASSWORD}" --bigkeys

# OR use memory usage command for specific keys
valkey-cli -a "${VALKEY_PASSWORD}" MEMORY USAGE some:key

# Find top 10 largest keys
valkey-cli -a "${VALKEY_PASSWORD}" --scan --pattern "*" | while read key; do
  size=$(valkey-cli -a "${VALKEY_PASSWORD}" MEMORY USAGE "$key")
  echo "$size $key"
done | sort -rn | head -10
```

---

## Varnish Thread Pool and Workspace Tuning

### Thread Pool Optimization

```bash
# Runtime parameter tuning
# Monitor current usage first:
varnishstat -1 | grep -E "MAIN\.threads|MAIN\.n_waiting"

# Adjust based on traffic patterns:
THREAD_POOL_MIN=200       # Don't go below for production
THREAD_POOL_MAX=5000      # Max concurrent threads
THREAD_POOL_TIMEOUT=120   # Quick thread reuse (lower is better for bursty traffic)
THREAD_POOL_ADD_DELAY=0.2 # Faster thread creation under load
THREAD_POOL_PURGE_DELAY=1 # Faster thread cleanup
```

### Workspace Tuning

```bash
# Client workspace: request parsing
# Too small: workspaces overflow (warm workspace)
# Too large: memory waste
WORKSPACE_CLIENT=512k     # For large cookies and headers

# Backend workspace: response parsing
# Too small: backend response truncation
WORKSPACE_BACKEND=512k    # For large responses

# Monitor workspace overflows:
varnishstat -1 | grep -E "MAIN\.n_wrk_write|MAIN\.ws"
# If these counters increase, increase workspace size
```

### Storage Backend Tuning

```bash
# Malloc (RAM) - fastest but no persistence
-s malloc,4g

# File (persistent across restarts)
-s file,/var/lib/varnish/varnish_storage.bin,10g

# Persistent (experimental, survives crashes better)
-s persistent,/var/lib/varnish/varnish_storage.bin,10g

# Mixed storage (for production)
-s malloc,2g -s file,/var/lib/varnish/varnish_storage.bin,8g
# RAM for hot objects, disk for warm objects
```

### Varnish Optimization Checklist

- [ ] Enable HTTP/2: `-p feature=+http2`
- [ ] Enable HTTP/2 edge cases: `-p feature=+http2_edge_cases`
- [ ] Monitor thread usage: keep `n_waiting` near 0
- [ ] Tune `thread_pool_min` to handle baseline traffic without thread creation
- [ ] Set `nuke_limit` high enough to avoid eviction death spirals
- [ ] Use `varnishstat` to find `n_object` count and tune memory accordingly
- [ ] Enable `gzip` for bandwidth savings
- [ ] Ensure `workspace_client` is large enough for requests with cookies

### Varnish Performance Testing

```bash
# Test with varnishload (Varnish factory load testing)
varnishload -T localhost:6082 -r /tmp/requests.txt -c 100 -n 10000

# Monitor performance during test
watch -n 1 'varnishstat -1 | grep -E "MAIN\.(sess_conn|cache_hit|cache_miss|threads|n_object|n_waiting)"'
```

---

## Nginx Worker Process and Connection Tuning

### Worker Process Optimization

```nginx
# CPU affinity (match your core count)
worker_processes auto;

# For physical CPUs with hyperthreading:
# 16 vCPUs = 8 physical cores
worker_cpu_affinity auto;

# Open file limit
worker_rlimit_nofile 100000;

events {
    # Max connections per worker
    worker_connections 32768;

    # Use epoll (Linux)
    use epoll;

    # Accept multiple connections
    multi_accept on;

    # Disable accept mutex for better performance
    accept_mutex off;
}
```

### Connection Pool Sizing

```nginx
http {
    # Connection pool
    keepalive_timeout 75;
    keepalive_requests 10000;

    # Buffer sizes
    client_body_buffer_size 128k;
    client_header_buffer_size 8k;
    large_client_header_buffers 8 8k;
    connection_pool_size 4096;
    request_pool_size 32k;

    # Proxy buffers
    proxy_buffer_size 8k;
    proxy_buffers 256 8k;
    proxy_busy_buffers_size 64k;
    proxy_buffering on;
}
```

### Sendfile and Zero-Copy

```nginx
# Enable sendfile for static files
sendfile on;
sendfile_max_chunk 512k;   # Limit per call to avoid blocking

# TCP optimization
tcp_nopush on;             # Optimize packet sending
tcp_nodelay on;            # Disable Nagle for interactive responses

# Direct I/O for large files
# Bypass page cache for files > 1MB
# Specifically useful for ATS and large CDN files
# proxy_max_temp_file_size 0;
```

### SSL/TLS Performance

```nginx
# Session cache
ssl_session_cache shared:SSL:50m;
ssl_session_timeout 1d;

# Session tickets (performance vs security trade-off)
ssl_session_tickets off;   # Slightly slower but more secure

# Buffers
ssl_buffer_size 4k;        # Optimize SSL record size

# OCSP stapling
ssl_stapling on;
resolver 8.8.8.8 1.1.1.1 valid=300s;
resolver_timeout 5s;

# Early data (0-RTT)
ssl_early_data on;
```

### Nginx Cache Zone Tuning

```nginx
proxy_cache_path /var/cache/nginx/api levels=1:2 keys_zone=api_cache:1g
    max_size=20g inactive=60m use_temp_path=off;

proxy_cache_path /var/cache/nginx/static levels=1:2 keys_zone=static_cache:1g
    max_size=100g inactive=30d use_temp_path=off;

proxy_cache_path /var/cache/nginx/cdn levels=1:2 keys_zone=cdn_cache:1g
    max_size=200g inactive=60d use_temp_path=off;

# Tuning parameters for each zone:
proxy_cache_key "$scheme$request_method$host$request_uri";
proxy_cache_lock on;
proxy_cache_lock_timeout 5s;
proxy_cache_use_stale error timeout updating http_500 http_502 http_503 http_504;
```

---

## ATS Thread and Cache Tuning

### Thread Configuration

```
CONFIG proxy.config.exec_thread.autoconfig INT 1
CONFIG proxy.config.exec_thread.autoconfig.scale FLOAT 2.0
CONFIG proxy.config.exec_thread.limit INT 32

# For dedicated cache nodes with 16+ cores:
CONFIG proxy.config.exec_thread.autoconfig INT 0
CONFIG proxy.config.exec_thread.limit INT 16
CONFIG proxy.config.exec_thread.affinity INT 1
```

### RAM Cache Tuning

```
# Increase RAM cache for hot objects
CONFIG proxy.config.cache.ram_cache.size INT 4G
CONFIG proxy.config.cache.ram_cache_cutoff INT 1048576  # 1MB max for RAM

# Enable RAM cache compression (saves memory at CPU cost)
CONFIG proxy.config.cache.ram_cache.compress INT 1
```

### Disk Cache Tuning

```
# Max disk cache size
CONFIG proxy.config.cache.max_disk_size INT 500G

# Min object size (below this, skip disk cache)
CONFIG proxy.config.cache.min_average_object_size INT 4096

# Cache write aggregation
CONFIG proxy.config.cache.aggregate_write_size INT 131072  # 128KB

# Enable caching for HTTP
CONFIG proxy.config.http.cache.http INT 1

# Ignore no-cache from clients
CONFIG proxy.config.http.cache.ignore_client_no_cache INT 0
CONFIG proxy.config.http.cache.ignore_client_cc_max_age INT 1
```

### Timeout Tuning

```
# Keep connections alive longer
CONFIG proxy.config.http.keep_alive_no_activity_timeout_in INT 120
CONFIG proxy.config.http.keep_alive_no_activity_timeout_out INT 120

# Shorter transaction timeouts for faster rejection
CONFIG proxy.config.http.transaction_no_activity_timeout_in INT 30
CONFIG proxy.config.http.transaction_no_activity_timeout_out INT 30

# Socket buffer sizes
CONFIG proxy.config.net.sock_recv_buffer_size INT 262144
CONFIG proxy.config.net.sock_send_buffer_size INT 262144
```

---

## SSDs and Disk I/O Scheduler Tuning

### I/O Scheduler Selection

```bash
# NVMe drives: use 'none' (no I/O scheduling needed)
echo none > /sys/block/nvme0n1/queue/scheduler

# SATA SSDs: use 'mq-deadline' or 'none'
echo mq-deadline > /sys/block/sda/queue/scheduler

# HDDs: use 'bfq' (if available) or 'mq-deadline'
echo bfq > /sys/block/sdb/queue/scheduler

# Make permanent (add to /etc/rc.local or udev rule):
# /etc/udev/rules.d/60-iosched.rules
# ACTION=="add|change", KERNEL=="nvme*", ATTR{queue/scheduler}="none"
# ACTION=="add|change", KERNEL=="sd*", ATTR{queue/rotational}=="0", ATTR{queue/scheduler}="mq-deadline"
```

### SSD Tuning

```bash
# Read-ahead: 4MB for sequential access patterns
blockdev --setra 4096 /dev/nvme0n1

# Disk queue depth (NR_QUEUE): larger = better for NVMe
# Default is usually 1024, can increase
echo 2048 > /sys/block/nvme0n1/queue/nr_requests

# Disable I/O statistics collection (saves CPU on busy drives)
echo 0 > /sys/block/nvme0n1/queue/iostats

# Enable TRIM/discard
# For ext4, mount with 'discard' or run fstrim periodically
fstrim -v /var/cache

# Or use cron for periodic trim
# 0 3 * * 0 /sbin/fstrim -v /var/cache
```

### Disk Performance Testing

```bash
# Sequential read/write
fio --name=seq-read --rw=read --bs=1m --size=10g --numjobs=4 --runtime=60
fio --name=seq-write --rw=write --bs=1m --size=10g --numjobs=4 --runtime=60

# Random 4K read/write (cache-like workload)
fio --name=rand-4k-read --rw=randread --bs=4k --size=10g --numjobs=8 --runtime=60
fio --name=rand-4k-write --rw=randwrite --bs=4k --size=10g --numjobs=8 --runtime=60

# Mixed workload (70/30 read/write)
fio --name=mixed --rw=randrw --rwmixread=70 --bs=4k --size=10g --numjobs=4 --runtime=60

# Latency test
fio --name=latency --rw=randread --bs=4k --size=1g --runtime=30 --iodepth=1

# Check results: look for IOPS, latency (clat), and bandwidth
```

### SMART Monitoring

```bash
# Check SSD health
smartctl -a /dev/nvme0n1 | grep -E "Percentage Used|Data Units Read|Data Units Written|Media Errors|Critical Warning"

# Monitor over time
while true; do
  clear
  smartctl -A /dev/nvme0n1 | grep -E "Percentage|Data_Units|Media_Errors|Unsafe"
  sleep 60
done
```

---

## Filesystem Tuning

### Mount Options for Cache Volumes

```bash
# noatime - disable access time updates (big performance gain)
# nodiratime - disable directory access time updates
# nobarrier - disable write barriers (only for cache-only data)
# discard - enable TRIM for SSDs
# data=ordered - ext4 journaling mode
# commit=30 - delay journal commit up to 30s

# For cache-only data (non-critical):
mount -o noatime,nodiratime,nobarrier,discard,commit=60 /dev/nvme0n1p1 /var/cache

# For production with data integrity:
mount -o noatime,nodiratime,data=ordered,noatime /dev/nvme0n1p1 /var/cache

# /etc/fstab entry:
# /dev/nvme0n1p1 /var/cache ext4 noatime,nodiratime,nobarrier,discard,commit=30 0 2
```

### XFS vs ext4

```bash
# XFS is recommended for cache volumes >50GB
# Better parallel performance and scalability

# Format with XFS (large cache volumes)
mkfs.xfs -f -s size=4096 -d agcount=8 -l size=128m /dev/nvme0n1p1

# ext4 for smaller volumes
mkfs.ext4 -F -O extent,uninit_bg,^flex_bg -E stride=128,stripe_width=128 /dev/nvme0n1p1
```

### Verify Mount Options

```bash
mount | grep /var/cache
# Expected: noatime,nodiratime,discard

# Check filesystem performance
df -hT /var/cache
```

---

## Performance Testing Methodology

### Multi-Layer Cache Test Plan

1. **Baseline**: Measure origin server latency without cache
2. **Single layer**: Enable one cache layer at a time
3. **Full stack**: All layers enabled
4. **Load test**: Ramp up concurrent connections
5. **Burst test**: Sudden traffic spike
6. **Stale test**: Measure behavior during backend failure
7. **Invalidation test**: Measure PURGE/BAN latency

### Test Scenarios

```bash
# 1. Static file cache test (Layer 4, 5, 6)
./benchmark.sh -u "https://myworkspace.myenum.in/_next/static/test.js" -c 1000 -n 100000

# 2. API cache test (Layer 4, 5)
./benchmark.sh -u "https://myworkspace.myenum.in/api/search?q=test" -c 500 -n 50000

# 3. Dynamic content (no cache)
./benchmark.sh -u "https://myworkspace.myenum.in/api/auth/login" -c 100 -n 10000

# 4. Mixed workload
./benchmark.sh -f urls.txt -c 500 -n 100000 -m mixed
```

### Benchmark Tools

```bash
# wrk (HTTP benchmark)
apt-get install wrk

# Basic test
wrk -t12 -c400 -d30s https://myworkspace.myenum.in/

# With different file sizes
wrk -t12 -c400 -d30s --latency https://myworkspace.myenum.in/_next/static/test.js

# wrk2 (for precise latency measurements)
wrk2 -t12 -c400 -d30s -R 10000 --latency https://myworkspace.myenum.in/

# hey (Go-based, good for complex scenarios)
hey -n 100000 -c 500 -m GET https://myworkspace.myenum.in/api/dashboard

# vegeta (supports rate-limiting)
echo "GET https://myworkspace.myenum.in/api/health" | vegeta attack -rate 1000 -duration 30s | vegeta report

# autocannon (Node.js, great for HTTP/2)
npx autocannon -c 100 -d 30 https://myworkspace.myenum.in/
```

### Prometheus Query for Performance

```promql
# Request rate
rate(nginx_http_requests_total[1m])

# P99 latency
histogram_quantile(0.99, rate(nginx_http_request_duration_seconds_bucket[5m]))

# Cache hit ratio
sum(rate(nginx_http_cache_total{status="HIT"}[5m])) /
  sum(rate(nginx_http_cache_total[5m])) * 100

# Error rate
sum(rate(nginx_http_requests_total{status=~"5.."}[5m])) /
  sum(rate(nginx_http_requests_total[5m])) * 100
```

---

## Capacity Planning Guidelines

### Throughput Estimates

| Layer | Max Throughput | Scaling Method |
|---|---|---|
| NodeCache (L1) | 500,000 ops/s per process | Horizontal (app instances) |
| Valkey Standalone (L2) | 100,000 ops/s read / 50,000 ops/s write | Vertical scaling |
| Valkey Cluster (L3) | 300,000 ops/s read / 150,000 ops/s write (6 nodes) | Horizontal (more nodes) |
| Varnish (L4) | 50,000 req/s per instance | Horizontal (more instances) |
| Nginx (L5) | 100,000 req/s per instance | Horizontal (more instances) |
| ATS (L6) | 30,000 req/s per instance | Horizontal (more instances) |

### Memory Sizing

| Component | Base | Per GB Traffic | Typical |
|---|---|---|---|
| Valkey Standalone | 1GB | 500MB per 10K keys | 4GB |
| Valkey Cluster (per node) | 512MB | 500MB per 10K keys | 2GB |
| Varnish | 1GB | 1GB per 5K req/s | 4GB |
| Nginx cache keys | 500MB | 1GB per 100K cache entries | 1GB |
| Nginx worker RSS | 50MB | 10MB per 1000 conn | 500MB |
| ATS RAM cache | 1GB | 2GB per 10K req/s | 4GB |
| ATS worker RSS | 200MB | — | 1GB |
| Prometheus | 2GB | 5GB per 30d retention | 4GB |
| Grafana | 256MB | — | 1GB |

### Disk Sizing

| Volume | Minimum | Recommended | Growth Rate |
|---|---|---|---|
| Nginx API cache | 10GB | 20GB | 5GB/month |
| Nginx static cache | 50GB | 100GB | 20GB/month |
| Nginx CDN cache | 100GB | 200GB | 50GB/month |
| ATS disk cache | 100GB | 500GB | 100GB/month |
| Prometheus TSDB | 10GB | 50GB | 1GB/day |
| Grafana DB | 1GB | 5GB | 100MB/month |
| FS-Cache | 50GB | 100GB | 10GB/month |
| bcache SSD | 100GB | 500GB | Shared with ATS |

---

## Scaling Strategies for Each Layer

### NodeCache (L1) - Application-Level

```
Strategy: Scale with application instances
- Each app instance has its own NodeCache
- No coordination needed between instances
- Cache miss falls through to Valkey (L2)
```

### Valkey Standalone (L2)

```
Vertical scaling (primary):
- Increase maxmemory up to available RAM
- More CPU cores for better throughput

Horizontal: Use Sentinel for read replica offloading
- Add more replicas for read scaling
- Writes still go to master

Replica read connection:
const client = createClient({
  socket: {
    host: isWrite ? 'valkey-master' : 'valkey-replica',
    port: 6379,
    reconnectStrategy: ...
  }
});
```

### Valkey Cluster (L3)

```
Horizontal scaling:
- Add more node pairs (master + replica)
- Cluster re-shards hash slots automatically

Scale from 6 nodes (3+3) to 10 nodes (5+5):
# Add new nodes
valkey-cli --cluster add-node new-node:6379 existing-node:6379
valkey-cli --cluster add-node new-replica:6379 existing-node:6379 --cluster-slave

# Reshard
valkey-cli --cluster rebalance existing-node:6379 \
  --cluster-weight new-node=1 \
  --cluster-use-empty-masters \
  --cluster-threshold 1 \
  --cluster-simulate  # Run without --simulate to execute
```

### Varnish (L4)

```
Horizontal scaling:
- Deploy behind load balancer (Nginx upstream)
- All instances share the same VCL
- Cache is per-instance (no shared cache)

Load balancer config:
upstream varnish_servers {
    ip_hash;  # Session persistence to same Varnish
    server varnish-1:80 max_fails=3 fail_timeout=30s;
    server varnish-2:80 max_fails=3 fail_timeout=30s;

    # Add more as needed
    server varnish-3:80 max_fails=3 fail_timeout=30s;
    server varnish-4:80 max_fails=3 fail_timeout=30s;
}
```

### Nginx (L5)

```
Horizontal scaling:
- Multiple Nginx instances behind load balancer
- Cache is per-instance (use consistent hashing for sticky cache)

Consistent hashing upstream:
upstream nginx_servers {
    hash $request_uri consistent;
    server nginx-1:443;
    server nginx-2:443;
}

Vertical scaling:
- More worker_processes (match CPU cores)
- Increase worker_connections
- Increase cache zone sizes
```

### Apache Traffic Server (L6)

```
Horizontal scaling:
- Multiple ATS instances as origin cache
- Use consistent hashing or parent cache hierarchy

Parent cache hierarchy in remap.config:
map / http://parent-ats:8080/  @plugin=headers.so @pparam=--parent-ats

Vertical scaling:
- Increase ram_cache.size
- Add more disk volumes
- Increase thread count
```

### FS-Cache / bcache (L7)

```
Vertical scaling:
- Faster SSD/NVMe for cache device
- Larger cache partition
- Multiple cache devices (RAID0 for speed)

Horizontal: Not applicable (kernel-level, per-host)
```

---

## Common Bottlenecks and Solutions

| Bottleneck | Symptom | Root Cause | Solution |
|---|---|---|---|
| High CPU | 100% CPU on workers | Too few workers, complex VCL | Increase workers, simplify VCL |
| Memory pressure | OOM, swapping | Cache too large for RAM | Reduce cache sizes, add RAM |
| Network saturation | Packet loss, high latency | Insufficient bandwidth | Upgrade NIC, add instances |
| Disk I/O | High iowait, slow cache fills | Slow disks, too much disk cache | More RAM cache, faster SSD |
| Lock contention | `proxy_cache_lock` timeouts | Many concurrent misses | Reduce lock timeout, warm caches |
| TLS handshake overhead | High SSL CPU usage | No session reuse | Increase session cache |
| DNS resolution delays | Slow first request | Unresponsive DNS | Cache DNS, use local resolver |
| Connection pool exhaustion | `Cannot assign requested address` | Too many TIME_WAIT sockets | Enable tcp_tw_reuse, reduce pool size |
| Nagle buffering | High latency for small responses | TCP_NODELAY not set | Enable `tcp_nodelay on` |
| Fragmentation | Memory usage > maxmemory | Active fragmentation | Enable `activedefrag yes` |

### Bottleneck Detection Commands

```bash
# CPU
mpstat -P ALL 1
pidstat -w -t 1 -p $(pgrep -f nginx | head -1)

# Memory
free -h
vmstat 1 10

# Disk I/O
iostat -x 1 10
iotop -oP

# Network
nicstat -z 1
netstat -s | grep -E "retransmit|drop|overflow"
ss -tan | awk '{print $1}' | sort | uniq -c

# Connection tracking
cat /proc/net/nf_conntrack | wc -l
sysctl net.netfilter.nf_conntrack_max
```

---

## Benchmark Commands

### All Layers Benchmark

```bash
#!/bin/bash
# run-benchmarks.sh - Test each layer independently

BACKEND="myworkspace.myenum.in"

echo "=== Layer 5: Nginx (Static Cache) ==="
echo "Testing: /_next/static/test.js"
wrk -t4 -c200 -d30s --latency "https://${BACKEND}/_next/static/test.js"

echo -e "\n=== Layer 4+5: Varnish + Nginx (API Cache) ==="
echo "Testing: /api/search?q=benchmark"
wrk -t4 -c200 -d30s --latency "https://${BACKEND}/api/search?q=benchmark"

echo -e "\n=== Layer 6: ATS (Direct Port 8080) ==="
echo "Testing: http://${BACKEND}:8080/_next/static/test.js"
wrk -t4 -c200 -d30s --latency "http://${BACKEND}:8080/_next/static/test.js"

echo -e "\n=== Layer 3: Valkey Cluster ==="
echo "Testing: SET/GET operations"
valkey-benchmark -h localhost -p 6379 -a "${VALKEY_PASSWORD}" \
  -n 100000 -c 50 -t set,get -P 16

echo -e "\n=== Layer 2: Valkey Standalone ==="
echo "Testing: SET/GET operations"
valkey-benchmark -h localhost -p 6379 -a "${VALKEY_PASSWORD}" \
  -n 100000 -c 50 -t set,get -P 16 -d 1024

echo -e "\n=== CURL Test (Single Request Timing) ==="
echo "Warmup..."
curl -s -o /dev/null "https://${BACKEND}/api/dashboard"
echo "Cold request:"
curl -w "  time_total: %{time_total}s\n  time_connect: %{time_connect}s\n  time_starttransfer: %{time_starttransfer}s\n  http_code: %{http_code}\n" \
  -s -o /dev/null "https://${BACKEND}/api/dashboard"
```

### Custom Payload Benchmark

```bash
# Test with realistic payload sizes
for size in 100 1024 10240 102400 1048576; do
  echo "Payload size: ${size} bytes"
  valkey-benchmark -h localhost -p 6379 -a "${VALKEY_PASSWORD}" \
    -n 50000 -c 50 -t set,get -P 16 -d ${size} \
    | grep "SET\|GET"
done
```

### Latency Distribution

```bash
#!/bin/bash
# Measure latency distribution per layer

for url in \
  "https://myworkspace.myenum.in/_next/static/test.js" \
  "https://myworkspace.myenum.in/api/search?q=test" \
  "https://myworkspace.myenum.in/api/dashboard" \
  "http://localhost:8080/_next/static/test.js"; do

  echo "=== Testing: $url ==="
  tmp=$(mktemp)
  for i in $(seq 1 100); do
    curl -w "%{time_total}\n" -s -o /dev/null "$url" >> "$tmp"
  done
  sort -n "$tmp" | awk '
    BEGIN { sum=0; n=0 }
    { sum+=$1; vals[n++]=$1 }
    END {
      printf "  Min: %fs\n", vals[0]
      printf "  P50: %fs\n", vals[int(n*0.50)]
      printf "  P95: %fs\n", vals[int(n*0.95)]
      printf "  P99: %fs\n", vals[int(n*0.99)]
      printf "  Max: %fs\n", vals[n-1]
      printf "  Avg: %fs\n", sum/n
    }'
  rm "$tmp"
done
```
