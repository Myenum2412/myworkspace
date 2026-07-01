# Performance Baseline — Pre-Optimization

**Date**: $(date -u +"%Y-%m-%dT%H:%M:%SZ")
**Commit**: 948759f3b477a7a9e16c8c2814ade0fcbcbab195
**Branch**: main

## Build Metrics
- Total JS bundle size: 16.19 MB (uncompressed)
- Static chunks: 3.9 MB
- Total static assets: 4.3 MB

## Backend Test Status
- 19 validation unit tests: PASS
- 40 casbin-rbac integration tests: PASS
- 1 health test: PASS (cleanup issue pre-existing)
- Auth tests: FAIL (pre-existing — MongoDB Memory Server does not support transactions)
- Client-files: FAIL (pre-existing)

## Frontend Build
- Build: SUCCESS
- Routes: ~60 pages, all compiled

## Key Files at Baseline
- `backend/src/lib/cache.ts` — NodeCache-based (no Redis backend, not used in hot paths)
- `backend/src/lib/cache/index.ts` — Map-based (30s TTL, used only by files-advanced)
- `frontend/app/dashboard/page.tsx` — force-dynamic, 14 MongoDB queries
- `frontend/app/orgmenu/page.tsx` — force-dynamic, ~15 MongoDB queries
- `backend/src/middleware/auth.ts` — No JWT caching, resolveStaleUserId on every request
- `frontend/server.ts` — http-proxy-middleware active
- `backend/src/app.ts` — gzip compression only
