import { EmailData } from "./types.js";

function ts(): string {
  return new Date().toLocaleString();
}

export const buildProjectCreated = (
  firstName: string,
  projectName: string,
  createdBy: string,
  startDate: string,
  endDate: string,
  projectUrl: string
): EmailData => ({
  subject: `New Project: ${projectName}`,
  previewText: `A new project "${projectName}" has been created`,
  greeting: `Hi ${firstName},`,
  metadata: { module: "Project Management", timestamp: ts(), action: "Project Created" },
  statusIndicator: { type: "info", label: "New Project" },
  intro: [`${createdBy} has created a new project that you are part of.`],
  details: [
    { label: "Project", value: projectName },
    { label: "Created By", value: createdBy },
    { label: "Start Date", value: startDate },
    { label: "End Date", value: endDate },
  ],
  quickStart: [
    "Review project goals and milestones",
    "Check assigned tasks",
    "Introduce yourself to the team",
    "Set up your project preferences",
  ],
  button: { text: "Open Project", url: projectUrl },
  supportEmail: "support@workspace.com",
});

export const buildProjectUpdated = (
  firstName: string,
  projectName: string,
  updatedBy: string,
  changes: string,
  projectUrl: string
): EmailData => ({
  subject: `Project Updated: ${projectName}`,
  previewText: `"${projectName}" has been updated`,
  greeting: `Hi ${firstName},`,
  metadata: { module: "Project Management", timestamp: ts(), action: "Project Updated" },
  statusIndicator: { type: "info", label: "Updated" },
  intro: [`${updatedBy} has made updates to the project "${projectName}".`],
  details: [
    { label: "Project", value: projectName },
    { label: "Updated By", value: updatedBy },
    { label: "Changes", value: changes },
  ],
  button: { text: "Open Project", url: projectUrl },
  supportEmail: "support@workspace.com",
});

export const buildProjectMilestoneReached = (
  firstName: string,
  projectName: string,
  milestoneName: string,
  achievedBy: string,
  progressPercent: number,
  projectUrl: string
): EmailData => ({
  subject: `Milestone Reached: ${milestoneName} - ${projectName}`,
  previewText: `"${milestoneName}" milestone achieved in ${projectName}`,
  greeting: `Hi ${firstName},`,
  metadata: { module: "Project Management", timestamp: ts(), action: "Milestone Reached" },
  statusIndicator: { type: "success", label: "Milestone Completed" },
  intro: [`${achievedBy} has achieved the milestone "${milestoneName}" in ${projectName}.`],
  details: [
    { label: "Project", value: projectName },
    { label: "Milestone", value: milestoneName },
    { label: "Achieved By", value: achievedBy },
    { label: "Overall Progress", value: `${progressPercent}%` },
  ],
  button: { text: "View Progress", url: projectUrl },
  tip: "Keep up the momentum! Review upcoming milestones to stay on track.",
  supportEmail: "support@workspace.com",
});

export const buildProjectDeadlineExtended = (
  firstName: string,
  projectName: string,
  extendedBy: string,
  oldDeadline: string,
  newDeadline: string,
  reason: string,
  projectUrl: string
): EmailData => ({
  subject: `Deadline Extended: ${projectName}`,
  previewText: `The deadline for ${projectName} has been extended to ${newDeadline}`,
  greeting: `Hi ${firstName},`,
  metadata: { module: "Project Management", timestamp: ts(), action: "Deadline Extended" },
  statusIndicator: { type: "warning", label: "Deadline Changed" },
  intro: [`The deadline for "${projectName}" has been extended by ${extendedBy}.`],
  details: [
    { label: "Project", value: projectName },
    { label: "Previous Deadline", value: oldDeadline },
    { label: "New Deadline", value: newDeadline },
    { label: "Reason", value: reason },
    { label: "Extended By", value: extendedBy },
  ],
  button: { text: "View Project", url: projectUrl },
  tip: "Use this additional time wisely. Review the project plan and adjust your schedule accordingly.",
  supportEmail: "support@workspace.com",
});

export const buildProjectCompleted = (
  firstName: string,
  projectName: string,
  completedBy: string,
  totalTasks: number,
  projectUrl: string
): EmailData => ({
  subject: `Project Completed: ${projectName}`,
  previewText: `"${projectName}" has been marked as complete`,
  greeting: `Hi ${firstName},`,
  metadata: { module: "Project Management", timestamp: ts(), action: "Project Completed" },
  statusIndicator: { type: "success", label: "Completed" },
  intro: [`${completedBy} has marked the project "${projectName}" as complete.`],
  details: [
    { label: "Project", value: projectName },
    { label: "Completed By", value: completedBy },
    { label: "Total Tasks", value: String(totalTasks) },
    { label: "Completion Date", value: ts() },
  ],
  cards: [
    {
      title: "Project Summary",
      content: `All tasks have been completed. Great work by the entire team! Be sure to document any lessons learned and celebrate this achievement.`,
    },
  ],
  button: { text: "View Project", url: projectUrl },
  tip: "Take time to celebrate your team's accomplishment and document key takeaways for future projects.",
  supportEmail: "support@workspace.com",
});

export const buildProjectMemberAdded = (
  firstName: string,
  projectName: string,
  addedBy: string,
  memberName: string,
  memberRole: string,
  projectUrl: string
): EmailData => ({
  subject: `New Team Member: ${memberName} joined ${projectName}`,
  previewText: `${memberName} has been added to ${projectName}`,
  greeting: `Hi ${firstName},`,
  metadata: { module: "Project Management", timestamp: ts(), action: "Member Added" },
  statusIndicator: { type: "info", label: "New Member" },
  intro: [`${addedBy} has added ${memberName} to the project "${projectName}" as ${memberRole}.`],
  details: [
    { label: "Project", value: projectName },
    { label: "New Member", value: memberName },
    { label: "Role", value: memberRole },
    { label: "Added By", value: addedBy },
  ],
  button: { text: "View Project", url: projectUrl },
  supportEmail: "support@workspace.com",
});

export const buildProjectMemberRemoved = (
  firstName: string,
  projectName: string,
  removedBy: string,
  memberName: string,
  projectUrl: string
): EmailData => ({
  subject: `Team Member Removed: ${memberName} left ${projectName}`,
  previewText: `${memberName} has been removed from ${projectName}`,
  greeting: `Hi ${firstName},`,
  metadata: { module: "Project Management", timestamp: ts(), action: "Member Removed" },
  statusIndicator: { type: "neutral", label: "Member Removed" },
  intro: [`${removedBy} has removed ${memberName} from the project "${projectName}".`],
  details: [
    { label: "Project", value: projectName },
    { label: "Removed Member", value: memberName },
    { label: "Removed By", value: removedBy },
  ],
  button: { text: "View Project", url: projectUrl },
  supportEmail: "support@workspace.com",
});

export const buildProjectStatusChanged = (
  firstName: string,
  projectName: string,
  changedBy: string,
  oldStatus: string,
  newStatus: string,
  projectUrl: string
): EmailData => ({
  subject: `Project Status Changed: ${projectName}`,
  previewText: `"${projectName}" status changed from ${oldStatus} to ${newStatus}`,
  greeting: `Hi ${firstName},`,
  metadata: { module: "Project Management", timestamp: ts(), action: "Status Changed" },
  statusIndicator: {
    type: newStatus === "Completed" ? "success" : newStatus === "On Hold" ? "warning" : "info",
    label: newStatus,
  },
  intro: [`${changedBy} changed the status of "${projectName}" from ${oldStatus} to ${newStatus}.`],
  details: [
    { label: "Project", value: projectName },
    { label: "Previous Status", value: oldStatus },
    { label: "New Status", value: newStatus },
    { label: "Changed By", value: changedBy },
  ],
  button: { text: "View Project", url: projectUrl },
  supportEmail: "support@workspace.com",
});

export const buildProjectWeeklySummary = (
  firstName: string,
  projectName: string,
  tasksCompleted: number,
  tasksAdded: number,
  tasksOverdue: number,
  upcomingDeadlines: string,
  projectUrl: string
): EmailData => ({
  subject: `Weekly Project Summary - ${projectName}`,
  previewText: `${tasksCompleted} tasks completed, ${tasksOverdue} overdue in ${projectName}`,
  greeting: `Hi ${firstName},`,
  metadata: { module: "Project Management", timestamp: ts(), action: "Weekly Summary" },
  statusIndicator: {
    type: tasksOverdue > 0 ? "warning" : "success",
    label: tasksOverdue > 0 ? `${tasksOverdue} overdue` : "On Track",
  },
  intro: [`Here is your weekly summary for "${projectName}".`],
  details: [
    { label: "Project", value: projectName },
    { label: "Tasks Completed", value: String(tasksCompleted) },
    { label: "New Tasks Added", value: String(tasksAdded) },
    { label: "Overdue Tasks", value: String(tasksOverdue) },
    { label: "Upcoming Deadlines", value: upcomingDeadlines },
  ],
  warning: tasksOverdue > 0
    ? `You have ${tasksOverdue} overdue task${tasksOverdue > 1 ? 's' : ''}. Please prioritize these in the coming week.`
    : undefined,
  button: { text: "View Project", url: projectUrl },
  supportEmail: "support@workspace.com",
});
