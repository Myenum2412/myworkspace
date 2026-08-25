/**
 * Notification Wiring Module
 *
 * Single entry point for all route handlers to emit notifications.
 * Every function is idempotent - safe to call multiple times.
 * Respects user notification preferences and deduplication.
 */

import { notifyApproval } from "./notify-approval.js";
import { notifyUserAuth } from "./notify-auth.js";
import { notifyBilling } from "./notify-billing.js";
import { broadcastNotification } from "./notify-broadcast.js";
import { notifyClient } from "./notify-client.js";
import { notifyCommunication } from "./notify-communication.js";
import { notifyFile } from "./notify-file.js";
import { notifyHR } from "./notify-hr.js";
import { notifyMultiUser } from "./notify-multi-user.js";
import { notifyPermission } from "./notify-permission.js";
import { notifyProject } from "./notify-project.js";
import { notifySecurity } from "./notify-security.js";
import { notifySystem } from "./notify-system.js";
import { notifyTask } from "./notify-task.js";

// User & Auth
export const notifyAuth = notifyUserAuth;

// Task Management
// Project Management
// File Management
// Approval Workflow
// Permission & Access
// HR & Employee
// Client Management
// Communication
// Billing & Subscription
// Security
// System
// Multi-user & Broadcast
export {
  broadcastNotification,
  notifyApproval,
  notifyBilling,
  notifyClient,
  notifyCommunication,
  notifyFile,
  notifyHR,
  notifyMultiUser,
  notifyPermission,
  notifyProject,
  notifySecurity,
  notifySystem,
  notifyTask,
};

// ============================================================
// Convenience wrappers for common notification scenarios
// ============================================================

export async function notifyTaskCreatedAndAssignees(
  task: { id: string; title: string; assigneeIds?: string[]; createdBy: string; orgId: string },
  projectName?: string,
) {
  const promises: Promise<any>[] = [];
  if (task.assigneeIds?.length) {
    for (const assigneeId of task.assigneeIds) {
      promises.push(
        notifyTask.assigned(
          assigneeId,
          task.orgId,
          task.createdBy,
          task.title,
          task.id,
          projectName,
        ),
      );
    }
  }
  return Promise.allSettled(promises);
}

export async function notifyProjectMembers(
  members: { userId: string; orgId: string }[],
  notificationFn: (userId: string, orgId: string) => Promise<any>,
) {
  const results = await Promise.allSettled(members.map((m) => notificationFn(m.userId, m.orgId)));
  return results.filter((r) => r.status === "fulfilled").map((r: any) => r.value);
}

export async function notifyAdmins(
  adminIds: string[],
  orgId: string,
  creatorId: string,
  type: any,
  title: string,
  message: string,
  options?: { link?: string; category?: any; priority?: any },
) {
  return notifyMultiUser(adminIds, orgId, creatorId, type, title, message, options);
}
