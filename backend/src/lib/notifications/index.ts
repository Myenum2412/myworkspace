import { createNotification } from "../../services/notification.service.js";
import type { NotificationType, NotificationCategory, NotificationPriority, INotificationAction } from "../db/models/Notification.js";

export async function notifyTaskAssigned(
  task: { id: string; title: string },
  assigneeId: string,
  assignedByName: string,
  orgId: string,
  metadata?: Record<string, unknown>
) {
  return createNotification({
    userId: assigneeId,
    orgId,
    createdBy: assigneeId,
    type: "task_assigned",
    category: "tasks",
    priority: "high",
    title: "Task Assigned",
    message: `${assignedByName} assigned you to "${task.title}"`,
    link: `/alltasks?id=${task.id}`,
    actions: [
      { label: "View Task", action: "view", url: `/alltasks?id=${task.id}` },
    ],
    metadata: { taskId: task.id, ...metadata },
  });
}

export async function notifyTaskUpdated(
  task: { id: string; title: string },
  userId: string,
  updatedByName: string,
  orgId: string,
  changes?: string
) {
  return createNotification({
    userId,
    orgId,
    createdBy: userId,
    type: "task_updated",
    category: "tasks",
    priority: "normal",
    title: "Task Updated",
    message: `${updatedByName} updated "${task.title}"${changes ? `: ${changes}` : ""}`,
    link: `/alltasks?id=${task.id}`,
    actions: [
      { label: "View Task", action: "view", url: `/alltasks?id=${task.id}` },
    ],
    metadata: { taskId: task.id },
  });
}

export async function notifyNewEmployee(
  employee: { id: string; name: string; email: string },
  orgId: string,
  createdBy: string,
  adminIds: string[]
) {
  const results = [];
  for (const adminId of adminIds) {
    const n = await createNotification({
      userId: adminId,
      orgId,
      createdBy,
      type: "system",
      category: "team",
      priority: "normal",
      title: "New Employee Added",
      message: `${employee.name} (${employee.email}) has been added to the organization.`,
      link: "/employees",
    });
    results.push(n);
  }
  return results;
}

export async function notifyMessage(
  userId: string,
  fromName: string,
  messagePreview: string,
  orgId: string,
  conversationId: string
) {
  return createNotification({
    userId,
    orgId,
    createdBy: userId,
    type: "message",
    category: "messages",
    priority: "normal",
    title: `Message from ${fromName}`,
    message: messagePreview,
    link: `/messages?conversation=${conversationId}`,
    actions: [
      { label: "Reply", action: "reply", url: `/messages?conversation=${conversationId}` },
    ],
    metadata: { conversationId },
  });
}

export async function notifyMention(
  userId: string,
  mentionedByName: string,
  context: string,
  orgId: string,
  link?: string
) {
  return createNotification({
    userId,
    orgId,
    createdBy: userId,
    type: "mention",
    category: "messages",
    priority: "high",
    title: `You were mentioned by ${mentionedByName}`,
    message: context,
    link,
  });
}

export async function notifyProjectUpdate(
  userId: string,
  projectName: string,
  update: string,
  orgId: string,
  projectId: string
) {
  return createNotification({
    userId,
    orgId,
    createdBy: userId,
    type: "project_update",
    category: "projects",
    priority: "normal",
    title: `Project Update: ${projectName}`,
    message: update,
    link: `/projects?id=${projectId}`,
    actions: [
      { label: "View Project", action: "view", url: `/projects?id=${projectId}` },
    ],
    metadata: { projectId },
  });
}

export async function notifyTaskDueSoon(
  task: { id: string; title: string; dueDate: Date },
  assigneeId: string,
  orgId: string,
  daysRemaining: number
) {
  const message = daysRemaining <= 0
    ? `"${task.title}" is overdue (was due ${task.dueDate.toLocaleDateString()})`
    : `"${task.title}" is due in ${daysRemaining} day${daysRemaining > 1 ? "s" : ""} (${task.dueDate.toLocaleDateString()})`;
  return createNotification({
    userId: assigneeId,
    orgId,
    createdBy: assigneeId,
    type: "task_due_soon",
    category: "tasks",
    priority: "high",
    title: daysRemaining <= 0 ? "Task Overdue" : "Task Due Soon",
    message,
    link: `/alltasks?id=${task.id}`,
    actions: [
      { label: "View Task", action: "view", url: `/alltasks?id=${task.id}` },
    ],
    metadata: { taskId: task.id, dueDate: task.dueDate.toISOString(), daysRemaining },
  });
}

export async function notifyBillingReminder(
  userId: string,
  orgId: string,
  message: string,
  link?: string
) {
  return createNotification({
    userId,
    orgId,
    createdBy: userId,
    type: "billing_reminder",
    category: "billing",
    priority: "high",
    title: "Billing Reminder",
    message,
    link: link || "/billing",
    actions: [
      { label: "View Billing", action: "view", url: link || "/billing" },
    ],
  });
}

export async function notifyApprovalRequest(
  userId: string,
  orgId: string,
  createdBy: string,
  itemName: string,
  itemType: string,
  link?: string
) {
  return createNotification({
    userId,
    orgId,
    createdBy,
    type: "approval_request",
    category: "approvals",
    priority: "high",
    title: "Approval Request",
    message: `${createdBy} requests approval for ${itemType}: ${itemName}`,
    link: link || "/approvals",
    actions: [
      { label: "Approve", action: "approve", url: link || "/approvals" },
      { label: "Reject", action: "reject", url: link || "/approvals" },
      { label: "Review", action: "view", url: link || "/approvals" },
    ],
  });
}

export async function notifyAnnouncement(
  userId: string,
  orgId: string,
  title: string,
  message: string,
  link?: string
) {
  return createNotification({
    userId,
    orgId,
    createdBy: userId,
    type: "announcement",
    category: "system",
    priority: "normal",
    title,
    message,
    link,
  });
}

export async function notifyTeamUpdate(
  userId: string,
  orgId: string,
  teamName: string,
  update: string,
  link?: string
) {
  return createNotification({
    userId,
    orgId,
    createdBy: userId,
    type: "team_update",
    category: "team",
    priority: "normal",
    title: `Team Update: ${teamName}`,
    message: update,
    link,
  });
}
