# Deployment Guide

## Overview

This document describes how to deploy MyWorkSpace to production. Two deployment models are supported:

1. **Docker Compose** — Single-server deployment (recommended for most deployments)
2. **Kubernetes** — Multi-node orchestrated deployment (for scale)

---

## Prerequisites

| Requirement | Version | Notes |
|-------------|---------|-------|
| Docker | 24+ | docker compose v2 |
| Node.js | 22+ | Build-time only |
| Domain | — | DNS A/AAAA records for `app.yourdomain.com` and `api.yourdomain.com` |
| SSL | — | Lets Encrypt (auto via Caddy/cert-manager) |

---

## Docker Compose Deployment

### 1. Clone and Configure

```bash
git clone <repo-url> /opt/myworkspace
cd /opt/myworkspace
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

### 2. Set Environment Variables

Edit `backend/.env` and set:
- `MONGODB_URI` — MongoDB Atlas or self-hosted connection string
- `JWT_SECRET` — Generate with: `openssl rand -base64 48`
- `NEXTAUTH_SECRET` — Generate with: `openssl rand -base64 48`

### 3. Deploy

```bash
make docker-build
make docker-up
make verify
```

### 4. First-time Setup

```bash
# Seed admin user
docker compose exec backend npm run db:seed-admin

# Verify deployment
curl https://yourdomain.com/api/health
```

---

## Kubernetes Deployment

### 1. Configure Secrets

```bash
cd k8s/overlays/production
kubectl create namespace myworkspace

# Create secrets from template
kubectl create secret generic myworkspace-secrets \
  --from-literal=MONGODB_URI='mongodb+srv://...' \
  --from-literal=JWT_SECRET='...' \
  --from-literal=NEXTAUTH_SECRET='...' \
  --namespace myworkspace
```

### 2. Deploy

```bash
kubectl apply -k k8s/overlays/production
```

### 3. Verify

```bash
kubectl rollout status deployment/myworkspace-backend -n myworkspace
kubectl rollout status deployment/myworkspace-frontend -n myworkspace
kubectl get ingress -n myworkspace
```

---

## Zero-Downtime Deployment

```bash
make deploy                     # Deploy with latest tag
make deploy TAG=v1.2.3          # Deploy specific version
```

The script performs a rolling update:
1. Pre-deployment health checks
2. Build images
3. Deploy backend (scale 1 → wait healthy → scale full)
4. Deploy frontend (scale 1 → wait healthy → scale full)
5. Post-deployment verification
6. Automatic rollback on failure

---

## Rollback

```bash
make rollback
```

Rolls back to the previous deployment by:
1. Reading the saved previous image tag
2. Rebuilding with that tag
3. Restarting all services
4. Verifying health

---

## Environment Variables

### Required (backend)

| Variable | Description | Example |
|----------|-------------|---------|
| `MONGODB_URI` | MongoDB connection string | `mongodb+srv://...` |
| `JWT_SECRET` | JWT signing key (64+ chars) | `openssl rand -base64 48` |
| `NODE_ENV` | Environment | `production` |

### Required (frontend)

| Variable | Description | Example |
|----------|-------------|---------|
| `NEXTAUTH_SECRET` | NextAuth encryption key | `openssl rand -base64 48` |
| `NEXTAUTH_URL` | Public frontend URL | `https://app.yourdomain.com` |

See `backend/.env.example` and `frontend/.env.example` for the full list.

---

## Database Migrations

```bash
make migrate                          # Run all pending migrations
make migrate FILE=backend/src/migrations/20250101_add_index.ts   # Run specific
```

Migrations are stored in `backend/src/migrations/` and are tracked via `.done_*` marker files.

---

## Backup & Restore

```bash
make backup                           # Full backup (MongoDB + Redis + configs)
make restore FILE=/backups/dump.gz    # Restore from specific backup
```

See [BACKUP-RESTORE.md](./BACKUP-RESTORE.md) for detailed procedures.
