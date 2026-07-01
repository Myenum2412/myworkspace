# MyWorkSpace: Performance Optimization Roadmap

## Phase Dependency Graph

```
Phase 1 (Dashboard Cache) ──→ Phase 3 (Remove force-dynamic) ──→ Phase 9 (Bundle Opt)
         │                                                              │
         ↓                                                              ↓
Phase 2 (Auth Opt) ──→ Phase 4 (Redis Consolidation) ──→ Phase 10 (MongoDB Opt)
                               │
                               ↓
                         Phase 5 (Proxy Simplify)
                               │
                               ↓
                         Phase 6 (Brotli)
                               │
                               ↓
                         Phase 7 (Code Split)
                               │
                               ↓
                         Phase 8 (CDN)
```

**Rule**: Complete and verify each phase before starting the next. No phase depends on a later phase.

---

## Full Request-Response Cycle

```
Browser
  │
  ▼
Next.js Edge Middleware (middleware.ts)
  ├── Decrypt NextAuth JWT cookie (jose HKDF + JWE decrypt)
  ├── Route context detection (origin/staff/workspace/public/client)
  ├── Auth redirect logic
  │
  ▼
Custom Server (server.ts)
  ├── Decides: proxy to backend OR handle directly
  │
  ├── [API Proxy Path] → http-proxy-middleware → Express Backend (port 4000)
  │                              │
  │                              ▼
  │                    Express Middleware Stack:
  │                      helmet → cors → compression → json parser
  │                      → rate-limiter → perf middleware
  │                      → AUTHENTICATE (HKDF derive + JWE decrypt
  │                        + jwt.verify + OrgMember.findOne + User.findOne)
  │                      → ORG CONTEXT (OrgMember.findOne if no orgId in token)
  │                      → route handler → MongoDB queries
  │                      → response
  │
  ├── [Next.js API Route] → Next.js Route Handler (app/api/*)
  │                              │
  │                              ▼
  │                    Direct MongoDB access (from frontend server)
  │
  └── [Server Component] → auth() → NextAuth JWT callback
                                 (queries users + org_members + orgs)
                           → Direct MongoDB queries (dashboard: 14 queries)
                           → Render JSX → HTML
```

---

## Bottleneck Summary

| # | Bottleneck | Source | Est. Impact |
|---|-----------|--------|-------------|
| 1 | Auth overhead (JWE decrypt + 2-4 DB queries per request) | `auth.ts`, `org-context.ts`, `auth/config.ts`, `middleware.ts` | 300-500ms |
| 2 | Dashboard: 14 MongoDB queries with no caching | `frontend/app/dashboard/page.tsx` | 400-800ms |
| 3 | Dual proxy architecture | `server.ts` + `next.config.ts` rewrites | 50-100ms |
| 4 | Two cache implementations, neither used in hot paths | `lib/cache.ts`, `lib/cache/index.ts` | 100-200ms |
| 5 | Two MongoDB connection pools | `frontend/lib/db/`, `backend/src/lib/db/` | 100-200ms |
| 6 | No code splitting (MUI, recharts, Socket.IO all in initial bundle) | Multiple components | 200-300ms initial load |
| 7 | No CDN for static assets | Vercel origin serving | 100-200ms asset load |
| 8 | gzip instead of brotli | `app.ts` | 50-100ms per response |

---

## Affected Files by System

### Authentication (83 files total, 5 core files for changes)

| File | Role |
|------|------|
| `backend/src/middleware/auth.ts` | Core auth middleware — JWE decrypt, Bearer verify, `resolveStaleUserId` |
| `backend/src/middleware/authorize.ts` | Role/permission authorization |
| `backend/src/middleware/org-context.ts` | Org resolution from token or OrgMember lookup |
| `backend/src/middleware/casbin-auth.ts` | Casbin RBAC for file/folder ops |
| `frontend/lib/auth/config.ts` | NextAuth config — `jwt` callback queries 3 collections |
| `frontend/middleware.ts` | Edge middleware — route protection, session decrypt |
| `backend/src/config/auth.ts` | JWT sign/verify helpers |
| `frontend/lib/auth/actions.ts` | Auth server actions (login, signup, logout) |
| `frontend/actions/tasks.ts` | Task actions — calls `auth()` via `requireOrgId()` |
| `frontend/actions/files.ts` | File actions — calls `auth()` via `requireOrgId()` |
| `frontend/actions/employees.ts` | Employee actions — calls `auth()` |
| `frontend/actions/projects.ts` | Project actions — calls `auth()` |
| `frontend/actions/notifications.ts` | Notification actions — calls `auth()` |
| `frontend/actions/admin.ts` | Admin actions — calls `auth()` |
| `frontend/actions/settings.ts` | Settings actions — calls `auth()` |
| `frontend/lib/actions/onboarding.ts` | Onboarding actions — calls `auth()` + `unstable_update()` |

**22 backend route files** all use `authenticate` middleware from `auth.ts`.

### Caching (30 files total)

| File | Role |
|------|------|
| `backend/src/lib/cache.ts` | NodeCache-based CacheManager (300s TTL, not used in hot paths) |
| `backend/src/lib/cache/index.ts` | Map-based CacheManager (30s TTL, used by files-advanced only) |
| `backend/src/routes/files-advanced.ts` | Only consumer of cache/index — uses `getOrSet`, `invalidatePattern` |
| `backend/src/lib/org-utils.ts` | Local Map cache for org membership (30s TTL) |
| `frontend/components/providers.tsx` | React Query provider (staleTime: 30s, gcTime: 5min) |
| `frontend/hooks/use-realtime-list.ts` | React Query `useQuery` + `queryClient.setQueryData` |
| `frontend/hooks/use-realtime-tasks.ts` | Real-time task hook via `useRealtimeList` |
| `frontend/hooks/use-realtime-projects.ts` | Real-time project hook |
| `frontend/hooks/use-realtime-teams.ts` | Real-time team hook |
| `frontend/hooks/use-realtime-clients.ts` | Real-time client hook |
| `frontend/actions/tasks.ts` | Uses `revalidateTag`, `revalidatePath` |
| `frontend/actions/files.ts` | Uses `revalidatePath` |
| `frontend/actions/admin.ts` | Uses `revalidatePath` |
| `frontend/actions/projects.ts` | Uses `revalidatePath` |
| `frontend/actions/employees.ts` | Uses `revalidatePath` |
| `frontend/actions/settings.ts` | Uses `revalidatePath` |
| `frontend/lib/auth/actions.ts` | Uses `revalidatePath` |
| `frontend/lib/auth/actions-mongo.ts` | Uses `revalidatePath` |
| `frontend/lib/actions/onboarding.ts` | Uses `revalidatePath` |
| `docker-compose.yml` | Redis service already configured |

### Dashboard (49 files total, 2 core files for changes)

| File | Role |
|------|------|
| `frontend/app/dashboard/page.tsx` | **Main dashboard** — 14 MongoDB queries, `force-dynamic` |
| `frontend/app/orgmenu/page.tsx` | **Org admin dashboard** — aggregation queries with `cache()` from react |
| `backend/src/routes/dashboard.ts` | Backend `/api/dashboard/metrics` — 6 countDocuments, no cache |
| `frontend/components/dashboard-actions.tsx` | Dashboard action components |
| `frontend/components/dashboard-orgs.tsx` | Dashboard orgs table |
| `frontend/components/dashboard-signups.tsx` | Dashboard signups table |
| `frontend/components/MonthlyRevenueChart.tsx` | Revenue chart (uses recharts) |
| `frontend/components/NewUsersChart.tsx` | Users chart (uses recharts) |
| `frontend/app/client/dashboard/page.tsx` | Client dashboard |
| `frontend/app/client/dashboard/dashboard-interactive.tsx` | Client dashboard interactive |

### Server / Proxy / Infra

| File | Role |
|------|------|
| `frontend/server.ts` | Custom Next.js server with `http-proxy-middleware` |
| `frontend/next.config.ts` | Next.js config — rewrites, compression, images |
| `backend/src/app.ts` | Express app — helmet, cors, compression, routes |
| `backend/src/index.ts` | Backend entry — creates server, connects services |
| `docker-compose.yml` | Redis, RabbitMQ, MongoDB, backend |
| `ecosystem.config.cjs` | PM2 process manager |
| `start.sh` | Dev startup script |
| `.github/workflows/ci.yml` | CI/CD pipeline |

### MongoDB (56 files total, 4 core files for changes)

| File | Role |
|------|------|
| `backend/src/lib/db/index.ts` | Mongoose connection (pool: 50 min, 10 min) |
| `frontend/lib/db/mongodb.ts` | Native MongoDB driver connection (no pooling) |
| `frontend/lib/db/schema.ts` | Collection name constants |
| `frontend/lib/db/counter.ts` | Auto-increment sequences |

**28 Mongoose models** in `backend/src/lib/db/models/`.

### Frontend Heavy Components

| File | Lines | Heavy Deps |
|------|-------|-----------|
| `components/ui/sidebar.tsx` | 751 | shadcn sidebar |
| `components/dropzone-upload.tsx` | 727 | TUS client |
| `components/file-explorer.tsx` | 861 | File ops |
| `components/ui/dialog.tsx` | 143 | radix |
| `components/ui/dropdown-menu.tsx` | 269 | radix |
| `components/ui/field.tsx` | 238 | radix |
| `components/ui/chart.tsx` | 354 | recharts |
| `components/chart-area-interactive.tsx` | 264 | recharts |
| `components/chart-bar-interactive.tsx` | 275 | recharts |
| `components/storage-chart.tsx` | 202 | recharts |
| `components/evilcharts/charts/radar-chart.tsx` | 590 | recharts |
| `employees/employees-mui-table.tsx` | MUI | @mui/material |

**144 files** use `"use client"` directive. **4 files** use `next/dynamic`. **0 files** use `React.lazy`.

---

## Phase 1: Dashboard Caching

**Estimated Improvement: 400-800ms per dashboard load | Risk: Medium**

### Files Modified (9)

| File | Change |
|------|--------|
| `frontend/app/dashboard/page.tsx` | Wrap 14 MongoDB queries in `unstable_cache()` with `tags: ['dashboard:${orgId}']`, `revalidate: 30` |
| `frontend/app/orgmenu/page.tsx` | Apply `unstable_cache()` to all metric fetchers |
| `frontend/actions/tasks.ts` | Add `revalidateTag('dashboard:${orgId}')` to create/update/delete/status-change |
| `frontend/actions/files.ts` | Add `revalidateTag('dashboard:${orgId}')` to delete/share/unshare |
| `frontend/actions/employees.ts` | Add `revalidateTag('dashboard:${orgId}')` to add-employee |
| `frontend/actions/projects.ts` | Add `revalidateTag('dashboard:${orgId}')` to create/update/delete |
| `frontend/actions/admin.ts` | Add `revalidateTag('dashboard:*')` for super-admin dashboard |
| `frontend/lib/auth/actions.ts` | Add `revalidateTag('dashboard:${orgId}')` on login/signup |
| `backend/src/routes/dashboard.ts` | Add `CacheManager.getOrSet()` for `/metrics` with 30s TTL |

### Dependencies
- Requires `ioredis` package (add to `backend/package.json`)
- Requires Redis running (already in `docker-compose.yml`)

### Implementation Steps
1. `npm install ioredis` in backend
2. Create `backend/src/lib/redis.ts` — singleton Redis client with retry
3. Modify `backend/src/lib/cache.ts` — add Redis fallback after NodeCache miss
4. Wrap dashboard queries in `unstable_cache()` with tags
5. Add `revalidateTag()` calls to all mutation server actions
6. Same pattern for `orgmenu/page.tsx`

### Rollback Strategy
- `git commit -m "Phase 1: dashboard caching"` before moving on
- Rollback: `git revert HEAD`
- Feature flag: `process.env.DASHBOARD_CACHE_ENABLED !== "1"`

### Testing Strategy
- Verify second dashboard request returns cached data
- Create a task → verify `revalidateTag` invalidates dashboard cache
- Verify cached data respects user org (no cross-org leakage)

### Expected Effects

| System | Effect |
|--------|--------|
| Auth | None |
| RBAC | None (cache is org-scoped) |
| MongoDB | Dashboard query count drops from 14 to ~2 (miss) or 0 (hit) |
| Redis | ~5-10KB per cached org dashboard entry |
| RabbitMQ | None |
| Next.js Routing | Adding `revalidateTag` adds ~5ms to server actions |
| Express Middleware | None |
| Cache | Dashboard backend route now uses CacheManager |

---

## Phase 2: Authentication Optimization

**Estimated Improvement: 150-400ms per authenticated request | Risk: High**

### Files Modified (5)

| File | Change |
|------|--------|
| `backend/src/middleware/auth.ts` | Add LRU cache for JWE decrypt results (60s TTL). Short-circuit `resolveStaleUserId` with local cache (5min TTL). Eliminates 1 DB query per request. |
| `frontend/lib/auth/config.ts` | Reduce `jwt` callback DB queries — cache user/org data in token, refresh from DB every 5 min |
| `frontend/middleware.ts` | Pre-compile route arrays, replace `startsWith` loops with `Set.has()` |
| `backend/src/middleware/org-context.ts` | Cache `resolveOrgContext` result by userId (60s TTL). Remove `console.log`. |
| `backend/src/lib/org-utils.ts` | Replace local Map cache with shared `CacheManager` from `cache.ts` |

### Implementation Steps
1. Add JWT decrypt cache: `Map` keyed by cookie prefix hash, skip HKDF+JWE on hit (60s TTL)
2. Add `resolveStaleUserId` cache: skip `OrgMember.findOne()` entirely on hit (5min TTL)
3. In `frontend/lib/auth/config.ts` `jwt` callback: add `lastVerified` timestamp to token, only query DB every 5min
4. Pre-compile route arrays in middleware for O(1) lookups
5. Cache org context resolution in `org-context.ts`

### Rollback Strategy
- Git commit per sub-step
- Each cache has a `process.env.AUTH_CACHE_ENABLED` flag
- Worst case: restore `authenticate` to pre-cache version

### Testing Strategy
- Verify JWT cache hit returns correct user (5 requests, only 1st does decrypt)
- Security: expired tokens still return 401 from cache
- Security: User A token never returned for User B
- Load test: 100 concurrent requests, measure auth latency distribution

### Expected Effects

| System | Effect |
|--------|--------|
| Auth | JWT decrypt reduced from ~30-50ms to ~0.1ms on hit. 1 DB query eliminated per request |
| RBAC | None |
| MongoDB | `OrgMember.findOne()` drops from every request to every 5 minutes per user |
| Redis | None (in-memory caches) |
| RabbitMQ | None |
| Next.js Routing | Middleware ~5ms → ~1ms |
| Express Middleware | Auth middleware ~15ms → ~1ms on cache hit |
| Cache | None |

---

## Phase 3: Remove force-dynamic

**Estimated Improvement: 0-200ms per page load (enables full route cache) | Risk: Medium**

### Files Modified (2)

| File | Change |
|------|--------|
| `frontend/app/dashboard/page.tsx` | Remove `export const dynamic = "force-dynamic"` |
| `frontend/app/orgmenu/page.tsx` | Remove `export const dynamic = "force-dynamic"` |

### Dependencies
- Must complete Phase 1 first (unstable_cache provides freshness)

### Implementation Steps
1. Delete `force-dynamic` lines from both files
2. Add `export const revalidate = 30` as explicit fallback

### Rollback Strategy
- `git revert` restores `force-dynamic`

### Testing Strategy
- Page still renders fresh data within 30s of mutation
- Test stale-while-revalidate behavior
- Verify no stale cross-user data leaks

### Expected Effects

| System | Effect |
|--------|--------|
| Auth | None |
| RBAC | None |
| MongoDB | SSR queries only on first request in 30s window |
| Redis | None directly |
| RabbitMQ | None |
| Next.js Routing | Full route cache now enabled |
| Express Middleware | None |
| Cache | None |

---

## Phase 4: Redis Cache Consolidation

**Estimated Improvement: 50-150ms per request | Risk: Medium**

### Files Modified (8)

| File | Change |
|------|--------|
| `backend/src/lib/cache.ts` | Replace NodeCache with Redis as primary, NodeCache as L1 fallback |
| `backend/src/lib/cache/index.ts` | **Delete** — redirect consumers to consolidated cache |
| `backend/src/routes/files-advanced.ts` | Update import path to consolidated cache |
| `backend/src/lib/org-utils.ts` | Remove local Map cache, use shared CacheManager |
| `backend/src/middleware/rate-limit.ts` | Swap in-memory store for `rate-limit-redis` |
| `backend/src/lib/socketio/index.ts` | Replace in-memory handshake rate limiter with Redis |
| `backend/package.json` | Add `ioredis`, `rate-limit-redis`, `socket.io-redis` |
| `docker-compose.yml` | Already configured — no change |

### Implementation Steps
1. Install Redis packages
2. Create `backend/src/lib/redis.ts` singleton
3. Refactor `CacheManager` to use L1 (NodeCache) + L2 (Redis) hierarchy
4. Delete redundant `cache/index.ts`
5. Update all consumers
6. Swap rate-limit and socket.io rate limiter to Redis

### Rollback Strategy
- Feature flag: `REDIS_ENABLED=false` reverts to NodeCache-only

### Testing Strategy
- Test L1/L2 hierarchy (L1 hit, L2 hit, both miss)
- Verify Redis cache survives backend restart
- Verify rate limiting works across simulated multi-instance

### Expected Effects

| System | Effect |
|--------|--------|
| Auth | Rate-limit shared across instances |
| RBAC | None |
| MongoDB | Reduced query load |
| Redis | Moderate memory usage |
| RabbitMQ | None |
| Next.js Routing | None |
| Express Middleware | Rate-limit now Redis-backed |
| Cache | NodeCache becomes L1, Redis L2 |

---

## Phase 5: Proxy Architecture Simplification

**Estimated Improvement: 30-80ms per API call | Risk: Medium**

### Files Modified (3)

| File | Change |
|------|--------|
| `frontend/server.ts` | Remove `http-proxy-middleware`, replace with thin passthrough or remove entirely |
| `frontend/next.config.ts` | Ensure rewrites cover all proxy paths |
| `frontend/package.json` | Remove `http-proxy-middleware` and `@types/http-proxy-middleware` |

### Implementation Steps
1. Audit which API calls hit the custom proxy vs Next.js rewrites
2. If Next.js rewrites fully cover all paths: remove `server.ts` proxy entirely
3. If some paths need special handling: replace with thin `http.request` wrapper
4. Remove unused dependencies

### Rollback Strategy
- Keep `server.ts` backup as `server.ts.bak`

### Testing Strategy
- E2E test: every API endpoint works without custom proxy
- Verify WebSocket connections still work
- Verify TUS file uploads still work
- Load test: verify throughput is equal or better

### Expected Effects

| System | Effect |
|--------|--------|
| Auth | None |
| RBAC | None |
| MongoDB | None |
| Redis | None |
| RabbitMQ | None |
| Next.js Routing | Rewrites now handle all proxying — simpler, faster |
| Express Middleware | None |
| Cache | None |

---

## Phase 6: Brotli Compression

**Estimated Improvement: 50-100ms per response | Risk: Low**

### Files Modified (2)

| File | Change |
|------|--------|
| `backend/src/app.ts` | Replace `compression()` with brotli-capable compression |
| `backend/package.json` | Add `shrink-ray-current` |

### Implementation Steps
1. Install `shrink-ray-current` (supports brotli + gzip + deflate)
2. Replace `app.use(compression())` with `app.use(shrinkRay())`
3. Verify `Content-Encoding: br` in response headers

### Rollback Strategy
- Comment out brotli, uncomment `compression()`

### Testing Strategy
- Response header check: `curl -H "Accept-Encoding: br" -I` returns `Content-Encoding: br`
- Compare payload sizes: brotli vs gzip (~20% smaller)
- Verify no CPU regression under load (brotli level 4)

### Expected Effects

| System | Effect |
|--------|--------|
| All | ~20% smaller response payloads |

---

## Phase 7: Code Splitting and Lazy Loading

**Estimated Improvement: 200-300ms initial load, ~150KB bundle reduction | Risk: Medium**

### Files Modified (17)

| File | Change |
|------|--------|
| `frontend/components/chart-area-interactive.tsx` | Dynamic import recharts components |
| `frontend/components/chart-bar-interactive.tsx` | Dynamic import recharts components |
| `frontend/components/MonthlyRevenueChart.tsx` | Dynamic import entire component |
| `frontend/components/NewUsersChart.tsx` | Dynamic import entire component |
| `frontend/components/storage-chart.tsx` | Dynamic import recharts components |
| `frontend/components/ui/chart.tsx` | Dynamic import recharts parts |
| `frontend/components/evilcharts/charts/radar-chart.tsx` | Dynamic import with `ssr: false` |
| `frontend/components/evilcharts/ui/chart.tsx` | Dynamic import recharts |
| `frontend/components/evilcharts/ui/legend.tsx` | Dynamic import |
| `frontend/components/evilcharts/ui/tooltip.tsx` | Dynamic import |
| `frontend/components/evilcharts/ui/background.tsx` | Dynamic import |
| `frontend/app/employees/employees-mui-table.tsx` | Dynamic import with `ssr: false` |
| `frontend/app/orgmenu/page.tsx` | Dynamic import chart components |
| `frontend/components/app-sidebar.tsx` | Lazy-load lucide-react icons |
| `frontend/components/session-tracker.tsx` | Dynamic import socket.io-client |
| `frontend/hooks/use-session-tracker.ts` | Dynamic import socket.io-client |
| `frontend/lib/socketio-client.ts` | Dynamic import socket.io |

### Implementation Steps
1. Replace all `import { X } from "recharts"` with `next/dynamic` wrappers
2. Dynamic import MUI table component
3. Dynamic import charts in orgmenu page
4. Dynamic import socket.io-client in session tracker and hooks
5. After each change: `npm run build` and verify

### Rollback Strategy
- Per-component: each `dynamic()` import is independently reversible

### Testing Strategy
- Build analysis: verify bundle size reduction
- Visual: verify all chart components render correctly
- SSR: no hydration errors from dynamically loaded components

### Expected Effects

| System | Effect |
|--------|--------|
| Next.js Routing | Initial JS bundle reduced by ~150-200KB |
| All others | None |

---

## Phase 8: CDN Integration

**Estimated Improvement: 100-200ms asset load | Risk: Low**

### Files Modified (4)

| File | Change |
|------|--------|
| `frontend/next.config.ts` | Add `assetPrefix` for CDN. Update CSP for CDN origin. |
| `frontend/middleware.ts` | Add cache headers for static assets |
| `frontend/app/layout.tsx` | Update `metadataBase` to CDN URL |

### Implementation Steps
1. Configure Cloudflare DNS proxying
2. Create page rules: static → cache 1 year, API → bypass
3. Add `assetPrefix: process.env.CDN_URL` to next.config
4. Set `Cache-Control: public, max-age=31536000, immutable` for `/_next/static/*`
5. Configure R2 public URL as CDN origin for uploads

### Rollback Strategy
- Remove `assetPrefix` from config

### Testing Strategy
- Verify static assets served from CDN
- Verify API responses bypass CDN
- Lighthouse: compare asset load times

### Expected Effects

| System | Effect |
|--------|--------|
| Next.js Routing | Static chunks served from edge |
| All others | None |

---

## Phase 9: Bundle Optimization

**Estimated Improvement: 100-200KB bundle reduction | Risk: Low**

### Files Modified (3)

| File | Change |
|------|--------|
| `frontend/next.config.ts` | Add `modularizeImports` for lucide-react, @mui/material, @mui/icons-material |
| `frontend/package.json` | Add `@next/bundle-analyzer` |
| `frontend/eslint.config.mjs` | Add import restriction rules |

### Implementation Steps
1. Run `ANALYZE=true next build` for baseline
2. Add `modularizeImports` config for icon libraries
3. Verify tree-shaking works

### Rollback Strategy
- Remove `modularizeImports` config

### Testing Strategy
- Build analysis: compare before/after sizes
- Visual: verify all icons render

### Expected Effects

| System | Effect |
|--------|--------|
| Next.js Routing | Faster JS parsing/execution |
| All others | None |

---

## Phase 10: MongoDB Connection Optimization

**Estimated Improvement: 50-150ms per server component render | Risk: Medium**

### Files Modified (4)

| File | Change |
|------|--------|
| `frontend/lib/db/mongodb.ts` | Add connection pooling config (`maxPoolSize: 10`) |
| `frontend/app/dashboard/page.tsx` | Replace direct MongoDB queries with backend API calls |
| `frontend/app/orgmenu/page.tsx` | Replace direct MongoDB queries with backend API calls |
| `frontend/lib/auth/config.ts` | Eliminate direct MongoDB queries in `jwt` callback |

### Implementation Steps
1. Optimize frontend MongoClient with pooling
2. Migrate dashboard from direct DB to backend API
3. Same for orgmenu
4. Update auth config to use cached/stored token data

### Rollback Strategy
- Feature flag: `DIRECT_MONGO=true` restores direct DB access

### Testing Strategy
- Compare dashboard response time direct DB vs API
- Verify login/oauth flow still works
- Monitor MongoDB connection count (should drop ~50%)

### Expected Effects

| System | Effect |
|--------|--------|
| Auth | Auth callbacks no longer query MongoDB directly |
| RBAC | All RBAC centralized at backend (Casbin) |
| MongoDB | ~50% reduction in connection pool size |
| Redis | None |
| RabbitMQ | None |
| Next.js Routing | Server components depend on backend API |
| Express Middleware | Backend routes see increased traffic |
| Cache | Backend cache has full visibility into all queries |

---

## Implementation Checklist

### Pre-Phase: Baseline

- [ ] `npm test` (backend) — all pass
- [ ] `npm run build` (frontend) — clean build
- [ ] Measure TTFB: 10 requests to dashboard, avg
- [ ] Measure API response time: 10 requests to `/api/dashboard/metrics`
- [ ] Lighthouse Performance score for dashboard
- [ ] Bundle size: `ANALYZE=true next build`
- [ ] MongoDB connection count
- [ ] Auth latency
- [ ] Record commit hash: `git log --oneline -1`

### Phase 1: Dashboard Caching

- [ ] Install `ioredis` in backend
- [ ] Create `backend/src/lib/redis.ts`
- [ ] Modify `backend/src/lib/cache.ts` for Redis L2
- [ ] Modify `frontend/app/dashboard/page.tsx` — wrap queries in `unstable_cache`
- [ ] Add `revalidateTag` to task create/update/delete
- [ ] Add `revalidateTag` to file actions
- [ ] Add `revalidateTag` to employee actions
- [ ] Add `revalidateTag` to project actions
- [ ] Add `revalidateTag` to admin actions
- [ ] Add `revalidateTag` to auth actions
- [ ] Modify `frontend/app/orgmenu/page.tsx` — wrap queries
- [ ] `npm test` (backend)
- [ ] `npm run build` (frontend)
- [ ] Benchmark: Dashboard TTFB
- [ ] Verify cache invalidation
- [ ] Verify cache isolation (no cross-org leakage)
- [ ] Commit

### Phase 2: Authentication Optimization

- [ ] Add JWE decrypt cache in `auth.ts` (60s TTL)
- [ ] Add `resolveStaleUserId` cache (5min TTL)
- [ ] Remove `console.log` from `org-context.ts`
- [ ] Add org context cache (60s TTL)
- [ ] Optimize `frontend/lib/auth/config.ts` — reduce `jwt` callback DB queries
- [ ] Pre-compile route arrays in `frontend/middleware.ts`
- [ ] Update `backend/src/lib/org-utils.ts` to use shared cache
- [ ] `npm test` (backend)
- [ ] `npm run build` (frontend)
- [ ] Benchmark: Auth latency
- [ ] Security test: expired tokens still return 401 from cache
- [ ] Security test: no cross-user cache leakage
- [ ] Commit

### Phase 3: Remove force-dynamic

- [ ] Remove `force-dynamic` from `dashboard/page.tsx`
- [ ] Remove `force-dynamic` from `orgmenu/page.tsx`
- [ ] Add `export const revalidate = 30`
- [ ] `npm run build` (frontend)
- [ ] Verify fresh data after 30s
- [ ] Verify stale-while-revalidate
- [ ] Commit

### Phase 4: Redis Cache Consolidation

- [ ] Create `backend/src/lib/redis.ts`
- [ ] Modify `backend/src/lib/cache.ts` — add Redis L2
- [ ] Delete `backend/src/lib/cache/index.ts`
- [ ] Update `files-advanced.ts` import
- [ ] Update `org-utils.ts` to use shared cache
- [ ] Update `rate-limit.ts` — add `rate-limit-redis`
- [ ] Update Socket.IO rate limiter
- [ ] Add dependencies to `backend/package.json`
- [ ] `npm test` (backend)
- [ ] Verify Redis survives restart
- [ ] Verify rate limiting across simulated multi-instance
- [ ] Commit

### Phase 5: Proxy Architecture Simplification

- [ ] Audit all API routes through custom proxy
- [ ] Remove `http-proxy-middleware` from `server.ts`
- [ ] Update `next.config.ts` rewrites
- [ ] Remove `http-proxy-middleware` from `package.json`
- [ ] `npm run build` (frontend)
- [ ] E2E: all API endpoints work
- [ ] E2E: WebSocket works
- [ ] E2E: TUS uploads work
- [ ] Commit

### Phase 6: Brotli Compression

- [ ] Install `shrink-ray-current`
- [ ] Replace `compression()` in `app.ts`
- [ ] Verify `Content-Encoding: br`
- [ ] Compare payload sizes
- [ ] Load test: no CPU regression
- [ ] `npm test` (backend)
- [ ] Commit

### Phase 7: Code Splitting

- [ ] Dynamic import recharts in chart-area-interactive
- [ ] Dynamic import recharts in chart-bar-interactive
- [ ] Dynamic import MonthlyRevenueChart
- [ ] Dynamic import NewUsersChart
- [ ] Dynamic import storage-chart
- [ ] Dynamic import ui/chart
- [ ] Dynamic import evilcharts components
- [ ] Dynamic import MUI table
- [ ] Dynamic import charts in orgmenu
- [ ] Dynamic import socket.io-client in session-tracker
- [ ] `npm run build` (frontend)
- [ ] Bundle analyzer: verify size reduction
- [ ] Visual: all charts render correctly
- [ ] Hydration: no errors
- [ ] Commit

### Phase 8: CDN Integration

- [ ] Configure Cloudflare DNS proxying
- [ ] Create Cloudflare page rules
- [ ] Add `assetPrefix` to `next.config.ts`
- [ ] Add cache headers in middleware
- [ ] Configure R2 public URL
- [ ] Update CSP for CDN origin
- [ ] Build and deploy
- [ ] Verify static assets from CDN
- [ ] Verify API bypasses CDN
- [ ] Lighthouse: compare
- [ ] Commit

### Phase 9: Bundle Optimization

- [ ] Baseline bundle analysis
- [ ] Add `modularizeImports` for lucide-react
- [ ] Add `modularizeImports` for MUI
- [ ] Install `@next/bundle-analyzer`
- [ ] Run analysis: compare
- [ ] Visual: all icons render
- [ ] `npm run build` (frontend)
- [ ] Lighthouse: compare
- [ ] Commit

### Phase 10: MongoDB Connection Optimization

- [ ] Add pooling config to `frontend/lib/db/mongodb.ts`
- [ ] Migrate dashboard from direct DB to API
- [ ] Migrate orgmenu from direct DB to API
- [ ] Update auth config to eliminate direct DB queries
- [ ] Remove `mongodb` import from server component pages
- [ ] `npm run build` (frontend)
- [ ] `npm test` (backend)
- [ ] E2E: dashboard loads
- [ ] E2E: orgmenu loads
- [ ] E2E: login works
- [ ] Monitor MongoDB connection count
- [ ] Benchmark dashboard TTFB
- [ ] If regression: increase backend cache TTL
- [ ] Commit

### Post-Phase: Final Benchmark

- [ ] `npm test` (backend)
- [ ] `npm run build` (frontend)
- [ ] Measure final TTFB (10 requests, avg)
- [ ] Measure final API response time
- [ ] Measure final auth latency
- [ ] Measure final MongoDB query count per dashboard load
- [ ] Measure final bundle size
- [ ] Lighthouse Performance score
- [ ] Core Web Vitals (LCP, FCP, CLS, INP)
- [ ] Memory usage
- [ ] CPU utilization under load
- [ ] Generate final benchmark report
- [ ] `git push origin main`

---

## Risk Scorecard

| Phase | Risk | Complexity | Rollback Difficulty | Testing Effort |
|-------|------|-----------|-------------------|----------------|
| 1. Dashboard Cache | Medium | High | Low | High |
| 2. Auth Optimization | High | Medium | Low | Very High |
| 3. Remove force-dynamic | Medium | Low | Low | Medium |
| 4. Redis Consolidation | Medium | High | Medium | High |
| 5. Proxy Simplify | Medium | Medium | Medium | Very High |
| 6. Brotli Compression | Low | Low | Low | Low |
| 7. Code Splitting | Medium | High | Medium | High |
| 8. CDN Integration | Low | Low | Low | Medium |
| 9. Bundle Optimization | Low | Low | Low | Low |
| 10. MongoDB Connection | Medium | High | High | Very High |

---

## Critical Safety Rules

1. **No two high-risk optimizations in a single commit.** Phase 2 (auth) and Phase 5 (proxy) are both high-risk — they must not be combined.
2. **Test auth after every phase.** Auth is the most critical path. Every phase must include: login, protected route access, RBAC enforcement.
3. **Backend tests must pass before committing.** Run `npm test` in backend before every commit.
4. **Frontend must build before committing.** Run `npm run build` before every commit.
5. **Each phase gets its own benchmark.** Do not skip the benchmark report step at any phase.
6. **Benchmark baseline is permanent.** Save the pre-optimization benchmark results to a file so they can be referenced after all 10 phases.
7. **If a phase causes regression, revert immediately.** Do not "fix forward" on a phase — revert, analyze, re-apply.
8. **Do not start Phase N until Phase N-1 is committed and benchmarked.** No parallel work across phases.
