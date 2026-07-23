# MyWorkSpace — FAQ Page

**Page Title:** Frequently Asked Questions — MyWorkSpace

**Meta Description:** Find answers to common questions about MyWorkSpace — deployment, features, security, pricing, integrations, support, and more. Everything you need to know before you start.

**H1 Headline:** Questions? We Have Answers.

**Subheadline:** We've compiled the questions we hear most often — from deployment to features to pricing. If you don't find what you're looking for, reach out. We're here to help.

---

### Getting Started

**What is MyWorkSpace?**
MyWorkSpace is a self-hosted, all-in-one workforce management and team collaboration platform that combines employee management, project and task tracking, time and attendance monitoring, enterprise file management, client portals, billing, and analytics into a single unified system. It replaces the need for 5–10 separate SaaS tools.

**Who is MyWorkSpace for?**
MyWorkSpace is designed for organizations of all sizes — from 5-person startups to 500+ person enterprises — across industries including construction, engineering, IT services, software development, marketing agencies, consulting, real estate, manufacturing, healthcare, logistics, HR, finance, and more. If your team uses multiple tools to manage operations, MyWorkSpace is for you.

**How is MyWorkSpace different from Asana, Google Drive, Toggl, or BambooHR?**
Those are point solutions — each does one thing well. MyWorkSpace replaces 5–7 of them in a single, integrated platform. Your data lives in one place. Your team works in one place. Your reporting comes from one source of truth. No integrations to maintain. No context-switching. No "which tool was that in?"

**How quickly can I get started?**
Most organizations deploy and configure MyWorkSpace in under an hour. Deployment scripts are included. Set up your organization, invite your team, and start working — all in a single afternoon. Many Free tier users are fully operational within 45 minutes.

**Do I need technical expertise to set it up?**
Basic server administration knowledge is helpful. Deployment is automated via Docker Compose or PM2 scripts — both are well-documented. If you can run a command in a terminal, you can deploy MyWorkSpace. For organizations without in-house DevOps, our Enterprise tier includes white-glove deployment assistance where our team handles the setup for you.

**Do I need a dedicated server?**
You need a Linux server — it can be a cloud instance (AWS EC2, DigitalOcean Droplet, Linode, etc.), a virtual machine, or an on-premise server. Minimum 2 GB RAM (4 GB+ recommended for production). If you already have a server running other applications, MyWorkSpace can often share it.

**Is there a demo or trial available?**
The Free tier is effectively a full-featured trial with no time limit. Deploy it, use it, and see if it fits. If you need a guided walkthrough, book a demo with our team.

**What if I migrate from another tool?**
Most customers migrate from a combination of tools (e.g., Asana/Jira, Google Drive/Dropbox, Toggl/Harvest, BambooHR). We provide migration guides and our API makes it possible to import data from other systems. Enterprise tier includes migration assistance.

---

### Deployment & Hosting

**Can I self-host MyWorkSpace?**
Yes. MyWorkSpace is purpose-built for self-hosted deployment. You run it on your own server — your data never touches third-party infrastructure. All deployment scripts, configuration templates, and documentation are included. No proprietary cloud platform required.

**What are the minimum system requirements?**
- Linux server (Ubuntu 22.04+ recommended, but any modern Linux distribution works)
- Node.js 20+
- MongoDB 7+
- Redis 7 / Valkey
- Minimum 2 GB RAM (4 GB+ recommended for production)
- 10 GB available storage (plus your file storage needs)
- Docker (optional, for containerized deployment)

**What deployment methods are supported?**
- **Docker Compose** — Recommended. One-command setup with all dependencies containerized. Most popular choice.
- **PM2** — Traditional Node.js process manager on Ubuntu EC2. Full control over individual processes.
- **Kubernetes** — Manifests provided for container orchestration environments. For enterprise-scale deployments.

**Can I deploy on a cloud provider?**
Yes. MyWorkSpace runs on any Linux server — AWS EC2, DigitalOcean, Linode, Azure, Google Cloud, or your own on-premise hardware. We have customers using all of the above. Your choice.

**Is there a cloud-hosted (SaaS) version?**
MyWorkSpace is designed as a self-hosted platform. We believe data sovereignty is fundamental — your business data belongs on your infrastructure. However, our Enterprise tier includes deployment support and can discuss managed infrastructure options for organizations that want assistance running the platform.

**Can I use my own domain and SSL certificate?**
Yes. The included Caddy reverse proxy automatically provisions and renews Let's Encrypt TLS certificates. You can also configure custom SSL certificates from your preferred provider. Custom domains are supported.

**How do updates work?**
Updates are distributed via GitHub. Pull the latest code, run the update script, and your platform is upgraded. We provide changelogs with every release detailing new features, improvements, and any breaking changes. Most updates complete in under 5 minutes.

**Can I run MyWorkSpace on a Raspberry Pi or low-power device?**
For testing and evaluation only. Minimum 2 GB RAM is required. A Raspberry Pi 4 with 4+ GB RAM can run a small instance for evaluation purposes, but we do not recommend it for production use.

---

### Features

**What modules are included?**
MyWorkSpace includes 20+ integrated modules: Employee Management, Project Management, Task Management (with Kanban board), Enterprise File Management, Time Tracking, Attendance, Client Collaboration Portal, Billing & Subscriptions, Analytics & Reports, Real-Time Notifications, Cross-Entity Search, Calendar, Security & Administration, and Organization Management. Each module is optional — use what you need.

**Can clients access the platform?**
Yes. MyWorkSpace includes a dedicated Client Portal with separate login, isolated workspaces, project visibility, file access, and notifications — all without exposing your internal data. Clients see only what you explicitly authorize. It's one of our most-loved features.

**Can I customize which features my team sees?**
Yes. Feature visibility is controlled through role-based access. You can show or hide entire modules, specific features within modules, or individual actions. For example, you can give employees access to task management without exposing billing data.

**Is there a mobile app?**
MyWorkSpace has a responsive web interface that works on desktop, tablet, and mobile browsers. No native app installation is required — access from any device with a browser. The interface adapts to your screen size automatically.

**Does it support real-time collaboration?**
Yes. Socket.IO-powered real-time updates deliver instant notifications for task changes, file operations, user status changes, and team activity. When someone updates a task or uploads a file, everyone relevant knows immediately — no refreshing required.

**How does file versioning work?**
Every file modification creates a numbered version with a timestamp and the user who made the change. You can view the full version history and roll back to any previous version with one click. Version comments document what changed and why. Growth tier and above.

**What file types are supported?**
All file types. MyWorkSpace is file-format agnostic — upload documents (PDF, DOCX, XLSX), images (JPG, PNG, SVG, PSD), videos (MP4, MOV), CAD files (DWG, DXF), spreadsheets, presentations, code files, design files, or any other format.

**What is the file size limit?**
Free tier: 100 MB per file. Growth and Enterprise tiers: up to 10 GB per file via the TUS resumable upload protocol, which automatically resumes uploads after network interruptions. Total storage is separate from per-file limits.

**Can I recover deleted files?**
Yes. The Recycle Bin stores soft-deleted files with full restore capability. You can browse deleted files by original location, view deletion timestamps, and restore with one click. Permanent deletion requires explicit confirmation and is restricted to authorized roles.

**Can I share files externally?**
Yes. Growth and Enterprise tiers support secure external sharing: generate share links with optional password protection, expiration dates, and download limits. You control exactly who can access shared files and for how long.

**Can I track time against specific projects and tasks?**
Yes. Every time entry is associated with a specific project and task. This enables billable hour tracking by client or project, project-level utilization reports, and profit/loss analysis. Manual entry and session-based tracking are both supported.

**Does it support multiple currencies?**
Billing is processed through Stripe, which supports multiple currencies. Contact sales for multi-currency configuration details for your specific setup.

**Can I set up approval workflows?**
Yes. The File Management module includes an approval workflow that routes files through review steps before publishing. Each step can have assigned approvers, comments, and status tracking. Perfect for legal review, creative approval, or compliance sign-off.

---

### Security

**How is my data protected at rest and in transit?**
- **At rest:** bcrypt password hashing, encrypted file storage on your filesystem
- **In transit:** All traffic encrypted via HTTPS with automatic TLS certificate management via Caddy
- **Sessions:** JWE-encrypted (A256CBC-HS512) cookie tokens — encrypted, not just signed
- **Files:** Optional at-rest encryption on your storage infrastructure

**Do you support two-factor authentication?**
Yes. TOTP-based two-factor authentication is supported for all user roles. Users set up 2FA through their profile settings using any authenticator app (Google Authenticator, Authy, 1Password, Microsoft Authenticator, etc.). Enforce 2FA organization-wide or per-role.

**What is your backup strategy?**
MyWorkSpace provides the tools — you control the strategy. MongoDB can be backed up via mongodump, file storage via rsync or your preferred backup tool. Deployment includes backup script templates. We recommend automated daily backups with off-site storage for production deployments.

**What happens if a user enters the wrong password too many times?**
After 5 consecutive failed login attempts, the account is automatically locked for 15 minutes. This prevents brute-force attacks. Administrators can manually unlock accounts if needed. Failed attempt counters reset after successful login or after the lockout period.

**Is MyWorkSpace GDPR compliant?**
MyWorkSpace provides the technical foundation for GDPR compliance: self-hosted data control (data stays on your infrastructure), RBAC (access is role-based and auditable), audit trails (every access and modification logged), data export capabilities (export any user's data), and account deletion workflows. Organizations are responsible for implementing their specific GDPR compliance procedures on top of the platform.

**Is MyWorkSpace SOC 2 compliant?**
MyWorkSpace's technical architecture supports SOC 2 compliance requirements through access controls, audit logging, change management, and security monitoring. Organizations should conduct their own SOC 2 audit with the platform deployed on their infrastructure. The platform provides the tools — you certify the process.

**Can I set different permission levels for different users?**
Yes. MyWorkSpace implements Casbin RBAC with 9 hierarchical roles (Super Admin, Admin, Org Admin, Project Manager, Team Lead, Employee, Client, Viewer, Staff). Permissions are granular — view, upload, download, edit, delete, share, restore, archive — and can be set at the file, folder, project, and organization level.

**Can I integrate SSO?**
Yes. SAML-based single sign-on is supported through the organization security settings. Enterprise tier includes dedicated SSO configuration support and custom identity provider integration.

**How do you handle security vulnerabilities?**
We use Sentry for real-time error monitoring, conduct regular dependency audits, and follow responsible disclosure practices. Critical security patches are prioritized and deployed urgently. Customers are notified of security updates through our changelog and email notifications for critical issues.

**Is my data scanned for viruses?**
Yes. Every file upload is scanned by ClamAV integration. Infected files are automatically quarantined and flagged for administrators. This applies to all upload methods — drag-and-drop, upload dialog, and TUS resumable uploads.

**Can I see who accessed what and when?**
Yes. The audit log captures every action by every user with timestamps, IP addresses, and request correlation IDs. You can filter by user, action type, date range, and entity. Export the audit log for compliance reporting or internal investigation.

---

### Integrations

**What integrations are currently available?**

| Integration | Purpose | Status |
|---|---|---|
| Google OAuth | Social login & authentication | ✅ Active |
| GitHub OAuth | Social login & authentication | ✅ Active |
| LinkedIn OAuth | Social login & authentication | ✅ Active |
| Stripe | Payment processing, subscriptions, invoices | ✅ Active |
| Resend | Transactional email delivery | ✅ Active |
| SMTP / Nodemailer | Email delivery (fallback or primary) | ✅ Active |
| ClamAV | File virus scanning on upload | ✅ Active |
| Sentry | Real-time error monitoring and alerting | ✅ Active |
| OpenTelemetry + Prometheus | Metrics collection and observability | ✅ Active |
| Grafana | Metrics visualization and operational dashboards | ✅ Active |
| Redis / Valkey | Caching and real-time pub/sub | ✅ Active |
| RabbitMQ | Async message queue | ✅ Active |
| Vercel Analytics | Web analytics | ✅ Active |
| SAML / SSO | Single sign-on configuration | ✅ Available |

**Can I build custom integrations?**
Yes. MyWorkSpace exposes a comprehensive REST API covering all modules. The Enterprise tier includes custom integration development support. We regularly build custom integrations for enterprise clients.

**Is there an API?**
Yes. The backend exposes a REST API under `/api/` with endpoints for all modules: auth, users, tasks, projects, files, time entries, organizations, clients, billing, search, and more. API documentation is included with the platform.

**Do you have webhooks?**
Stripe webhooks are implemented for subscription lifecycle events (upgrades, cancellations, payment failures). Custom webhook endpoints can be added for your specific integration needs — our API makes it possible to trigger custom actions on platform events.

**Can I connect MyWorkSpace to my existing tools?**
Through the API and integrations listed above, yes. For tools not listed in our integrations table, custom integration is possible through the REST API. Enterprise tier includes dedicated integration support.

**Is there an App Store?**
The platform includes an App Store hub (`/appstore`) that serves as the central directory for discovering and managing integrations. New integrations appear here as they become available.

---

### Billing & Plans

**What is the pricing model?**
MyWorkSpace uses a tiered pricing model with Free, Growth, and Enterprise tiers. Because MyWorkSpace is self-hosted, there are no per-seat monthly fees — you pay for the platform (once), not for each user (monthly).

**Is there a free plan?**
Yes. The Free tier supports up to 10 team members with 5 GB storage, core features, and no time limit. No credit card required. It's a genuine free tier, not a time-limited trial.

**Why don't you charge per user?**
Per-seat pricing punishes growth. Every time you hire, your costs go up, creating friction between growing your team and managing your budget. We believe you should pay for the platform and get unlimited use of it — whether you have 10 employees or 500.

**What payment methods do you accept?**
All major credit and debit cards, processed securely through Stripe. Enterprise tier also supports invoicing, purchase orders, and bank transfers.

**Can I switch plans?**
Yes. Upgrade at any time — your data, projects, and configuration carry over seamlessly. Downgrades are processed at the end of the current billing period. No data loss occurs during plan changes.

**Do you offer refunds?**
Yes. We offer a 14-day money-back guarantee on all paid tiers. If MyWorkSpace isn't the right fit, we'll refund your payment in full — no questions asked, no paperwork required.

**Do you offer discounts for non-profits or educational institutions?**
Yes. Contact our sales team for discounted pricing for qualified non-profit organizations and accredited educational institutions. We believe in making professional tools accessible.

**Can I self-host on a free cloud tier?**
Some cloud providers offer free tiers with enough resources to run MyWorkSpace for small teams. For example, an Oracle Cloud free tier VM or an AWS t2.micro can handle a small evaluation instance. For production use, we recommend at minimum a 2 GB RAM instance.

**What happens if I need more storage?**
Growth tier starts at 50 GB. Additional storage can be purchased in 10 GB blocks. Enterprise tier offers custom (unlimited) storage. Free tier includes 5 GB.

---

### Support

**What support options are available?**

| Tier | Support Level | Response Time (Business Hours) |
|---|---|---|
| Free | Community support (documentation + forums) | Best effort |
| Growth | Email + Phone | 12 hours |
| Enterprise | Dedicated Account Manager | 4 hours (24/7 escalation available) |

**Do you offer deployment support?**
- **Free tier:** Documentation, community guides, and setup scripts
- **Growth tier:** Deployment guides, best-practice documentation, and email support for deployment issues
- **Enterprise tier:** White-glove deployment assistance where our engineers deploy and configure the platform on your infrastructure

**Is there a community or user forum?**
Yes. Community support is available through our documentation and community forums. Users share tips, ask questions, and help each other. Our team monitors the forums regularly.

**What are your support hours?**
Standard business hours support is available Monday through Friday, 9 AM to 6 PM in your local time zone. Enterprise tier includes extended hours and on-call escalation for critical production issues, 24/7/365.

**How do I report a bug?**
Report bugs through our support channels (email or support portal) or GitHub issue tracker. Critical security issues should be reported through priority support channels for immediate attention. We acknowledge all bug reports within 24 hours.

**Do you offer training?**
Enterprise tier includes a training and handover session. Growth tier includes documentation and best-practice guides. Custom training sessions are available as an add-on for any tier.

**Can I get help migrating from my current tools?**
Enterprise tier includes migration assistance. Growth and Free tiers have access to migration guides and API documentation to support self-service migration. Many customers find the parallel run approach (run MyWorkSpace alongside existing tools for a transition period) works well.

---

### Platform & Technical

**What is the tech stack?**
- **Frontend:** Next.js 16 (App Router), React 19, Tailwind CSS 4, shadcn/ui, Radix UI
- **Backend:** Express 5 with TypeScript, modular architecture
- **Database:** MongoDB 7 with Mongoose ORM, replica set support
- **Caching:** Redis 7 / Valkey with 7-tier caching pipeline (NodeCache → Valkey → Varnish → Nginx → ATS → FS-Cache)
- **Message Queue:** RabbitMQ with Agenda.js for scheduled jobs
- **Real-Time:** Socket.IO with Redis adapter for horizontal scaling
- **File Upload:** TUS Protocol (resumable)
- **Auth:** next-auth 5, JWT, JWE (A256CBC-HS512), bcryptjs, Casbin RBAC
- **Testing:** Jest, ts-jest, supertest, mongodb-memory-server
- **Monitoring:** OpenTelemetry, Prometheus, Grafana, Sentry

**How is performance at scale?**
MyWorkSpace is engineered for horizontal scalability. The 7-tier caching pipeline handles high-traffic scenarios with sub-100ms API response times for cached endpoints. MongoDB supports sharding and replica sets for data scaling. Socket.IO with Redis adapter enables horizontally scaled real-time connections for thousands of concurrent users.

**How many concurrent users can the platform handle?**
On recommended production hardware (4+ cores, 8 GB RAM), MyWorkSpace handles 500+ concurrent users with good performance. With horizontal scaling (multiple application instances behind a load balancer), this extends to thousands of concurrent users.

**Is there an API for custom development?**
Yes. A full REST API is available under `/api/` covering all platform modules: auth, users, tasks, projects, files, time entries, organizations, clients, billing, search, and more. The API is versioned and documented.

**Can I extend the platform with custom features?**
Growth and Enterprise tiers support custom feature requests. Enterprise tier includes dedicated development support for custom integrations, feature extensions, and platform modifications.

**How often is the platform updated?**
We ship regular updates with new features, performance improvements, security patches, and bug fixes. Major releases are monthly. Security patches are deployed as needed — same-day for critical vulnerabilities. All updates are documented in our changelog.

**Is MyWorkSpace open source?**
MyWorkSpace is a proprietary, commercial product. However, we are transparent about our roadmap, changelog, and security practices. Enterprise customers can discuss source code access as part of their agreement.

**Can I run MyWorkSpace in a high-availability configuration?**
Yes. MongoDB supports replica sets for database HA. Application instances can be horizontally scaled behind a load balancer. Redis/Valkey supports cluster mode. The architecture supports multi-AZ and multi-region deployments. Enterprise tier includes guidance on HA configuration.

---

### Still Have Questions?

**Can't find what you're looking for?**

We understand — every organization is unique. If your question isn't answered here, reach out. Our team typically responds within 24 hours (4 hours for Enterprise clients).

**Common topics not covered above:**
- Custom feature requests and development timelines
- Specific compliance requirements (HIPAA, PCI-DSS, etc.)
- Multi-region or multi-organization deployment configurations
- Migration planning and data import assistance
- White-label or custom branding options
- Professional services and consulting engagements

**Contact Us:** /contact
**Book a Demo:** /demo
**Documentation:** /docs
**Community Forum:** /community
