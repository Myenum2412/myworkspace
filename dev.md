# Development Overview

## Languages

| Language | Usage |
|----------|-------|
| TypeScript | Primary language (frontend & backend) |
| JavaScript | Service Worker (`public/sw.js`), config files |
| CSS | Tailwind CSS styling |
| Shell | DevOps scripts |
| Dockerfile | Container build |
| VCL | Varnish Cache configuration (`cache/varnish/vcl/`) |
| YAML | Docker Compose, Kubernetes manifests, Prometheus/Grafana config |
| TOML / Conf | Nginx, Apache Traffic Server, Valkey/Redis config |

## Frameworks & Libraries

| Layer | Technology |
|-------|-----------|
| Frontend Framework | Next.js 16 (App Router) + React 19 |
| UI Components | shadcn/ui, Radix UI, MUI, Base UI, Ark UI |
| Styling | Tailwind CSS 4, Emotion, class-variance-authority, clsx, tailwind-merge |
| Icons / Animations | lucide-react, motion (Framer Motion) |
| State Management | Zustand, TanStack React Query, TanStack React Table |
| Charts & Viz | visx, recharts, reactflow, d3, topojson |
| Backend Framework | Express 5 |
| Auth | next-auth 5 (frontend), jsonwebtoken + jose (JWT/JWE), bcryptjs |
| Authorization | Casbin (RBAC/ABAC) + MongoDB adapter |
| Database ORM | Mongoose (MongoDB) |
| Validation | zod |
| Real-time | Socket.IO + Redis adapter (server), socket.io-client (client) |
| File Upload | TUS protocol (tus-node-server + tus-js-client) |
| Image Processing | sharp |
| Queue | RabbitMQ (amqplib) + Agenda (scheduled jobs) |
| Logging | pino |
| HTTP | compression, helmet, cors, express-rate-limit |
| Build | TypeScript compiler, Next.js build, Turbopack, PostCSS, Docker |

## Third-Party Integrations

| Service | Purpose |
|---------|---------|
| MongoDB Atlas | Primary database |
| Redis / Valkey | Caching (L2/L3), rate limiting, Socket.IO adapter |
| RabbitMQ | Async message queue |
| Stripe | Payment processing |
| Resend | Transactional email delivery |
| Sentry | Error tracking |
| AWS S3 / Cloudflare R2 | Object storage (S3-compatible) |
| Google Cloud Storage | Object storage (configured) |
| Azure Blob Storage | Object storage (configured) |
| ClamAV | Virus scanning on file upload |
| Vercel Analytics | Web analytics |
| NVIDIA AI | AI/ML API |
| GitHub OAuth | Social login |
| Google OAuth | Social login |
| LinkedIn OAuth | Social login |
| OpenTelemetry + Prometheus | Metrics & observability |
| Grafana | Metrics visualization |
| PM2 | Production process manager |
| Caddy | Reverse proxy + auto TLS |
| Nginx | Reverse proxy + CDN edge cache (L5) |
| Varnish | HTTP accelerator cache (L4) |
| Apache Traffic Server | CDN edge caching proxy (L6) |

## Testing

| Tool | Usage |
|------|-------|
| Jest | Test runner |
| ts-jest | TypeScript support for Jest |
| supertest | HTTP integration testing |
| mongodb-memory-server | In-memory MongoDB for tests |
| socket.io-client | Socket.IO integration tests |

~137 tests across 19 test files.

## Architecture Highlights

- **7-layer caching**: NodeCache (L1) → Valkey standalone (L2) → Valkey cluster (L3) → Varnish (L4) → Nginx (L5) → Apache Traffic Server (L6) → Linux FS-Cache (L7)
- **Dual auth**: JWT Bearer tokens + JWE-encrypted NextAuth cookies
- **Offline support**: Service Worker + IndexedDB-backed offline queue
- **Multi-cloud storage**: Abstraction layer supporting local FS, S3-compatible, GCS, Azure
- **CI/CD**: GitHub Actions → build → deploy to EC2 via PM2
- **Orchestration**: Docker Compose (dev + prod) + Kubernetes manifests (cache services)
