# Enterprise RBAC Security Enhancement - Deployment Checklist

## Pre-Deployment

### 1. Environment Variables
Ensure the following environment variables are set:

```bash
# JWT Configuration (CRITICAL)
JWT_SECRET=<secure-random-64-char-string>
JWT_REFRESH_SECRET=<secure-random-64-char-string>
JWT_EXPIRES_IN=15m  # Changed from 7d
JWT_REFRESH_EXPIRES_IN=30d
JWT_ISSUER=myworkspace

# Database
MONGODB_URI=<mongodb-connection-string>

# Redis (for caching)
REDIS_URL=redis://localhost:6379

# Casbin
CASINB_MONGO_ADAPTER=1  # Enable MongoDB adapter for policies

# Security
CORS_ORIGIN=<allowed-origins>
APP_URL=<frontend-url>
```

### 2. Database Migrations
Run the following migrations before deployment:

```bash
# 1. Add tokenVersion to users collection (if not exists)
db.users.updateMany(
  { tokenVersion: { $exists: false } },
  { $set: { tokenVersion: 0 } }
);

# 2. Create AuditLog collection with indexes
db.createCollection("auditlogs");
db.auditlogs.createIndex({ orgId: 1, createdAt: -1 });
db.auditlogs.createIndex({ orgId: 1, action: 1, createdAt: -1 });
db.auditlogs.createIndex({ correlationId: 1 });
db.auditlogs.createIndex({ hash: 1 });

# 3. Add indexes to existing collections
db.users.createIndex({ email: 1 }, { unique: true });
db.orgmembers.createIndex({ userId: 1, orgId: 1 });
db.tasks.createIndex({ orgId: 1, status: 1 });
db.fileattachments.createIndex({ orgId: 1, deletedAt: 1 });
```

### 3. Casbin Policy Migration
If using MongoDB adapter for Casbin:

```bash
# Policies are automatically loaded from casbin-policies.csv
# On first startup with CASINB_MONGO_ADAPTER=1
```

### 4. Backup
```bash
# Backup MongoDB
mongodump --uri="<MONGODB_URI>" --out=/backup/pre-deployment-$(date +%Y%m%d)

# Backup frontend build
cp -r /app/frontend /backup/frontend-$(date +%Y%m%d)
```

## Deployment Steps

### Step 1: Deploy Backend
```bash
cd /app/backend
npm install
npm run build

# Stop existing process
pm2 stop myworkspace-api

# Start new process
pm2 start dist/app.js --name myworkspace-api

# Verify
pm2 logs myworkspace-api --lines 50
```

### Step 2: Deploy Frontend
```bash
cd /app/frontend
npm install
npm run build

# Restart Next.js
pm2 restart myworkspace-frontend

# Verify
curl -I https://your-domain.com
```

### Step 3: Verify Services
```bash
# Health check
curl https://your-domain.com/api/health

# Auth check
curl https://your-domain.com/api/auth/session

# Security dashboard (admin only)
curl -H "Authorization: Bearer <token>" https://your-domain.com/api/admin/security/dashboard
```

## Post-Deployment Verification

### 1. Authentication Flow
- [ ] Login with email/password works
- [ ] OAuth login (Google, GitHub, LinkedIn) works
- [ ] 2FA setup and verification works
- [ ] Password reset flow works
- [ ] Session refresh works (15-minute token expiry)

### 2. Authorization Flow
- [ ] Role-based route access works
- [ ] Casbin policy evaluation works
- [ ] Permission caching works
- [ ] Cross-tenant access is blocked

### 3. Audit Logging
- [ ] Authentication events are logged
- [ ] Authorization decisions are logged
- [ ] Data mutations are logged
- [ ] Audit chain integrity works

### 4. Security Features
- [ ] Rate limiting works
- [ ] CSRF protection works
- [ ] Path traversal protection works
- [ ] Input sanitization works

## Rollback Plan

### If Authentication Issues
```bash
# Revert JWT_EXPIRES_IN to 7 days temporarily
export JWT_EXPIRES_IN=7d
pm2 restart myworkspace-api
```

### If Casbin Issues
```bash
# Disable MongoDB adapter, use file-based policies
unset CASINB_MONGO_ADAPTER
pm2 restart myworkspace-api
```

### Full Rollback
```bash
# Restore backend
cd /app/backend
git checkout <previous-commit>
npm run build
pm2 restart myworkspace-api

# Restore frontend
cd /app/frontend
git checkout <previous-commit>
npm run build
pm2 restart myworkspace-frontend

# Restore database
mongorestore --uri="<MONGODB_URI>" /backup/pre-deployment-<date>
```

## Monitoring

### Key Metrics to Watch
- `auth_events_total` - Authentication attempts
- `auth_failures_total` - Authentication failures
- `authorization_denials_total` - Authorization denials
- `tenant_isolation_violations_total` - Cross-tenant access attempts
- `authorization_latency_ms` - Authorization response time
- `permission_cache_hit_rate` - Cache performance

### Alert Thresholds
- Auth failures > 100/hour: Investigate potential brute force
- Auth denials > 50/hour: Review role configurations
- Tenant violations > 0: Critical - investigate immediately
- Authorization latency > 100ms: Performance issue

## Support Contacts

- **Backend Issues:** Backend team
- **Frontend Issues:** Frontend team
- **Database Issues:** DBA team
- **Security Issues:** Security team
