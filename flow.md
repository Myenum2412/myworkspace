# MyWorkSpace — Complete Route Dependency Graph

```
═══════════════════════════════════════════════════════════════════
                ROUTE PROTECTION LAYER (middleware.ts)
═══════════════════════════════════════════════════════════════════

Unauthenticated → /login   Authenticated → Route Check   Role Check
     │                            │                            │
     ├── PUBLIC (no auth)         │                            │
     │   ├── /login               │                            │
     │   ├── /signup              ├── /orgmenu/* ──────────────┤
     │   ├── /signup-mongo        │     ┌─ Role == ORG_MENU_ADMIN? ──→ Allow
     │   ├── /forgot-password     │     ├─ Role == SUPER_ADMIN? ─────→ Allow
     │   └── /pricing             │     └─ Email == ADMIN_EMAIL? ────→ Allow
     │                            │                  │ No
     ├── / → root                 │                  └──→ Redirect /dashboard
     │   ├── Authed → /dashboard  │
     │   └── Unauthed → /login    ├── All other routes ──→ Has session?
     │                            │     ├── Yes → Allow
     └── API / _next / favicon    │     └── No → Redirect /login
         └── Always pass through  │

═══════════════════════════════════════════════════════════════════
                  LAYER 1: AUTH & PUBLIC PAGES
═══════════════════════════════════════════════════════════════════

/
├── /login                           [public]
│   └── Methods: Credentials | Google OAuth | LinkedIn OAuth | GitHub OAuth
├── /signup                          [public]
│   └── On success → Create User + Organization + OrgMember(admin) → /dashboard
├── /signup-mongo                    [public]
│   └── Alternative signup using direct MongoDB server action
├── /forgot-password                 [public]
│   └── Request reset → Email link → New password
├── /pricing                         [public]
│   └── View plans → /signup
└── /auth/role-redirect
    └── Post-auth → determine destination based on role

═══════════════════════════════════════════════════════════════════
                   LAYER 2: MAIN APPLICATION (AppSidebar)
═══════════════════════════════════════════════════════════════════

/dashboard (PLATFORM root)
├── /overview (Task Allocation)
│   ├── /teamtasks
│   ├── /alltasks
│   ├── /mytasks
│   ├── /savedtasks
│   └── /upcomingtasks
│
├── /employees
│   ├── /addemployees
│   ├── /staffs ←── NOTE: separate sidebar, see Layer 3
│   ├── /teams
│   ├── /departments
│   └── /terminated
│
├── /projects
│   └── /addprojects
│
├── /clients
│
├── /approvals
│   ├── /approvals/approved
│   └── /approvals/rejected
│
├── /time-tracker
│   ├── /my-time
│   ├── /team-time
│   └── /time-reports
│
├── /files
│   ├── /upload
│   ├── /shared
│   └── /recycle-bin
│
├── /reports
│
├── /calendar
│
├── /settings
│
├── /profile
│
└── 🔗 ADMINISTRATION (email-gated)
    └── /orgmenu → see Layer 4

═══════════════════════════════════════════════════════════════════
     LAYER 3: STAFF MANAGEMENT (StaffSidebar — /staffs & children)
═══════════════════════════════════════════════════════════════════

/staffs
│
├── ✅ EXISTS as page route
│
├── SIDEBAR NAV LINKS (as defined in staff-sidebar.tsx)
│   │
│   ├── 🟢 /staffs ───────────────────────── ✅ Route EXISTS
│   │   └── Dashboard overview
│   │
│   ├── 🔴 /staffs/activity ─────────────── ❌ ROUTE MISSING
│   │   └── Referenced in sidebar, no page.tsx
│   │
│   ├── 🔴 /staffs/list ─────────────────── ❌ ROUTE MISSING
│   │   └── Directory view — no page.tsx
│   │
│   ├── 🔴 /staffs/add ──────────────────── ❌ ROUTE MISSING
│   │   └── Add staff form — no page.tsx
│   │
│   ├── 🔴 /staffs/schedule ─────────────── ❌ ROUTE MISSING
│   │   └── Shift management — no page.tsx
│   │
│   ├── 🔴 /staffs/time-off ─────────────── ❌ ROUTE MISSING
│   │   └── Time off requests — no page.tsx
│   │
│   ├── 🔴 /staffs/attendance ───────────── ❌ ROUTE MISSING
│   │   └── Today's attendance — no page.tsx
│   │
│   ├── 🔴 /staffs/attendance/reports ───── ❌ ROUTE MISSING
│   │   └── Attendance reports — no page.tsx
│   │
│   ├── 🟢 /alltasks ────────────────────── ✅ Route EXISTS
│   │   └── Shared with AppSidebar
│   │
│   ├── 🟢 /mytasks ─────────────────────── ✅ Route EXISTS
│   │   └── Shared with AppSidebar
│   │
│   ├── 🟢 /teamtasks ───────────────────── ✅ Route EXISTS
│   │   └── Shared with AppSidebar
│   │
│   ├── 🟢 /upcomingtasks ───────────────── ✅ Route EXISTS
│   │   └── Shared with AppSidebar
│   │
│   ├── 🔴 /staffs/performance ──────────── ❌ ROUTE MISSING
│   │   └── Performance reviews — no page.tsx
│   │
│   ├── 🔴 /staffs/performance/goals ────── ❌ ROUTE MISSING
│   │   └── Goals tracking — no page.tsx
│   │
│   ├── 🔴 /staffs/settings ─────────────── ❌ ROUTE MISSING
│   │   └── General settings — no page.tsx
│   │
│   └── 🔴 /staffs/settings/roles ───────── ❌ ROUTE MISSING
│       └── Role management — no page.tsx

═══════════════════════════════════════════════════════════════════
             LAYER 4: ADMIN PANEL (OrgSidebar — /orgmenu/*)
═══════════════════════════════════════════════════════════════════

/orgmenu (requires ORG_MENU_ADMIN / SUPER_ADMIN / ADMIN_EMAIL)
│
├── 🟢 /orgmenu ─────────────────────────────────── ✅ EXISTS
│   └── Dashboard overview (system-wide stats)
│
├── 🟢 /orgmenu/analytics ───────────────────────── ✅ EXISTS
│   └── Analytics dashboard
│
├── 🟢 /orgmenu/org ─────────────────────────────── ✅ EXISTS
│   ├── 🟢 /orgmenu/org/billing ─────────────────── ✅ EXISTS
│   └── 🟢 /orgmenu/org/plans ───────────────────── ✅ EXISTS
│
├── 🟢 /orgmenu/members ─────────────────────────── ✅ EXISTS
│   ├── 🟢 /orgmenu/members/invite ──────────────── ✅ EXISTS
│   └── 🟢 /orgmenu/members/roles ───────────────── ✅ EXISTS
│
├── 🟢 /orgmenu/audit ───────────────────────────── ✅ EXISTS
│   └── 🟢 /orgmenu/audit/exports ───────────────── ✅ EXISTS
│
├── 🟢 /orgmenu/reports ─────────────────────────── ✅ EXISTS
│   ├── 🟢 /orgmenu/reports/usage ───────────────── ✅ EXISTS
│   └── 🟢 /orgmenu/reports/activity ────────────── ✅ EXISTS
│
├── 🟢 /orgmenu/security ────────────────────────── ✅ EXISTS
│   ├── 🟢 /orgmenu/security/policies ───────────── ✅ EXISTS
│   ├── 🟢 /orgmenu/security/sso ────────────────── ✅ EXISTS
│   └── 🟢 /orgmenu/security/api-keys ───────────── ✅ EXISTS
│
├── 🟢 /orgmenu/settings ────────────────────────── ✅ EXISTS
│   ├── 🟢 /orgmenu/settings/integrations ───────── ✅ EXISTS
│   └── 🟢 /orgmenu/settings/notifications ──────── ✅ EXISTS
│
└── 🟢 /orgmenu/profile ─────────────────────────── ✅ EXISTS

═══════════════════════════════════════════════════════════════════
                     LAYER 5: COMMON PAGES
═══════════════════════════════════════════════════════════════════

/settings         ✅ Shared across roles
/profile          ✅ Shared across roles
/calendar         ✅ Shared across roles
/not-found        ✅ 404 fallback

═══════════════════════════════════════════════════════════════════
              /workspace — DOES NOT EXIST
═══════════════════════════════════════════════════════════════════

🔴 /workspace ─────────────────────────────────── ❌ ROUTE MISSING
    └── No directory or page.tsx found anywhere in frontend/app/
    └── "workspace" only appears in:
        ├── App name "MyWorkSpace" (layouts, sidebars)
        ├── orgSlug default "myworkspace" (settings page)
        └── metadataBase URL "https://myworkspace.io"
    └── No sidebar link references it either

═══════════════════════════════════════════════════════════════════
                  CROSS-ROUTE CONNECTIONS
═══════════════════════════════════════════════════════════════════

              ╔═══════════════════════════╗
              ║       /dashboard          ║
              ╚═══════╦═══════════╦═══════╝
                      ║           ║
         ┌────────────╣           ╠──────────────┐
         ▼            ▼           ▼              ▼
   ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐
   │ /tasks/* │ │/employees│ │/projects │ │ /clients │
   │   (5)    │ │  /teams  │ │/addproj  │ │          │
   └────┬─────┘ └────┬─────┘ └────┬─────┘ └──────────┘
        │            │           │
        ▼            ▼           ▼
   ┌──────────┐ ┌──────────┐ ┌──────────┐
   │ /time-*  │ │ /staffs  │ │  /clients│
   │  (4)     │ │  (17ref) │ │          │
   └────┬─────┘ └────┬─────┘ └──────────┘
        │            │
        ▼            ▼
   ┌──────────┐ ┌──────────┐
   │/approvals│ │/alltasks │
   │  (3)     │ │ /mytasks │
   └──────────┘ │/teamtasks│
                │/upcoming │
                └──────────┘

═══════════════════════════════════════════════════════════════════
                CONNECTION STATUS SUMMARY
═══════════════════════════════════════════════════════════════════

CONNECTION                           FROM              TO              STATUS
─────────────────────────────────────────────────────────────────────────────
Navigation link                    /dashboard       /employees        ✅
Navigation link                    /dashboard       /projects         ✅
Navigation link                    /dashboard       /clients          ✅
Navigation link                    /dashboard       /approvals        ✅
Navigation link                    /dashboard       /time-tracker     ✅
Navigation link                    /dashboard       /files            ✅
Navigation link                    /dashboard       /settings         ✅
Navigation link                    /dashboard       /orgmenu          ✅ (gated)
Navigation link (staff sidebar)    /staffs          /alltasks         ✅
Navigation link (staff sidebar)    /staffs          /mytasks          ✅
Navigation link (staff sidebar)    /staffs          /teamtasks        ✅
Navigation link (staff sidebar)    /staffs          /upcomingtasks    ✅
Sidebar → actual route             /staffs          /staffs/activity  ❌ BROKEN
Sidebar → actual route             /staffs          /staffs/list      ❌ BROKEN
Sidebar → actual route             /staffs          /staffs/add       ❌ BROKEN
Sidebar → actual route             /staffs          /staffs/schedule  ❌ BROKEN
Sidebar → actual route             /staffs          /staffs/time-off  ❌ BROKEN
Sidebar → actual route             /staffs          /staffs/attendance ❌ BROKEN
Sidebar → actual route             /staffs          /staffs/...reports ❌ BROKEN
Sidebar → actual route             /staffs          /staffs/performance ❌ BROKEN
Sidebar → actual route             /staffs          /staffs/...goals  ❌ BROKEN
Sidebar → actual route             /staffs          /staffs/settings  ❌ BROKEN
Sidebar → actual route             /staffs          /staffs/...roles  ❌ BROKEN
Workspace route                    ANY              /workspace       ❌ MISSING
Employee→Staff bridge              /employees       /staffs          ❌ NO DIRECT LINK
Staff→Employee bridge              /staffs          /employees       ❌ NO DIRECT LINK
Orgmenu→App bridge                 /orgmenu         /dashboard       ❌ NO BACK-LINK
Calendar connection                /calendar        (any)            ❌ STANDALONE

═══════════════════════════════════════════════════════════════════
                 MISSING ROUTES (BROKEN LINKS)
═══════════════════════════════════════════════════════════════════

StaffSidebar references 15 routes, only 5 exist:
  ┌──────────────────────────────────────────────────┐
  │ REFERENCED IN SIDEBAR          PAGE EXISTS?      │
  ├──────────────────────────────────────────────────┤
  │ /staffs                         ✅ YES           │
  │ /staffs/activity                ❌ NO            │
  │ /staffs/list                    ❌ NO            │
  │ /staffs/add                     ❌ NO            │
  │ /staffs/schedule                ❌ NO            │
  │ /staffs/time-off                ❌ NO            │
  │ /staffs/attendance              ❌ NO            │
  │ /staffs/attendance/reports      ❌ NO            │
  │ /alltasks                       ✅ YES (shared)  │
  │ /mytasks                        ✅ YES (shared)  │
  │ /teamtasks                      ✅ YES (shared)  │
  │ /upcomingtasks                  ✅ YES (shared)  │
  │ /staffs/performance             ❌ NO            │
  │ /staffs/performance/goals       ❌ NO            │
  │ /staffs/settings                ❌ NO            │
  │ /staffs/settings/roles          ❌ NO            │
  └──────────────────────────────────────────────────┘

═══ LEGEND ═══════════════════════════════════════════════════════

  🟢 ✅ = Route exists (page.tsx found)
  🔴 ❌ = Route missing (no page.tsx)
  🔗    = Direct navigation link exists between routes
  ──→   = Connection flow direction
  (gated) = Requires role/email check before access
  (shared) = Route accessible from multiple sidebars
  BROKEN  = Sidebar references a route that does not exist
  MISSING = Route entirely absent from the app
  NO DIRECT LINK = Routes exist but no navigation between them
```
