# User Acceptance Testing Plan — MyWorkSpace GA

## Scope

Validate all application functionality across every role, permission level, and tenant before General Availability launch.

---

## 1. Role-Based Access Control Testing

### 1.1 Roles Under Test

| Role | Abbreviation | Permissions | Test User |
|------|-------------|-------------|-----------|
| Super Admin | SA | Full system access | `superadmin@test.com` |
| Org Admin | OA | Org-level management | `orgadmin@test.com` |
| Manager | MGR | Team/project management | `manager@test.com` |
| Staff | STF | Task execution | `staff@test.com` |
| Client | CLT | Limited client portal | `client@test.com` |

### 1.2 Permission Matrix Validation

| Page/Feature | SA | OA | MGR | STF | CLT |
|-------------|-----|-----|------|------|------|
| System Settings | ✓ | ✗ | ✗ | ✗ | ✗ |
| Organization Settings | ✓ | ✓ | ✗ | ✗ | ✗ |
| User Management | ✓ | ✓ | ✗ | ✗ | ✗ |
| Team Management | ✓ | ✓ | ✓ | ✗ | ✗ |
| Projects | ✓ | ✓ | ✓ | ✓ | ✗ |
| Tasks | ✓ | ✓ | ✓ | ✓ | ✓ |
| Time Tracking | ✓ | ✓ | ✓ | ✓ | ✗ |
| File Manager | ✓ | ✓ | ✓ | ✓ | ✓ |
| Billing | ✓ | ✓ | ✗ | ✗ | ✓ |
| Reports | ✓ | ✓ | ✓ | ✗ | ✗ |
| Client Portal | ✓ | ✓ | ✗ | ✗ | ✓ |
| Admin Dashboard | ✓ | ✓ | ✗ | ✗ | ✗ |

**Test scenarios:**
- Each role attempts to access every route
- Verify unauthorized routes return 403
- Verify API returns correct scoped data per role
- Verify UI hides/shows navigation items per role

---

## 2. Authentication & Authorization

### 2.1 Login Flows

| TC-ID | Scenario | Steps | Expected |
|-------|----------|-------|----------|
| AUTH-01 | Email/password login | Navigate to /login, enter credentials | Token received, redirect to dashboard |
| AUTH-02 | Invalid email | Submit unknown email + any password | 401 error, "Invalid credentials" |
| AUTH-03 | Wrong password | Submit correct email + wrong password | 401 error, lockout after 5 attempts |
| AUTH-04 | Account locked | Fail login 5 times | 423 error, "Account locked for 15 min" |
| AUTH-05 | Deactivated account | Login with deactivated user | 403 error, "Account deactivated" |
| AUTH-06 | Session persistence | Login, refresh page, navigate | Session maintained across navigation |
| AUTH-07 | Logout | Click logout | Session cleared, redirect to /login |
| AUTH-08 | Token expiry | Wait for token expiry (or use expired token) | 401, redirect to /login |
| AUTH-09 | 2FA flow (if enabled) | Login with 2FA user | Temp token, 2FA prompt, full access after verification |
| AUTH-10 | Client login | Login as client user | Redirect to /client/dashboard |

### 2.2 Authorization Enforcement

| TC-ID | Scenario | Steps | Expected |
|-------|----------|-------|----------|
| AUTH-11 | Direct URL access (unauthorized) | Navigate to /admin/settings as Staff | 403 or redirect |
| AUTH-12 | API direct access (unauthorized) | GET /api/admin/users as Staff | 403 Forbidden |
| AUTH-13 | No auth token | Call any API without Bearer token | 401 Unauthorized |
| AUTH-14 | Expired JWT | Call API with expired token | 401 "Invalid or expired token" |
| AUTH-15 | Modified JWT | Call API with tampered token | 401 "Invalid signature" |

---

## 3. Organization & User Management

### 3.1 Organization CRUD

| TC-ID | Scenario | Steps | Expected |
|-------|----------|-------|----------|
| ORG-01 | Create organization | Fill all fields, submit | 201, org created, auto-generated slug |
| ORG-02 | Edit organization | Change name, logo, settings | 200, fields updated |
| ORG-03 | Update org plan | Change subscription plan | Plan updated, features unlocked/locked |
| ORG-04 | Org slug uniqueness | Try duplicate slug | Error, auto-suffix added |
| ORG-05 | Delete organization | Confirm deletion cascade | Soft delete, data preserved for 30 days |

### 3.2 User CRUD

| TC-ID | Scenario | Steps | Expected |
|-------|----------|-------|----------|
| USER-01 | Invite user (email) | Send invitation to new email | Invitation email sent, user in "pending" state |
| USER-02 | Invite user (existing platform) | Invite existing user | Added to org, notification sent |
| USER-03 | Accept invitation | Click invitation link | Account activated, redirected to org |
| USER-04 | Deactivate user | Deactivate active user | User can't login, active sessions terminated |
| USER-05 | Change user role | Promote Staff → Manager | Permissions updated immediately |
| USER-06 | Password reset | Request reset email | Email sent, token valid for 1 hour |
| USER-07 | Update profile | Change name, avatar, preferences | Profile updated across system |

### 3.3 Team Management

| TC-ID | Scenario | Steps | Expected |
|-------|----------|-------|----------|
| TEAM-01 | Create team | Set name, description | Team created, empty member list |
| TEAM-02 | Add members to team | Select users, add | Members appear in team roster |
| TEAM-03 | Remove member from team | Remove user | User removed from team, projects unaffected |
| TEAM-04 | Delete team | Confirm delete | Team removed, members unlinked |
| TEAM-05 | Team-based permissions | Assign task to team | All team members can view/edit |

---

## 4. Project & Task Management

### 4.1 Project CRUD

| TC-ID | Scenario | Steps | Expected |
|-------|----------|-------|----------|
| PROJ-01 | Create project | Fill name, description, dates, team | 201, project visible in list |
| PROJ-02 | Edit project | Modify fields, change dates | All fields updated |
| PROJ-03 | Project status workflow | Draft → Active → Completed → Archived | Status transitions logged |
| PROJ-04 | Project with deadlines | Set start/end dates | Gantt chart reflects timeline |
| PROJ-05 | Project assignment | Assign to team/individual | Assignment permissions enforced |
| PROJ-06 | Delete project | Confirm delete | Soft delete, data preserved |

### 4.2 Task CRUD

| TC-ID | Scenario | Steps | Expected |
|-------|----------|-------|----------|
| TASK-01 | Create task | Set title, description, assignee, due date | 201, appears in assignee's list |
| TASK-02 | Rich text description | Use Tiptap editor formatting | HTML rendered correctly |
| TASK-03 | Task status workflow | Todo → In Progress → Review → Done | Status transitions logged |
| TASK-04 | Assign task | Change assignee | Notification sent to new assignee |
| TASK-05 | Task dependencies | Set dependency on another task | Blocked indicator shown |
| TASK-06 | Bulk task operations | Select 5 tasks, change status | All 5 updated |
| TASK-07 | Task comments | Add comment, @mention user | Notification to mentioned user |
| TASK-08 | Task attachments | Upload file to task | File linked to task |
| TASK-09 | Task filters | Filter by status, assignee, date | Correct filtered results |
| TASK-10 | Recurring tasks | Create daily/weekly recurring task | Instances generated per schedule |

### 4.3 Time Tracking

| TC-ID | Scenario | Steps | Expected |
|-------|----------|-------|----------|
| TIME-01 | Start timer | Click "Start" on task | Timer running, entry created |
| TIME-02 | Pause timer | Click "Pause" | Timer pauses, duration tracked |
| TIME-03 | Resume timer | Click "Resume" | Timer continues from paused |
| TIME-04 | Stop timer | Click "Stop" | Entry finalized with duration |
| TIME-05 | Manual entry | Add time entry manually | Entry created, editable |
| TIME-06 | Billable/non-billable | Toggle billable flag | Flag reflected in reports/invoices |
| TIME-07 | Time entry approval | Manager approves entry | Status changes, notification sent |
| TIME-08 | Weekly timesheet | View weekly summary | Correct total hours per project |

---

## 5. File Management

### 5.1 File Operations

| TC-ID | Scenario | Steps | Expected |
|-------|----------|-------|----------|
| FILE-01 | Upload single file | Select file, upload | File appears in list with metadata |
| FILE-02 | Upload large file | Upload 500MB file | Progress indicator, TUS resumable |
| FILE-03 | Upload paused/resumed | Pause upload, resume | Continues from last chunk |
| FILE-04 | Multiple file upload | Select 10 files, upload | All appear in list |
| FILE-05 | Create folder | Create nested folders | Folder hierarchy maintained |
| FILE-06 | Rename file | Edit file name | Name updated, extension preserved |
| FILE-07 | Move file | Drag to different folder | File appears in new location |
| FILE-08 | Copy file | Copy to different folder | Duplicate created |
| FILE-09 | Delete file | Move to trash | File in trash folder |
| FILE-10 | Permanent delete | Empty trash | File permanently removed |
| FILE-11 | File preview | Click on image/PDF | Preview renders in-browser |
| FILE-12 | File versioning | Upload new version | Version history maintained |
| FILE-13 | Search files | Search by name, type, folder | Correct results returned |

### 5.2 File Sharing

| TC-ID | Scenario | Steps | Expected |
|-------|----------|-------|----------|
| SHARE-01 | Share link generation | Create share link | Unique URL generated |
| SHARE-02 | Share with expiry | Set 24-hour expiry | Link expires after 24h |
| SHARE-03 | Share with password | Set password protection | Password required to access |
| SHARE-04 | Share download limit | Set 5 download max | Link invalid after 5 downloads |
| SHARE-05 | Access shared file | Open share link | File downloads (or previews) |
| SHARE-06 | Revoke share | Delete share link | Link returns 404 |
| SHARE-07 | Bulk share | Share folder | All files in folder accessible |

### 5.3 File Categories

| TC-ID | Scenario | Steps | Expected |
|-------|----------|-------|----------|
| FILE-CAT-01 | General upload | Upload without category | Defaults to "general" |
| FILE-CAT-02 | Profile document | Upload resume, offer letter | Category = "profile" |
| FILE-CAT-03 | Report upload | Upload report export | Category = "report" |
| FILE-CAT-04 | Category filter | Filter by category | Only files of selected category shown |
| FILE-CAT-05 | Category tab navigation | Click All/Profile/Report/General | Correct tab selected, files filtered |

---

## 6. Billing & Invoicing

| TC-ID | Scenario | Steps | Expected |
|-------|----------|-------|----------|
| BILL-01 | View billing dashboard | Navigate to billing | Current plan, usage, invoices displayed |
| BILL-02 | Upgrade plan | Select higher tier | Plan upgraded, prorated charge applied |
| BILL-03 | Downgrade plan | Select lower tier | Plan changes at next billing cycle |
| BILL-04 | View invoice | Open invoice detail | All line items, amounts, status correct |
| BILL-05 | Download invoice PDF | Click download | PDF generated with Stripe |
| BILL-06 | Payment method | Add credit card | Card saved, default updated |
| BILL-07 | Payment method removal | Remove card | Card removed from profile |
| BILL-08 | Invoice payment | Pay open invoice | Status changes to "paid" |
| BILL-09 | Past due notification | Allow invoice to become past due | Email notification, UI banner |
| BILL-10 | Subscription cancellation | Cancel subscription | Access continues until period end |

---

## 7. Notifications & Real-time

| TC-ID | Scenario | Steps | Expected |
|-------|----------|-------|----------|
| NOTIF-01 | Task assignment | Assign task to user | Push notification + in-app badge |
| NOTIF-02 | Task @mention | Comment with @username | Notification to mentioned user |
| NOTIF-03 | File share notification | Share file with user | Notification received |
| NOTIF-04 | Billing notification | Invoice generated | Email + in-app notification |
| NOTIF-05 | Unread count badge | Receive notifications | Badge count increments |
| NOTIF-06 | Mark single read | Click notification | Badge decrements |
| NOTIF-07 | Mark all read | Click "Mark all read" | All notifications read, badge = 0 |
| NOTIF-08 | Notification preferences | Disable email notifications | No emails, in-app still works |
| NOTIF-09 | Real-time updates | Another user edits same task | Changes appear without refresh |
| NOTIF-10 | Push notifications | Browser push permission | Notifications arrive when tab unfocused |

---

## 8. Reports & Analytics

| TC-ID | Scenario | Steps | Expected |
|-------|----------|-------|----------|
| RPT-01 | Dashboard loads | Navigate to dashboard | All widgets render with data |
| RPT-02 | Time report | Generate time report by project/team | Correct hours aggregated |
| RPT-03 | Project progress | View project Gantt chart | Timeline with tasks displayed |
| RPT-04 | User activity report | Select user, date range | Activity timeline, sessions, duration |
| RPT-05 | File storage report | View storage analytics | Usage by category, user, trends |
| RPT-06 | Export report | Click export CSV/PDF | File downloads with correct data |
| RPT-07 | Report date range | Change date filter | Data recalculates for new range |
| RPT-08 | Dashboard refresh | Click refresh | Latest data loaded |

---

## 9. Client Portal

| TC-ID | Scenario | Steps | Expected |
|-------|----------|-------|----------|
| CLIENT-01 | Client login | Login as client user | Redirect to /client/dashboard |
| CLIENT-02 | View tasks | Navigate to tasks | Only assigned tasks visible |
| CLIENT-03 | View files | Open shared folder | Only shared files accessible |
| CLIENT-04 | View invoices | Navigate to billing | Own invoices visible |
| CLIENT-05 | Download invoice | Click download | PDF downloads |
| CLIENT-06 | Workspace stats | View dashboard | Folder/file counts correct |
| CLIENT-07 | Cannot see other clients | Attempt to access other client data | 403 or empty result |

---

## 10. Tenant Isolation

| TC-ID | Scenario | Steps | Expected |
|-------|----------|-------|----------|
| TENANT-01 | Cross-org data isolation | Org A user queries API | Only Org A data returned |
| TENANT-02 | Cross-org file access | Org A tries Org B file URL | 403 Forbidden |
| TENANT-03 | Cross-org user search | Search for user in different org | Not found |
| TENANT-04 | Clone org | Create new org, populate | Data isolated from source |
| TENANT-05 | User in multiple orgs | Switch between orgs | Separate data per org context |

---

## 11. Client Authentication Portal

| TC-ID | Scenario | Steps | Expected |
|-------|----------|-------|----------|
| CLIENT-AUTH-01 | Client registration | Register via client portal | Account created, verification email sent |
| CLIENT-AUTH-02 | Email verification | Click verification link | Email marked verified |
| CLIENT-AUTH-03 | Password change | Change password | New password effective immediately |
| CLIENT-AUTH-04 | Forgot password | Request reset, click link | Password reset, can login |
| CLIENT-AUTH-05 | Profile update | Update name, preferences | Profile updated |
| CLIENT-AUTH-06 | Session management | Active sessions visible | Can view and terminate sessions |

---

## 12. WhatsApp Integration

| TC-ID | Scenario | Steps | Expected |
|-------|----------|-------|----------|
| WHATSAPP-01 | Connection status | View WhatsApp settings | Status: Connected/Disconnected |
| WHATSAPP-02 | Start/stop client | Toggle WhatsApp client | Status changes accordingly |
| WHATSAPP-03 | Send notification | Trigger notification with WhatsApp enabled | WhatsApp message delivered |
| WHATSAPP-04 | QR code scan | Generate QR for first connection | QR renders, can be scanned |

---

## 13. Edge Cases & Error Handling

| TC-ID | Scenario | Steps | Expected |
|-------|----------|-------|----------|
| EDGE-01 | Concurrent edit | Two users edit same task simultaneously | Last write wins, no data corruption |
| EDGE-02 | Network interruption | Kill network during upload | Upload resumes on reconnect (TUS) |
| EDGE-03 | Empty state | New org with no data | Proper empty states with guidance |
| EDGE-04 | Maximum field length | Exceed character limits | Validation error |
| EDGE-05 | Special characters | Input XSS/HTML in fields | Sanitized, no injection |
| EDGE-06 | Rate limit exceeded | Rapid requests | 429 response, retry-after header |
| EDGE-07 | Large dataset | List with 10,000 items | Pagination, no performance degradation |
| EDGE-08 | File type restriction | Upload .exe file | Rejected by validation |
| EDGE-09 | Duplicate submission | Double-click submit | Idempotency prevents duplicates |
| EDGE-10 | Browser back button | Navigate, use back | State maintained, no stale data |

---

## UAT Sign-off Criteria

| Criteria | Minimum Pass Rate | Owner |
|----------|-------------------|-------|
| All Critical/P0 tests | 100% | QA Lead |
| All High/P1 tests | 100% | QA Lead |
| All Medium/P2 tests | > 90% | Product Manager |
| All Low/P3 tests | > 70% | Product Manager |
| Each role verified | All critical flows | QA Lead |
| Permission matrix | 100% of combinations | Security Lead |
| Data isolation | 100% of scenarios | Security Lead |

### Sign-off

```diff
+ Q.A Lead: _________________ Date: _________
+ Product Manager: _________________ Date: _________
+ Security Lead: _________________ Date: _________
+ CTO: _________________ Date: _________
```
