# Notification & Communication Platform — Reference

## Table of Contents

1. [Notification Services Overview](#1-notification-services-overview)
2. [Notification Types by Category](#2-notification-types-by-category)
   - [Auth & User](#21-auth--user)
   - [Projects](#22-projects)
   - [Tasks](#23-tasks)
   - [Files](#24-files)
   - [Approvals](#25-approvals)
   - [Permissions](#26-permissions)
   - [HR & Employee](#27-hr--employee)
   - [Clients](#28-clients)
   - [Communication](#29-communication)
   - [Billing](#210-billing)
   - [Security](#211-security)
   - [System](#212-system)
3. [Priority Mapping](#3-priority-mapping)
4. [Email Template Coverage](#4-email-template-coverage)
5. [Helper Functions by Module](#5-helper-functions-by-module)
6. [Route Wiring Coverage](#6-route-wiring-coverage)
7. [Architecture Diagram](#7-architecture-diagram)

---

## 1. Notification Services Overview

| Service | File | Purpose |
|---------|------|---------|
| **Notification Engine** | `services/notification-engine.service.ts` | Central `processEvent()` — dedup, channel routing, in-app creation, socket emit, push, audit |
| **Notification Core** | `services/notification.service.ts` | Legacy `createNotification()`, `CRITICAL_TYPES`, `CATEGORY_MAP`, `PRIORITY_MAP`, list/search/archive/bulk ops |
| **Email Queue** | `services/email-queue.service.ts` | Queued email delivery with retry, `TEMPLATE_MAP`, template routing via `buildEmailDataForNotification` |
| **Notification Queue** | `services/notification-queue.service.ts` | RabbitMQ consumer with DLQ, delivery tracking via `EmailLog`, fallback HTML builder |
| **Digest Service** | `services/notification-digest.service.ts` | Hourly/daily/weekly digest aggregation and sending |
| **Scheduler** | `services/notification-scheduler.service.ts` | Agenda job definitions for digests, cleanup, snooze reactivation |
| **Push Service** | `services/push.service.ts` | Web push (VAPID) subscription management and sending |
| **Metrics** | `services/notification-metrics.service.ts` | EventEmitter-based in-memory counters, DB aggregation |
| **Health** | `services/notification-health.service.ts` | Multi-subsystem health check (DB, queue, SMTP, VAPID, activity) |
| **Socket Service** | `services/notification-socket.service.ts` | Socket.IO emission helpers for real-time delivery |
| **Event Handler** | `lib/events/notification-event-handler.ts` | Domain event bridge for `notification:sent` events |

---

## 2. Notification Types by Category

### 2.1 Auth & User

**Service helper:** `notifyAuth` (alias for `notifyUserAuth` in `lib/notifications/notify-auth.ts`)
**Routes wired:** `auth.ts`, `two-factor.ts`, `sessions.ts`, `admin.ts`

| Notification Type | Category | Default Priority | In-App | Email | Push | Socket | Email Template | Audit |
|---|---|---|---|---|---|---|---|---|
| `workspace_registered` | auth | medium | ✓ | ✓ | – | ✓ | `buildWelcomeEmail` | ✓ |
| `organization_created` | auth | medium | ✓ | ✓ | – | ✓ | `buildWorkspaceSetupComplete` | ✓ |
| `workspace_welcome` | auth | medium | ✓ | ✓ | – | ✓ | `buildWelcomeEmail` | ✓ |
| `user_invited` | auth | medium | ✓ | ✓ | – | ✓ | `buildWorkspaceInvite` | ✓ |
| `user_account_created` | auth | medium | ✓ | ✓ | – | ✓ | `buildEmployeeOnboarded` | ✓ |
| `user_activation` | auth | medium | ✓ | ✓ | – | ✓ | `buildVerificationEmail` | ✓ |
| `email_verified` | auth | low | ✓ | – | – | ✓ | `buildVerifiedEmail` | ✓ |
| `password_setup_invite` | auth | high | ✓ | ✓ | – | ✓ | `buildPasswordDeliveredEmail` | ✓ |
| `password_reset` | auth | high | ✓ | ✓ | – | ✓ | `buildPasswordReset` | ✓ |
| `password_changed` | auth | **high** | ✓ | ✓ | ✓ | ✓ | `buildPasswordChanged` | ✓ |
| `new_device_login` | auth | medium | ✓ | ✓ | ✓ | ✓ | `buildNewDeviceLogin` | ✓ |
| `failed_login` | auth | **high** | ✓ | – | – | ✓ | – | ✓ |
| `mfa_enabled` | auth | high | ✓ | ✓ | – | ✓ | – | ✓ |
| `mfa_disabled` | auth | **critical** | ✓ | ✓ | ✓ | ✓ | – | ✓ |
| `account_locked` | auth | **critical** | ✓ | ✓ | ✓ | ✓ | `buildAccountDeactivated` | ✓ |
| `account_unlocked` | auth | high | ✓ | ✓ | – | ✓ | `buildAccountReactivated` | ✓ |
| `account_suspended` | auth | **critical** | ✓ | ✓ | ✓ | ✓ | `buildAccountDeactivated` | ✓ |
| `account_reactivated` | auth | high | ✓ | ✓ | – | ✓ | `buildAccountReactivated` | ✓ |
| `role_changed` | permissions | medium | ✓ | ✓ | – | ✓ | `buildRoleChanged` | ✓ |
| `permission_updated` | permissions | medium | ✓ | – | – | ✓ | – | ✓ |
| `profile_updated` | auth | low | ✓ | – | – | ✓ | `buildEmployeeProfileUpdated` | ✓ |
| `account_deleted` | auth | **critical** | ✓ | ✓ | ✓ | ✓ | – | ✓ |

### 2.2 Projects

**Service helper:** `notifyProject` in `lib/notifications/notify-project.ts`
**Routes wired:** `projects.ts`

| Notification Type | Category | Default Priority | In-App | Email | Push | Socket | Email Template | Audit |
|---|---|---|---|---|---|---|---|---|
| `project_created` | projects | medium | ✓ | ✓ | – | ✓ | `buildProjectCreated` | ✓ |
| `project_updated` | projects | medium | ✓ | ✓ | – | ✓ | `buildProjectUpdated` | ✓ |
| `project_archived` | projects | high | ✓ | ✓ | – | ✓ | – | ✓ |
| `project_restored` | projects | medium | ✓ | ✓ | – | ✓ | – | ✓ |
| `project_deleted` | projects | high | ✓ | ✓ | – | ✓ | – | ✓ |
| `project_assigned` | projects | high | ✓ | ✓ | – | ✓ | `buildProjectMemberAdded` | ✓ |
| `project_ownership_transferred` | projects | high | ✓ | ✓ | – | ✓ | – | ✓ |
| `project_deadline_changed` | projects | medium | ✓ | ✓ | – | ✓ | `buildProjectDeadlineExtended` | ✓ |
| `project_status_changed` | projects | medium | ✓ | ✓ | – | ✓ | `buildProjectStatusChanged` | ✓ |
| `project_completed` | projects | high | ✓ | ✓ | – | ✓ | `buildProjectCompleted` | ✓ |
| `project_reopened` | projects | medium | ✓ | ✓ | – | ✓ | – | ✓ |
| `project_budget_updated` | projects | medium | ✓ | – | – | ✓ | – | ✓ |
| `milestone_created` | projects | medium | ✓ | ✓ | – | ✓ | – | ✓ |
| `milestone_updated` | projects | medium | ✓ | ✓ | – | ✓ | – | ✓ |
| `milestone_completed` | projects | high | ✓ | ✓ | – | ✓ | `buildProjectMilestoneReached` | ✓ |
| `milestone_delayed` | projects | high | ✓ | ✓ | – | ✓ | – | ✓ |
| `project_health_at_risk` | projects | **high** | ✓ | ✓ | – | ✓ | – | ✓ |

### 2.3 Tasks

**Service helper:** `notifyTask` in `lib/notifications/notify-task.ts`
**Routes wired:** `tasks.ts`

| Notification Type | Category | Default Priority | In-App | Email | Push | Socket | Email Template | Audit |
|---|---|---|---|---|---|---|---|---|
| `task_created` | tasks | medium | ✓ | ✓ | – | ✓ | `buildTaskCreated` | ✓ |
| `task_assigned` | tasks | **high** | ✓ | ✓ | – | ✓ | `buildTaskAssigned` | ✓ |
| `task_reassigned` | tasks | high | ✓ | ✓ | – | ✓ | `buildTaskAssigned` | ✓ |
| `task_accepted` | tasks | medium | ✓ | – | – | ✓ | – | ✓ |
| `task_declined` | tasks | medium | ✓ | – | – | ✓ | – | ✓ |
| `task_started` | tasks | low | ✓ | – | – | ✓ | – | ✓ |
| `task_paused` | tasks | low | ✓ | – | – | ✓ | – | ✓ |
| `task_resumed` | tasks | low | ✓ | – | – | ✓ | – | ✓ |
| `task_on_hold` | tasks | medium | ✓ | – | – | ✓ | – | ✓ |
| `task_overdue` | tasks | **high** | ✓ | ✓ | – | ✓ | `buildTaskOverdue` | ✓ |
| `task_due_today` | tasks | **high** | ✓ | – | – | ✓ | – | ✓ |
| `task_due_tomorrow` | tasks | medium | ✓ | – | – | ✓ | – | ✓ |
| `task_completed` | tasks | medium | ✓ | ✓ | – | ✓ | `buildTaskCompleted` | ✓ |
| `task_reopened` | tasks | medium | ✓ | ✓ | – | ✓ | `buildTaskReopened` | ✓ |
| `task_rejected` | tasks | high | ✓ | ✓ | – | ✓ | – | ✓ |
| `task_approved` | tasks | high | ✓ | ✓ | – | ✓ | – | ✓ |
| `task_priority_changed` | tasks | medium | ✓ | ✓ | – | ✓ | `buildTaskPriorityChanged` | ✓ |
| `task_dependencies_completed` | tasks | medium | ✓ | – | – | ✓ | – | ✓ |
| `task_checklist_updated` | tasks | low | ✓ | – | – | ✓ | – | ✓ |
| `task_comment_added` | tasks | medium | ✓ | ✓ | – | ✓ | `buildTaskCommentAdded` | ✓ |
| `task_attachment_added` | tasks | low | ✓ | – | – | ✓ | – | ✓ |
| `task_estimated_hours_updated` | tasks | low | ✓ | – | – | ✓ | – | ✓ |
| `task_actual_hours_submitted` | tasks | medium | ✓ | – | – | ✓ | – | ✓ |
| `task_updated` | tasks | medium | ✓ | ✓ | – | ✓ | `buildTaskUpdated` | ✓ |

### 2.4 Files

**Service helper:** `notifyFile` in `lib/notifications/notify-file.ts`
**Routes wired:** `files-enhanced.ts`, `file-approval.ts`, `file-favorites.ts`, `folders.ts`

| Notification Type | Category | Default Priority | In-App | Email | Push | Socket | Email Template | Audit |
|---|---|---|---|---|---|---|---|---|
| `file_uploaded` | files | medium | ✓ | ✓ | – | ✓ | `buildFileUploaded` | ✓ |
| `file_bulk_uploaded` | files | low | ✓ | – | – | ✓ | – | ✓ |
| `folder_created` | files | low | ✓ | – | – | ✓ | – | ✓ |
| `folder_renamed` | files | low | ✓ | – | – | ✓ | – | ✓ |
| `file_renamed` | files | low | ✓ | – | – | ✓ | `buildFileRenamed` | ✓ |
| `file_moved` | files | low | ✓ | – | – | ✓ | – | ✓ |
| `file_copied` | files | low | ✓ | – | – | ✓ | – | ✓ |
| `file_shared` | files | medium | ✓ | ✓ | – | ✓ | `buildFileShared` | ✓ |
| `file_downloaded` | files | low | ✓ | – | – | ✓ | `buildFileDownloaded` | ✓ |
| `file_previewed` | files | low | ✓ | – | – | ✓ | – | ✓ |
| `file_approved` | files | high | ✓ | ✓ | – | ✓ | `buildFileReviewCompleted` | ✓ |
| `file_rejected` | files | high | ✓ | ✓ | – | ✓ | – | ✓ |
| `file_deleted` | files | medium | ✓ | ✓ | – | ✓ | `buildFileDeleted` | ✓ |
| `file_restored` | files | medium | ✓ | ✓ | – | ✓ | `buildFileRestored` | ✓ |
| `file_permanently_deleted` | files | high | ✓ | – | – | ✓ | – | ✓ |
| `storage_nearing_limit` | files | high | ✓ | ✓ | – | ✓ | `buildStorageQuotaWarning` | ✓ |
| `storage_exceeded` | files | **critical** | ✓ | ✓ | ✓ | ✓ | – | ✓ |
| `virus_scan_failed` | files | **high** | ✓ | ✓ | – | ✓ | – | ✓ |
| `upload_failed` | files | high | ✓ | – | – | ✓ | – | ✓ |
| `upload_completed` | files | medium | ✓ | – | – | ✓ | – | ✓ |

### 2.5 Approvals

**Service helper:** `notifyApproval` in `lib/notifications/notify-approval.ts`
**Routes wired:** `tasks.ts`, `file-approval.ts`

| Notification Type | Category | Default Priority | In-App | Email | Push | Socket | Email Template | Audit |
|---|---|---|---|---|---|---|---|---|
| `approval_requested` | approvals | **high** | ✓ | ✓ | – | ✓ | `buildApprovalRequested` | ✓ |
| `approval_pending` | approvals | medium | ✓ | – | – | ✓ | – | ✓ |
| `approval_approved` | approvals | high | ✓ | ✓ | – | ✓ | `buildApprovalApproved` | ✓ |
| `approval_rejected` | approvals | high | ✓ | ✓ | – | ✓ | `buildApprovalRejected` | ✓ |
| `approval_cancelled` | approvals | medium | ✓ | – | – | ✓ | – | ✓ |
| `approval_escalated` | approvals | high | ✓ | ✓ | – | ✓ | – | ✓ |
| `approval_overdue` | approvals | **high** | ✓ | ✓ | – | ✓ | `buildApprovalReminder` | ✓ |
| `approval_level_progressed` | approvals | medium | ✓ | – | – | ✓ | – | ✓ |

### 2.6 Permissions

**Service helper:** `notifyPermission` in `lib/notifications/notify-permission.ts`
**Routes wired:** `teams.ts`, `org-mfa-policy.ts`, `two-factor.ts`

| Notification Type | Category | Default Priority | In-App | Email | Push | Socket | Email Template | Audit |
|---|---|---|---|---|---|---|---|---|
| `permission_granted` | permissions | medium | ✓ | ✓ | – | ✓ | – | ✓ |
| `permission_revoked` | permissions | high | ✓ | ✓ | – | ✓ | – | ✓ |
| `role_updated` | permissions | medium | ✓ | ✓ | – | ✓ | `buildRoleChanged` | ✓ |
| `department_access_changed` | permissions | medium | ✓ | – | – | ✓ | – | ✓ |
| `workspace_access_changed` | permissions | high | ✓ | ✓ | – | ✓ | – | ✓ |
| `client_portal_access_granted` | permissions | medium | ✓ | ✓ | – | ✓ | – | ✓ |
| `api_key_generated` | permissions | medium | ✓ | – | – | ✓ | – | ✓ |
| `api_key_revoked` | permissions | high | ✓ | – | – | ✓ | – | ✓ |
| `suspicious_permission_change` | permissions | **critical** | ✓ | ✓ | ✓ | ✓ | – | ✓ |

### 2.7 HR & Employee

**Service helper:** `notifyHR` in `lib/notifications/notify-hr.ts`
**Routes wired:** `contractors.ts`, `user.ts`, `time-entries.ts`

| Notification Type | Category | Default Priority | In-App | Email | Push | Socket | Email Template | Audit |
|---|---|---|---|---|---|---|---|---|
| `employee_onboarded` | hr | high | ✓ | ✓ | – | ✓ | `buildEmployeeOnboarded` | ✓ |
| `employee_terminated` | hr | high | ✓ | ✓ | – | ✓ | `buildEmployeeDeactivated` | ✓ |
| `leave_request_submitted` | hr | medium | ✓ | ✓ | – | ✓ | `buildLeaveRequestSubmitted` | ✓ |
| `leave_approved` | hr | high | ✓ | ✓ | – | ✓ | `buildLeaveRequestApproved` | ✓ |
| `leave_rejected` | hr | high | ✓ | ✓ | – | ✓ | `buildLeaveRequestRejected` | ✓ |
| `attendance_anomaly` | hr | medium | ✓ | – | – | ✓ | – | ✓ |
| `payroll_processed` | hr | high | ✓ | ✓ | – | ✓ | – | ✓ |
| `salary_credited` | hr | high | ✓ | ✓ | – | ✓ | – | ✓ |
| `performance_review_scheduled` | hr | medium | ✓ | ✓ | – | ✓ | – | ✓ |
| `performance_review_completed` | hr | medium | ✓ | ✓ | – | ✓ | – | ✓ |
| `training_assigned` | hr | medium | ✓ | ✓ | – | ✓ | – | ✓ |
| `certification_expired` | hr | medium | ✓ | ✓ | – | ✓ | – | ✓ |

### 2.8 Clients

**Service helper:** `notifyClient` in `lib/notifications/notify-client.ts`
**Routes wired:** `clients.ts`, `client-auth.ts`, `client-folders.ts`

| Notification Type | Category | Default Priority | In-App | Email | Push | Socket | Email Template | Audit |
|---|---|---|---|---|---|---|---|---|
| `client_created` | clients | medium | ✓ | ✓ | – | ✓ | – | ✓ |
| `client_updated` | clients | low | ✓ | – | – | ✓ | – | ✓ |
| `client_assigned` | clients | medium | ✓ | ✓ | – | ✓ | – | ✓ |
| `client_invitation_sent` | clients | medium | ✓ | ✓ | – | ✓ | `buildEmployeeInvited` | ✓ |
| `client_invitation_accepted` | clients | high | ✓ | ✓ | – | ✓ | – | ✓ |
| `client_uploaded_files` | clients | medium | ✓ | – | – | ✓ | – | ✓ |
| `client_approved_deliverables` | clients | high | ✓ | ✓ | – | ✓ | – | ✓ |
| `client_rejected_deliverables` | clients | high | ✓ | ✓ | – | ✓ | – | ✓ |
| `contract_signed` | clients | high | ✓ | ✓ | – | ✓ | – | ✓ |
| `proposal_accepted` | clients | high | ✓ | ✓ | – | ✓ | – | ✓ |
| `proposal_rejected` | clients | high | ✓ | ✓ | – | ✓ | – | ✓ |

### 2.9 Communication

**Service helper:** `notifyCommunication` in `lib/notifications/notify-communication.ts`
**Routes wired:** `chat.ts`, `appointments.ts`

| Notification Type | Category | Default Priority | In-App | Email | Push | Socket | Email Template | Audit |
|---|---|---|---|---|---|---|---|---|
| `new_comment` | messages | medium | ✓ | ✓ | – | ✓ | – | ✓ |
| `mention` | messages | **high** | ✓ | ✓ | – | ✓ | (generic fallback) | ✓ |
| `reply_received` | messages | medium | ✓ | ✓ | – | ✓ | – | ✓ |
| `chat_message` | messages | low | ✓ | ✓ | – | ✓ | (generic fallback) | ✓ |
| `team_announcement` | messages | high | ✓ | ✓ | – | ✓ | – | ✓ |
| `broadcast_message` | messages | high | ✓ | ✓ | – | ✓ | – | ✓ |
| `meeting_scheduled` | messages | medium | ✓ | ✓ | – | ✓ | (inline template) | ✓ |
| `meeting_reminder` | messages | high | ✓ | ✓ | – | ✓ | (inline template) | ✓ |
| `meeting_cancelled` | messages | medium | ✓ | ✓ | – | ✓ | – | ✓ |
| `calendar_invitation` | messages | medium | ✓ | ✓ | – | ✓ | – | ✓ |

### 2.10 Billing

**Service helper:** `notifyBilling` in `lib/notifications/notify-billing.ts`
**Routes wired:** `billing.ts`, `plans.ts`, `receipts.ts`

| Notification Type | Category | Default Priority | In-App | Email | Push | Socket | Email Template | Audit |
|---|---|---|---|---|---|---|---|---|
| `invoice_generated` | billing | medium | ✓ | ✓ | – | ✓ | (inline template) | ✓ |
| `invoice_paid` | billing | high | ✓ | ✓ | – | ✓ | (inline template) | ✓ |
| `payment_failed` | billing | **high** | ✓ | ✓ | ✓ | ✓ | (inline template) | ✓ |
| `refund_processed` | billing | medium | ✓ | ✓ | – | ✓ | – | ✓ |
| `subscription_renewal_reminder` | billing | high | ✓ | ✓ | – | ✓ | `buildRenewalConfirmation` | ✓ |
| `trial_ending` | billing | high | ✓ | ✓ | – | ✓ | `buildTrialEndingSoon` | ✓ |
| `storage_upgrade_available` | billing | low | ✓ | ✓ | – | ✓ | – | ✓ |
| `plan_limit_reached` | billing | high | ✓ | ✓ | – | ✓ | – | ✓ |
| `additional_users_purchased` | billing | medium | ✓ | ✓ | – | ✓ | – | ✓ |

### 2.11 Security

**Service helper:** `notifySecurity` in `lib/notifications/notify-security.ts`
**Routes wired:** `sessions.ts`, `two-factor.ts`, `admin.ts`

| Notification Type | Category | Default Priority | In-App | Email | Push | Socket | Email Template | Audit |
|---|---|---|---|---|---|---|---|---|
| `suspicious_login` | security | **critical** | ✓ | ✓ | ✓ | ✓ | `buildSecurityAlert` | ✓ |
| `email_changed` | security | high | ✓ | ✓ | ✓ | ✓ | – | ✓ |
| `backup_codes_generated` | security | medium | ✓ | ✓ | – | ✓ | – | ✓ |
| `api_abuse_detected` | security | high | ✓ | ✓ | ✓ | ✓ | – | ✓ |
| `rate_limit_exceeded` | security | medium | ✓ | – | – | ✓ | – | ✓ |
| `unauthorized_access_attempt` | security | **critical** | ✓ | ✓ | ✓ | ✓ | – | ✓ |

### 2.12 System

**Service helper:** `notifySystem` in `lib/notifications/notify-system.ts`
**Routes wired:** `admin.ts`, `admin-consent.ts`

| Notification Type | Category | Default Priority | In-App | Email | Push | Socket | Email Template | Audit |
|---|---|---|---|---|---|---|---|---|
| `scheduled_maintenance` | system | high | ✓ | ✓ | ✓ | ✓ | (inline template) | ✓ |
| `system_outage` | system | **critical** | ✓ | ✓ | ✓ | ✓ | (inline template) | ✓ |
| `service_restored` | system | high | ✓ | ✓ | ✓ | ✓ | – | ✓ |
| `backup_completed` | system | low | ✓ | – | – | ✓ | – | ✓ |
| `backup_failed` | system | **critical** | ✓ | ✓ | ✓ | ✓ | – | ✓ |
| `database_maintenance` | system | high | ✓ | ✓ | ✓ | ✓ | – | ✓ |
| `new_feature_announcement` | system | low | ✓ | ✓ | – | ✓ | – | ✓ |
| `platform_update` | system | low | ✓ | ✓ | – | ✓ | – | ✓ |
| `version_release` | system | low | ✓ | ✓ | – | ✓ | – | ✓ |

---

## 3. Priority Mapping

Notifications with **critical** priority always bypass user preferences, DND, and quiet hours — they are delivered via all channels.

| Priority | Types |
|----------|-------|
| **critical** | `suspicious_login`, `account_locked`, `system_outage`, `storage_exceeded`, `unauthorized_access_attempt`, `mfa_disabled`, `account_suspended`, `account_deleted`, `suspicious_permission_change`, `backup_failed` |
| **high** | `password_changed`, `task_overdue`, `task_due_today`, `approval_overdue`, `project_health_at_risk`, `virus_scan_failed`, `failed_login`, `api_abuse_detected`, `payment_failed`, `password_reset`, `password_setup_invite`, `account_locked`, `account_unlocked`, `account_reactivated`, `task_assigned`, `mention`, `approval_requested`, `file_approved`, `file_rejected`, `storage_nearing_limit`, `upload_failed`, `leave_approved`, `leave_rejected`, `payroll_processed`, `salary_credited`, `contract_signed`, `proposal_accepted`, `proposal_rejected`, `client_invitation_accepted`, `meeting_reminder`, `subscription_renewal_reminder`, `trial_ending`, `plan_limit_reached`, `scheduled_maintenance`, `service_restored`, `database_maintenance`, `email_changed`, `workspace_access_changed`, `api_key_revoked`, `project_deleted`, `project_archived`, `project_ownership_transferred`, `milestone_completed`, `milestone_delayed`, `task_reassigned`, `task_rejected`, `task_approved` |
| medium | All remaining types not listed above |
| low | `email_verified`, `profile_updated`, `task_started`, `task_paused`, `task_resumed`, `task_checklist_updated`, `task_attachment_added`, `task_estimated_hours_updated`, `file_bulk_uploaded`, `folder_created`, `folder_renamed`, `file_renamed`, `file_moved`, `file_copied`, `file_downloaded`, `file_previewed`, `chat_message`, `client_updated`, `storage_upgrade_available`, `backup_completed`, `new_feature_announcement`, `platform_update`, `version_release` |

---

## 4. Email Template Coverage

All 39 notification types in the `TEMPLATE_MAP` now have email content via the switch in `email-queue.service.ts`:

| Template Key | Subject | Source |
|-------------|---------|--------|
| `task_assigned` | Task Assigned | `TemplateFactory.buildTaskAssigned` |
| `task_updated` | Task Updated | `TemplateFactory.buildTaskUpdated` |
| `task_due_soon` | Due Reminder | `TemplateFactory.buildTaskDueSoon` |
| `task_overdue` | Overdue Notice | `TemplateFactory.buildTaskOverdue` |
| `task_completed` | Task Completed | `TemplateFactory.buildTaskCompleted` |
| `task_reopened` | Task Reopened | `TemplateFactory.buildTaskReopened` |
| `task_comment_added` | New Comment | `TemplateFactory.buildTaskCommentAdded` |
| `task_priority_changed` | Priority Changed | `TemplateFactory.buildTaskPriorityChanged` |
| `project_created` | Project Created | `TemplateFactory.buildProjectCreated` |
| `project_updated` | Project Updated | `TemplateFactory.buildProjectUpdated` |
| `project_completed` | Project Completed | `TemplateFactory.buildProjectCompleted` |
| `approval_requested` | Approval Requested | `TemplateFactory.buildApprovalRequested` |
| `approval_approved` | Approved | `TemplateFactory.buildApprovalApproved` |
| `approval_rejected` | Rejected | `TemplateFactory.buildApprovalRejected` |
| `file_uploaded` | File Uploaded | `TemplateFactory.buildFileUploaded` |
| `file_shared` | File Shared | `TemplateFactory.buildFileShared` |
| `file_downloaded` | File Downloaded | `TemplateFactory.buildFileDownloaded` |
| `file_deleted` | File Deleted | `TemplateFactory.buildFileDeleted` |
| `password_reset` | Password Reset | `TemplateFactory.buildPasswordReset` |
| `password_changed` | Password Changed | `TemplateFactory.buildPasswordChanged` |
| `new_device_login` | New Device Login | `TemplateFactory.buildNewDeviceLogin` |
| `account_locked` | Account Locked | `TemplateFactory.buildAccountDeactivated` |
| `account_suspended` | Account Suspended | `TemplateFactory.buildAccountDeactivated` |
| `leave_request_submitted` | Leave Request | `TemplateFactory.buildLeaveRequestSubmitted` |
| `leave_approved` | Leave Approved | `TemplateFactory.buildLeaveRequestApproved` |
| `leave_rejected` | Leave Rejected | `TemplateFactory.buildLeaveRequestRejected` |
| `training_assigned` | Training Assigned | Inline template |
| `client_invitation_sent` | Client Invitation | `TemplateFactory.buildEmployeeInvited` |
| `contract_signed` | Contract Signed | `TemplateFactory.buildFileShared` |
| `meeting_scheduled` | Meeting Scheduled | Inline template |
| `meeting_reminder` | Meeting Reminder | Inline template |
| `system_outage` | System Outage | Inline template with `statusIndicator: error` |
| `scheduled_maintenance` | Scheduled Maintenance | Inline template with `statusIndicator: info` |
| `invoice_generated` | Invoice Generated | Inline template |
| `invoice_paid` | Invoice Paid | Inline template with `statusIndicator: success` |
| `payment_failed` | Payment Failed | Inline template with `statusIndicator: error` |
| `subscription_nearing_expiration` | Subscription Expiring | Inline template with `statusIndicator: warning` |
| `mention` | You were mentioned | Inline template |
| `chat_message` | New Message | Inline template |

---

## 5. Helper Functions by Module

| Module | File | Functions | Methods |
|--------|------|-----------|---------|
| **Auth** | `lib/notifications/notify-auth.ts` | 26 | `workspaceRegistered`, `organizationCreated`, `workspaceWelcome`, `userInvited`, `userAccountCreated`, `userActivation`, `emailVerified`, `passwordSetupInvite`, `passwordReset`, `passwordChanged`, `newDeviceLogin`, `failedLogin`, `mfaEnabled`, `mfaDisabled`, `accountLocked`, `accountUnlocked`, `accountSuspended`, `accountReactivated`, `roleChanged`, `permissionUpdated`, `profileUpdated`, `accountDeleted`, `subscriptionActivated`, `subscriptionUpgraded`, `subscriptionDowngraded`, `subscriptionRenewed` |
| **Tasks** | `lib/notifications/notify-task.ts` | 24 | `created`, `assigned`, `reassigned`, `accepted`, `declined`, `started`, `paused`, `resumed`, `onHold`, `overdue`, `dueToday`, `dueTomorrow`, `completed`, `reopened`, `rejected`, `approved`, `priorityChanged`, `dependenciesCompleted`, `checklistUpdated`, `commentAdded`, `attachmentAdded`, `estimatedHoursUpdated`, `actualHoursSubmitted`, `updated` |
| **Projects** | `lib/notifications/notify-project.ts` | 17 | `created`, `updated`, `archived`, `restored`, `deleted`, `assigned`, `ownershipTransferred`, `deadlineChanged`, `statusChanged`, `completed`, `reopened`, `budgetUpdated`, `milestoneCreated`, `milestoneUpdated`, `milestoneCompleted`, `milestoneDelayed`, `healthAtRisk` |
| **Files** | `lib/notifications/notify-file.ts` | 20 | `uploaded`, `bulkUploaded`, `folderCreated`, `folderRenamed`, `renamed`, `moved`, `copied`, `shared`, `downloaded`, `previewed`, `approved`, `rejected`, `deleted`, `restored`, `permanentlyDeleted`, `storageNearingLimit`, `storageExceeded`, `virusScanFailed`, `uploadFailed`, `uploadCompleted` |
| **Approvals** | `lib/notifications/notify-approval.ts` | 8 | `requested`, `pending`, `approved`, `rejected`, `cancelled`, `escalated`, `overdue`, `levelProgressed` |
| **Permissions** | `lib/notifications/notify-permission.ts` | 9 | `granted`, `revoked`, `roleUpdated`, `departmentAccessChanged`, `workspaceAccessChanged`, `clientPortalAccessGranted`, `apiKeyGenerated`, `apiKeyRevoked`, `suspiciousPermissionChange` |
| **HR** | `lib/notifications/notify-hr.ts` | 12 | `employeeOnboarded`, `employeeTerminated`, `leaveRequestSubmitted`, `leaveApproved`, `leaveRejected`, `attendanceAnomaly`, `payrollProcessed`, `salaryCredited`, `performanceReviewScheduled`, `performanceReviewCompleted`, `trainingAssigned`, `certificationExpired` |
| **Clients** | `lib/notifications/notify-client.ts` | 11 | `created`, `updated`, `assigned`, `invitationSent`, `invitationAccepted`, `uploadedFiles`, `approvedDeliverables`, `rejectedDeliverables`, `contractSigned`, `proposalAccepted`, `proposalRejected` |
| **Communication** | `lib/notifications/notify-communication.ts` | 10 | `newComment`, `mention`, `replyReceived`, `chatMessage`, `teamAnnouncement`, `broadcastMessage`, `meetingScheduled`, `meetingReminder`, `meetingCancelled`, `calendarInvitation` |
| **Billing** | `lib/notifications/notify-billing.ts` | 9 | `invoiceGenerated`, `invoicePaid`, `paymentFailed`, `refundProcessed`, `renewalReminder`, `trialEnding`, `storageUpgradeAvailable`, `planLimitReached`, `additionalUsersPurchased` |
| **Security** | `lib/notifications/notify-security.ts` | 6 | `suspiciousLogin`, `emailChanged`, `backupCodesGenerated`, `apiAbuseDetected`, `rateLimitExceeded`, `unauthorizedAccessAttempt` |
| **System** | `lib/notifications/notify-system.ts` | 9 | `scheduledMaintenance`, `systemOutage`, `serviceRestored`, `backupCompleted`, `backupFailed`, `databaseMaintenance`, `newFeatureAnnouncement`, `platformUpdate`, `versionRelease` |
| **Multi-User** | `lib/notifications/notify-multi-user.ts` | 1 | `notifyMultiUser` (sends to multiple users) |
| **Broadcast** | `lib/notifications/notify-broadcast.ts` | 1 | `broadcastNotification` (org-wide broadcast + socket) |

---

## 6. Route Wiring Coverage

| Route File | Wired? | Notification Types Used |
|-----------|--------|----------------------|
| `auth.ts` | ✓ | workspace_registered, organization_created, workspace_welcome, user_account_created, account_locked, failed_login, new_device_login, email_verified, password_reset, password_changed |
| `tasks.ts` | ✓ | task_created, task_assigned, task_updated, task_completed, task_started, task_paused, task_reopened, task_rejected, task_approved, task_priority_changed, task_reassigned, task_submitted, task_published, task_activated, draft_published |
| `projects.ts` | ✓ | project_created, project_assigned, project_updated, project_status_changed, project_completed, project_reopened, project_archived, project_deadline_changed, project_budget_updated, project_deleted |
| `files-enhanced.ts` | ✓ | file_uploaded, file_shared, file_deleted, file_permanently_deleted, file_restored, file_renamed |
| `clients.ts` | ✓ | client_created, client_updated |
| `billing.ts` | ✓ | invoice_generated |
| `organizations.ts` | ✓ | user_invited, organization_created, permission_updated, account_deleted |
| `teams.ts` | ✓ | team_announcement, team_update, department_access_changed, permission_revoked, role_changed |
| `sessions.ts` | ✓ | new_device_login, suspicious_login |
| `two-factor.ts` | ✓ | mfa_enabled, mfa_disabled, backup_codes_generated, new_device_login |
| `org-mfa-policy.ts` | ✓ | permission_updated, permission_granted, permission_revoked |
| `admin.ts` | ✓ | account_suspended, account_reactivated, platform_update |
| `plans.ts` | ✓ | platform_update, subscription_activated, subscription_upgraded, subscription_cancelled |
| `appointments.ts` | ✓ | meeting_scheduled, meeting_cancelled |
| `chat.ts` | ✓ | chat_message, mention |
| `file-approval.ts` | ✓ | file_approved, file_rejected |
| `contractors.ts` | ✓ | employee_onboarded, employee_terminated, profile_updated |
| `user.ts` | ✓ | profile_updated |
| `settings.ts` | ✓ | profile_updated |
| `notifications.ts` | ✓ | (self — notification CRUD + broadcast) |
| `activity.ts` | – | (read-only) |
| `admin-consent.ts` | – | (read-only + consent management) |
| `admin-security.ts` | – | (read-only) |
| `analytics.ts` | – | (read-only) |
| `blog.ts` | – | (content management — future) |
| `bootstrap.ts` | – | (read-only) |
| `client-auth.ts` | – | (client portal auth — separate domain) |
| `client-folders.ts` | – | (read-only) |
| `consent.ts` | – | (legal compliance) |
| `dashboard.ts` | – | (read-only) |
| `file-favorites.ts` | – | (low-value events) |
| `files-tus.ts` | – | (protocol handler) |
| `folders.ts` | – | (tree operations — audit only) |
| `installer.ts` | – | (system installer) |
| `receipts.ts` | – | (receipt CRUD — future) |
| `search.ts` | – | (read-only) |
| `shares.ts` | – | (share link management) |
| `stocks.ts` | – | (inventory) |
| `time-entries.ts` | – | (time tracking) |
| `users.ts` | – | (read-only) |
| `whatsapp.ts` | – | (external integration) |

---

## 7. Architecture Diagram

```
┌──────────────┐     ┌──────────────────────────────────────────────┐
│  Route       │────▶│  notification-engine.service.ts              │
│  Handler     │     │                                              │
│              │     │  processEvent(EngineEvent)                   │
│              │     │    ├── checkDeduplication()                  │
│              │     │    ├── determineChannels()                   │
│              │     │    │   └── NotificationSettings (DND,        │
│              │     │    │        quiet hours, muted, category)    │
│              │     │    ├── createInApp()                         │
│              │     │    │   └── Notification.create()             │
│              │     │    ├── emitSocket()                          │
│              │     │    │   └── socketIOManager.emitToUser()      │
│              │     │    ├── sendPush()                            │
│              │     │    │   └── push.service                      │
│              │     │    └── recordAudit()                         │
│              │     │        └── audit.service                     │
└──────────────┘     └──────────────────────────────────────────────┘
                                    │
                                    ▼
                    ┌─────────────────────────────┐
                    │  email-queue.service.ts      │
                    │  (TEMPLATE_MAP + switch)     │
                    │         │                    │
                    │         ▼                    │
                    │  lib/mail/templates/         │
                    │  ┌───────────────────────┐   │
                    │  │ factory-account.ts    │   │
                    │  │ factory-task.ts       │   │
                    │  │ factory-project.ts    │   │
                    │  │ factory-file.ts       │   │
                    │  │ factory-approval.ts   │   │
                    │  │ factory-employee.ts   │   │
                    │  │ factory-summary.ts    │   │
                    │  └──────────┬────────────┘   │
                    │             │                │
                    │             ▼                │
                    │  builder.ts (EmailData→HTML) │
                    │  (dark mode, responsive,     │
                    │   branding, inline CSS)      │
                    │             │                │
                    │             ▼                │
                    │  sender.ts (SMTP/Resend)     │
                    └─────────────────────────────┘

  ┌──────────────────────────────────────────────────┐
  │  notification-metrics.service.ts                 │
  │  (EventEmitter counters + DB aggregation)        │
  ├──────────────────────────────────────────────────┤
  │  notification-health.service.ts                  │
  │  (DB / Queue / SMTP / VAPID / Activity checks)   │
  └──────────────────────────────────────────────────┘
