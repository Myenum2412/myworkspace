# Setup Guide — MyWorkSpace Cache Infrastructure

## Prerequisites

### Docker Environment

| Requirement | Minimum | Recommended |
|---|---|---|
| Docker Engine | 24.0+ | 26.0+ |
| Docker Compose | v2.20+ | v2.27+ |
| Docker Swarm | Built-in (24.0+) | Built-in (26.0+) |
| Host RAM | 16 GB | 32 GB |
| Free Disk | 50 GB | 200 GB+ (SSD) |
| CPU Cores | 4 | 8+ |

### Kubernetes Environment

| Requirement | Minimum | Recommended |
|---|---|---|
| Kubernetes | 1.28+ | 1.30+ |
| kubectl | 1.28+ | 1.30+ |
| Helm | 3.12+ | 3.15+ |
| Cluster Nodes | 3 | 5+ |
| Storage Class | SSD-backed | NVMe-backed |

### Linux Kernel Requirements

| Feature | Kernel Version | Module |
|---|---|---|
| OverlayFS | 5.11+ (7 layers) | `overlay` |
| FS-Cache | 5.10+ | `fscache`, `cachefiles` |
| bcache | 5.10+ | `bcache` |
| TCP BBR | 5.10+ | `tcp_bbr` |
| io_uring | 5.10+ | Built-in |
| AF_XDP | 5.12+ | `xdp` |

Enable modules:
```bash
modprobe overlay
modprobe fscache
modprobe cachefiles
modprobe bcache
modprobe tcp_bbr
echo "tcp_bbr" >> /etc/modules-load.d/bbr.conf
```

---

## Environment Variables Reference

| Variable | Default | Description | Required |
|---|---|---|---|
| `VALKEY_PASSWORD` | `myworkspace` | Valkey authentication password | Yes |
| `SESSION_CACHE_PASSWORD` | (none) | Session cache user password | Yes |
| `API_CACHE_PASSWORD` | (none) | API cache user password | Yes |
| `READONLY_PASSWORD` | (none) | Read-only cache user password | Yes |
| `MONITORING_PASSWORD` | (none) | Monitoring cache user password | Yes |
| `GRAFANA_PASSWORD` | `admin` | Grafana admin password | No |
| `VARNISH_MEMORY` | `2g` | Varnish malloc memory size | No |
| `VARNISH_STORAGE` | `malloc,2g` | Varnish storage backend | No |
| `THREAD_POOL_MIN` | `50` | Varnish minimum worker threads | No |
| `THREAD_POOL_MAX` | `1000` | Varnish maximum worker threads | No |
| `THREAD_POOL_TIMEOUT` | `300` | Varnish thread idle timeout (s) | No |
| `WORKSPACE_CLIENT` | `256k` | Varnish client workspace size | No |
| `WORKSPACE_BACKEND` | `256k` | Varnish backend workspace size | No |
| `DEFAULT_TTL` | `120` | Varnish default TTL (s) | No |
| `DEFAULT_GRACE` | `3600` | Varnish default grace (s) | No |
| `GZIP_LEVEL` | `6` | Varnish gzip compression level | No |
| `NUKE_LIMIT` | `50` | Varnish nuke limit | No |
| `MAX_RESTARTS` | `4` | Varnish max request restarts | No |
| `MAX_RETRIES` | `3` | Varnish max backend retries | No |
| `OVERLAY_UPPER_DIR` | `/var/cache/overlay/upper` | OverlayFS upper directory | No |
| `OVERLAY_WORK_DIR` | `/var/cache/overlay/work` | OverlayFS work directory | No |
| `OVERLAY_LOWER_DIR` | `/var/lib/docker` | OverlayFS lower directory | No |
| `OVERLAY_MERGE_DIR` | `/var/cache/overlay/merged` | OverlayFS merge directory | No |
| `BCACHE_SSD_DEV` | `/dev/nvme0n1` | bcache SSD caching device | No |
| `BCACHE_HDD_DEV` | `/dev/sda1` | bcache HDD backing device | No |
| `BCACHE_MOUNT_POINT` | `/var/cache/bcache` | bcache mount point | No |
| `BCACHE_CACHE_MODE` | `writeback` | bcache cache mode | No |
| `SMTP_PASSWORD` | (none) | AlertManager SMTP password | No |
| `SLACK_WEBHOOK_URL` | (none) | AlertManager Slack webhook | No |
| `PAGERDUTY_ROUTING_KEY` | (none) | AlertManager PagerDuty key | No |
| `WEBHOOK_USER` | (none) | AlertManager webhook auth user | No |
| `WEBHOOK_PASSWORD` | (none) | AlertManager webhook auth password | No |

---

## Step-by-Step: Docker Compose Deployment

### 1. Prepare Environment

```bash
cd /root/myworkspace/cache

# Create required directories
mkdir -p docker/compose docker/stack

# Export production passwords (never use defaults in production)
export VALKEY_PASSWORD="$(openssl rand -base64 32)"
export SESSION_CACHE_PASSWORD="$(openssl rand -base64 24)"
export API_CACHE_PASSWORD="$(openssl rand -base64 24)"
export READONLY_PASSWORD="$(openssl rand -base64 24)"
export MONITORING_PASSWORD="$(openssl rand -base64 24)"
export GRAFANA_PASSWORD="$(openssl rand -base64 16)"

# Save to .env for repeatability
cat > .env << EOF
VALKEY_PASSWORD=${VALKEY_PASSWORD}
SESSION_CACHE_PASSWORD=${SESSION_CACHE_PASSWORD}
API_CACHE_PASSWORD=${API_CACHE_PASSWORD}
READONLY_PASSWORD=${READONLY_PASSWORD}
MONITORING_PASSWORD=${MONITORING_PASSWORD}
GRAFANA_PASSWORD=${GRAFANA_PASSWORD}
VARNISH_MEMORY=2g
VARNISH_STORAGE=malloc,2g
EOF
```

### 2. Create Persistent Data Directories

```bash
# Create persistent data directories
for i in 0 1 2 3 4 5; do
  mkdir -p /data/cache/valkey/${i}
done
mkdir -p /data/cache/valkey/sentinel
mkdir -p /data/cache/prometheus
mkdir -p /data/cache/grafana
mkdir -p /data/cache/alertmanager

# Set proper ownership
chown -R 1000:1000 /data/cache
```

### 3. Deploy All Services

```bash
docker compose -f docker/compose/docker-compose.cache.yml up -d
```

### 4. Monitor Startup

```bash
# Watch all services come up
docker compose -f docker/compose/docker-compose.cache.yml logs -f

# Check initialization job status
docker compose -f docker/compose/docker-compose.cache.yml logs valkey-cluster-init

# Verify cluster creation
docker compose -f docker/compose/docker-compose.cache.yml exec valkey-cluster-0 \
  valkey-cli -a "${VALKEY_PASSWORD}" cluster info
```

### 5. Verify All Services

```bash
docker compose -f docker/compose/docker-compose.cache.yml ps
```

Expected output:
```
NAME                    IMAGE                           STATUS
valkey-0                valkey/valkey:8-alpine          Up (healthy)
valkey-sentinel-0       valkey/valkey:8-alpine          Up (healthy)
valkey-cluster-0        valkey/valkey:8-alpine          Up (healthy)
valkey-cluster-1        valkey/valkey:8-alpine          Up (healthy)
valkey-cluster-2        valkey/valkey:8-alpine          Up (healthy)
valkey-cluster-3        valkey/valkey:8-alpine          Up (healthy)
valkey-cluster-4        valkey/valkey:8-alpine          Up (healthy)
valkey-cluster-5        valkey/valkey:8-alpine          Up (healthy)
varnish                 varnish:7.6                     Up (healthy)
nginx                   nginx:1.27-alpine               Up (healthy)
trafficserver           apache/trafficserver:9.2        Up (healthy)
prometheus              prom/prometheus:v2.55           Up
grafana                 grafana/grafana:11.3            Up
valkey-exporter         oliver006/redis_exporter:v1.67  Up
nginx-exporter          nginx/nginx-prometheus-exporter:1.3 Up
```

### 6. Stop and Cleanup

```bash
# Stop all services (preserves volumes)
docker compose -f docker/compose/docker-compose.cache.yml down

# Stop and remove volumes
docker compose -f docker/compose/docker-compose.cache.yml down -v

# Full cleanup (removes everything)
docker compose -f docker/compose/docker-compose.cache.yml down -v --rmi all
```

---

## Step-by-Step: Kubernetes Deployment

### 1. Prepare the Cluster

```bash
# Create namespace
kubectl create namespace myworkspace-cache

# Label namespace for network policies
kubectl label namespace myworkspace-cache app.kubernetes.io/part-of=myworkspace

# Create storage class if not exists (SSD-backed)
cat <<EOF | kubectl apply -f -
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: ssd
provisioner: kubernetes.io/no-provisioner
volumeBindingMode: WaitForFirstConsumer
EOF
```

### 2. Create Secrets

```bash
# Generate strong passwords
VALKEY_PASSWORD=$(openssl rand -base64 32)

# Create secrets
kubectl create secret generic valkey-secret \
  --from-literal=password="${VALKEY_PASSWORD}" \
  -n myworkspace-cache

kubectl create secret generic grafana-secret \
  --from-literal=password="$(openssl rand -base64 16)" \
  -n myworkspace-cache

# TLS certificates (if using self-signed for internal)
kubectl create secret tls nginx-ssl \
  --cert=/path/to/fullchain.pem \
  --key=/path/to/privkey.pem \
  -n myworkspace-cache
```

### 3. Create ConfigMaps

```bash
# Valkey standalone config
kubectl create configmap valkey-config \
  --from-file=valkey/standalone/valkey.conf \
  -n myworkspace-cache

# Valkey cluster config
kubectl create configmap valkey-cluster-config \
  --from-file=valkey/cluster/valkey-cluster.conf \
  -n myworkspace-cache

# Valkey cluster init script
kubectl create configmap valkey-cluster-init-script \
  --from-file=valkey/init-cluster.sh \
  -n myworkspace-cache

# Varnish VCL
kubectl create configmap varnish-config \
  --from-file=default.vcl=varnish/vcl/default.vcl \
  -n myworkspace-cache

# Nginx configs
kubectl create configmap nginx-config \
  --from-file=nginx.conf=nginx/conf/nginx.conf \
  --from-file=conf.d/myworkspace.conf=nginx/conf/conf.d/myworkspace.conf \
  --from-file=conf.d/cdn.conf=nginx/conf/conf.d/cdn.conf \
  -n myworkspace-cache

# Traffic Server configs
kubectl create configmap ats-config \
  --from-file=records.config=trafficserver/conf/records.config \
  --from-file=remap.config=trafficserver/conf/remap.config \
  --from-file=cache.config=trafficserver/conf/cache.config \
  -n myworkspace-cache
```

### 4. Deploy Valkey (Standalone + Cluster)

```bash
# Deploy Valkey standalone with Sentinel
kubectl apply -f kubernetes/valkey/valkey-standalone.yaml -n myworkspace-cache

# Deploy Valkey cluster
kubectl apply -f kubernetes/valkey/valkey-cluster.yaml -n myworkspace-cache
```

### 5. Deploy Varnish

```bash
kubectl apply -f kubernetes/varnish/configmap.yaml -n myworkspace-cache 2>/dev/null || \
  kubectl create configmap varnish-config \
    --from-file=default.vcl=varnish/vcl/default.vcl \
    -n myworkspace-cache
kubectl apply -f kubernetes/varnish/service.yaml -n myworkspace-cache
kubectl apply -f kubernetes/varnish/deployment.yaml -n myworkspace-cache
kubectl apply -f kubernetes/varnish/hpa.yaml -n myworkspace-cache
kubectl apply -f kubernetes/varnish/pdb.yaml -n myworkspace-cache
```

### 6. Deploy Nginx

```bash
kubectl apply -f kubernetes/nginx/configmap.yaml -n myworkspace-cache
kubectl apply -f kubernetes/nginx/service.yaml -n myworkspace-cache
kubectl apply -f kubernetes/nginx/deployment.yaml -n myworkspace-cache
kubectl apply -f kubernetes/nginx/ingress.yaml -n myworkspace-cache
```

### 7. Deploy Traffic Server

```bash
kubectl apply -f kubernetes/trafficserver/configmap.yaml -n myworkspace-cache
kubectl apply -f kubernetes/trafficserver/service.yaml -n myworkspace-cache
kubectl apply -f kubernetes/trafficserver/deployment.yaml -n myworkspace-cache
```

### 8. Deploy Monitoring

```bash
# Prometheus
kubectl create configmap prometheus-config \
  --from-file=monitoring/prometheus/prometheus.yml \
  --from-file=monitoring/prometheus/valkey.yml \
  -n myworkspace-cache

kubectl create configmap grafana-dashboards \
  --from-file=monitoring/grafana/dashboards/ \
  -n myworkspace-cache

kubectl create configmap grafana-datasources \
  --from-file=monitoring/grafana/datasources/ \
  -n myworkspace-cache
```

### 9. Apply Network Policies

```bash
kubectl apply -f kubernetes/network-policy.yaml -n myworkspace-cache
```

### 10. Wait and Verify

```bash
# Watch pods
kubectl get pods -n myworkspace-cache -w

# Check cluster init
kubectl logs -n myworkspace-cache -l job-name=valkey-cluster-init

# Verify Valkey cluster
kubectl exec -n myworkspace-cache deploy/valkey -- \
  valkey-cli -a "${VALKEY_PASSWORD}" cluster info
```

---

## Step-by-Step: Docker Swarm Deployment

### 1. Initialize Swarm (if not already)

```bash
# Initialize the swarm
docker swarm init --advertise-addr eth0

# Label nodes for service placement
docker node update --label-add cache=valkey $(hostname)
docker node update --label-add cache=valkey-cluster $(hostname)
docker node update --label-add cache=varnish $(hostname)
docker node update --label-add cache=nginx $(hostname)
docker node update --label-add cache=trafficserver $(hostname)

# For multi-node: label other worker nodes
# docker node update --label-add cache=valkey worker-1
# docker node update --label-add cache=valkey-cluster worker-1
```

### 2. Create Secrets

```bash
# Create Docker secrets (must be done before stack deploy)
echo "super-secure-password" | docker secret create valkey_password -
echo "session-secret" | docker secret create session_cache_password -
echo "api-secret" | docker secret create api_cache_password -
echo "readonly-secret" | docker secret create readonly_password -
echo "monitor-secret" | docker secret create monitoring_password -
echo "grafana-admin-pass" | docker secret create grafana_password -

# TLS certificates
docker secret create nginx_fullchain /root/myworkspace/cache/nginx/ssl/fullchain.pem
docker secret create nginx_privkey /root/myworkspace/cache/nginx/ssl/privkey.pem
```

### 3. Create Overlay Networks

```bash
# Internal cache network (encrypted)
docker network create --driver overlay --opt encrypted \
  --subnet 10.20.0.0/16 cache-network

# External app network (must exist before stack deploy)
docker network create --driver overlay \
  --attachable myworkspace-network
```

### 4. Create Data Directories (Worker Nodes)

```bash
# On each Swarm worker node:
for i in 0 1 2 3 4 5; do
  mkdir -p /data/cache/valkey/${i}
done
mkdir -p /data/cache/valkey/sentinel
mkdir -p /data/cache/prometheus
mkdir -p /data/cache/grafana
mkdir -p /data/cache/alertmanager
chown -R 1000:1000 /data/cache
```

### 5. Deploy the Stack

```bash
cd /root/myworkspace/cache

docker stack deploy -c docker/stack/docker-stack.cache.yml cache
```

### 6. Monitor Deployment

```bash
# Check stack services
docker stack services cache

# Watch service rollout
watch docker stack ps cache

# View logs for specific service
docker service logs cache_valkey-cluster-init

# Scale cluster init manually (it starts with 0 replicas)
docker service scale cache_valkey-cluster-init=1

# After cluster init completes, scale back to 0
docker service scale cache_valkey-cluster-init=0
```

### 7. Verify

```bash
# List all services
docker stack services cache

# Check individual task status
docker stack ps cache --no-trunc

# Test Valkey standalone
docker exec $(docker ps --filter name=cache_valkey-standalone -q) \
  valkey-cli -a "$(cat /run/secrets/valkey_password)" ping

# Test Varnish
docker exec $(docker ps --filter name=cache_varnish -q) \
  varnishadm ping
```

### 8. Updating the Stack

```bash
# Update configuration and redeploy
docker stack deploy -c docker/stack/docker-stack.cache.yml cache

# Rolling update with specific service
docker service update --image valkey/valkey:8-alpine cache_valkey-standalone

# Rollback if needed
docker service rollback cache_varnish
```

### 9. Remove Stack

```bash
docker stack rm cache

# Remove secrets
docker secret rm valkey_password session_cache_password api_cache_password \
  readonly_password monitoring_password grafana_password \
  nginx_fullchain nginx_privkey

# Remove networks (if no other services use them)
docker network rm cache-network myworkspace-network
```

---

## Verification Steps for Each Layer

### Layer 1: NodeCache (Application-Level)

```bash
# Check NodeCache is active via application health endpoint
curl -s https://myworkspace.myenum.in/api/health | jq '.cache'

# Expected:
# {
#   "l1Connected": true,
#   "l2Connected": true,
#   "remoteConnected": true,
#   "providers": ["config","query","api","session","auth","permission","computation"]
# }
```

### Layer 2: Valkey Standalone

```bash
# Ping
valkey-cli -h localhost -p 6379 -a "${VALKEY_PASSWORD}" ping
# Expected: PONG

# Info
valkey-cli -h localhost -p 6379 -a "${VALKEY_PASSWORD}" INFO stats | grep keyspace

# Check memory
valkey-cli -h localhost -p 6379 -a "${VALKEY_PASSWORD}" INFO memory | grep -E "used_memory_human|maxmemory_human"

# Test set/get
valkey-cli -h localhost -p 6379 -a "${VALKEY_PASSWORD}" set test:key "hello"
valkey-cli -h localhost -p 6379 -a "${VALKEY_PASSWORD}" get test:key
valkey-cli -h localhost -p 6379 -a "${VALKEY_PASSWORD}" del test:key
```

### Layer 3: Valkey Cluster

```bash
# Cluster info
valkey-cli -h localhost -p 6379 -a "${VALKEY_PASSWORD}" cluster info

# Expected output:
# cluster_state:ok
# cluster_slots_assigned:16384
# cluster_slots_ok:16384
# cluster_known_nodes:6
# cluster_size:3

# Check nodes
valkey-cli -h localhost -p 6379 -a "${VALKEY_PASSWORD}" cluster nodes

# Test cluster write
valkey-cli -h localhost -p 6379 -a "${VALKEY_PASSWORD}" set cluster:test "distributed"
valkey-cli -h localhost -p 6379 -a "${VALKEY_PASSWORD}" get cluster:test
```

### Layer 4: Varnish Cache

```bash
# Admin ping
varnishadm -T localhost:6082 ping
# Expected: PONG (response to ping)

# Check statistics
varnishstat -1 | grep -E "MAIN\.(cache_hit|cache_miss|sess_conn)"

# Check hit rate
varnishstat -1 | grep -E "MAIN\.(n_object|n_expired|n_lru_nuked)"

# Test cache via HTTP
curl -s -I http://localhost/_next/static/test.js | grep -E "X-Cache|X-Cache-Hits"

# Expected:
# X-Cache: HIT (or MISS on first request)
```

### Layer 5: Nginx

```bash
# Health check
curl -k https://myworkspace.myenum.in/nginx-health
# Expected: healthy

# Check cache status
curl -k -I https://myworkspace.myenum.in/_next/static/test.js | grep X-Cache-Status
# Expected: STATIC (for static files) or HIT/MISS (for cached API)

# Check API cache
curl -k -I https://myworkspace.myenum.in/api/search?q=test | grep X-Cache-Status

# Check TLS
curl -kvI https://myworkspace.myenum.in/ 2>&1 | grep -E "SSL|TLS"

# Verify security headers
curl -k -I https://myworkspace.myenum.in/ | grep -E "Strict-Transport-Security|X-Frame-Options|X-Content-Type-Options"
```

### Layer 6: Apache Traffic Server

```bash
# Check server status
curl -s http://localhost:8080/__ats__/stats | grep proxy.node.cache_hit_ratio

# Check cache metrics
curl -s http://localhost:8080/__ats__/stats | grep -E "proxy.node.cache_(hit|miss|total)"

# Test static asset caching
curl -s -I http://localhost:8080/_next/static/test.js | grep -E "Age|Via|X-Cache"

# Verify API passthrough (NOT cached)
curl -s -I http://localhost:8080/api/dashboard | grep -E "Age|Via|X-Cache"
```

### Layer 7: FS-Cache / bcache

```bash
# FS-Cache status
if [ -d /sys/module/fscache ]; then
  echo "FS-Cache module loaded"
  cat /proc/fs/fscache/objects 2>/dev/null || echo "No objects cached"
fi

# bcache status
if [ -d /sys/fs/bcache ]; then
  bcache-super-show /dev/nvme0n1 | head -20
  # Check cache hit ratio
  cat /sys/block/bcache0/bcache/stats_total/cache_hit_ratio
fi
```

### Monitoring Stack

```bash
# Prometheus targets
curl -s http://localhost:9090/api/v1/targets | jq '.data.activeTargets[].labels.job'

# Prometheus query
curl -s 'http://localhost:9090/api/v1/query?query=redis_up' | jq '.data.result'

# Grafana health
curl -s http://localhost:3000/api/health
# Expected: {"database":"ok","version":"11.3.0"}

# Valkey exporter
curl -s http://localhost:9121/metrics | grep redis_up

# Nginx exporter
curl -s http://localhost:9113/metrics | grep nginx_up
```

---

## Common Setup Issues and Fixes

### Docker Permission Denied

**Symptom**: `Got permission denied while trying to connect to the Docker daemon socket`

**Fix**:
```bash
sudo usermod -aG docker $USER
newgrp docker
# Or use sudo for Docker commands
```

### Port Already in Use

**Symptom**: `port is already allocated` or `address already in use`

**Fix**:
```bash
# Find what's using the port
ss -tlnp | grep -E ':(80|443|6379|8080|9090|3000)\s'

# Stop conflicting service
systemctl stop nginx  # if conflicting with port 80/443
# Or change port bindings in the compose/stack file
```

### Docker DNS Resolution

**Symptom**: Services can't resolve each other's hostnames

**Fix**:
```bash
# In compose: ensure same network
# In swarm: ensure overlay network is created

# Check DNS resolution inside a container
docker exec -it $(docker ps --filter name=cache_nginx -q) \
  nslookup valkey-standalone
docker exec -it $(docker ps --filter name=cache_nginx -q) \
  nslookup varnish

# Restart DNS resolver in container
docker compose -f docker/compose/docker-compose.cache.yml restart
```

### Swarm Network Not Found

**Symptom**: `network myworkspace-network not found`

**Fix**:
```bash
# Create external network before stack deploy
docker network create --driver overlay --attachable myworkspace-network
```

### Volume Mount Permission Denied

**Symptom**: `mkdir /data/cache/valkey: permission denied`

**Fix**:
```bash
# Create directories with proper permissions
sudo mkdir -p /data/cache
sudo chown -R $(whoami):$(whoami) /data/cache
```

### Valkey Cluster Init Fails

**Symptom**: `valkey-cluster-init` exits with error

**Root Causes**:
1. Cluster nodes not ready yet (race condition)
2. Password mismatch
3. Network isolation prevents cluster bus communication

**Fix**:
```bash
# Check node status
for i in 0 1 2 3 4 5; do
  echo "Node $i: $(docker compose exec valkey-cluster-$i valkey-cli ping)"
done

# Manually initialize
docker compose exec valkey-cluster-0 \
  valkey-cli --cluster create \
    10.20.0.10:6379 10.20.0.11:6379 10.20.0.12:6379 \
    10.20.0.13:6379 10.20.0.14:6379 10.20.0.15:6379 \
    --cluster-replicas 1 \
    -a "${VALKEY_PASSWORD}"
```

### Varnish Fails to Start

**Symptom**: Varnish container exits with `varnishd: Could not open storage`

**Fix**:
```bash
# Increase tmpfs size or check available memory
# In compose, ensure tmpfs is configured
# In swarm, tmpfs may not be supported — use malloc storage only

# Check Varnish logs
docker compose logs varnish

# Test VCL compilation
docker compose exec varnish varnishd -C -f /etc/varnish/default.vcl
```

### Prometheus Scrape Targets Down

**Symptom**: Prometheus targets show `DOWN` status

**Fix**:
```bash
# Check exporter is accessible
curl -s http://localhost:9121/metrics | head -5

# Verify DNS resolution from Prometheus
docker compose exec prometheus wget -q -O /dev/null http://valkey-exporter:9121/metrics

# Reload Prometheus config
docker compose exec prometheus kill -HUP 1

# Or force reload via API
curl -X POST http://localhost:9090/-/reload
```

### Grafana Can't Connect to Prometheus

**Symptom**: Grafana dashboards show "No data" or "Prometheus: Bad Gateway"

**Fix**:
```bash
# Check datasource config
docker compose exec grafana \
  curl -s http://localhost:3000/api/datasources | jq

# Verify Prometheus is reachable from Grafana
docker compose exec grafana \
  wget -q -O /dev/null http://prometheus:9090/-/healthy

# Restart Grafana
docker compose restart grafana
```

---

## First-Time Initialization

### New Environment Checklist

- [ ] All passwords generated and stored in a vault/password manager
- [ ] `.env` file created with production values
- [ ] TLS certificates generated and deployed
- [ ] Data directories created on all Swarm nodes
- [ ] Sealed secrets for Kubernetes created
- [ ] Firewall rules applied (only expose 80/443, 9090/3000 for admin VPN)
- [ ] Monitoring alert destinations configured
- [ ] Backup scripts tested
- [ ] Kernel parameters tuned (`sysctl`)
- [ ] Disk I/O scheduler set to `none` for NVMe, `mq-deadline` for SSD
- [ ] FS-Cache / bcache initialized (if using Layer 7)

### Initial Data Seeding

```bash
# After first deployment, warm the caches

# Warm Valkey
docker compose exec valkey-0 \
  valkey-cli -a "${VALKEY_PASSWORD}" script load "$(cat valkey/cache-warming.js)"

# Prime Varnish cache
for url in $(cat initial-cache-urls.txt); do
  curl -s -o /dev/null -w "%{http_code}" "http://localhost${url}"
done

# Prime Nginx cache
for url in $(cat initial-api-urls.txt); do
  curl -k -s -o /dev/null "https://myworkspace.myenum.in${url}"
done
```

---

## Configuration Overrides

### Per-Environment Overrides

```bash
# Production override file
cat > docker/compose/docker-compose.override.yml << EOF
services:
  valkey-standalone:
    deploy:
      resources:
        limits:
          memory: 8g
  varnish:
    environment:
      VARNISH_MEMORY: 4g
      VARNISH_STORAGE: malloc,4g
  trafficserver:
    deploy:
      resources:
        limits:
          memory: 16g
          cpus: "8"
EOF

# Deploy with override
docker compose -f docker/compose/docker-compose.cache.yml \
  -f docker/compose/docker-compose.override.yml up -d
```

### Swarm Stack Environment File

```bash
# Create a .env file in the same directory as the stack file
cat > docker/stack/.env << EOF
VARNISH_MEMORY=4g
VARNISH_STORAGE=malloc,4g
THREAD_POOL_MAX=2000
EOF

# Deploy stack (docker stack reads .env automatically)
docker stack deploy -c docker/stack/docker-stack.cache.yml cache
```

### Kubernetes ConfigMap Overrides

```bash
# Patch a running config
kubectl create configmap nginx-config-override \
  --from-file=nginx-override.conf -n myworkspace-cache

# Mount with overrides in deployment
# Or edit the ConfigMap directly:
kubectl edit configmap nginx-config -n myworkspace-cache
```

### Using Multiple Compose Files Safely

```yaml
# docker-compose.override.yml - example production overrides
services:
  nginx:
    deploy:
      resources:
        limits:
          memory: 2g
          cpus: "4"
    ports:
      - "443:443"
    environment:
      - MYWORKSPACE_ENV=production

  valkey-standalone:
    deploy:
      replicas: 1
    environment:
      VALKEY_PASSWORD: ${VALKEY_PASSWORD}
    configs:
      - target: /etc/valkey/users.acl
        source: valkey_users_acl
        mode: 0440
```
