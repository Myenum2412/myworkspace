# Untestable-in-CI Items & Manual Verification Plan

This document lists test categories that cannot be automated in CI, with recommended manual/staging verification strategies.

## 1. Varnish VCL Behavior

**Why untestable in CI:** Varnish is a separate HTTP cache/reverse-proxy process. It's not part of the Node.js runtime and requires a real Varnish instance to test VCL configuration.

**Verification plan:**
- Set up a staging environment with Varnish in front of the app
- Use `varnishtest` (Varnish Test Framework) to verify VCL rules
- Test cache hit/miss ratios with specific URL patterns
- Verify cache invalidation (BAN/PURGE requests) work correctly
- Test edge cases: TTL headers, cache key normalization, grace mode

## 2. Nginx Configuration

**Why untestable in CI:** Nginx config directives (proxy_pass, caching headers, rate limiting, SSL termination) require a real nginx process.

**Verification plan:**
- Use `nginx -t` to validate config syntax (can be done in CI)
- In staging, test: SSL termination, reverse proxy behavior, client_max_body_size enforcement
- Verify nginx cache headers match Express Cache-Control headers
- Test rate limiting at nginx level (limit_req, limit_conn)

## 3. Apache Traffic Server (ATS)

**Why untestable in CI:** ATS is a separate HTTP proxy and cache server that requires its own infrastructure.

**Verification plan:**
- Validate ATS `remap.config` and `cache.config` syntax
- Test cache invalidation propagation across ATS → Nginx → Varnish → App
- Measure cache hit ratio improvements with ATS
- Test behavior under ATS timeout scenarios

## 4. Linux FS-Cache (cachefilesd)

**Why untestable in CI:** FS-Cache is a kernel-level feature that caches filesystem data on disk. It requires specific kernel modules and configuration.

**Verification plan:**
- Verify cachefilesd is running: `systemctl status cachefilesd`
- Monitor cache usage: `cat /sys/fs/fscache/stats`
- Test behavior when cache backend disk fills up
- Verify cache coherency with NFS or local filesystem

## 5. ClamAV (Real Daemon)

**Why partially untestable:** The virus scan service is tested with mock responses in unit tests, but real ClamAV daemon behavior (performance under load, signature updates, socket communication) requires a running clamd instance.

**Verification plan:**
- Deploy ClamAV in staging with real virus definitions
- Test with EICAR test file: `echo 'X5O!P%@AP[4\PZX54(P^)7CC)7}EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*' > test.txt`
- Test scan performance under concurrent uploads
- Test clamd restart/reload behavior without service interruption
- Test clamd unavailability causes graceful degradation

## 6. Stripe Live Webhooks

**Why untestable in CI:** Stripe test-mode webhooks work in CI, but end-to-end flow from Stripe dashboard → webhook → subscription update requires real Stripe events.

**Verification plan:**
- Use Stripe CLI `stripe listen --forward-to localhost:4000/api/billing/webhook`
- Trigger events: `stripe trigger payment_intent.succeeded`, `stripe trigger invoice.paid`, `stripe trigger customer.subscription.updated`
- Verify subscription state transitions in the application database
- Test webhook retry logic (Stripe sends up to 3 retries)
- Test idempotency: send same event twice, verify no duplicate processing

## 7. Redis Sentinel / Cluster Failover

**Why not in CI:** Redis Sentinel failover testing requires a multi-node Redis setup and actual failover events.

**Verification plan:**
- In staging with Redis Sentinel:
  - Manually fail over the Redis master: `redis-cli -p 26379 SENTINEL FAILOVER mymaster`
  - Verify app reconnects to new master without data loss
  - Verify Socket.IO Redis adapter reconnects correctly
  - Monitor connection disruption time

## 8. Multi-Cloud Provider Failover

**Why challenging in CI:** Testing S3 ↔ GCS ↔ Azure failover requires real credentials and multi-region infrastructure.

**Verification plan:**
- Configure all three cloud providers in staging
- Simulate S3 outage: block S3 endpoint in firewall/network ACL
- Verify automatic failover to GCS or Azure
- Test fallback to local filesystem when all clouds are down
- Verify data consistency across providers

## 9. MongoDB Replica Set Failover

**Why challenging in CI:** While mongodb-memory-server provides a single-node replica set, testing actual primary election and failover requires a multi-node replica set.

**Verification plan:**
- In staging with a 3-node replica set:
  - Force stepDown of primary: `rs.stepDown(60)`
  - Verify write concern `w: "majority"` during election
  - Verify read preference `primaryPreferred` for read-your-writes consistency
  - Monitor driver reconnection: expect < 2s interruption

## 10. Real Load Tests

**Why not in CI by default:** k6 load tests are included as scripts but should be run against staging, not CI, to avoid distorting results.

**Verification plan:**
- Run k6 load tests against staging before every major release
- Monitor: p50/p95/p99 response times, error rate, memory leak (heap growth)
- Establish baseline metrics and fail if degradation > 20%
- Run soak test (30min+) to catch memory leaks

## 11. Docker Compose End-to-End

**Why not in CI:** Full docker-compose up with all services (MongoDB, Redis, RabbitMQ, ClamAV, Nginx, Varnish) is resource-intensive.

**Verification plan:**
- In staging, run `docker-compose up -d` and verify all services start
- Run the full integration test suite against the docker-compose stack
- Test service startup order (MongoDB must be ready before app)
- Test graceful shutdown and cleanup

## 12. Service Worker Browser Registration

**Why not in CI:** PWA service worker registration requires a real browser with HTTPS.

**Verification plan:**
- Verify HTTPS is enforced (needed for SW registration)
- Use Playwright/Cypress in staging: navigate to app, verify SW is registered
- Test offline page fallback: disconnect network, refresh page
- Test push notification permission flow
