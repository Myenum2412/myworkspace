import { createNotification } from "../../services/notification.service.js";

export async function notifyTaskAssigned(
  task: { id: string; title: string },
  assigneeId: string,
  assignedByName: string,
  orgId: string,
  metadata?: Record<string, unknown>
) {
  return createNotification({
    userId: assigneeId, orgId, createdBy: assigneeId,
    type: "task_assigned", category: "tasks", priority: "high",
    title: "Task Assigned",
    message: `${assignedByName} assigned you to "${task.title}"`,
    link: `/alltasks?id=${task.id}`,
    actions: [{ label: "View Task", action: "view", url: `/alltasks?id=${task.id}`, primary: true }],
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
    userId, orgId, createdBy: userId,
    type: "task_updated", category: "tasks",
    title: "Task Updated",
    message: `${updatedByName} updated "${task.title}"${changes ? `: ${changes}` : ""}`,
    link: `/alltasks?id=${task.id}`,
    actions: [{ label: "View Task", action: "view", url: `/alltasks?id=${task.id}`, primary: true }],
    metadata: { taskId: task.id },
  });
}

export async function notifyNewEmployee(
  employee: { id: string; name: string; email: string },
  orgId: string,
  createdBy: string,
  adminIds: string[]
) {
  for (const adminId of adminIds) {
    await createNotification({
      userId: adminId, orgId, createdBy,
      type: "employee_onboarded", category: "hr",
      title: "New Employee Added",
      message: `${employee.name} (${employee.email}) has been added to the organization.`,
      link: "/employees",
    });
  }
}

export async function notifyMessage(
  userId: string,
  fromName: string,
  messagePreview: string,
  orgId: string,
  conversationId: string
) {
  return createNotification({
    userId, orgId, createdBy: userId,
    type: "chat_message", category: "messages",
    title: `Message from ${fromName}`,
    message: messagePreview,
    link: `/messages?conversation=${conversationId}`,
    actions: [{ label: "Reply", action: "reply", url: `/messages?conversation=${conversationId}`, primary: true }],
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
    userId, orgId, createdBy: userId,
    type: "mention", category: "messages", priority: "high",
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
    userId, orgId, createdBy: userId,
    type: "project_updated", category: "projects",
    title: `Project Update: ${projectName}`,
    message: update,
    link: `/projects?id=${projectId}`,
    actions: [{ label: "View Project", action: "view", url: `/projects?id=${projectId}`, primary: true }],
    metadata: { projectId },
  });
}

export async function notifyTeamTaskSubmitted(
  task: { id: string; title: string },
  headUserId: string,
  submittedByName: string,
  orgId: string,
) {
  return createNotification({
    userId: headUserId, orgId, createdBy: headUserId,
    type: "task_submitted", category: "tasks", priority: "high",
    title: "Verification Requested",
    message: `${submittedByName} submitted "${task.title}" for verification`,
    link: `/alltasks?id=${task.id}`,
    actions: [
      { label: "Approve", action: "approve", url: `/alltasks?id=${task.id}`, primary: true },
      { label: "Reject", action: "reject", url: `/alltasks?id=${task.id}` },
      { label: "View Task", action: "view", url: `/alltasks?id=${task.id}` },
    ],
    metadata: { taskId: task.id },
  });
}

export async function notifyTeamTaskApproved(
  task: { id: string; title: string },
  userId: string,
  approvedByName: string,
  orgId: string,
) {
  return createNotification({
    userId, orgId, createdBy: userId,
    type: "task_approved", category: "tasks",
    title: "Task Approved",
    message: `${approvedByName} approved "${task.title}"`,
    link: `/alltasks?id=${task.id}`,
    actions: [{ label: "View Task", action: "view", url: `/alltasks?id=${task.id}`, primary: true }],
    metadata: { taskId: task.id },
  });
}

export async function notifyTeamTaskRejected(
  task: { id: string; title: string },
  userId: string,
  rejectedByName: string,
  orgId: string,
  reason: string,
) {
  return createNotification({
    userId, orgId, createdBy: userId,
    type: "task_rejected", category: "tasks", priority: "high",
    title: "Task Rejected",
    message: `${rejectedByName} rejected "${task.title}": ${reason}`,
    link: `/alltasks?id=${task.id}`,
    actions: [{ label: "View Task", action: "view", url: `/alltasks?id=${task.id}`, primary: true }],
    metadata: { taskId: task.id, rejectionReason: reason },
  });
}

export async function notifyCommonTaskPublished(
  task: { id: string; title: string },
  userId: string,
  publishedByName: string,
  orgId: string,
) {
  return createNotification({
    userId, orgId, createdBy: userId,
    type: "task_published", category: "tasks",
    title: "New Common Task",
    message: `${publishedByName} published "${task.title}"`,
    link: `/alltasks?id=${task.id}`,
    actions: [{ label: "View Task", action: "view", url: `/alltasks?id=${task.id}`, primary: true }],
    metadata: { taskId: task.id },
  });
}

export async function notifyUpcomingTaskActivated(
  task: { id: string; title: string },
  userId: string,
  activatedByName: string,
  orgId: string,
) {
  return createNotification({
    userId, orgId, createdBy: userId,
    type: "task_activated", category: "tasks", priority: "high",
    title: "Task Activated",
    message: `${activatedByName} activated "${task.title}"`,
    link: `/alltasks?id=${task.id}`,
    actions: [{ label: "View Task", action: "view", url: `/alltasks?id=${task.id}`, primary: true }],
    metadata: { taskId: task.id },
  });
}

export async function notifyDraftPublished(
  task: { id: string; title: string },
  userId: string,
  publishedByName: string,
  orgId: string,
  targetType: string,
) {
  return createNotification({
    userId, orgId, createdBy: userId,
    type: "draft_published", category: "tasks",
    title: "Draft Published",
    message: `${publishedByName} published "${task.title}" as a ${targetType} task`,
    link: `/alltasks?id=${task.id}`,
    actions: [{ label: "View Task", action: "view", url: `/alltasks?id=${task.id}`, primary: true }],
    metadata: { taskId: task.id, targetType },
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
    userId: assigneeId, orgId, createdBy: assigneeId,
    type: daysRemaining <= 0 ? "task_overdue" : "task_due_today",
    category: "tasks", priority: "high",
    title: daysRemaining <= 0 ? "Task Overdue" : "Task Due Soon",
    message,
    link: `/alltasks?id=${task.id}`,
    actions: [{ label: "View Task", action: "view", url: `/alltasks?id=${task.id}`, primary: true }],
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
    userId, orgId, createdBy: userId,
    type: "billing_reminder", category: "billing", priority: "high",
    title: "Billing Reminder",
    message,
    link: link || "/billing",
    actions: [{ label: "View Billing", action: "view", url: link || "/billing", primary: true }],
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
    userId, orgId, createdBy,
    type: "approval_requested", category: "approvals", priority: "high",
    title: "Approval Request",
    message: `${createdBy} requests approval for ${itemType}: ${itemName}`,
    link: link || "/approvals",
    actions: [
      { label: "Approve", action: "approve", url: link || "/approvals", primary: true },
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
    userId, orgId, createdBy: userId,
    type: "announcement", category: "system",
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
    userId, orgId, createdBy: userId,
    type: "team_update", category: "team",
    title: `Team Update: ${teamName}`,
    message: update,
    link,
  });
}
