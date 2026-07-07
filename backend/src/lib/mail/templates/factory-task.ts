import { EmailData } from "./types.js";

function ts(): string {
  return new Date().toLocaleString();
}

export const buildTaskCreated = (
  firstName: string,
  taskTitle: string,
  projectName: string,
  createdBy: string,
  dueDate: string,
  priority: string,
  taskUrl: string
): EmailData => ({
  subject: `Task Created: ${taskTitle}`,
  previewText: `A new task "${taskTitle}" has been created in ${projectName}`,
  greeting: `Hi ${firstName},`,
  metadata: { module: "Task Management", timestamp: ts(), action: "Task Created" },
  statusIndicator: { type: "info", label: "New Task" },
  intro: [`${createdBy} has created a new task assigned to you in ${projectName}.`],
  details: [
    { label: "Task", value: taskTitle },
    { label: "Project", value: projectName },
    { label: "Created By", value: createdBy },
    { label: "Due Date", value: dueDate },
    { label: "Priority", value: priority },
  ],
  button: { text: "View Task", url: taskUrl },
  outro: ["Please review the task details and update your progress accordingly."],
  supportEmail: "support@workspace.com",
});

export const buildTaskAssigned = (
  firstName: string,
  taskTitle: string,
  projectName: string,
  assignedBy: string,
  dueDate: string,
  priority: string,
  taskUrl: string
): EmailData => ({
  subject: `Task Assigned: ${taskTitle}`,
  previewText: `You have been assigned the task "${taskTitle}"`,
  greeting: `Hi ${firstName},`,
  metadata: { module: "Task Management", timestamp: ts(), action: "Task Assigned" },
  statusIndicator: { type: "info", label: "Assigned to You" },
  intro: [`You have been assigned a new task by ${assignedBy} in ${projectName}.`],
  details: [
    { label: "Task", value: taskTitle },
    { label: "Project", value: projectName },
    { label: "Assigned By", value: assignedBy },
    { label: "Due Date", value: dueDate },
    { label: "Priority", value: priority },
  ],
  button: { text: "View Task", url: taskUrl },
  tip: "Break down large tasks into smaller subtasks for better tracking.",
  supportEmail: "support@workspace.com",
});

export const buildTaskUpdated = (
  firstName: string,
  taskTitle: string,
  projectName: string,
  updatedBy: string,
  changes: string,
  taskUrl: string
): EmailData => ({
  subject: `Task Updated: ${taskTitle}`,
  previewText: `The task "${taskTitle}" has been updated`,
  greeting: `Hi ${firstName},`,
  metadata: { module: "Task Management", timestamp: ts(), action: "Task Updated" },
  statusIndicator: { type: "info", label: "Updated" },
  intro: [`${updatedBy} has made changes to the task "${taskTitle}" in ${projectName}.`],
  details: [
    { label: "Task", value: taskTitle },
    { label: "Project", value: projectName },
    { label: "Updated By", value: updatedBy },
    { label: "Changes", value: changes },
  ],
  button: { text: "View Task", url: taskUrl },
  supportEmail: "support@workspace.com",
});

export const buildTaskDueSoon = (
  firstName: string,
  taskTitle: string,
  projectName: string,
  dueDate: string,
  daysRemaining: number,
  taskUrl: string
): EmailData => ({
  subject: `Task Due Soon: ${taskTitle}`,
  previewText: `"${taskTitle}" is due in ${daysRemaining} days`,
  greeting: `Hi ${firstName},`,
  metadata: { module: "Task Management", timestamp: ts(), action: "Due Reminder" },
  statusIndicator: {
    type: daysRemaining <= 1 ? "error" : "warning",
    label: daysRemaining <= 1 ? "Due Today" : `Due in ${daysRemaining} days`,
  },
  intro: [`This is a reminder that the following task is approaching its deadline.`],
  details: [
    { label: "Task", value: taskTitle },
    { label: "Project", value: projectName },
    { label: "Due Date", value: dueDate },
  ],
  warning: daysRemaining <= 1
    ? "This task is due today. Please prioritize completion."
    : `This task is due in ${daysRemaining} days. Please ensure you are on track.`,
  button: { text: "View Task", url: taskUrl },
  supportEmail: "support@workspace.com",
});

export const buildTaskOverdue = (
  firstName: string,
  taskTitle: string,
  projectName: string,
  dueDate: string,
  daysOverdue: number,
  taskUrl: string
): EmailData => ({
  subject: `Overdue Task: ${taskTitle}`,
  previewText: `"${taskTitle}" is overdue by ${daysOverdue} days`,
  greeting: `Hi ${firstName},`,
  metadata: { module: "Task Management", timestamp: ts(), action: "Overdue Notice" },
  statusIndicator: { type: "error", label: `${daysOverdue} days overdue` },
  intro: [`The following task is past its due date and requires immediate attention.`],
  details: [
    { label: "Task", value: taskTitle },
    { label: "Project", value: projectName },
    { label: "Due Date", value: dueDate },
  ],
  warning: "This task is overdue. Please update your status or request an extension as soon as possible.",
  button: { text: "View Task", url: taskUrl },
  supportEmail: "support@workspace.com",
});

export const buildTaskCompleted = (
  firstName: string,
  taskTitle: string,
  projectName: string,
  completedBy: string,
  taskUrl: string
): EmailData => ({
  subject: `Task Completed: ${taskTitle}`,
  previewText: `"${taskTitle}" has been marked as complete`,
  greeting: `Hi ${firstName},`,
  metadata: { module: "Task Management", timestamp: ts(), action: "Task Completed" },
  statusIndicator: { type: "success", label: "Completed" },
  intro: [`${completedBy} has marked the task "${taskTitle}" as complete in ${projectName}.`],
  details: [
    { label: "Task", value: taskTitle },
    { label: "Project", value: projectName },
    { label: "Completed By", value: completedBy },
  ],
  button: { text: "View Task", url: taskUrl },
  tip: "Great work! Consider reviewing completed tasks during your next team standup.",
  supportEmail: "support@workspace.com",
});

export const buildTaskReopened = (
  firstName: string,
  taskTitle: string,
  projectName: string,
  reopenedBy: string,
  reason: string,
  taskUrl: string
): EmailData => ({
  subject: `Task Reopened: ${taskTitle}`,
  previewText: `"${taskTitle}" has been reopened`,
  greeting: `Hi ${firstName},`,
  metadata: { module: "Task Management", timestamp: ts(), action: "Task Reopened" },
  statusIndicator: { type: "warning", label: "Reopened" },
  intro: [`${reopenedBy} has reopened the task "${taskTitle}" in ${projectName}.`],
  details: [
    { label: "Task", value: taskTitle },
    { label: "Project", value: projectName },
    { label: "Reopened By", value: reopenedBy },
    { label: "Reason", value: reason },
  ],
  button: { text: "View Task", url: taskUrl },
  supportEmail: "support@workspace.com",
});

export const buildTaskCommentAdded = (
  firstName: string,
  taskTitle: string,
  projectName: string,
  commentAuthor: string,
  commentText: string,
  taskUrl: string
): EmailData => ({
  subject: `New Comment on Task: ${taskTitle}`,
  previewText: `${commentAuthor} commented on "${taskTitle}"`,
  greeting: `Hi ${firstName},`,
  metadata: { module: "Task Management", timestamp: ts(), action: "New Comment" },
  statusIndicator: { type: "info", label: "New Comment" },
  intro: [`${commentAuthor} added a comment to the task "${taskTitle}" in ${projectName}.`],
  details: [
    { label: "Task", value: taskTitle },
    { label: "Project", value: projectName },
    { label: "Comment By", value: commentAuthor },
  ],
  cards: [
    {
      title: "Comment",
      content: commentText,
    },
  ],
  button: { text: "View Task", url: taskUrl },
  supportEmail: "support@workspace.com",
});

export const buildTaskStatusChanged = (
  firstName: string,
  taskTitle: string,
  projectName: string,
  changedBy: string,
  oldStatus: string,
  newStatus: string,
  taskUrl: string
): EmailData => ({
  subject: `Task Status Changed: ${taskTitle}`,
  previewText: `"${taskTitle}" moved from ${oldStatus} to ${newStatus}`,
  greeting: `Hi ${firstName},`,
  metadata: { module: "Task Management", timestamp: ts(), action: "Status Changed" },
  statusIndicator: { type: "info", label: newStatus },
  intro: [`${changedBy} updated the status of "${taskTitle}" in ${projectName}.`],
  details: [
    { label: "Task", value: taskTitle },
    { label: "Project", value: projectName },
    { label: "Updated By", value: changedBy },
    { label: "Previous Status", value: oldStatus },
    { label: "New Status", value: newStatus },
  ],
  button: { text: "View Task", url: taskUrl },
  supportEmail: "support@workspace.com",
});

export const buildTaskPriorityChanged = (
  firstName: string,
  taskTitle: string,
  projectName: string,
  changedBy: string,
  oldPriority: string,
  newPriority: string,
  taskUrl: string
): EmailData => ({
  subject: `Task Priority Changed: ${taskTitle}`,
  previewText: `"${taskTitle}" priority changed to ${newPriority}`,
  greeting: `Hi ${firstName},`,
  metadata: { module: "Task Management", timestamp: ts(), action: "Priority Changed" },
  statusIndicator: {
    type: newPriority === "Critical" || newPriority === "High" ? "error" : "info",
    label: `Priority: ${newPriority}`,
  },
  intro: [`${changedBy} updated the priority of "${taskTitle}" in ${projectName}.`],
  details: [
    { label: "Task", value: taskTitle },
    { label: "Project", value: projectName },
    { label: "Updated By", value: changedBy },
    { label: "Previous Priority", value: oldPriority },
    { label: "New Priority", value: newPriority },
  ],
  button: { text: "View Task", url: taskUrl },
  supportEmail: "support@workspace.com",
});

export const buildTaskDeleted = (
  firstName: string,
  taskTitle: string,
  projectName: string,
  deletedBy: string,
  taskUrl: string
): EmailData => ({
  subject: `Task Removed: ${taskTitle}`,
  previewText: `"${taskTitle}" has been deleted from ${projectName}`,
  greeting: `Hi ${firstName},`,
  metadata: { module: "Task Management", timestamp: ts(), action: "Task Deleted" },
  statusIndicator: { type: "neutral", label: "Removed" },
  intro: [`${deletedBy} has removed the task "${taskTitle}" from ${projectName}.`],
  details: [
    { label: "Task", value: taskTitle },
    { label: "Project", value: projectName },
    { label: "Removed By", value: deletedBy },
  ],
  button: { text: "View Project", url: taskUrl },
  supportEmail: "support@workspace.com",
});

export const buildDailyTaskSummary = (
  firstName: string,
  projectName: string,
  completedCount: number,
  pendingCount: number,
  overdueCount: number,
  dashboardUrl: string
): EmailData => ({
  subject: `Daily Task Summary - ${projectName}`,
  previewText: `${completedCount} completed, ${pendingCount} pending, ${overdueCount} overdue`,
  greeting: `Hi ${firstName},`,
  metadata: { module: "Task Management", timestamp: ts(), action: "Daily Summary" },
  intro: [`Here is your daily task summary for ${projectName}.`],
  details: [
    { label: "Project", value: projectName },
    { label: "Completed", value: String(completedCount) },
    { label: "Pending", value: String(pendingCount) },
    { label: "Overdue", value: String(overdueCount) },
  ],
  warning: overdueCount > 0
    ? `You have ${overdueCount} overdue task${overdueCount > 1 ? 's' : ''} that need${overdueCount > 1 ? '' : 's'} attention.`
    : undefined,
  button: { text: "View Dashboard", url: dashboardUrl },
  supportEmail: "support@workspace.com",
});
