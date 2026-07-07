import { EmailData } from "./types.js";

function ts(): string {
  return new Date().toLocaleString();
}

export const buildEmployeeInvited = (
  firstName: string,
  inviterName: string,
  workspaceName: string,
  role: string,
  inviteUrl: string
): EmailData => ({
  subject: `You've been invited to ${workspaceName}`,
  previewText: `${inviterName} has invited you to join ${workspaceName}`,
  greeting: `Hi ${firstName},`,
  metadata: { module: "Employee Management", timestamp: ts(), action: "Invitation" },
  statusIndicator: { type: "info", label: "Invitation" },
  intro: [`${inviterName} has invited you to join ${workspaceName} as a ${role}.`],
  details: [
    { label: "Workspace", value: workspaceName },
    { label: "Invited By", value: inviterName },
    { label: "Your Role", value: role },
  ],
  button: { text: "Accept Invitation", url: inviteUrl },
  warning: "This invitation link will expire in 7 days.",
  supportEmail: "support@workspace.com",
});

export const buildEmployeeOnboarded = (
  firstName: string,
  email: string,
  workspaceName: string,
  loginUrl: string,
  tempPassword: string
): EmailData => ({
  subject: `Welcome to ${workspaceName} - Your Account is Ready`,
  previewText: `Your ${workspaceName} account has been created. Sign in with ${email}.`,
  greeting: `Hi ${firstName},`,
  metadata: { module: "Employee Management", timestamp: ts(), action: "Account Created" },
  statusIndicator: { type: "success", label: "Account Created" },
  intro: [
    `Your account for ${workspaceName} has been created successfully.`,
    "Please use the credentials below to sign in and complete your onboarding.",
  ],
  details: [
    { label: "Workspace", value: workspaceName },
    { label: "Email", value: email },
    { label: "Temporary Password", value: tempPassword },
    { label: "Status", value: "Active" },
  ],
  quickStart: [
    "Log in with your email and temporary password",
    "Set up your profile and upload a photo",
    "Change your temporary password",
    "Review your notification preferences",
    "Explore the workspace and available projects",
    "Connect with your team members",
  ],
  button: { text: "Log In Now", url: loginUrl },
  securityNotice: true,
  warning: "For security, please change your temporary password after your first login.",
  supportEmail: "support@workspace.com",
});

export const buildRoleChanged = (
  firstName: string,
  changedBy: string,
  oldRole: string,
  newRole: string,
  workspaceName: string,
  profileUrl: string
): EmailData => ({
  subject: "Role Updated",
  previewText: `Your role in ${workspaceName} has been changed to ${newRole}`,
  greeting: `Hi ${firstName},`,
  metadata: { module: "Employee Management", timestamp: ts(), action: "Role Changed" },
  statusIndicator: { type: "info", label: "Role Updated" },
  intro: [`Your role in ${workspaceName} has been updated by ${changedBy}.`],
  details: [
    { label: "Workspace", value: workspaceName },
    { label: "Previous Role", value: oldRole },
    { label: "New Role", value: newRole },
    { label: "Updated By", value: changedBy },
  ],
  button: { text: "View Profile", url: profileUrl },
  tip: "Your new role may grant access to additional features and resources.",
  supportEmail: "support@workspace.com",
});

export const buildLeaveRequestSubmitted = (
  firstName: string,
  leaveType: string,
  startDate: string,
  endDate: string,
  duration: string,
  reason: string,
  leaveUrl: string
): EmailData => ({
  subject: `Leave Request Submitted: ${leaveType}`,
  previewText: `Your ${leaveType} leave request from ${startDate} to ${endDate} has been submitted`,
  greeting: `Hi ${firstName},`,
  metadata: { module: "Employee Management", timestamp: ts(), action: "Leave Request" },
  statusIndicator: { type: "info", label: "Pending Approval" },
  intro: ["Your leave request has been submitted successfully and is pending approval."],
  details: [
    { label: "Leave Type", value: leaveType },
    { label: "Start Date", value: startDate },
    { label: "End Date", value: endDate },
    { label: "Duration", value: duration },
    { label: "Reason", value: reason },
  ],
  button: { text: "View Request", url: leaveUrl },
  supportEmail: "support@workspace.com",
});

export const buildLeaveRequestApproved = (
  firstName: string,
  leaveType: string,
  startDate: string,
  endDate: string,
  duration: string,
  approvedBy: string,
  leaveUrl: string
): EmailData => ({
  subject: `Leave Request Approved: ${leaveType}`,
  previewText: `Your ${leaveType} leave request has been approved`,
  greeting: `Hi ${firstName},`,
  metadata: { module: "Employee Management", timestamp: ts(), action: "Leave Approved" },
  statusIndicator: { type: "success", label: "Approved" },
  intro: [`Your ${leaveType} leave request has been approved by ${approvedBy}.`],
  details: [
    { label: "Leave Type", value: leaveType },
    { label: "Start Date", value: startDate },
    { label: "End Date", value: endDate },
    { label: "Duration", value: duration },
    { label: "Approved By", value: approvedBy },
  ],
  button: { text: "View Request", url: leaveUrl },
  tip: "Remember to set an out-of-office message and hand off pending tasks before your leave.",
  supportEmail: "support@workspace.com",
});

export const buildLeaveRequestRejected = (
  firstName: string,
  leaveType: string,
  startDate: string,
  endDate: string,
  rejectedBy: string,
  reason: string,
  leaveUrl: string
): EmailData => ({
  subject: `Leave Request Not Approved: ${leaveType}`,
  previewText: `Your ${leaveType} leave request has not been approved`,
  greeting: `Hi ${firstName},`,
  metadata: { module: "Employee Management", timestamp: ts(), action: "Leave Rejected" },
  statusIndicator: { type: "error", label: "Not Approved" },
  intro: [`Unfortunately, your ${leaveType} leave request was not approved by ${rejectedBy}.`],
  details: [
    { label: "Leave Type", value: leaveType },
    { label: "Start Date", value: startDate },
    { label: "End Date", value: endDate },
    { label: "Rejected By", value: rejectedBy },
    { label: "Reason", value: reason },
  ],
  button: { text: "View Details", url: leaveUrl },
  supportEmail: "support@workspace.com",
});

export const buildEmployeeDeactivated = (
  firstName: string,
  deactivatedBy: string,
  reason: string,
  supportEmail_: string
): EmailData => ({
  subject: "Account Deactivated",
  previewText: "Your account has been deactivated",
  greeting: `Hi ${firstName},`,
  metadata: { module: "Employee Management", timestamp: ts(), action: "Account Deactivated" },
  statusIndicator: { type: "error", label: "Deactivated" },
  intro: ["Your account has been deactivated by an administrator."],
  details: [
    { label: "Deactivated By", value: deactivatedBy },
    { label: "Reason", value: reason },
  ],
  outro: ["If you believe this is a mistake, please contact your administrator or our support team."],
  supportEmail: supportEmail_ || "support@workspace.com",
});

export const buildEmployeeReactivated = (
  firstName: string,
  reactivatedBy: string,
  loginUrl: string
): EmailData => ({
  subject: "Account Reactivated",
  previewText: "Your account has been reactivated",
  greeting: `Hi ${firstName},`,
  metadata: { module: "Employee Management", timestamp: ts(), action: "Account Reactivated" },
  statusIndicator: { type: "success", label: "Active" },
  intro: ["Good news! Your account has been reactivated by an administrator."],
  details: [
    { label: "Reactivated By", value: reactivatedBy },
  ],
  button: { text: "Log In", url: loginUrl },
  supportEmail: "support@workspace.com",
});

export const buildEmployeeProfileUpdated = (
  firstName: string,
  updatedBy: string,
  changes: string,
  profileUrl: string
): EmailData => ({
  subject: "Profile Updated",
  previewText: "Your profile information has been updated",
  greeting: `Hi ${firstName},`,
  metadata: { module: "Employee Management", timestamp: ts(), action: "Profile Updated" },
  statusIndicator: { type: "info", label: "Updated" },
  intro: [`Your profile was updated by ${updatedBy}.`],
  details: [
    { label: "Updated By", value: updatedBy },
    { label: "Changes", value: changes },
  ],
  button: { text: "View Profile", url: profileUrl },
  supportEmail: "support@workspace.com",
});

export const buildWorkAnniversary = (
  firstName: string,
  years: number,
  workspaceName: string,
  profileUrl: string
): EmailData => ({
  subject: `Happy ${years} Year${years > 1 ? 's' : ''} at ${workspaceName}!`,
  previewText: `Celebrating ${years} year${years > 1 ? 's' : ''} with ${workspaceName}`,
  greeting: `Hi ${firstName},`,
  metadata: { module: "Employee Management", timestamp: ts(), action: "Work Anniversary" },
  statusIndicator: { type: "success", label: "Anniversary" },
  intro: [`Congratulations on ${years} incredible year${years > 1 ? 's' : ''} with ${workspaceName}!`],
  cards: [
    {
      title: "Your Journey",
      content: `Thank you for your dedication and contributions over the past ${years} year${years > 1 ? 's' : ''}. Your hard work has made a real difference to our team and company.`,
    },
  ],
  button: { text: "View Profile", url: profileUrl },
  tip: "Take a moment to update your profile and celebrate this milestone with your team!",
  supportEmail: "support@workspace.com",
});

export const buildLeaveRequestActionNeeded = (
  firstName: string,
  employeeName: string,
  leaveType: string,
  startDate: string,
  endDate: string,
  duration: string,
  reviewUrl: string
): EmailData => ({
  subject: `Leave Request Pending Your Review: ${employeeName}`,
  previewText: `${employeeName} has submitted a ${leaveType} leave request requiring your approval`,
  greeting: `Hi ${firstName},`,
  metadata: { module: "Employee Management", timestamp: ts(), action: "Approval Needed" },
  statusIndicator: { type: "warning", label: "Action Required" },
  intro: [`${employeeName} has submitted a ${leaveType} leave request that requires your review.`],
  details: [
    { label: "Employee", value: employeeName },
    { label: "Leave Type", value: leaveType },
    { label: "Start Date", value: startDate },
    { label: "End Date", value: endDate },
    { label: "Duration", value: duration },
  ],
  button: { text: "Review Request", url: reviewUrl },
  supportEmail: "support@workspace.com",
});

export const buildOnboardingReminder = (
  firstName: string,
  email: string,
  workspaceName: string,
  daysSinceCreation: number,
  loginUrl: string
): EmailData => ({
  subject: `Reminder: Complete Your ${workspaceName} Onboarding`,
  previewText: `You haven't completed your ${workspaceName} onboarding yet. Sign in with ${email} to get started.`,
  greeting: `Hi ${firstName},`,
  metadata: { module: "Employee Management", timestamp: ts(), action: "Onboarding Reminder" },
  statusIndicator: { type: "warning", label: "Action Required" },
  intro: [
    `Your ${workspaceName} account was created ${daysSinceCreation} day${daysSinceCreation > 1 ? 's' : ''} ago, but you haven't completed the onboarding process yet.`,
    "Please sign in using your credentials to get started.",
  ],
  details: [
    { label: "Workspace", value: workspaceName },
    { label: "Email", value: email },
    { label: "Account Created", value: `${daysSinceCreation} day${daysSinceCreation > 1 ? 's' : ''} ago` },
  ],
  quickStart: [
    "Log in with your email and password",
    "Set up your profile",
    "Explore projects and tasks",
    "Connect with your team",
  ],
  button: { text: "Complete Onboarding", url: loginUrl },
  warning: "Your account may be deactivated if onboarding is not completed within 14 days.",
  supportEmail: "support@workspace.com",
});
