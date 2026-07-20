# Task Management System — Complete Workflow

## Task Types

The system supports **four active types** + **one draft type**:

| Type | Purpose | Visibility |
|------|---------|------------|
| **Individual** | Assigned to exactly one employee | Assignee + Creator + Admin |
| **Team** | Collaborative work by a team | Team Members + Team Head + Admin |
| **Common** | Shared organizational tasks | Selected users/groups + Admin |
| **Upcoming** | Future scheduled tasks | Creator + Admin (until activation) |
| **Draft** | Saved incomplete tasks | Creator only |

> Tasks **never** move between categories unless explicitly converted by an authorized user (draft → any type).

---

## Complete Workflow Diagram

```
                        Create Task
                             │
                             ▼
                   Select Task Category
                             │
     ┌──────────┬────────────┼────────────┬──────────┐
     │          │            │            │          │
     ▼          ▼            ▼            ▼          ▼
 Individual   Team        Common      Upcoming    Draft
     │          │            │            │          │
     │          │            │            │          │
 Assign      Assign      Select      Set       Save Only
 Employee    Team        Users       Schedule         │
     │          │            │            │          │
     ▼          ▼            ▼            ▼          ▼
 Visibility  Team        Permission   Scheduled   Private
 Check       Validation  Check        Date Set    Draft
     │          │            │            │          │
     ▼          ▼            ▼            ▼          │
 Active     Active       Published    Scheduled   │
 Task       Team Task    Task         (inactive)  │
     │          │            │            │          │
     ▼          │            ▼            ▼          │
 Status    Team Members   Accepted   Auto-Activate  │
 Updates    Work on it               at scheduled   │
     │          │            │       time           │
     ▼          ▼            ▼            ▼          │
          Submit for    Completed    Activated       │
          Verification               → Active Task   │
               │                        │            │
               ▼                        ▼            │
         Team Head Review           Notify          │
          │          │              User            │
          ▼          ▼                               │
      Approved   Rejected                            │
          │          │                               │
          ▼          ▼                               │
      Completed  Back to Team                        │
                  (In Progress)                      │
                                                     │
          └──────────────┬───────────────────────────┘
                         │
                         ▼
                   Audit Log + Notifications
```

---

## 1. Individual Task Workflow

### Lifecycle

```
Draft → Assigned → Pending → In Progress → Completed → Closed
                                │
                    ┌───────────┴───────────┐
                    │                       │
                    ▼                       ▼
                  Hold                  Cancelled
                    │                       │
                    ▼                       ▼
                Resumed                 Reopened
```

### Status Transitions

| From | To |
|------|----|
| `draft` | `assigned` |
| `assigned` | `pending`, `hold`, `cancelled` |
| `pending` | `in_progress`, `hold`, `cancelled` |
| `in_progress` | `completed`, `hold`, `cancelled` |
| `completed` | `closed`, `reopened` |
| `hold` | `pending`, `in_progress`, `cancelled` |
| `cancelled` | `reopened` |
| `rejected` | `pending`, `in_progress` |
| `reopened` | `in_progress` |

### Rules

- **Only creator** can reassign the task
- **Assignee** can update status
- Others cannot access

### API

| Action | Endpoint |
|--------|----------|
| Create | `POST /api/tasks` with `type: "individual"` |
| Assign | `POST /api/tasks/:id/assign` with `{ assigneeId }` |
| Update status | `PATCH /api/tasks/:id/status` |

---

## 2. Team Task Workflow

### Lifecycle

```
Draft → Pending → In Progress → Submitted → Approved → Completed → Closed
                                               │
                                               ▼
                                           Rejected → In Progress
```

### Rules

- **Team members** update progress
- **Team head** approves/rejects verification
- **Admin** can override team head decisions
- Rejected tasks return to `in_progress` with **mandatory rejection reason**

### API

| Action | Endpoint |
|--------|----------|
| Create | `POST /api/tasks` with `type: "team"` and `teamId` |
| Submit | `POST /api/tasks/:id/submit-verification` |
| Approve | `POST /api/tasks/:id/approve` |
| Reject | `POST /api/tasks/:id/reject` with `{ reason }` |

### Validation

- `teamId` is **required** on creation
- Team must exist in the workspace
- Only team members can submit for verification
- Only team head (or admin) can approve/reject
- Rejection requires a reason string

---

## 3. Common Task Workflow

### Lifecycle

```
Draft → Published → Accepted → Completed → Closed
```

### Rules

- Published tasks become visible to selected users
- Only creator/admin can publish

### API

| Action | Endpoint |
|--------|----------|
| Create | `POST /api/tasks` with `type: "common"` and `selectedUserIds` |
| Publish | `POST /api/tasks/:id/publish` |

---

## 4. Upcoming Task Workflow

### Lifecycle

```
Draft → Scheduled → Activated → In Progress → Completed → Closed
                       │
                       ▼
                   Cancelled
```

### Rules

- `scheduledDate` is required
- Tasks remain invisible in My/Team/Common task views until activated
- Auto-activation runs at scheduled time via `POST /api/tasks/system/auto-activate`
- Only creator/admin can modify schedule or cancel

### API

| Action | Endpoint |
|--------|----------|
| Create | `POST /api/tasks` with `type: "upcoming"` and `scheduledDate` |
| Activate | `POST /api/tasks/:id/activate` |
| Auto-activate | `POST /api/tasks/system/auto-activate` |

---

## 5. Draft Workflow

### Lifecycle

```
Create → Save Draft (type="draft") → Publish → [individual|team|common|upcoming]
```

### Rules

- Drafts send **no notifications** and create **no emails**
- Invisible to everyone except creator (and optionally admin)
- Only creator can edit, delete, or publish

### API

| Action | Endpoint |
|--------|----------|
| Create | `POST /api/tasks` with `type: "draft"` |
| Publish | `POST /api/tasks/:id/publish-draft` with `{ targetType, assigneeId?, teamId?, selectedUserIds?, scheduledDate? }` |

---

## Visibility Matrix

| Task Type | Employee | Assigned User | Team | Team Head | HR/Admin | org_admin |
|-----------|----------|---------------|------|-----------|----------|-------------|
| Individual | ❌ | ✅ | ❌ | ❌ | ✅ | ✅ |
| Team | ❌ | ❌ | ✅ | ✅ | ✅ | ✅ |
| Common | If Included | If Included | If Included | If Included | ✅ | ✅ |
| Upcoming | ❌ | After Activation | ❌ | ❌ | ✅ | ✅ |
| Draft | ❌ | Creator Only | ❌ | ❌ | Optional | ✅ |

---

## Notification Workflow

### Individual Task
```
Task Assigned → Notify Assignee → Email → Audit Log
```

### Team Task
```
Task Created → Notify Team Members + Team Head
Submit Verification → Notify Team Head
Approve/Reject → Notify All Team Members
```

### Common Task
```
Published → Notify All Selected Users
```

### Upcoming Task
```
Scheduled Time → Auto-Activate → Notify Assignee/Creator
```

### Draft
```
Published as type → Confirm to Creator
```

---

## Permission Rules

| Rule | Scope |
|------|-------|
| Only creator can reassign individual tasks | Individual |
| Assignee can update status | Individual |
| Team members update progress | Team |
| Only team head can approve/reject | Team |
| Admin can override team decisions | Team |
| Only creator can edit/delete/publish drafts | Draft |
| Only creator/admin can modify/cancel upcoming | Upcoming |

---

## Audit Trail

Every action generates an immutable audit log entry (`recordAuditLog`):

| Action | Description |
|--------|-------------|
| `task.created` | Task created with type |
| `task.updated` | Task fields updated |
| `task.assigned` | Individual task assigned |
| `task.deleted` | Task deleted |
| `task.status_changed` | Status transition |
| `task.submitted` | Team task submitted for verification |
| `task.approved` | Team task approved |
| `task.rejected` | Team task rejected with reason |
| `task.published` | Draft → published as type / Common task published |
| `task.activated` | Upcoming task activated |

Each entry captures: `timestamp`, `userId`, `orgId`, `taskId`, `action`, `description`, optional `metadata`.

---

## Backend Validation Rules

Before any operation:
1. Validate JWT authentication
2. Validate organization membership
3. Enforce workspace isolation (cross-org assignments blocked with 403)
4. Verify valid status transition for the task type
5. Apply visibility filters before returning data
6. Reject unauthorized access with HTTP 403
7. Prevent cross-organization assignments
8. Require Team Head approval for team-task completion
9. Auto-activate scheduled tasks at their start time
10. Never expose task IDs through unauthorized API responses

---

## Key Source Files

| File | Purpose |
|------|---------|
| `backend/src/lib/validate.ts` | Types and constants (`TaskStatus`, `TaskPriority`, `TaskType`) |
| `backend/src/lib/db/models/Task.ts` | Mongoose schema with `type`, status, approval/scheduling fields |
| `backend/src/services/task.service.ts` | Core lifecycle logic (per-type transitions, visibility, approval) |
| `backend/src/routes/tasks.ts` | REST API routes (+ new workflow endpoints) |
| `backend/src/lib/notifications/index.ts` | Per-type notification triggers |
| `backend/src/lib/mail/index.ts` | Email sending (+ team task templates) |
| `frontend/components/task-allocation/task-allocation-modal.tsx` | Task creation form with type selector |
| `frontend/components/task-detailed-view.tsx` | Detail view with type-specific statuses and action buttons |
| `frontend/components/task-data-table.tsx` | Table with type badge column |
| `frontend/app/alltasks/alltasks-interactive.client.tsx` | Main task listing with type tabs |
| `frontend/lib/services/task-service.ts` | Client-side API service (all endpoints) |
