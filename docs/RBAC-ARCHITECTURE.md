# RBAC Architecture & Enterprise Security Documentation

## 1. Executive Summary

### Purpose
The Role-Based Access Control (RBAC) system provides fine-grained, multi-tenant authorization for the entire platform. Every permission decision is derived from a centralized, auditable, and testable authorization engine.

### Security Objectives
- **Least-privilege enforcement**: Every user operates at the minimum permission level required for their role.
- **Tenant isolation**: No data crosses organizational boundaries.
- **Immutable audit trail**: Every authorization decision and privileged action is logged.
- **Defense in depth**: Authentication → Authorization → Casbin enforcement → Ownership validation.

### Multi-Tenant Architecture
The system is fully multi-tenant. Each organization (org) is an isolated tenant. All data queries filter by `orgId`. The `org_admin` role is the only role with cross-tenant visibility (via the platform admin interface).

### Authorization Philosophy
1. **Deny by default**: No access is granted unless explicitly permitted.
2. **Explicit over implicit**: Permissions are declared declaratively (Casbin policies, middleware chains), never implicitly assumed.
3. **Centralized enforcement**: All permission logic flows through `backend/src/lib/rbac/index.ts` and `frontend/lib/rbac/index.ts`.
4. **Auditability**: Every denied access attempt and every privileged action generates an immutable audit log entry.

---

## 2. Architecture Overview

### Authentication Flow
```
Client → [NextAuth.js / JWT] → Token issued (JWE encrypted)
  → Token stored in HttpOnly, Secure, SameSite=Strict cookie
  → Every API request includes Bearer token
  → `authenticate` middleware validates JWT signature + expiry
  → `req.user` populated with { userId, role, orgId, email }
```

### Authorization Flow
```
Request → authenticate → authorize middleware → route handler
                                    ↓
                           [Role check against endpoint requirements]
                                    ↓
                           Pass → next()
                           Fail → 403 Forbidden + audit log entry
```

### Casbin Enforcement Flow
```
Route handler → checkPermission(userRole, resource, action)
                     ↓
        buildFileResource/buildFolderResource(params)
                     ↓
             Casbin enforcer.enforce(sub, obj, act)
                     ↓
        Matches against casbin-policies.csv + rbac-model.conf
                     ↓
              { allowed: boolean, role: string }
```

### Central RBAC Module

**Backend**: `backend/src/lib/rbac/index.ts`
- Defines `ROLES`, `ROLE_HIERARCHY`, `ROLE_LABELS`, `ROLE_DESCRIPTIONS`
- Provides helpers: `isAdminRole`, `isPlatformRole`, `hasRole`, `hasAnyRole`
- Provides `getEffectivePermissions` for permission enumeration

**Frontend**: `frontend/lib/rbac/index.ts`
- Mirrors backend constants
- Provides identical helper functions for UI rendering decisions
- Controls sidebar visibility, button rendering, route guards

### Permission Evaluation Lifecycle
```
1. Request arrives at middleware chain
2. `authenticate` verifies identity → sets req.user
3. Route-level middleware checks role (authorizeRole, orgAdminOnly, membersOnly)
4. Route handler performs Casbin checkPermission for resource-scoped decisions
5. Ownership middleware (verifyOwnership) confirms resource ownership
6. Audit log middleware records the operation
```

### Request Lifecycle
```
Client Request
  ↓
helmet/CSRF/CORS headers
  ↓
rate-limiter
  ↓
authenticate (JWT verification)
  ↓
authorizeRole / orgAdminOnly / membersOnly
  ↓
body parser (JSON validation)
  ↓
route handler
  ↓
  ├── verifyOwnership (for user-scoped resources)
  ├── requireOrgContext (ensures orgId present)
  ├── checkPermission (Casbin enforcement)
  └── recordAuditLog (immutable log entry)
  ↓
Response (JSON/Error)
```

### Middleware Execution Order
1. **Security headers**: helmet, CORS
2. **Rate limiting**: Auth: 20/15min, API: 600/15min, Upload: 50/15min
3. **Authentication**: `authenticate` middleware
4. **Authorization**: `authorizeRole(roles)` or `orgAdminOnly()` or `membersOnly()`
5. **Ownership**: `verifyOwnership(model, ownerField)`
6. **Tenant isolation**: `requireOrgContext` / `requireOrgMembership`
7. **Route handler**: Business logic + `checkPermission` for resource-scoped decisions
8. **Audit logging**: `auditLog` middleware or explicit `recordAuditLog` calls

### Audit Logging Flow
```
Operation → recordAuditLog({
  orgId, userId, action, entityType, entityId,
  description, ipAddress, userAgent, success, metadata
})
  → writeViaQueue (RabbitMQ, priority 5)
    → fallback to writeDirect (MongoDB)
      → ActivityLog collection (immutable, indexed by orgId+createdAt)
```

### Tenant Isolation Strategy
- Every database query includes `{ orgId }` filter
- `requireOrgContext` middleware enforces orgId presence
- File paths include org-scoped prefixes
- Share links are org-scoped
- User sessions are org-scoped

---

## 3. Role Definitions

### org_admin — Platform Owner

**Responsibilities**: Full platform administration across all organizations. System configuration, billing oversight, user management, audit log review, compliance enforcement.

**Permissions**:
- Wildcard access to all resources (`*:*`)
- File management: view, upload, download, edit, delete, share, restore, archive
- Folder management: view, create, edit, delete
- Upload management: view, resume, cancel, pause
- Cross-tenant visibility via platform admin dashboard
- System settings and configuration
- User management across all orgs
- Billing and subscription management
- Audit log access
- AI and storage management

**Restrictions**: None within the platform.

### members — Company Owner

**Responsibilities**: Full administrative control within their own organization. Manage projects, staff, HR, clients, billing, settings, files, teams, approvals, reports, AI, departments.

**Permissions**:
- Org-scoped file management: view, upload, download, edit, delete, share, restore, archive
- Org-scoped folder management: view, create, edit, delete
- Org-scoped upload management: view, resume, cancel, pause
- Workspace management
- Project management
- Staff management
- HR management
- Client management
- Billing management
- Organization settings
- Team management
- Approval management
- Report management
- AI feature management
- Department management
- Permission management

**Restrictions**:
- No cross-tenant access
- Cannot access system-level settings
- Cannot access other orgs' data

### staffs

**Responsibilities**: Execute tasks, collaborate on projects, communicate within teams, manage assigned files and approvals.

**Permissions**:
- Project-scoped file management: view, upload, download, edit, delete
- Project-scoped folder management: view, create
- Task access
- File access (assigned)
- Communications
- Approvals (submission)
- Collaboration tools
- AI feature access (assigned)

**Restrictions**:
- No org-scoped (organization-wide) file operations
- No delete/restore/archive capabilities
- No client-scoped access
- No billing, HR, or settings access
- No team or user management

### hr

**Responsibilities**: Manage employees, attendance, leave, payroll, recruitment, onboarding, documents, performance, and HR reports within their organization.

**Permissions**:
- Org-scoped file management: view, upload, download, edit, share
- Org-scoped folder management: view, create
- Employee management
- Attendance management
- Leave management
- Payroll management
- Recruitment management
- Onboarding management
- Document management
- Performance management
- HR report access

**Restrictions**:
- No delete/restore/archive capabilities
- No project-scoped access
- No client-scoped access
- No billing or settings access
- No team or user management (beyond HR functions)

### clients

**Responsibilities**: Access assigned projects, approved files, invoices, messages, and shared documents via the client portal.

**Permissions**:
- Client-scoped file management: view, upload, download
- Client-scoped folder management: view
- Portal access
- Project access (assigned)
- Invoice access (own)
- Message access
- Approval access

**Restrictions**:
- No org-scoped or project-scoped access
- No delete, edit, share, restore, archive capabilities
- No folder creation or editing
- No cross-client visibility
- No billing, HR, settings, or admin access

---

## 4. Permission Matrix

| Feature | org_admin | members | staffs | hr | clients |
|---|---|---|---|---|---|
| **Dashboard** | | | | | |
| View System Dashboard | ✓ | ✗ | ✗ | ✗ | ✗ |
| View Org Dashboard | ✓ | ✓ | ✓ | ✓ | ✓ |
| **Projects** | | | | | |
| View | ✓ | ✓ | ✓ | ✗ | ✗ |
| Create | ✓ | ✓ | ✗ | ✗ | ✗ |
| Update | ✓ | ✓ | ✗ | ✗ | ✗ |
| Delete | ✓ | ✓ | ✗ | ✗ | ✗ |
| **Files** | | | | | |
| View (org-scoped) | ✓ | ✓ | ✗ | ✓ | ✗ |
| View (project-scoped) | ✓ | ✓ | ✓ | ✗ | ✗ |
| View (client-scoped) | ✓ | ✓ | ✗ | ✗ | ✓ |
| View (shared) | ✓ | ✓ | ✓ | ✓ | ✓ |
| Upload (org) | ✓ | ✓ | ✗ | ✓ | ✗ |
| Upload (project) | ✓ | ✓ | ✓ | ✗ | ✗ |
| Upload (client) | ✓ | ✓ | ✗ | ✗ | ✓ |
| Download | ✓ | ✓ | ✓ | ✓ | ✓ |
| Edit | ✓ | ✓ | ✓ | ✓ | ✗ |
| Delete | ✓ | ✓ | ✗ | ✗ | ✗ |
| Share | ✓ | ✓ | ✗ | ✓ | ✗ |
| Restore | ✓ | ✓ | ✗ | ✗ | ✗ |
| Archive | ✓ | ✓ | ✗ | ✗ | ✗ |
| **Folders** | | | | | |
| View | ✓ | ✓ | ✓ | ✓ | ✓ |
| Create | ✓ | ✓ | ✓ | ✓ | ✗ |
| Edit | ✓ | ✓ | ✗ | ✗ | ✗ |
| Delete | ✓ | ✓ | ✗ | ✗ | ✗ |
| **Upload Sessions** | | | | | |
| View | ✓ | ✓ | ✓ | ✗ | ✗ |
| Resume | ✓ | ✓ | ✓ | ✗ | ✗ |
| Cancel | ✓ | ✓ | ✓ | ✗ | ✗ |
| Pause | ✓ | ✓ | ✓ | ✗ | ✗ |
| **AI** | | | | | |
| Manage AI | ✓ | ✓ | ✗ | ✗ | ✗ |
| Use AI | ✓ | ✓ | ✓ | ✓ | ✗ |
| **HR** | | | | | |
| Manage Employees | ✓ | ✓ | ✗ | ✓ | ✗ |
| Manage Attendance | ✓ | ✓ | ✗ | ✓ | ✗ |
| Manage Leave | ✓ | ✓ | ✗ | ✓ | ✗ |
| Manage Payroll | ✓ | ✓ | ✗ | ✓ | ✗ |
| Manage Recruitment | ✓ | ✓ | ✗ | ✓ | ✗ |
| Manage Onboarding | ✓ | ✓ | ✗ | ✓ | ✗ |
| Manage Performance | ✓ | ✓ | ✗ | ✓ | ✗ |
| **Clients** | | | | | |
| Manage Clients | ✓ | ✓ | ✗ | ✗ | ✗ |
| Client Portal | ✓ | ✓ | ✗ | ✗ | ✓ |
| **Billing** | | | | | |
| View Billing | ✓ | ✓ | ✗ | ✗ | ✓ |
| Manage Billing | ✓ | ✓ | ✗ | ✗ | ✗ |
| **Reports** | | | | | |
| View Reports | ✓ | ✓ | ✓ | ✓ | ✗ |
| Export Reports | ✓ | ✓ | ✓ | ✓ | ✗ |
| **Notifications** | | | | | |
| View Own | ✓ | ✓ | ✓ | ✓ | ✓ |
| System Broadcast | ✓ | ✗ | ✗ | ✗ | ✗ |
| **Calendar** | | | | | |
| View Org Calendar | ✓ | ✓ | ✓ | ✓ | ✗ |
| Manage Events | ✓ | ✓ | ✓ | ✓ | ✗ |
| **Contractors** | | | | | |
| View | ✓ | ✓ | ✗ | ✗ | ✗ |
| Manage | ✓ | ✓ | ✗ | ✗ | ✗ |
| **Receipts** | | | | | |
| View | ✓ | ✓ | ✗ | ✗ | ✗ |
| Manage | ✓ | ✓ | ✗ | ✗ | ✗ |
| **Appointments** | | | | | |
| View | ✓ | ✓ | ✗ | ✓ | ✗ |
| Manage | ✓ | ✓ | ✗ | ✓ | ✗ |
| **Storage** | | | | | |
| View Usage | ✓ | ✓ | ✗ | ✗ | ✗ |
| Manage Storage | ✓ | ✓ | ✗ | ✗ | ✗ |
| **Organization Settings** | | | | | |
| View | ✓ | ✓ | ✗ | ✗ | ✗ |
| Update | ✓ | ✓ | ✗ | ✗ | ✗ |
| Delete Org | ✓ | ✗ | ✗ | ✗ | ✗ |
| **User Management** | | | | | |
| Invite Users | ✓ | ✓ | ✗ | ✗ | ✗ |
| Change Roles | ✓ | ✓ | ✗ | ✗ | ✗ |
| Deactivate Users | ✓ | ✓ | ✗ | ✗ | ✗ |
| **Audit Logs** | | | | | |
| View Audit Logs | ✓ | ✗ | ✗ | ✗ | ✗ |
| **Teams** | | | | | |
| Manage Teams | ✓ | ✓ | ✗ | ✗ | ✗ |
| **Tasks** | | | | | |
| View Assigned | ✓ | ✓ | ✓ | ✓ | ✓ |
| Create | ✓ | ✓ | ✓ | ✓ | ✗ |
| Update | ✓ | ✓ | ✓ | ✓ | ✗ |
| Delete | ✓ | ✓ | ✗ | ✗ | ✗ |

---

## 5. Tenant Isolation

### organizationId Enforcement
- Every MongoDB query for tenant-scoped data includes `{ orgId }` or `{ organizationId }` filter
- `requireOrgContext` middleware extracts orgId from JWT token or request body
- `requireOrgMembership` middleware verifies the user is a member of the target org
- Routes without org context (auth, public endpoints) are explicitly excluded

### Ownership Validation
- `verifyOwnership(model, ownerField)` middleware compares resource owner against `req.user.userId`
- Applied to user-scoped resources (sessions, notifications, time entries)
- Logs audit entry on denial for security monitoring

### Resource Isolation
- File resources are scoped by prefix: `:org_file`, `:project_file`, `:client_file`, `:shared_file`
- Casbin policies enforce scope-based access — a `staffs` user with `:project_file` access cannot view `:org_file` resources
- Folder resources follow the same scoping: `:org_folder`, `:project_folder`, `:client_folder`

### Query Filtering
- All `.find()`, `.findOne()`, `.findById()`, `.aggregate()` calls include `{ orgId }` filter
- Exceptions: user registration (no org yet), admin routes (platform-level), bootstrap scenarios (auto-org-assignment)

### File Isolation
- Upload sessions are org-scoped
- File metadata includes orgId
- Share links are org-scoped and validated on access
- File approval workflows verify org membership

### API Isolation
- Every protected route requires authentication
- Role authorization middleware gates access per endpoint
- Resource-scoped Casbin enforcement for file/folder operations
- Ownership middleware for user-scoped resources

---

## 6. Security Controls

### Authentication
| Control | Implementation |
|---------|---------------|
| JWT signing | RS256 with rotating key pair |
| Session encryption | JWE (JSON Web Encryption) |
| Cookie security | HttpOnly, Secure, SameSite=Strict |
| Token expiry | 7 days (configurable) |
| Multi-factor | TOTP-based 2FA |
| OAuth providers | Google, GitHub, LinkedIn |
| Rate limiting | Auth: 20 req/15min, API: 600 req/15min |
| Account lockout | 5 failed attempts → 15 min lock |

### Authorization
| Control | Implementation |
|---------|---------------|
| Role check | `authorizeRole(...roles)` middleware |
| Admin check | `orgAdminOnly()` / `membersOnly()` middleware |
| Platform admin | `platformAdminOnly()` (alias for `orgAdminOnly()`) |
| Resource scoping | Casbin `checkPermission` with built resource identifiers |
| Permission enumeration | `getEffectivePermissions` for UI rendering |

### Casbin
| Control | Implementation |
|---------|---------------|
| Policy engine | Casbin v3 with RBAC model |
| Policy storage | CSV file (production: MongoDB adapter available) |
| Model | `rbac-model.conf` with `g` role hierarchy |
| Policy file | `casbin-policies.csv` (61 lines, 28 permission rules) |
| Role hierarchy | `org_admin → members → staffs` and `org_admin → members → hr` |
| Singleton enforcer | Cached after first load |
| Dynamic policies | `addPolicy`, `removePolicy`, `addRoleForUser` available |

### IDOR Prevention
- `verifyOwnership` middleware on user-scoped resources (sessions, notifications, time entries)
- Resource ID validation against authenticated user's userId
- Audit logging on all access denial attempts

### Horizontal Privilege Escalation Prevention
- Casbin scope-based resource identifiers prevent cross-scope access
- A `staffs` user with `:project_file` access cannot view `:org_file` resources
- `clients` scoped exclusively to `:client_file`
- Tenant isolation enforced at query level with `{ orgId }` filter

### Vertical Privilege Escalation Prevention
- `authorizeRole` middleware explicitly lists allowed roles per endpoint
- `orgAdminOnly` rejects all non-`org_admin` roles
- `membersOnly` rejects non-admin roles (staffs, hr, clients)
- Audit logging on all unauthorized access attempts

### Organization Hopping Prevention
- `requireOrgContext` ensures req.orgId matches token claims
- `requireOrgMembership` verifies user belongs to target org
- All queries include orgId filter
- Cross-org resource identifiers (e.g., `*:file`) restricted to `org_admin`

### Resource Ownership Validation
- `verifyOwnership(model, ownerField)` validates resource ownership
- Applied to time entries, notifications, sessions, and other user-scoped resources
- Denial generates structured audit log with IP, user agent, metadata

### Immutable Audit Logging
- `ActivityLog` collection with append-only writes
- No update or delete operations exposed
- Indexed by orgId + createdAt for efficient querying
- Includes: IP address, user agent, success/failure status, actor, action, resource, timestamp, metadata

### Least-Privilege Enforcement
- Five-role architecture ensures minimum necessary permissions
- No role has unnecessary cross-scope access
- `org_admin` is the only cross-tenant role
- `clients` role is heavily restricted to portal access only
- Every privilege escalation requires explicit policy declaration

### Additional Security Controls
| Control | Implementation |
|---------|---------------|
| Helmet headers | Content-Security-Policy, X-Frame-Options, X-Content-Type-Options, HSTS |
| CORS | Whitelist-based origin validation |
| CSRF | Double-submit cookie pattern with timing-safe comparison |
| Input validation | Zod schemas on all endpoints |
| File validation | MIME type + extension filtering |
| SQL injection prevention | Parameterized queries (Mongoose) |
| Secrets management | Environment variables, never committed |
| TLS termination | Caddy with TLS 1.3 |

---

## 7. Performance Optimizations

### Singleton Casbin Enforcer
- `getEnforcer()` caches the Casbin enforcer instance after first initialization
- Subsequent calls return the cached in-memory instance
- Zero overhead per request after initial load

### Optimized Permission Lookups
- `checkPermission` calls `e.enforce(sub, obj, act)` directly — a single Casbin call
- Eliminated redundant role hierarchy traversal (previously iterated all inherited roles with separate `enforce` calls)
- Casbin's RBAC model handles hierarchy internally via `g(r.sub, p.sub)` matcher

### Minimal Middleware Overhead
- Authorization middleware checks role string (`req.user.role`) directly — no Casbin call needed for role-level checks
- Casbin `checkPermission` only invoked for resource-scoped operations (files, folders, uploads)
- Ownership middleware performs a single MongoDB query with `.lean()` for minimal overhead

### Database Optimizations
- Indexes on frequently queried fields: `orgId`, `createdAt`, `userId`, `createdBy`
- Compound indexes for common query patterns
- `.lean()` used for read-only queries to skip Mongoose hydration

### Authorization Latency
- Role check middleware: < 1ms (string comparison)
- Casbin enforce: ~1-5ms (in-memory policy evaluation)
- Ownership verification: ~5-15ms (indexed MongoDB query)
- Audit log write: ~5-20ms (async queue or direct MongoDB write)

---

## 8. Testing

### Unit Tests

| Test File | Tests | Coverage |
|-----------|-------|----------|
| `unit/casbin-policies.test.ts` | 48 | Casbin policy enforcement, resource building, role hierarchy, deny-by-default |
| `unit/auth-jwt.test.ts` | 18 | JWT sign/verify, tamper detection, expiry, algorithm confusion |
| `unit/upload-security.test.ts` | 8 | MIME type categorization, allowed type validation |
| `unit/audit-service.test.ts` | 2 | Audit log creation, missing field handling |

### Integration Tests

| Test File | Tests | Coverage |
|-----------|-------|----------|
| `integration/casbin-rbac.test.ts` | 33 | Resource scope resolution, full Casbin enforcement, folder scoping |
| `integration/casbin-dynamic-policy.test.ts` | 5 | Runtime policy changes, role assignment, deny-override, escalation prevention |
| `integration/org-isolation.test.ts` | 1 | Cross-org data isolation verification |
| `integration/rbac.test.ts` | 1 | Non-admin route rejection |
| `integration/auth.test.ts` | 4 | Signup, login, dedup |
| `integration/auth-workflow.test.ts` | 4 | Full auth flow, weak password, lockout |
| `integration/dual-auth.test.ts` | 7 | JWT + JWE, token refresh/revocation |

### Security Tests

| Test File | Tests | Coverage |
|-----------|-------|----------|
| `security/rbac-security.test.ts` | 98 | Vertical/horizontal privilege escalation, IDOR, tenant isolation, unauthorized writes/deletes/approvals, org hopping, client data leakage |
| `security/jwt-security.test.ts` | 14 | JWT validation, token isolation, security headers, rate limiting |

### Socket Tests

| Test File | Tests | Coverage |
|-----------|-------|----------|
| `socket/auth.test.ts` | 3 | Socket.io token validation |

### Tenant Isolation Tests
- Cross-org data isolation (1 test)
- Client data leakage (13 tests)
- Organization hopping (6 tests)

### Casbin Tests
- Policy enforcement (48 tests)
- Resource scope resolution (33 tests)
- Dynamic policy management (5 tests)

### Authorization Tests
- Role-based access (21 tests for vertical privilege escalation)
- Resource-scoped access (10 tests for horizontal privilege escalation)
- Ownership verification (5 tests for IDOR prevention)

### Total Test Coverage
| Category | Files | Tests |
|----------|-------|-------|
| RBAC / Authorization | 6 | 186 |
| JWT / Security | 2 | 32 |
| Audit Service | 1 | 2 |
| Auth (non-RBAC) | 4 | 18 |
| Socket Auth | 1 | 3 |
| **Grand Total** | **14** | **241** |
