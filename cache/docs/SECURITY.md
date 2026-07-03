# Security Guide — MyWorkSpace Cache Infrastructure

## Network Isolation Strategies

### Docker Network Architecture

```
┌─────────────────────────────────┐
│         Internet                │
└──────────────┬──────────────────┘
               │ 443 (TLS)
┌──────────────▼──────────────────┐
│         Nginx (L5)              │
│    cache-network (10.20.0.0/16) │
└──────┬──────┬──────┬────────────┘
       │      │      │
  ┌────▼─┐ ┌─▼────┐ ┌▼──────────┐
  │Varnish│ │Valkey│ │    ATS    │
  │ (L4)  │ │L2/L3 │ │   (L6)   │
  └───────┘ └──────┘ └───────────┘
       │
  ┌────▼──────────────────────────┐
  │    app-network (external)     │
  │    Backend Application        │
  └───────────────────────────────┘
```

### Network Segmentation

| Network | Type | Services | Access |
|---|---|---|---|
| `cache-network` | `overlay` (encrypted) | All cache services | Internal only |
| `app-network` | `overlay` (external) | Nginx, Backend | Application only |

### Docker Compose Networks

```yaml
networks:
  cache-network:
    driver: bridge
    internal: true              # No external access
    ipam:
      config:
        - subnet: 10.20.0.0/16
  app-network:
    external: true
    name: myworkspace-network
```

### Docker Swarm Networks

```yaml
networks:
  cache-network:
    driver: overlay
    driver_opts:
      encrypted: "true"         # Encrypted overlay for multi-node
    ipam:
      config:
        - subnet: 10.20.0.0/16
  app-network:
    external: true
    name: myworkspace-network
```

### Kubernetes Network Policies

```yaml
# Restrict ingress: only allow from same namespace and monitoring
ingress:
  - from:
      - namespaceSelector:
          matchLabels:
            app.kubernetes.io/part-of: myworkspace
      - namespaceSelector:
          matchLabels:
            kubernetes.io/metadata.name: ingress-nginx
    ports:
      - port: 80
      - port: 443
      - port: 8080
      - port: 6379
  - from:
      - podSelector:  # Cache-to-cache communication
          matchLabels:
            app.kubernetes.io/component: cache

# Restrict egress: only DNS, internal, and specific externals
egress:
  - to:
      - namespaceSelector: {}
    ports:
      - port: 53 (UDP/TCP)
  - to:
      - podSelector:
          matchLabels:
            app.kubernetes.io/component: cache
  - to:
      - ipBlock:
          cidr: 0.0.0.0/0
        except:
          - 10.0.0.0/8      # Block internal network egress
          - 172.16.0.0/12
          - 192.168.0.0/16
```

### Host Firewall Rules

```bash
# iptables rules for cache nodes
# Allow internal cluster communication
iptables -A INPUT -s 10.20.0.0/16 -j ACCEPT

# Allow only Nginx ports externally
iptables -A INPUT -p tcp --dport 443 -j ACCEPT
iptables -A INPUT -p tcp --dport 80 -j ACCEPT

# Allow monitoring from admin VPN
iptables -A INPUT -s <admin-vpn-cidr> -p tcp --dport 9090 -j ACCEPT  # Prometheus
iptables -A INPUT -s <admin-vpn-cidr> -p tcp --dport 3000 -j ACCEPT  # Grafana

# Deny all other inbound
iptables -A INPUT -j DROP

# UFW alternative
ufw default deny incoming
ufw allow from 10.20.0.0/16
ufw allow 443/tcp
ufw allow 80/tcp
ufw allow from <admin-vpn-cidr> to any port 9090,3000
ufw enable
```

---

## TLS Configuration for Each Layer

### Nginx (Public-Facing TLS Termination)

**Config location**: `nginx/conf/ssl/ssl-params.conf`

| Parameter | Setting | Security Impact |
|---|---|---|
| Protocols | `TLSv1.2 TLSv1.3` | TLSv1.0/1.1 disabled (deprecated) |
| Ciphers | `ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-...` | Forward secrecy, no RC4/DES/3DES |
| Prefer server ciphers | `off` | Client can negotiate better ciphers |
| HSTS | `max-age=63072000; includeSubDomains; preload` | Forces HTTPS for 2 years |
| OCSP Stapling | `on` | Protects privacy, improves performance |
| Session tickets | `off` | Prevents ticket resumption attacks |
| Session cache | `shared:SSL:50m` | Reduces handshake overhead |
| Early data | `on` | 0-RTT (safe for idempotent requests) |

### Valkey TLS (Internal, Recommended for Production)

```conf
# valkey.conf
tls-port 6379
tls-cert-file /etc/valkey/tls/valkey.crt
tls-key-file /etc/valkey/tls/valkey.key
tls-ca-cert-file /etc/valkey/tls/ca.crt
tls-auth-clients yes
tls-replication yes
tls-cluster yes
```

Generate internal CA and certs:
```bash
# Internal CA
openssl genrsa -out ca.key 4096
openssl req -x509 -new -nodes -key ca.key -sha256 -days 3650 \
  -subj "/CN=Cache Internal CA" -out ca.crt

# Valkey server cert
openssl genrsa -out valkey.key 2048
openssl req -new -key valkey.key -subj "/CN=valkey-standalone" -out valkey.csr
openssl x509 -req -in valkey.csr -CA ca.crt -CAkey ca.key -CAcreateserial \
  -out valkey.crt -days 365 -sha256 -extfile <(echo "subjectAltName=DNS:valkey-standalone,DNS:valkey-cluster,DNS:localhost")
```

### Varnish TLS (Terminated at Nginx)

Varnish does not natively support TLS. TLS is terminated at Nginx, which proxies plain HTTP to Varnish:
```
Client ──HTTPS──> Nginx ──HTTP──> Varnish
```

For end-to-end encryption, Varnish can be configured with Hitch (external TLS proxy):
```bash
# Use Hitch as TLS terminator
docker run -d --name hitch \
  -v /path/to/certs:/etc/hitch/certs:ro \
  -p 443:443 \
  hitch:latest \
  --backend=[varnish]:80 \
  --frontend=[*]:443
```

### ATS TLS

ATS supports native TLS. Enable in `records.config`:
```
CONFIG proxy.config.http.server_port INT 8080
CONFIG proxy.config.ssl.server.cert.path STRING /opt/trafficserver/etc/trafficserver/certs
CONFIG proxy.config.ssl.server.private_key.path STRING /opt/trafficserver/etc/trafficserver/certs
```

### Certificate Rotation

```bash
# Automated rotation script
#!/bin/bash
NEW_CERT="/path/to/new/fullchain.pem"
NEW_KEY="/path/to/new/privkey.pem"

# Replace certs
cp "${NEW_CERT}" nginx/ssl/fullchain.pem
cp "${NEW_KEY}" nginx/ssl/privkey.pem

# Reload Nginx (doesn't drop connections)
docker compose exec nginx nginx -s reload

# Verify new cert
echo | openssl s_client -connect localhost:443 -servername myworkspace.myenum.in 2>/dev/null | \
  openssl x509 -noout -dates
```

---

## Valkey ACL User Roles and Least Privilege

### ACL File (`valkey/users.acl`)

```
# Default user is disabled
user default off

# Application user - full cache access (minus dangerous commands)
user appuser on >${VALKEY_PASSWORD} ~* +@all -@dangerous +@connection -@admin

# Session cache - only session keys
user sessionuser on >${SESSION_CACHE_PASSWORD} ~session:* +get +set +expire +del +exists +ttl

# API cache - only API keys
user apicacheuser on >${API_CACHE_PASSWORD} ~api:* +get +set +expire +del +exists

# Read-only reporting user
user readonlyuser on >${READONLY_PASSWORD} ~* +get +exists +ttl +keys +type +info

# Monitoring user - info only
user monitoringuser on >${MONITORING_PASSWORD} ~* +info +ping +cluster|info +slowlog|get +memory|stats
```

### Permission Categories

| Category | Commands | Users |
|---|---|---|
| `+@all` | All commands | `appuser` |
| `-@dangerous` | `FLUSHALL`, `FLUSHDB`, `DEBUG`, `SHUTDOWN`, `SLAVEOF`, `CONFIG` | `default off` |
| `+@connection` | `AUTH`, `ECHO`, `PING`, `QUIT` | `appuser` |
| `-@admin` | `CONFIG SET`, `REPLICAOF`, `CLUSTER` | All non-admin |
| Read-only | `+get +exists +ttl +keys +type +info` | `readonlyuser` |
| Monitoring | `+info +ping +cluster\|info +slowlog\|get +memory\|stats` | `monitoringuser` |

### Command Renaming (Extra Security)

```conf
# valkey.conf - rename dangerous commands
rename-command FLUSHALL ""
rename-command FLUSHDB ""
rename-command CONFIG ""
rename-command SHUTDOWN ""
rename-command DEBUG ""
```

### Password Policy

| User | Min Length | Rotation | Storage |
|---|---|---|---|
| `appuser` | 32 chars (256-bit) | 90 days | Docker/K8s secret |
| `sessionuser` | 24 chars | 90 days | Docker/K8s secret |
| `apicacheuser` | 24 chars | 90 days | Docker/K8s secret |
| `readonlyuser` | 24 chars | 90 days | Docker/K8s secret |
| `monitoringuser` | 24 chars | 90 days | Docker/K8s secret |

Generate strong passwords:
```bash
openssl rand -base64 32  # 256-bit key
```

---

## Varnish PURGE/BAN Access Control

### ACL Configuration

```vcl
acl purge_acl {
  "localhost";
  "127.0.0.1";
  "10.0.0.0"/8;
  "172.16.0.0"/12;
  "192.168.0.0"/16;
}

sub vcl_recv {
  if (req.method == "PURGE" || req.method == "BAN") {
    if (!client.ip ~ purge_acl) {
      return (synth(405, "Not allowed"));
    }
  }
}
```

### Recommended ACL for Production

```vcl
acl purge_acl {
  "localhost";
  "127.0.0.1";
  "::1";
  "10.0.0.0"/8;       # RFC 1918 (Docker)
  "172.16.0.0"/12;    # RFC 1918
  "192.168.0.0"/16;   # RFC 1918
  # Add specific admin/application IPs
  "10.20.0.50";       # Application backend IP
}
```

### Secure PURGE via Nginx

```nginx
# Only allow PURGE from localhost via Nginx
location ~ /purge(/.*) {
  allow 127.0.0.1;
  allow ::1;
  allow 10.20.0.0/16;
  deny all;
  proxy_cache_purge api_cache "$scheme$request_method$host$1";
}

# Or proxy purge to Varnish with IP spoofing protection
location ~ /admin/cache/purge {
  allow 127.0.0.1;
  allow 10.20.0.0/16;
  deny all;

  proxy_pass http://varnish_servers;
  proxy_set_header X-Forwarded-For "";
  proxy_method PURGE;
}
```

### Authentication for PURGE

```nginx
# Basic auth on purge endpoint
location ~ /purge/ {
  auth_basic "Cache Purge";
  auth_basic_user_file /etc/nginx/.htpasswd;
  proxy_pass http://varnish_servers;
  proxy_method PURGE;
}
```

---

## Nginx Security Headers and Rate Limiting

### Security Headers

```nginx
# Applied globally in nginx.conf
add_header X-Frame-Options "SAMEORIGIN" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-XSS-Protection "1; mode=block" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
add_header Permissions-Policy "camera=(), microphone=(), geolocation=()" always;

# Applied in site-specific config
add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always;
add_header Content-Security-Policy "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'" always;
```

### Rate Limiting Configuration

```nginx
# Zones
limit_req_zone $binary_remote_addr zone=auth_limit:10m rate=20r/m;
limit_req_zone $binary_remote_addr zone=api_limit:100m rate=600r/m;
limit_req_zone $binary_remote_addr zone=upload_limit:50m rate=50r/m;
limit_req_zone $binary_remote_addr zone=search_limit:50m rate=100r/m;
limit_conn_zone $binary_remote_addr zone=conn_limit:10m;

# Application
location /api/auth/ {
  limit_req zone=auth_limit burst=5 nodelay;
  limit_req_status 429;
  proxy_pass http://backend_servers;
}

location /api/ {
  limit_req zone=api_limit burst=100 nodelay;
  limit_conn conn_limit 50;
  limit_conn_status 429;
  proxy_pass http://backend_servers;
}
```

### Request Size Limits

```nginx
# Global
client_max_body_size 100m;
client_body_buffer_size 128k;
client_header_buffer_size 8k;
large_client_header_buffers 8 8k;

# Per-location
location /api/files/upload {
  client_max_body_size 500m;
}

location /api/files-tus {
  client_max_body_size 10g;
}
```

### Hide Server Version

```nginx
server_tokens off;
# Also remove in error pages
# nginx.conf: server_tokens off;
```

### Connection Limits

```nginx
# Prevent slowloris
client_body_timeout 12s;
client_header_timeout 12s;
send_timeout 10s;

# Limit concurrent connections per IP
limit_conn conn_limit 50;

# Timeout idle connections
keepalive_timeout 65;
keepalive_requests 1000;
reset_timedout_connection on;
```

---

## Firewall Recommendations

### Host-Level

```bash
#!/bin/bash
# Apply to all cache nodes

# Flush existing rules
iptables -F
iptables -X

# Default policies
iptables -P INPUT DROP
iptables -P FORWARD DROP
iptables -P OUTPUT ACCEPT

# Allow loopback
iptables -A INPUT -i lo -j ACCEPT

# Allow established connections
iptables -A INPUT -m state --state ESTABLISHED,RELATED -j ACCEPT

# Cache network internal
iptables -A INPUT -s 10.20.0.0/16 -j ACCEPT

# Allow SSH (admin access)
iptables -A INPUT -p tcp --dport 22 -j ACCEPT

# Allow HTTP/HTTPS
iptables -A INPUT -p tcp --dport 80 -j ACCEPT
iptables -A INPUT -p tcp --dport 443 -j ACCEPT

# Allow monitoring from admin VPN
iptables -A INPUT -s <VPN_CIDR> -p tcp --dport 9090 -j ACCEPT  # Prometheus
iptables -A INPUT -s <VPN_CIDR> -p tcp --dport 3000 -j ACCEPT  # Grafana

# Swarm networking
iptables -A INPUT -p tcp --dport 2377 -j ACCEPT  # Swarm manager
iptables -A INPUT -p tcp --dport 7946 -j ACCEPT  # Swarm gossip
iptables -A INPUT -p udp --dport 7946 -j ACCEPT
iptables -A INPUT -p udp --dport 4789 -j ACCEPT  # VXLAN

# Log dropped packets (rate-limited)
iptables -A INPUT -m limit --limit 5/min -j LOG --log-prefix "Dropped: " --log-level 7

# Save rules
iptables-save > /etc/iptables/rules.v4
```

### Application-Level

```bash
# Block common attack patterns with Nginx
# In server block or include:
location ~* \.(env|git|svn|hg|DS_Store|sql|bak|old|swp)$ {
  deny all;
  return 404;
}

location ~ /\.(ht|git|svn) {
  deny all;
  return 404;
}

location = /wp-admin {
  deny all;
  return 404;
}

location = /xmlrpc.php {
  deny all;
  return 404;
}
```

---

## Secret Management

### Docker Compose (Development)

```bash
# Use environment variables (NOT in version control)
export VALKEY_PASSWORD="$(openssl rand -base64 32)"

# .env file (gitignored)
cat > .env << EOF
VALKEY_PASSWORD=your-secure-password
SESSION_CACHE_PASSWORD=session-password
API_CACHE_PASSWORD=api-password
READONLY_PASSWORD=readonly-password
MONITORING_PASSWORD=monitor-password
GRAFANA_PASSWORD=admin-password
EOF
```

### Docker Swarm Secrets

```bash
# Create secrets from files
echo "your-secure-password" | docker secret create valkey_password -
echo "session-password" | docker secret create session_cache_password -

# Or from file
docker secret create nginx_ssl_cert /path/to/fullchain.pem

# Reference in stack file:
# secrets:
#   - source: valkey_password
#     target: /run/secrets/valkey_password
#     mode: 0400

# Read secret in container
# cat /run/secrets/valkey_password
```

### Kubernetes Secrets

```bash
# Generic secrets
kubectl create secret generic valkey-secret \
  --from-literal=password="$(openssl rand -base64 32)" \
  --namespace myworkspace-cache

# TLS secrets
kubectl create secret tls nginx-ssl \
  --cert=/path/to/fullchain.pem \
  --key=/path/to/privkey.pem \
  --namespace myworkspace-cache

# Use in deployment:
# env:
#   - name: VALKEY_PASSWORD
#     valueFrom:
#       secretKeyRef:
#         name: valkey-secret
#         key: password
```

### HashiCorp Vault (Enterprise)

```hcl
# vault policy for cache
path "cache/data/*" {
  capabilities = ["read", "list"]
}

# Store secrets
vault kv put cache/config \
  valkey_password=your-password \
  grafana_password=admin-password

# Use Vault Agent sidecar for K8s
# Or vault-env for Docker
```

### Secret Rotation

```bash
#!/bin/bash
# Rotate Valkey password

NEW_PASSWORD="$(openssl rand -base64 32)"

# 1. Update in all secret stores
echo "${NEW_PASSWORD}" | docker secret rm valkey_password 2>/dev/null || true
echo "${NEW_PASSWORD}" | docker secret create valkey_password -

# 2. Update config files remotely
# For Docker Compose: update .env
# For Kubernetes: update secret

# 3. Update AUTH in Valkey without restart
valkey-cli -a "${OLD_PASSWORD}" CONFIG SET requirepass "${NEW_PASSWORD}"

# 4. Restart services that use the password
docker service update --force cache_valkey-standalone
docker service update --force cache_valkey-exporter
```

---

## Audit Logging

### Nginx Access Logs (JSON format)

```json
{
  "time": "2026-07-03T10:30:00+00:00",
  "remote_addr": "10.20.0.5",
  "request": "GET /api/dashboard HTTP/2",
  "status": 200,
  "body_bytes_sent": 12345,
  "request_time": 0.045,
  "upstream_addr": "10.20.0.4:80",
  "upstream_status": "200",
  "upstream_response_time": "0.030",
  "cache_status": "HIT",
  "http_referrer": "https://myworkspace.myenum.in/",
  "http_user_agent": "Mozilla/5.0..."
}
```

### Audit Events to Log

| Event | Layer | Log Location |
|---|---|---|
| PURGE/BAN request | Varnish | `varnishlog`, Nginx access log |
| Config change | Valkey | Valkey log, slow log |
| ACL violation | All | Application log |
| Failover event | Valkey Sentinel | Sentinel log |
| Connection refused | Any | Service logs |
| Certificate expiry | Nginx | System log |
| Rate limit exceeded | Nginx | Access log (status 429) |
| Key access pattern | Valkey | Slow log, monitor log |

### Centralized Logging

```bash
# Forward logs to syslog or external SIEM
# Nginx syslog:
access_log syslog:server=logstash:514,facility=local7,tag=nginx,severity=info json_combined;

# Docker logging driver
docker compose up -d --log-driver syslog --log-opt syslog-address=tcp://logstash:5000

# Or use fluentd
docker compose up -d --log-driver fluentd --log-opt fluentd-address=fluentd:24224
```

---

## DDoS Protection Strategies

### Network-Level

```bash
# Rate limit connections
iptables -A INPUT -p tcp --syn -m connlimit --connlimit-above 100 -j DROP

# Rate limit ICMP
iptables -A INPUT -p icmp -m limit --limit 10/second -j ACCEPT
iptables -A INPUT -p icmp -j DROP

# SYN flood protection
iptables -A INPUT -p tcp --syn -m limit --limit 200/s --limit-burst 1000 -j ACCEPT
iptables -A INPUT -p tcp --syn -j DROP
```

### Application-Level (Nginx)

```nginx
# Rate limiting (per IP)
limit_req_zone $binary_remote_addr zone=ddos:50m rate=100r/s;

# Slow connection protection
limit_conn conn_limit 50;

# Block user agents
map $http_user_agent $bad_bot {
  default 0;
  ~*(bot|crawler|spider|scanner|masscan|nmap) 1;
  ~*(curl|wget|python-requests) 0;  # Allow legitimate
}
if ($bad_bot) {
  return 403;
}

# Block by geolocation (if geo module loaded)
# geo $blocked_country {
#   default 0;
#   CN 1;
#   RU 1;
# }
# if ($blocked_country) {
#   return 403;
# }
```

### Varnish DDoS Protection

```vcl
sub vcl_recv {
  # Limit request rate per client IP
  if (vsthrough.get_ip_rate(client.ip) > 100) {
    return (synth(429, "Rate limit exceeded"));
  }

  # Block common attack patterns
  if (req.url ~ "(union.*select|select.*from|insert.*into|drop.*table|script|alert)") {
    return (synth(403, "Forbidden"));
  }

  # Limit request body size
  if (req.method == "POST" && req.http.Content-Length) {
    if (std.integer(req.http.Content-Length, 0) > 10485760) {
      return (synth(413, "Request too large"));
    }
  }
}
```

### Cloudflare Integration

```bash
# Proxy through Cloudflare for additional DDoS protection
# 1. Set Cloudflare as DNS proxy
# 2. Ensure Nginx only accepts Cloudflare IPs:

# In nginx.conf:
real_ip_header CF-Connecting-IP;
set_real_ip_from 173.245.48.0/20;
set_real_ip_from 103.21.244.0/22;
set_real_ip_from 103.22.200.0/22;
set_real_ip_from 103.31.4.0/22;
set_real_ip_from 141.101.64.0/18;
set_real_ip_from 108.162.192.0/18;
set_real_ip_from 190.93.240.0/20;
set_real_ip_from 188.114.96.0/20;
set_real_ip_from 197.234.240.0/22;
set_real_ip_from 198.41.128.0/17;
set_real_ip_from 162.158.0.0/15;
set_real_ip_from 104.16.0.0/13;
set_real_ip_from 104.24.0.0/14;
set_real_ip_from 172.64.0.0/13;
set_real_ip_from 131.0.72.0/22;
```

---

## Regular Security Checklist

### Daily

- [ ] Check Prometheus alerts for cache services
- [ ] Verify all cache services are healthy
- [ ] Review rate limit logs for 429 responses
- [ ] Check disk usage on cache volumes

### Weekly

- [ ] Review audit logs for unusual PURGE/BAN activity
- [ ] Check Valkey slow log for slow queries
- [ ] Verify Sentinel quorum is healthy
- [ ] Check certificate expiration dates
- [ ] Review error logs across all layers

### Monthly

- [ ] Rotate Valkey passwords
- [ ] Review and update firewall rules
- [ ] Update TLS certificates if needed
- [ ] Run security scan on Docker images
- [ ] Review ACL user permissions
- [ ] Test backup restore procedures

### Quarterly

- [ ] Full penetration test of cache infrastructure
- [ ] Update all container images to latest security patches
- [ ] Review and update incident response procedures
- [ ] Conduct failover drills for each layer
- [ ] Audit network policy rules in Kubernetes
- [ ] Review DDoS mitigation effectiveness

### Annually

- [ ] Rotate internal CA certificates
- [ ] Full architecture review and security assessment
- [ ] Update disaster recovery plan
- [ ] Compliance audit (SOC2, GDPR, HIPAA as applicable)

---

## Incident Response Procedures

### Cache Data Breach

1. **Isolate**: Disconnect affected cache services from network
   ```bash
   docker network disconnect cache-network <container>
   kubectl scale deployment <deployment> --replicas=0
   ```

2. **Preserve evidence**: Capture logs and memory
   ```bash
   docker logs <container> > incident-$(date +%Y%m%d-%H%M%S).log
   valkey-cli -a "${VALKEY_PASSWORD}" MEMORY MALLOC-STATS > memory-dump.txt
   ```

3. **Rotate credentials**: Change all passwords immediately
   ```bash
   # Generate new passwords
   # Update secrets
   # Restart services
   ```

4. **Analyze**: Determine scope of exposure
   - Check which keys were accessed
   - Review access logs for unusual patterns
   - Determine data types exposed

5. **Notify**: Inform affected parties per compliance requirements

6. **Remediate**: Apply security fixes
   - Patch vulnerabilities found
   - Update ACLs
   - Add additional monitoring

### Service Outage

1. **Assess impact**: Determine which layers are affected
2. **Failover**: Trigger HA mechanisms
   ```bash
   valkey-cli -p 26379 sentinel failover mymaster
   kubectl patch deployment varnish -p '{"spec":{"replicas":5}}'
   ```
3. **Restore from backup**: If data lost
   ```bash
   valkey-cli -a "${VALKEY_PASSWORD}" --rdb /tmp/dump.rdb
   # Restore on new instance
   ```
4. **Document**: RCA within 24 hours
5. **Prevent**: Implement fixes to prevent recurrence

### Suspicious Activity

1. **Investigate**: Check logs for the suspicious source IP
   ```bash
   journalctl -u docker | grep <suspicious-ip>
   grep <suspicious-ip> /var/log/nginx/access.log
   ```

2. **Block**: Add to blocklist
   ```bash
   iptables -A INPUT -s <suspicious-ip> -j DROP
   # Or via Nginx:
   # Add to /etc/nginx/blocked-ips.conf
   ```

3. **Monitor**: Watch for related activity
4. **Report**: To hosting provider if originating from cloud

### Recovery Steps

```bash
# 1. Verify the issue is contained
# 2. Apply necessary patches
# 3. Restore services in dependency order:
docker compose up -d valkey-standalone
docker compose up -d varnish
docker compose up -d nginx
docker compose up -d trafficserver

# 4. Verify health of each layer
# 5. Warm caches if necessary
# 6. Monitor for 24 hours post-recovery
```
