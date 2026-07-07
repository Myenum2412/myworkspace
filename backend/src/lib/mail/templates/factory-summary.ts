import { EmailData, SummaryItem } from "./types.js";

function ts(): string {
  return new Date().toLocaleString();
}

export const buildDailyDigest = (
  firstName: string,
  date: string,
  taskUpdates: SummaryItem[],
  pendingApprovals: SummaryItem[],
  fileUpdates: SummaryItem[],
  totalNotifications: number,
  dashboardUrl: string
): EmailData => ({
  subject: `Daily Digest - ${date}`,
  previewText: `${totalNotifications} updates for today: ${taskUpdates.length} tasks, ${pendingApprovals.length} approvals, ${fileUpdates.length} files`,
  greeting: `Hi ${firstName},`,
  metadata: { module: "Notification Summary", timestamp: ts(), action: "Daily Digest" },
  statusIndicator: {
    type: pendingApprovals.length > 0 ? "warning" : "info",
    label: `${totalNotifications} update${totalNotifications !== 1 ? 's' : ''}`,
  },
  intro: ["Here is a summary of everything that needs your attention today."],
  divider: true,
  ...(taskUpdates.length > 0 ? {
    cards: [
      {
        title: `Tasks (${taskUpdates.length})`,
        list: taskUpdates.map(t => `${t.title}${t.meta ? ` - ${t.meta}` : ''}`),
      },
    ],
  } : {}),
  ...(pendingApprovals.length > 0 ? {
    cards: [
      ...(taskUpdates.length > 0 ? [] : []),
      {
        title: `Pending Approvals (${pendingApprovals.length})`,
        list: pendingApprovals.map(a => `${a.title}${a.meta ? ` - ${a.meta}` : ''}`),
      },
    ].filter((_, i, arr) => i < 2 || arr.length <= 2),
  } : {}),
  button: { text: "View Dashboard", url: dashboardUrl },
  ...(pendingApprovals.length > 0 ? {
    warning: `You have ${pendingApprovals.length} pending approval${pendingApprovals.length > 1 ? 's' : ''} that need your review.` as const,
  } : {}),
  supportEmail: "support@workspace.com",
});

export const buildWeeklyDigest = (
  firstName: string,
  weekLabel: string,
  tasksCompleted: number,
  tasksCreated: number,
  projectsUpdated: number,
  filesUploaded: number,
  approvalsHandled: number,
  topItems: SummaryItem[],
  dashboardUrl: string
): EmailData => ({
  subject: `Weekly Digest - ${weekLabel}`,
  previewText: `${tasksCompleted} tasks completed, ${filesUploaded} files uploaded, ${approvalsHandled} approvals handled`,
  greeting: `Hi ${firstName},`,
  metadata: { module: "Notification Summary", timestamp: ts(), action: "Weekly Digest" },
  statusIndicator: { type: "info", label: "Weekly Summary" },
  intro: ["Here is your weekly activity summary. See what happened across your workspace this week."],
  details: [
    { label: "Week", value: weekLabel },
    { label: "Tasks Completed", value: String(tasksCompleted) },
    { label: "Tasks Created", value: String(tasksCreated) },
    { label: "Projects Updated", value: String(projectsUpdated) },
    { label: "Files Uploaded", value: String(filesUploaded) },
    { label: "Approvals Handled", value: String(approvalsHandled) },
  ],
  ...(topItems.length > 0 ? {
    cards: [
      {
        title: "Top Highlights",
        list: topItems.map(item => item.title),
      },
    ],
  } : {}),
  button: { text: "View Full Report", url: dashboardUrl },
  tip: "Review your upcoming tasks and deadlines to start the next week strong.",
  supportEmail: "support@workspace.com",
});

export const buildUnreadNotificationsReminder = (
  firstName: string,
  unreadCount: number,
  topNotifications: SummaryItem[],
  notificationsUrl: string
): EmailData => ({
  subject: `You have ${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}`,
  previewText: `${unreadCount} unread notification${unreadCount > 1 ? 's' : ''} waiting for you`,
  greeting: `Hi ${firstName},`,
  metadata: { module: "Notification Summary", timestamp: ts(), action: "Unread Reminder" },
  statusIndicator: {
    type: unreadCount > 10 ? "warning" : "info",
    label: `${unreadCount} unread`,
  },
  intro: [`You have ${unreadCount} unread notification${unreadCount > 1 ? 's' : ''} that ${unreadCount > 1 ? 'are' : 'is'} waiting for your attention.`],
  ...(topNotifications.length > 0 ? {
    summaryItems: topNotifications,
  } : {}),
  button: { text: "View Notifications", url: notificationsUrl },
  supportEmail: "support@workspace.com",
});
