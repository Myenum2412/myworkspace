# MyWorkSpace Cache — Quick Start Guide

## Architecture Summary

**Layer 1 — NodeCache** (`nodecache/`): In-process JavaScript memory cache running inside the Node.js/Next.js application. Provides 7 namespaced providers (config, query, api, session, auth, permission, computation) with per-provider TTLs, max key limits, and tag-based invalidation. Sub-millisecond access. Binds to the application's lifecycle.

**Layer 2 — Valkey Standalone** (`valkey/standalone/`): Primary in-memory key-value store for sessions, auth tokens, and cached API responses. Configured with 4GB maxmemory, allkeys-lru eviction, and AOF+RDB persistence. High availability via 3-node Sentinel cluster. Accessible via `valkey-0:6379` with ACL-based user roles.

**Layer 3 — Valkey Cluster** (`valkey/cluster/`): Distributed in-memory cache with 6 nodes (3 masters, 3 replicas). Each node capped at 2GB. Auto-sharding across 16384 hash slots. Used for horizontally scalable caching of application data. Automatic failover with 5s node-timeout detection.

**Layer 4 — Varnish** (`varnish/`): HTTP cache accelerator running VCL 4.1 on port 80 with 2GB malloc storage. Caches static assets (7d TTL + 24h grace) and API GET responses (2m TTL + 10m grace). Supports PURGE (URL) and BAN (pattern/tag) invalidation. Bypasses auth, admin, orgmenu, and WebSocket traffic.

**Layer 5 — Nginx** (`nginx/`): Reverse proxy, TLS terminator (TLS 1.2/1.3, HTTP/2, HTTP/3), and CDN edge. Provides three proxy cache zones (api, static, tus, cdn) with up to 100GB disk cache. Rate limiting per endpoint (auth: 20r/m, api: 600r/m). Serves as the single entry point for all traffic on ports 80/443.

**Layer 6 — Apache Traffic Server** (`trafficserver/`): CDN/edge caching proxy on port 8080 with 1GB RAM cache + 100GB disk cache. Caches static assets (365d) and Next.js build output. API and HTML are explicitly excluded (handled by Varnish). Designed for origin-pull CDN deployments.

**Layer 7 — Linux FS-Cache / bcache** (`disk/`): Kernel-level filesystem caching. FS-Cache caches network filesystem data (NFS, CIFS) on local disk. bcache provides SSD caching for HDD backing stores. Transparent to user space — any file I/O benefits from block-level caching.

---

## Prerequisites

- **Docker** 24+ and **Docker Compose** v2.20+
- **Kubernetes** cluster (for K8s deployment) with `kubectl` configured
- **Linux** kernel 5.10+ (for bcache / FS-Cache features)
- **Git** (for cloning the repository)
- Minimum **16GB RAM** on Docker host (8GB minimum for cache stack alone)
- Minimum **50GB free disk** for cache volumes

---

## Quick Start with Docker Compose

```bash
# 1. Clone and enter the cache directory
cd /root/myworkspace/cache

# 2. Set required environment variables
export VALKEY_PASSWORD=change-me-in-production
export SESSION_CACHE_PASSWORD=session-secret
export API_CACHE_PASSWORD=api-secret
export READONLY_PASSWORD=readonly-secret
export MONITORING_PASSWORD=monitor-secret

# 3. Start all cache services
docker compose -f docker/compose/docker-compose.cache.yml up -d

# 4. Initialize Valkey Cluster (runs automatically, verify)
docker compose -f docker/compose/docker-compose.cache.yml logs valkey-cluster-init

# 5. Verify all services are healthy
docker compose -f docker/compose/docker-compose.cache.yml ps
```

Expected output after startup:
```
NAME                   IMAGE                          STATUS
valkey-0               valkey/valkey:8-alpine         Up (healthy)
valkey-sentinel-0      valkey/valkey:8-alpine         Up (healthy)
valkey-cluster-0       valkey/valkey:8-alpine         Up (healthy)
valkey-cluster-1       valkey/valkey:8-alpine         Up (healthy)
valkey-cluster-2       valkey/valkey:8-alpine         Up (healthy)
valkey-cluster-3       valkey/valkey:8-alpine         Up (healthy)
valkey-cluster-4       valkey/valkey:8-alpine         Up (healthy)
valkey-cluster-5       valkey/valkey:8-alpine         Up (healthy)
varnish                varnish:7.6                    Up (healthy)
nginx                  nginx:1.27-alpine              Up (healthy)
trafficserver          apache/trafficserver:9.2       Up (healthy)
prometheus             prom/prometheus:v2.55          Up
grafana                grafana/grafana:11.3           Up
valkey-exporter        oliver006/redis_exporter:v1.67 Up
nginx-exporter         nginx/nginx-prometheus-exporter:1.3 Up
```

---

## Quick Start with Kubernetes

```bash
# 1. Create namespace
kubectl create namespace myworkspace-cache

# 2. Create secrets
kubectl create secret generic valkey-secret \
  --from-literal=password=change-me-in-production \
  -n myworkspace-cache

# 3. Deploy Valkey Standalone
kubectl apply -f kubernetes/valkey/valkey-standalone.yaml -n myworkspace-cache

# 4. Deploy Valkey Cluster (StatefulSet + Job)
kubectl apply -f kubernetes/valkey/valkey-cluster.yaml -n myworkspace-cache

# 5. Monitor initialization
kubectl logs -n myworkspace-cache -l job-name=valkey-cluster-init

# 6. Deploy remaining layers (add manifests as needed)
# kubectl apply -f kubernetes/varnish/ -n myworkspace-cache
# kubectl apply -f kubernetes/nginx/ -n myworkspace-cache
# kubectl apply -f kubernetes/trafficserver/ -n myworkspace-cache

# 7. Verify
kubectl get pods -n myworkspace-cache -w
```

---

## Quick Verification

```bash
# Check Valkey standalone
valkey-cli -h localhost -p 6379 -a "${VALKEY_PASSWORD}" ping

# Check Valkey cluster
valkey-cli -h localhost -p 6379 -a "${VALKEY_PASSWORD}" cluster info

# Check Varnish
varnishadm -T localhost:6082 ping

# Check Nginx
curl -k https://myworkspace.myenum.in/nginx-health

# Check ATS
curl -s http://localhost:8080/__ats__/stats | grep proxy.node.cache_hit_ratio

# Check Nginx cache status
curl -k -I https://myworkspace.myenum.in/_next/static/test.js | grep X-Cache-Status
```

---

## Directory Structure

```
cache/
├── docs/                          # Documentation (this directory)
│   ├── ARCHITECTURE.md            # Full architecture description
│   ├── README.md                  # This file
│   ├── SETUP.md                   # Detailed setup guide
│   ├── CONFIGURATION.md           # Configuration reference
│   ├── TROUBLESHOOTING.md         # Common issues and solutions
│   ├── SECURITY.md                # Security guide
│   └── PRODUCTION_OPTIMIZATION.md # Production tuning
│
├── docker/
│   ├── compose/docker-compose.cache.yml  # Docker Compose for all cache services
│   └── stack/                            # Docker stack (Swarm) files
│
├── kubernetes/
│   ├── valkey/                     # Valkey K8s manifests
│   ├── nginx/                      # Nginx K8s manifests (TBD)
│   ├── varnish/                    # Varnish K8s manifests (TBD)
│   └── trafficserver/              # ATS K8s manifests (TBD)
│
├── nodecache/                      # Node.js L1 cache module
│   ├── cache-manager.ts            # Multi-tier CacheManager class
│   ├── node-cache-provider.ts      # LocalCacheProvider with tag indexing
│   └── package.json                # Dependencies (node-cache, redis)
│
├── valkey/
│   ├── standalone/valkey.conf      # Valkey standalone config
│   ├── cluster/valkey-cluster.conf # Valkey cluster config
│   ├── sentinel/sentinel.conf      # Sentinel HA config
│   ├── users.acl                   # ACL user definitions
│   ├── init-cluster.sh             # Cluster initialization script
│   └── docker-entrypoint.sh        # Entrypoint with env var substitution
│
├── varnish/
│   ├── vcl/
│   │   ├── default.vcl             # Main VCL configuration
│   │   └── api-cache.vcl           # API-specific cache rules
│   ├── logs/                       # Varnish log directory
│   └── docker-entrypoint.sh
│
├── nginx/
│   ├── conf/
│   │   ├── nginx.conf              # Main Nginx configuration
│   │   └── conf.d/
│   │       ├── myworkspace.conf    # Main site config (TLS, caching)
│   │       └── cdn.conf            # CDN subdomain config
│   ├── ssl/                        # TLS certificates
│   └── cdn/                        # CDN document root
│
├── trafficserver/
│   ├── conf/
│   │   ├── records.config          # ATS core configuration
│   │   ├── cache.config            # Cache rules (regex-based)
│   │   └── remap.config            # URL remapping rules
│   └── logs/                       # ATS log directory
│
├── disk/
│   ├── bcache/                     # bcache configuration scripts
│   └── fscache/                    # FS-Cache configuration
│
├── monitoring/
│   ├── prometheus/
│   │   ├── prometheus.yml          # Prometheus scrape config
│   │   └── valkey.yml              # Valkey alerting rules
│   ├── grafana/
│   │   ├── dashboards/             # Provisioned dashboards
│   │   └── datasources/            # Provisioned datasources
│   └── alertmanager/               # Alertmanager config (TBD)
│
└── scripts/
    ├── backup/                     # Backup scripts (TBD)
    ├── deploy/                     # Deployment scripts (TBD)
    └── monitoring/                 # Monitoring scripts (TBD)
```
