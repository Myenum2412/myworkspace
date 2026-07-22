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

interface TaskItem {
  id: string;
  title: string;
  status: string;
  priority: string;
  dueDate?: Date;
  project?: string;
  estimatedDuration?: string;
}

interface DailyTaskEmailOptions {
  firstName: string;
  date: string;
  totalTasks: number;
  pendingTasks: TaskItem[];
  overdueTasks: TaskItem[];
  highPriorityTasks: TaskItem[];
  includeProjectGrouping: boolean;
  includeTaskLinks: boolean;
  includeCompanyBranding: boolean;
  dashboardUrl: string;
}

export const buildDailyTaskEmail = (options: DailyTaskEmailOptions): string => {
  const {
    firstName,
    date,
    totalTasks,
    pendingTasks,
    overdueTasks,
    highPriorityTasks,
    includeProjectGrouping,
    includeTaskLinks,
    includeCompanyBranding,
    dashboardUrl,
  } = options;

  const priorityColors: Record<string, string> = {
    urgent: "#dc2626",
    high: "#ea580c",
    medium: "#ca8a04",
    low: "#16a34a",
  };

  const statusColors: Record<string, string> = {
    pending: "#6b7280",
    assigned: "#3b82f6",
    in_progress: "#8b5cf6",
    submitted: "#f59e0b",
  };

  const getPriorityBadge = (priority: string) => {
    const color = priorityColors[priority] || "#6b7280";
    return `<span style="display:inline-block;padding:2px 8px;border-radius:12px;font-size:11px;font-weight:600;color:white;background-color:${color};text-transform:uppercase;">${priority}</span>`;
  };

  const getStatusBadge = (status: string) => {
    const color = statusColors[status] || "#6b7280";
    return `<span style="display:inline-block;padding:2px 8px;border-radius:12px;font-size:11px;font-weight:600;color:white;background-color:${color};text-transform:uppercase;">${status.replace("_", " ")}</span>`;
  };

  const getTaskRow = (task: TaskItem) => {
    const dueDateStr = task.dueDate
      ? new Date(task.dueDate).toLocaleDateString()
      : "No due date";
    const taskLink = includeTaskLinks
      ? `<a href="${dashboardUrl}/tasks/${task.id}" style="color:#2563eb;text-decoration:none;">${task.title}</a>`
      : task.title;

    return `
      <tr style="border-bottom:1px solid #e5e7eb;">
        <td style="padding:12px 8px;font-weight:500;">${taskLink}</td>
        <td style="padding:12px 8px;">${task.project || "No Project"}</td>
        <td style="padding:12px 8px;">${dueDateStr}</td>
        <td style="padding:12px 8px;">${getPriorityBadge(task.priority)}</td>
        <td style="padding:12px 8px;">${getStatusBadge(task.status)}</td>
      </tr>
    `;
  };

  // Build task sections
  let taskSections = "";

  // Overdue Tasks Section
  if (overdueTasks.length > 0) {
    taskSections += `
      <div style="margin-bottom:24px;">
        <h3 style="color:#dc2626;font-size:16px;font-weight:600;margin-bottom:12px;">⚠️ Overdue Tasks (${overdueTasks.length})</h3>
        <table style="width:100%;border-collapse:collapse;background-color:#fef2f2;border-radius:8px;overflow:hidden;">
          <thead>
            <tr style="background-color:#fee2e2;border-bottom:2px solid #fca5a5;">
              <th style="padding:10px 8px;text-align:left;font-size:12px;color:#991b1b;">Task</th>
              <th style="padding:10px 8px;text-align:left;font-size:12px;color:#991b1b;">Project</th>
              <th style="padding:10px 8px;text-align:left;font-size:12px;color:#991b1b;">Due Date</th>
              <th style="padding:10px 8px;text-align:left;font-size:12px;color:#991b1b;">Priority</th>
              <th style="padding:10px 8px;text-align:left;font-size:12px;color:#991b1b;">Status</th>
            </tr>
          </thead>
          <tbody>
            ${overdueTasks.map(getTaskRow).join("")}
          </tbody>
        </table>
      </div>
    `;
  }

  // High Priority Tasks Section
  if (highPriorityTasks.length > 0) {
    taskSections += `
      <div style="margin-bottom:24px;">
        <h3 style="color:#ea580c;font-size:16px;font-weight:600;margin-bottom:12px;">🔥 High Priority Tasks (${highPriorityTasks.length})</h3>
        <table style="width:100%;border-collapse:collapse;background-color:#fff7ed;border-radius:8px;overflow:hidden;">
          <thead>
            <tr style="background-color:#ffedd5;border-bottom:2px solid #fed7aa;">
              <th style="padding:10px 8px;text-align:left;font-size:12px;color:#9a3412;">Task</th>
              <th style="padding:10px 8px;text-align:left;font-size:12px;color:#9a3412;">Project</th>
              <th style="padding:10px 8px;text-align:left;font-size:12px;color:#9a3412;">Due Date</th>
              <th style="padding:10px 8px;text-align:left;font-size:12px;color:#9a3412;">Priority</th>
              <th style="padding:10px 8px;text-align:left;font-size:12px;color:#9a3412;">Status</th>
            </tr>
          </thead>
          <tbody>
            ${highPriorityTasks.map(getTaskRow).join("")}
          </tbody>
        </table>
      </div>
    `;
  }

  // Pending Tasks Section
  if (pendingTasks.length > 0) {
    taskSections += `
      <div style="margin-bottom:24px;">
        <h3 style="color:#3b82f6;font-size:16px;font-weight:600;margin-bottom:12px;">📋 Pending Tasks (${pendingTasks.length})</h3>
        <table style="width:100%;border-collapse:collapse;background-color:#eff6ff;border-radius:8px;overflow:hidden;">
          <thead>
            <tr style="background-color:#dbeafe;border-bottom:2px solid #93c5fd;">
              <th style="padding:10px 8px;text-align:left;font-size:12px;color:#1e40af;">Task</th>
              <th style="padding:10px 8px;text-align:left;font-size:12px;color:#1e40af;">Project</th>
              <th style="padding:10px 8px;text-align:left;font-size:12px;color:#1e40af;">Due Date</th>
              <th style="padding:10px 8px;text-align:left;font-size:12px;color:#1e40af;">Priority</th>
              <th style="padding:10px 8px;text-align:left;font-size:12px;color:#1e40af;">Status</th>
            </tr>
          </thead>
          <tbody>
            ${pendingTasks.map(getTaskRow).join("")}
          </tbody>
        </table>
      </div>
    `;
  }

  // No tasks message
  if (totalTasks === 0) {
    taskSections = `
      <div style="text-align:center;padding:40px 20px;background-color:#f0fdf4;border-radius:8px;margin-bottom:24px;">
        <p style="color:#16a34a;font-size:18px;font-weight:500;margin:0;">You have no assigned tasks for today.</p>
        <p style="color:#6b7280;font-size:14px;margin:8px 0 0 0;">Enjoy your productive day!</p>
      </div>
    `;
  }

  // Company branding footer
  const brandingFooter = includeCompanyBranding
    ? `
      <div style="text-align:center;padding:20px;border-top:1px solid #e5e7eb;margin-top:32px;">
        <p style="color:#9ca3af;font-size:12px;margin:0;">This email was sent by MyWorkSpace</p>
        <p style="color:#9ca3af;font-size:12px;margin:4px 0 0 0;">© ${new Date().getFullYear()} MyWorkSpace. All rights reserved.</p>
      </div>
    `
    : "";

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;background-color:#f3f4f6;margin:0;padding:20px;">
      <div style="max-width:600px;margin:0 auto;background-color:white;border-radius:12px;box-shadow:0 4px 6px rgba(0,0,0,0.1);overflow:hidden;">
        <!-- Header -->
        <div style="background:linear-gradient(135deg,#3b82f6 0%,#8b5cf6 100%);padding:24px;text-align:center;">
          <h1 style="color:white;font-size:24px;font-weight:700;margin:0;">Daily Task Summary</h1>
          <p style="color:rgba(255,255,255,0.9);font-size:14px;margin:8px 0 0 0;">${date}</p>
        </div>

        <!-- Content -->
        <div style="padding:24px;">
          <!-- Greeting -->
          <p style="font-size:16px;color:#374151;margin:0 0 16px 0;">Hi ${firstName},</p>
          
          ${totalTasks > 0 
            ? `<p style="font-size:14px;color:#6b7280;margin:0 0 24px 0;">You have <strong>${totalTasks}</strong> task${totalTasks > 1 ? 's' : ''} assigned today.</p>`
            : ""
          }

          <!-- Task Sections -->
          ${taskSections}

          <!-- View Dashboard Button -->
          ${totalTasks > 0 ? `
            <div style="text-align:center;margin:24px 0;">
              <a href="${dashboardUrl}" style="display:inline-block;background-color:#3b82f6;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;">View Dashboard</a>
            </div>
          ` : ""}
        </div>

        <!-- Branding Footer -->
        ${brandingFooter}
      </div>
    </body>
    </html>
  `;
};
