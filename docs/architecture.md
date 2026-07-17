# MyWorkSpace Architecture

## System Overview

MyWorkSpace is a multi-tenant SaaS platform built with:
- **Frontend:** Next.js 16 (React 19) with App Router
- **Backend:** Express.js 5 with TypeScript
- **Database:** MongoDB Atlas (Mongoose ODM)
- **Cache:** Redis (ioredis)
- **Queue:** RabbitMQ (amqplib)
- **Real-time:** Socket.IO
- **Auth:** NextAuth.js v5 (JWT strategy)
- **Storage:** Local filesystem
- **Email:** Resend
- **Payments:** Stripe
- **Monitoring:** Prometheus + Grafana
- **Error Tracking:** Sentry

## Architecture Diagram

```
                    ┌─────────────────────────────────────────┐
                    │              Internet                    │
                    └─────────────────┬───────────────────────┘
                                      │
                    ┌─────────────────▼───────────────────────┐
                    │         Caddy (Reverse Proxy)           │
                    │         TLS Termination                 │
                    │         Rate Limiting                   │
                    └─────────────────┬───────────────────────┘
                                      │
              ┌───────────────────────┼───────────────────────┐
              │                       │                       │
    ┌─────────▼─────────┐   ┌────────▼────────┐   ┌─────────▼─────────┐
    │   Next.js Frontend │   │  Express Backend │   │   Socket.IO       │
    │   (Port 3000)      │   │  (Port 4000)    │   │   (Port 4000)    │
    │   Server-Side R    │   │  REST API        │   │   WebSocket      │
    │   Client-Side R    │   │  Auth Middleware  │   │   Real-time      │
    └─────────┬─────────┘   └────────┬────────┘   └─────────┬─────────┘
              │                       │                       │
              │                       │                       │
    ┌─────────▼───────────────────────▼───────────────────────▼─────────┐
    │                      Data Layer                                   │
    ├─────────────────┬─────────────────┬─────────────────┬─────────────┤
    │   MongoDB       │   Redis         │   RabbitMQ      │   Local FS  │
    │   (Atlas)       │   (Cache)       │   (Queue)       │   (Storage) │
    └─────────────────┴─────────────────┴─────────────────┴─────────────┘
```

## Request Flow

1. **Client Request** → Caddy (TLS termination, rate limiting)
2. **Next.js** → Server-side rendering, auth check, proxy to backend
3. **Express** → Middleware chain (auth, RBAC, validation, sanitization)
4. **Response** → Cached via Redis (L1) + NodeCache (L2) when possible
5. **Socket.IO** → Real-time events pushed to connected clients

## Authentication Flow

1. User submits credentials → Next.js server action
2. NextAuth validates → JWT created with user claims
3. JWE encrypted cookie set → HttpOnly, Secure, SameSite=Strict
4. Backend middleware decrypts JWE → Caches for 60s
5. Org membership verified → Cached for 120s

## Data Isolation

- Every query filtered by `orgId`
- File access verified via `verifyOrgAccess()`
- Share links scoped to org
- Audit logs per org
- Storage quotas per org

## Scalability

- **Horizontal:** 3-10 backend pods, 3-8 frontend pods
- **Database:** MongoDB Atlas auto-scaling
- **Cache:** Redis Cluster ready
- **Queue:** RabbitMQ mirrored queues
- **Storage:** Local filesystem

## Security

- OWASP Top 10 compliance
- CSRF protection (token validation)
- XSS prevention (input sanitization, output encoding)
- IDOR prevention (org membership checks)
- Rate limiting (per IP, per endpoint)
- File upload validation (MIME types, size limits)
- Secrets in K8s Secrets (never in code)
- Network policies (pod-to-pod isolation)
