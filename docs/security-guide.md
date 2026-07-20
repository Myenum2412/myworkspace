# Security Guide

## Security Controls

### Authentication
- NextAuth.js v5 with JWT strategy
- JWE encrypted session cookies
- HttpOnly, Secure, SameSite=Strict
- Multi-factor authentication (TOTP)
- OAuth providers: Google, GitHub, LinkedIn
- Session timeout: 7 days (configurable)
- Failed login lockout: 5 attempts → 15 min lock

### Authorization
- Role-Based Access Control (RBAC) via Casbin
- Roles: org_admin, members, staffs, hr, clients
- Organization-scoped data isolation
- File access verification on every request
- API endpoint authorization checks

### Input Validation
- Zod schema validation on all inputs
- Request body sanitization (XSS prevention)
- File upload type validation (MIME + extension)
- File size limits (100MB)
- SQL/NoSQL injection prevention

### CSRF Protection
- Double-submit cookie pattern
- Token validation on unsafe methods
- Timing-safe comparison
- HttpOnly=False for token readability

### Rate Limiting
- Auth endpoints: 20 requests/15min
- API endpoints: 600 requests/15min
- Upload endpoints: 50 requests/15min
- Search endpoints: 100 requests/min
- Redis-backed for distributed limiting

### Network Security
- TLS 1.3 termination (Caddy)
- HSTS with includeSubDomains
- Content-Security-Policy headers
- X-Frame-Options: SAMEORIGIN
- X-Content-Type-Options: nosniff
- Network policies (K8s pod isolation)

### Secrets Management
- Kubernetes Secrets for production
- Never committed to git (gitignore enforced)
- Rotation procedure documented
- Separate secrets per environment

### Monitoring
- Security event logging
- Failed authentication tracking
- Rate limit violation alerts
- Anomaly detection via Sentry

## Vulnerability Management

### Dependency Scanning
- npm audit on every CI run
- Trivy container scanning
- Automated PR alerts for vulnerabilities

### Penetration Testing
- Annual third-party pentest
- Quarterly internal security review
- Bug bounty program (planned)

## Compliance

### Data Protection
- GDPR: User data export, deletion
- Data encryption at rest (MongoDB Atlas)
- Data encryption in transit (TLS)
- Access logging and audit trail

### SOC 2 (Planned)
- Access controls
- Audit logging
- Change management
- Incident response

## Incident Response

### Security Incident Process
1. **Detect** → Alert received
2. **Triage** → Assess severity (P0-P3)
3. **Contain** → Isolate affected systems
4. **Eradicate** → Remove threat
5. **Recover** → Restore services
6. **Learn** → Post-mortem

### Severity Levels
- **P0 (Critical):** Data breach, complete outage
- **P1 (High):** Partial outage, unauthorized access
- **P2 (Medium):** Degraded service, potential vulnerability
- **P3 (Low):** Minor issue, informational

## Security Checklist

- [ ] All secrets rotated
- [ ] Dependencies up to date
- [ ] No hardcoded credentials
- [ ] HTTPS enforced
- [ ] Rate limiting active
- [ ] Input validation on all endpoints
- [ ] File upload restrictions in place
- [ ] CORS properly configured
- [ ] CSP headers set
- [ ] Audit logging enabled
- [ ] MFA available for admin accounts
- [ ] Backup encryption verified
