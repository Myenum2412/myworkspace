# MyWorkSpace — Platform Page

**Page Title:** Platform — Architecture, Security & Performance

**Meta Description:** MyWorkSpace is built on a modern, scalable architecture with enterprise-grade security, 7-tier caching, and offline support. Self-hosted. Real-time. Built for performance.

**H1 Headline:** Enterprise Architecture. Self-Hosted Control.

**Subheadline:** Built on Next.js 16, Express 5, MongoDB 7, Redis, and RabbitMQ — deployed on your infrastructure with your security policies and your data sovereignty. No third-party dependencies. No vendor lock-in.

**Intro:**
MyWorkSpace isn't another cloud platform where you rent access to your own data. It's a self-hosted, enterprise-grade platform that runs on your infrastructure, under your control. From architecture to deployment to security — every decision was made with one question in mind: does this serve our customers' need for reliability, security, and control?

---

### Architecture Overview

**Multi-Layer Design:**

MyWorkSpace is architected in four distinct layers, each independently scalable — meaning you can scale your database without touching your frontend, or scale your caching layer without touching your API.

```
+---------------------------------------------------------------+
|                    FRONTEND (Next.js 16)                       |
|       Landing Page - Dashboard - Staff Panel - Admin          |
|       Client Portal - Org Menu - Settings - Billing           |
+---------------------------------------------------------------+
|              API PROXY (Next.js API Routes)                    |
+---------------------------------------------------------------+
|                BACKEND (Express 5 / TypeScript)                |
|   Auth - RBAC - Tasks - Projects - Files - Time - Billing     |
|   Search - Notifications - Sessions - Organizations            |
+------------------+----------------+---------------------------+
|    MongoDB 7     |  Redis/Valkey  |  RabbitMQ + Agenda.js     |
|    (Primary)     |  (Cache/IO)    |  (Async Jobs/Scheduling)   |
+------------------+----------------+---------------------------+
```

**Why This Architecture Matters to You:**

**Frontend Layer:** Next.js 16 with App Router and React 19 delivers a responsive, server-rendered experience. Pages load fast. Navigation is fluid. The interface works on desktop, tablet, and mobile — no separate app required. shadcn/ui, Radix UI, and Tailwind CSS 4 provide a polished, accessible interface that your team will actually enjoy using.

**API Proxy Layer:** Next.js API routes handle request routing, authentication verification, and load balancing. This means your backend isn't exposed directly to the internet — an additional security layer by default.

**Backend Layer:** Express 5 with TypeScript provides a modular, type-safe API. Each domain (auth, tasks, projects, files, time, billing, etc.) is independently routed and tested. If one module has an issue, it doesn't take down the others. 137+ automated tests ensure reliability.

**Data Layer:** MongoDB 7 serves as the primary database with support for sharding and replica sets. Redis 7 / Valkey handles sub-millisecond caching and real-time pub/sub. RabbitMQ manages async job processing — file uploads, email sending, and scheduled tasks run in the background without blocking API requests.

**Layer Independence:** Each layer can be scaled independently. Growing your user base? Scale the frontend. Growing your data volume? Scale MongoDB. Growing traffic? Scale the caching layer. You pay only for what you need.

---

### Deployment

**Self-Hosted, Your Way:**

MyWorkSpace is designed to run on your infrastructure — not ours. You choose where it runs, how it's deployed, and who has access. No third-party dependencies. No vendor lock-in. Your data stays on servers you control.

**Deployment Options:**

- **Docker Compose (Recommended)** — One-command deployment with all dependencies containerized. Run `docker compose up` and your entire platform — frontend, backend, database, cache, queue — is running. Complete setup in under 15 minutes.
- **PM2** — Traditional Node.js process manager deployment for Ubuntu EC2. Full control over each process. Automatic restart on failure. Built-in load balancing.
- **Kubernetes** — Manifests provided for container orchestration environments. Scale horizontally across clusters. Ideal for enterprise deployments.

**System Requirements:**
- Linux server (Ubuntu 22.04+ recommended)
- Node.js 20+
- MongoDB 7+
- Redis 7 / Valkey
- RabbitMQ (optional, for async jobs)
- Minimum 2 GB RAM (4 GB+ recommended for production)

**Included in Every Deployment:**
- **Caddy reverse proxy** — Automatic HTTPS via Let's Encrypt. No manual certificate management.
- **Nginx configuration** — Edge caching and optimized static asset delivery
- **Environment configuration templates** — Database URLs, API keys, email settings — all in one config file
- **Health check endpoints** — Monitor platform status at `/health` and `/ready`
- **Backup scripts** — MongoDB dump and file storage backup templates
- **Logging pipeline** — pino-based structured logging with configurable log levels

**Supported Infrastructure:**
- AWS EC2 · DigitalOcean · Linode · Azure · Google Cloud · On-premise servers · Any Linux server

**Deployment Philosophy:**
We believe in data sovereignty. Your business data — employee records, client files, project plans, financial information — is too sensitive to trust to a third-party cloud provider. Self-hosting isn't just about cost savings. It's about control. MyWorkSpace gives you that control without requiring a dedicated DevOps team.

---

### Performance

**Built for Speed at Any Scale:**

MyWorkSpace was engineered for performance from day one. The 7-tier caching pipeline ensures that frequently accessed data is delivered in milliseconds — not seconds. Whether you have 10 users or 10,000, the experience stays fast.

**The 7-Tier Caching Pipeline:**

| Tier | Technology | Purpose | Response Time |
|---|---|---|---|
| L1 | NodeCache | In-memory cache for frequent queries | Sub-millisecond |
| L2 | Valkey Standalone | Single-node Redis-compatible cache | <1ms |
| L3 | Valkey Cluster | Distributed cache for horizontal scale | 1-2ms |
| L4 | Varnish Cache | HTTP-level reverse proxy caching | 2-5ms |
| L5 | Nginx | Edge caching and static asset delivery | 5-10ms |
| L6 | Apache Traffic Server | CDN/origin cache for distributed teams | 10-20ms |
| L7 | Linux FS-Cache | Filesystem-level caching for static resources | <1ms (local) |

**Why 7 Tiers?**
Because each tier serves a different purpose. L1 catches the most frequent queries (user profiles, project lists). L2 and L3 handle distributed caching across multiple server instances. L4–L6 cache at the HTTP level for fast page loads. L7 caches static files at the filesystem level. The result: your data is always served from the fastest possible source.

**Performance Benchmarks:**
| Capability | Detail |
|---|---|
| Max File Upload | 10 GB per file (TUS resumable protocol) |
| Real-Time Connections | Horizontally scalable via Redis adapter |
| API Response Time (cached) | Sub-100ms |
| API Response Time (uncached) | Sub-300ms |
| Static Asset Delivery | Nginx + optional CDN acceleration |
| Session Handling | Stateless JWT with Valkey-backed stores |
| Concurrent Users | 500+ on recommended hardware |

**Real-World Performance:**
On a standard 4-core, 8 GB RAM server, MyWorkSpace handles 500+ concurrent users with API responses under 100ms for cached endpoints. The 7-tier caching pipeline means that as your traffic grows, you add cache capacity — not application servers.

---

### Security

**Defense in Depth:**

MyWorkSpace was designed with security as a core requirement — not an afterthought. Every layer of the platform, from authentication to data storage, implements industry-standard protections. We've built what we'd want for our own data.

**Authentication Security:**
- **bcryptjs** — Salted, hashed password storage. Industry standard. No plaintext. Ever.
- **JWE encryption (A256CBC-HS512)** — Session tokens are encrypted, not just signed. Even if a token is intercepted, it cannot be read.
- **TOTP-based 2FA** — Time-based one-time passwords via OTPAuth library. Works with Google Authenticator, Authy, 1Password, and any TOTP app.
- **Account lockout** — Automatic 15-minute lockout after 5 consecutive failed login attempts. Brute force protection built in.
- **OAuth providers** — Google, GitHub, and LinkedIn for frictionless social login. Optional — not required.

**API Security:**
- **CSRF protection** — Custom anti-CSRF token middleware prevents cross-site request forgery attacks
- **Tiered rate limiting** — Different limits for different endpoints: auth (10/min), upload (30/min), search (30/min), API (100/min), share download (20/min). Prevents abuse without blocking legitimate use.
- **Input sanitization** — Automatic sanitization of all incoming request data. Injection attacks are blocked at the door.
- **Zod validation** — Every API payload is validated against a Zod schema before processing. Malformed requests are rejected immediately.
- **Request correlation IDs** — Every request tagged with a unique ID. Full request tracing for debugging and auditing.

**Access Control:**
- **Casbin RBAC** — 9 hierarchical roles: Super Admin, Admin, Org Admin, Project Manager, Team Lead, Employee, Client, Viewer, Staff
- **Granular file permissions** — view, upload, download, edit, delete, share, restore, archive — per file, per user role
- **Folder-level permissions** — view, create, edit, delete per folder
- **Organization-level permissions** — manage users, workspaces, companies, billing, roles, settings, subscriptions, logs

**Data Protection:**
- **Self-hosted** — Full data sovereignty. No third-party data processing. Your data on your infrastructure.
- **ClamAV virus scanning** — Every file upload is scanned for malware. Infected files are quarantined automatically.
- **Secure external sharing** — Password-protected share links with expiration dates and download limits. Granular control over external access.
- **Comprehensive audit trail** — Every action, by every user, at every timestamp — logged and exportable.
- **Recycle bin** — Soft-delete with restore. Accidental permanent deletion is not possible without explicit confirmation.

**Infrastructure Security:**
- **Caddy reverse proxy** — Automatic HTTPS via Let's Encrypt. TLS is not optional — it's automatic.
- **HTTP to HTTPS redirect** — All HTTP traffic is automatically redirected to HTTPS.
- **Configurable security headers** — CORS, CSP, HSTS, and more via Caddyfile configuration.
- **HTTPS enforcement** — All communications encrypted in transit.

**Compliance Foundation:**
MyWorkSpace provides the technical foundation that helps organizations achieve compliance with:
- **SOC 2** — Access controls, audit logging, change management, security monitoring
- **ISO 27001** — Information security management, access control, asset management
- **GDPR** — Data sovereignty, data export, account deletion, audit trails
- **Internal compliance** — Custom policies enforced through RBAC and audit logging

---

### Integrations

**Connect Your Ecosystem:**

MyWorkSpace integrates with the tools you already use. The App Store hub makes discovering and managing integrations simple.

| Integration | Purpose | Status |
|---|---|---|
| Google OAuth | Social login & authentication | ✅ Active |
| GitHub OAuth | Social login & authentication | ✅ Active |
| LinkedIn OAuth | Social login & authentication | ✅ Active |
| Stripe | Payment processing, subscriptions, invoices | ✅ Active |
| Resend | Transactional email delivery | ✅ Active |
| SMTP (Nodemailer) | Email fallback delivery | ✅ Active |
| ClamAV | File virus scanning | ✅ Active |
| Sentry | Real-time error monitoring | ✅ Active |
| OpenTelemetry + Prometheus | Metrics & observability | ✅ Active |
| Grafana | Metrics visualization & dashboards | ✅ Active |
| Redis / Valkey | Caching & real-time pub/sub | ✅ Active |
| RabbitMQ | Async message queue | ✅ Active |
| Vercel Analytics | Web analytics | ✅ Active |
| SAML / SSO | Single sign-on configuration | ✅ Available |

**REST API:**
Every module is accessible via a comprehensive REST API under `/api/`. Build custom integrations, connect your existing tools, or extend the platform. The API is documented and versioned.

**Webhooks:**
Stripe webhooks are implemented for subscription lifecycle events. Custom webhook endpoints can be added for your specific integration needs.

**App Store Directory:**
The platform includes an App Store hub (`/appstore`) for discovering and managing integrations — the central location for connecting third-party services. New integrations are added regularly.

---

### Testing & Reliability

**137+ Automated Tests** across 19 test files covering every critical path:

- **Backend API endpoints** — All modules tested at the HTTP layer
- **Authentication flows** — Login, registration, OAuth, 2FA setup/verification, password reset, account lockout
- **File operations** — Upload, versioning, sharing, permissions, virus scanning integration
- **Real-time communication** — Socket.IO event emission and reception
- **Authorization** — RBAC permissions across all user roles and entity types

**Test Tooling:**
- **Jest + ts-jest** — TypeScript-native test runner
- **supertest** — HTTP integration testing for all API endpoints
- **mongodb-memory-server** — In-memory MongoDB for isolated, repeatable database tests
- **Socket.IO client** — End-to-end real-time communication testing

**CI/CD Pipeline:**
Automated tests run on every pull request via GitHub Actions. Failed tests block deployment. This means every release has been verified against the full test suite.

**Production Monitoring:**
- **Sentry** — Real-time error tracking and alerting. We know about problems before they affect you.
- **OpenTelemetry + Prometheus** — Metrics collection for performance monitoring
- **Grafana** — Operational dashboards for infrastructure visibility
- **PM2** — Process monitoring with automatic restart on failure
- **Request correlation IDs** — End-to-end debugging for every request

**Uptime Commitment:**
- Growth tier: 99.9% uptime SLA
- Enterprise tier: 99.99% uptime SLA

---

### Offline Support

**Your Work Doesn't Stop When the Internet Does:**

MyWorkSpace includes a Service Worker with IndexedDB-backed offline queue. This isn't a nice-to-have — it's essential for teams working from the field, from job sites, from client offices, or anywhere with unreliable connectivity.

**What Happens When Connectivity Drops:**
- Users can continue working on cached tasks and files
- Changes are queued locally in IndexedDB
- A visual indicator shows offline status
- Upon reconnection, changes sync automatically — no manual intervention
- No data loss. No interruption. No frustration.

**Offline Capabilities:**
- View and update tasks
- Access recently viewed files
- Queue file uploads for when connectivity returns
- Continue time tracking sessions

**Why This Matters:**
Construction sites, manufacturing floors, client offices, remote field locations — these are where work happens. Internet connectivity isn't guaranteed. MyWorkSpace's offline support means your team stays productive regardless of network conditions.

---

### Developer Experience

**Built for Developers, Trusted by Ops:**

- **Full TypeScript** — End-to-end type safety from database to frontend
- **Modular architecture** — Each domain is independently deployable and testable
- **Comprehensive API** — REST API covers every platform function
- **Docker-first** — Containerized deployment with one command
- **Observability built in** — Prometheus metrics, Sentry errors, structured logging
- **Customizable** — Open schema, documented APIs, extensible architecture

---

### Why Self-Hosted?

**Control:**
Your data lives on your infrastructure. Not a shared cloud database. Not a third-party server. Your server, your security policies, your backup strategy.

**Cost:**
No per-seat fees. No price hikes when you hire. One platform investment covers your entire organization — from 5 people to 500.

**Compliance:**
Self-hosting is the gold standard for data sovereignty. GDPR, SOC 2, ISO 27001 — compliance starts with control over your data.

**Reliability:**
Your platform isn't affected by another vendor's outage. When your infrastructure is up, MyWorkSpace is up.

**No Vendor Lock-In:**
You can migrate, modify, or extend MyWorkSpace on your terms. There's no proprietary cloud platform holding your data hostage.
