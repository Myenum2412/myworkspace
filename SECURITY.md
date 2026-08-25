# Security Policy

This document describes how security issues in **MyWorkSpace** are handled and reported.

## Supported versions

Only the latest release on the `main` branch receives security updates.

| Version       | Status             |
| ------------- | ------------------ |
| `main` (latest) | ✅ Supported       |
| Older tags    | ❌ Not supported    |

## Reporting a vulnerability

Please **do not** open a public GitHub issue or pull request for a suspected vulnerability.

Report it privately using **one** of the following channels:

1. **Private vulnerability disclosure** (preferred): click **"Report a vulnerability"** on the
   repository's **Security** tab (Private vulnerability reporting).
2. **Email**: mail to **security@myenum.in** — include **"MyWorkspace"** and a brief severity rating
   in the subject line.

Please include:

- Affected component (`backend/`, `frontend/`) and version/commit the issue was reproduced with
- Steps to reproduce, ideally with a minimal proof-of-concept
- Any mitigation you believe may fix it

You will receive an acknowledgment within **48 hours**, and we will work with you to resolve it.
If the issue is confirmed, we will coordinate a fix and public disclosure after the fix is released.

### What not to report

- General questions or meta issues — open a normal issue instead.
- Vulnerabilities already reported publicly.
- Issues that only affect unreleased/development-only code with no production impact (we still
  appreciate hearing about these, but response times may be longer).
- Dependency advisories already covered by `npm audit`. If you reach a **public/Critical**
  npm advisory, report the dependency as part of this workflow instead of filing it
  upstream, unless the fix already exists.

## Disclosure timeline

We follow a coordinated-disclosure model:

1. Reporter submits report (T+0)
2. Maintainer acknowledges vulnerability (within 48h)
3. Maintainer reproduces and works on a fix
4. Fix is deployed to `main` and the production server(s)
5. Vulnerability is disclosed publicly (typically within 30–90 days)

We honor embargo requests unless a fix generates bad publicity faster than that, in which case we
will coordinate with you before going public.

## Scope

The following artifacts are in scope:

- `backend/`
- `frontend/`
- The production backend at `api.myworkspace.myenum.in`
- The Vercel-hosted frontend at `myworkspace.myenum.in`
- Any deploy-related configuration in this repository (Dockerfiles, workflows)

Out of scope: the infrastructure they run on (hosting providers, DNS, TLS termination by a
third party), and third-party libraries themselves.

## Security practices

The project uses an automated CI security pipeline on every push/PR (`security-scan.yml`):

- **Gitleaks** — detects secrets in the repository
- **CodeQL** — static analysis (JavaScript/TypeScript) with `security-and-quality`
- **Trivy** — container image scan (HIGH/CRITICAL)
- **npm audit** — dependency advisories (HIGH and above) for `backend/` and `frontend/`
- **Dependency Review** — fails PRs introducing HIGH+ severity dependency changes
- **Hadolint** — Dockerfile linting

### Security configuration summary

- The backend validates JWTs issued by the authentication service
- Media is served by `mediasoup` over a WebSocket-tunneled signaling channel (TLS) with RTC
  candidates limited to the announced public IP via `MEDIASOUP_ANNOUNCED_IP`
- CORS is restricted to the known frontend origins (`CORS_ORIGIN`)
- Secrets (JWTs, DB URIs) are read from the environment or `.env`, and are **never** committed
  to the repository

If you notice that a secret was committed, treat it as compromised, revoke it immediately, and
report it using the ["Reporting a vulnerability" section](#reporting-a-vulnerability).

## Data & encryption

- Passwords are hashed before storage.
- TLS 1.2+ is enforced at the edge for all production traffic.
- In production, the backend connects to MongoDB using authentication.
- Logs and error messages are scrubbed of tokens and personally identifiable information
  before they reach the logger.

## Attribution

This project does not participate in paid bug bounty programs at this time. Thanks go to everyone
who reports security issues responsibly.