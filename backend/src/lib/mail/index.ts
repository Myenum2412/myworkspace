import { Resend } from "resend";
import { env } from "../../config/env.js";
import nodemailer from "nodemailer";
import { buildEmailHtml } from "./templates/builder.js";
import * as Factory from "./templates/factory.js";

let resend: Resend | null = null;

const transporter = env.SMTP_HOST
  ? nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_PORT === 465,
      auth: {
        user: env.SMTP_USER,
        pass: env.SMTP_PASS,
      },
    })
  : null;

const RESEND_TEST_SENDER = "onboarding@resend.dev";

if (!transporter && env.MAIL_FROM === RESEND_TEST_SENDER) {
  console.warn(
    "[mail] WARNING: Using Resend test sender (onboarding@resend.dev). " +
    "Emails will ONLY be delivered to the email address verified with your Resend API key. " +
    "Set MAIL_FROM to a verified domain (e.g., 'noreply@yourdomain.com') to send to any recipient."
  );
}

async function sendEmail(to: string, subject: string, htmlBody: string): Promise<void> {
  if (transporter) {
    try {
      const info = await transporter.sendMail({
        from: env.MAIL_FROM,
        to,
        subject,
        html: htmlBody,
      });
      console.log(`[mail] Email sent to ${to} via SMTP (messageId: ${info.messageId})`);
      return;
    } catch (error: any) {
      console.error(`[mail] Failed to send email via SMTP to ${to}:`, error);
      throw new Error(`Failed to send email via SMTP: ${error.message}`);
    }
  }

  if (!env.RESEND_API_KEY) {
    const msg = "[mail] CRITICAL: Neither SMTP nor RESEND_API_KEY configured — email delivery skipped";
    console.error(msg);
    throw new Error(msg);
  }

  if (!resend) {
    resend = new Resend(env.RESEND_API_KEY);
  }

  // Try configured from address first, fall back to Resend test sender
  let lastError: any;
  const fromAddresses = [env.MAIL_FROM, RESEND_TEST_SENDER];

  for (const from of fromAddresses) {
    const { data, error } = await resend.emails.send({
      from,
      to,
      subject,
      html: htmlBody,
    });

    if (!error) {
      console.log(`[mail] Email sent to ${to} via Resend (from: ${from}, id: ${data?.id})`);
      return;
    }
    lastError = error;
    console.warn(`[mail] Failed to send via Resend "${from}" to ${to}:`, error.message);
  }

  const errMsg = `Failed to send email to ${to}: ${lastError?.message || "unknown error"}`;
  console.error(`[mail] ${errMsg}`);
  throw new Error(errMsg);
}

// ============================================================
// ACCOUNT MODULE (Backward Compatible + Enhanced)
// ============================================================

export async function sendPasswordResetEmail(to: string, name: string, resetLink: string): Promise<void> {
  const data = Factory.buildPasswordReset(name, resetLink);
  await sendEmail(to, data.subject, buildEmailHtml(data));
}

export async function sendWelcomeEmail(to: string, name: string): Promise<void> {
  const data = Factory.buildWelcomeEmail(name, to, "MyWorkspace", null, "User", `${env.APP_URL}/login`);
  await sendEmail(to, data.subject, buildEmailHtml(data));
}

export async function sendOrganizationInviteEmail(to: string, name: string, orgName: string, inviteUrl: string): Promise<void> {
  const data = Factory.buildWorkspaceInvite(name, "An administrator", orgName, inviteUrl);
  await sendEmail(to, data.subject, buildEmailHtml(data));
}

export async function sendVerificationEmail(to: string, name: string, verificationUrl: string): Promise<void> {
  const data = Factory.buildVerificationEmail(name, verificationUrl);
  await sendEmail(to, data.subject, buildEmailHtml(data));
}

export async function sendClientWelcomeEmail(to: string, clientName: string, email: string, tempPassword: string, loginUrl: string): Promise<void> {
  const data = Factory.buildWelcomeEmail(clientName, email, "MyWorkspace", null, "Client", loginUrl, tempPassword);
  await sendEmail(to, data.subject, buildEmailHtml(data));
}

export async function sendUserWelcomeEmail(to: string, firstName: string, workspaceName: string, companyName: string | null, role: string, loginUrl: string, tempPassword?: string, providerIcon?: string): Promise<void> {
  const data = Factory.buildWelcomeEmail(firstName, to, workspaceName, companyName, role, loginUrl, tempPassword, providerIcon);
  await sendEmail(to, data.subject, buildEmailHtml(data));
}

export async function sendAccountOnboardingReminder(to: string, firstName: string, email: string, workspaceName: string, role: string, daysSinceCreation: number, loginUrl: string): Promise<void> {
  const data = Factory.buildAccountOnboardingReminder(firstName, email, workspaceName, role, daysSinceCreation, loginUrl);
  await sendEmail(to, data.subject, buildEmailHtml(data));
}

export async function sendUserVerificationEmail(to: string, firstName: string, verificationUrl: string): Promise<void> {
  const data = Factory.buildVerificationEmail(firstName, verificationUrl);
  await sendEmail(to, data.subject, buildEmailHtml(data));
}

export async function sendVerifiedEmail(to: string, firstName: string, loginUrl: string): Promise<void> {
  const data = Factory.buildVerifiedEmail(firstName, loginUrl);
  await sendEmail(to, data.subject, buildEmailHtml(data));
}

export async function sendWorkspaceInvite(to: string, firstName: string, inviterName: string, workspaceName: string, inviteUrl: string): Promise<void> {
  const data = Factory.buildWorkspaceInvite(firstName, inviterName, workspaceName, inviteUrl);
  await sendEmail(to, data.subject, buildEmailHtml(data));
}

export async function sendTeamMemberAdded(to: string, firstName: string, teamName: string, loginUrl: string): Promise<void> {
  const data = Factory.buildTeamMemberAdded(firstName, teamName, loginUrl);
  await sendEmail(to, data.subject, buildEmailHtml(data));
}

export async function sendFirstLogin(to: string, firstName: string): Promise<void> {
  const data = Factory.buildFirstLogin(firstName);
  await sendEmail(to, data.subject, buildEmailHtml(data));
}

export async function sendGettingStarted(to: string, firstName: string, docsUrl: string): Promise<void> {
  const data = Factory.buildGettingStarted(firstName, docsUrl);
  await sendEmail(to, data.subject, buildEmailHtml(data));
}

export async function sendProfileReminder(to: string, firstName: string, profileUrl: string): Promise<void> {
  const data = Factory.buildProfileReminder(firstName, profileUrl);
  await sendEmail(to, data.subject, buildEmailHtml(data));
}

export async function sendWorkspaceSetupComplete(to: string, workspaceName: string, loginUrl: string): Promise<void> {
  const data = Factory.buildWorkspaceSetupComplete(workspaceName, loginUrl);
  await sendEmail(to, data.subject, buildEmailHtml(data));
}

export async function sendPasswordChanged(to: string, firstName: string): Promise<void> {
  const data = Factory.buildPasswordChanged(firstName);
  await sendEmail(to, data.subject, buildEmailHtml(data));
}

export async function sendNewDeviceLogin(to: string, firstName: string, deviceName: string, location: string): Promise<void> {
  const data = Factory.buildNewDeviceLogin(firstName, deviceName, location);
  await sendEmail(to, data.subject, buildEmailHtml(data));
}

export async function sendSecurityAlert(to: string, firstName: string, alertDetails: string): Promise<void> {
  const data = Factory.buildSecurityAlert(firstName, alertDetails);
  await sendEmail(to, data.subject, buildEmailHtml(data));
}

export async function sendSubscriptionActivated(to: string, firstName: string, planName: string, loginUrl: string): Promise<void> {
  const data = Factory.buildSubscriptionActivated(firstName, planName, loginUrl);
  await sendEmail(to, data.subject, buildEmailHtml(data));
}

export async function sendTrialStarted(to: string, firstName: string, daysLeft: number, loginUrl: string): Promise<void> {
  const data = Factory.buildTrialStarted(firstName, daysLeft, loginUrl);
  await sendEmail(to, data.subject, buildEmailHtml(data));
}

export async function sendTrialEndingSoon(to: string, firstName: string, daysLeft: number, upgradeUrl: string): Promise<void> {
  const data = Factory.buildTrialEndingSoon(firstName, daysLeft, upgradeUrl);
  await sendEmail(to, data.subject, buildEmailHtml(data));
}

export async function sendRenewalConfirmation(to: string, firstName: string, amount: string): Promise<void> {
  const data = Factory.buildRenewalConfirmation(firstName, amount);
  await sendEmail(to, data.subject, buildEmailHtml(data));
}

export async function sendPasswordReset(to: string, firstName: string, resetUrl: string): Promise<void> {
  const data = Factory.buildPasswordReset(firstName, resetUrl);
  await sendEmail(to, data.subject, buildEmailHtml(data));
}

export async function sendPasswordResetSuccess(to: string, firstName: string, loginUrl: string): Promise<void> {
  const data = Factory.buildPasswordResetSuccess(firstName, loginUrl);
  await sendEmail(to, data.subject, buildEmailHtml(data));
}

export async function sendAccountDeactivated(to: string, firstName: string): Promise<void> {
  const data = Factory.buildAccountDeactivated(firstName);
  await sendEmail(to, data.subject, buildEmailHtml(data));
}

export async function sendAccountReactivated(to: string, firstName: string, loginUrl: string): Promise<void> {
  const data = Factory.buildAccountReactivated(firstName, loginUrl);
  await sendEmail(to, data.subject, buildEmailHtml(data));
}

// ============================================================
// TASK MANAGEMENT MODULE
// ============================================================

export async function sendTaskCreated(to: string, firstName: string, taskTitle: string, projectName: string, createdBy: string, dueDate: string, priority: string, taskUrl: string): Promise<void> {
  const data = Factory.buildTaskCreated(firstName, taskTitle, projectName, createdBy, dueDate, priority, taskUrl);
  await sendEmail(to, data.subject, buildEmailHtml(data));
}

export async function sendTaskAssigned(to: string, firstName: string, taskTitle: string, projectName: string, assignedBy: string, dueDate: string, priority: string, taskUrl: string): Promise<void> {
  const data = Factory.buildTaskAssigned(firstName, taskTitle, projectName, assignedBy, dueDate, priority, taskUrl);
  await sendEmail(to, data.subject, buildEmailHtml(data));
}

export async function sendTaskUpdated(to: string, firstName: string, taskTitle: string, projectName: string, updatedBy: string, changes: string, taskUrl: string): Promise<void> {
  const data = Factory.buildTaskUpdated(firstName, taskTitle, projectName, updatedBy, changes, taskUrl);
  await sendEmail(to, data.subject, buildEmailHtml(data));
}

export async function sendTaskDueSoon(to: string, firstName: string, taskTitle: string, projectName: string, dueDate: string, daysRemaining: number, taskUrl: string): Promise<void> {
  const data = Factory.buildTaskDueSoon(firstName, taskTitle, projectName, dueDate, daysRemaining, taskUrl);
  await sendEmail(to, data.subject, buildEmailHtml(data));
}

export async function sendTaskOverdue(to: string, firstName: string, taskTitle: string, projectName: string, dueDate: string, daysOverdue: number, taskUrl: string): Promise<void> {
  const data = Factory.buildTaskOverdue(firstName, taskTitle, projectName, dueDate, daysOverdue, taskUrl);
  await sendEmail(to, data.subject, buildEmailHtml(data));
}

export async function sendTaskCompleted(to: string, firstName: string, taskTitle: string, projectName: string, completedBy: string, taskUrl: string): Promise<void> {
  const data = Factory.buildTaskCompleted(firstName, taskTitle, projectName, completedBy, taskUrl);
  await sendEmail(to, data.subject, buildEmailHtml(data));
}

export async function sendTaskReopened(to: string, firstName: string, taskTitle: string, projectName: string, reopenedBy: string, reason: string, taskUrl: string): Promise<void> {
  const data = Factory.buildTaskReopened(firstName, taskTitle, projectName, reopenedBy, reason, taskUrl);
  await sendEmail(to, data.subject, buildEmailHtml(data));
}

export async function sendTaskCommentAdded(to: string, firstName: string, taskTitle: string, projectName: string, commentAuthor: string, commentText: string, taskUrl: string): Promise<void> {
  const data = Factory.buildTaskCommentAdded(firstName, taskTitle, projectName, commentAuthor, commentText, taskUrl);
  await sendEmail(to, data.subject, buildEmailHtml(data));
}

export async function sendTaskStatusChanged(to: string, firstName: string, taskTitle: string, projectName: string, changedBy: string, oldStatus: string, newStatus: string, taskUrl: string): Promise<void> {
  const data = Factory.buildTaskStatusChanged(firstName, taskTitle, projectName, changedBy, oldStatus, newStatus, taskUrl);
  await sendEmail(to, data.subject, buildEmailHtml(data));
}

export async function sendTaskPriorityChanged(to: string, firstName: string, taskTitle: string, projectName: string, changedBy: string, oldPriority: string, newPriority: string, taskUrl: string): Promise<void> {
  const data = Factory.buildTaskPriorityChanged(firstName, taskTitle, projectName, changedBy, oldPriority, newPriority, taskUrl);
  await sendEmail(to, data.subject, buildEmailHtml(data));
}

export async function sendTaskDeleted(to: string, firstName: string, taskTitle: string, projectName: string, deletedBy: string, taskUrl: string): Promise<void> {
  const data = Factory.buildTaskDeleted(firstName, taskTitle, projectName, deletedBy, taskUrl);
  await sendEmail(to, data.subject, buildEmailHtml(data));
}

export async function sendDailyTaskSummary(to: string, firstName: string, projectName: string, completedCount: number, pendingCount: number, overdueCount: number, dashboardUrl: string): Promise<void> {
  const data = Factory.buildDailyTaskSummary(firstName, projectName, completedCount, pendingCount, overdueCount, dashboardUrl);
  await sendEmail(to, data.subject, buildEmailHtml(data));
}

// ============================================================
// EMPLOYEE MANAGEMENT MODULE
// ============================================================

export async function sendEmployeeInvited(to: string, firstName: string, inviterName: string, workspaceName: string, role: string, inviteUrl: string): Promise<void> {
  const data = Factory.buildEmployeeInvited(firstName, inviterName, workspaceName, role, inviteUrl);
  await sendEmail(to, data.subject, buildEmailHtml(data));
}

export async function sendEmployeeOnboarded(to: string, firstName: string, email: string, workspaceName: string, loginUrl: string, tempPassword: string): Promise<void> {
  const data = Factory.buildEmployeeOnboarded(firstName, email, workspaceName, loginUrl, tempPassword);
  await sendEmail(to, data.subject, buildEmailHtml(data));
}

export async function sendOnboardingReminder(to: string, firstName: string, email: string, workspaceName: string, daysSinceCreation: number, loginUrl: string): Promise<void> {
  const data = Factory.buildOnboardingReminder(firstName, email, workspaceName, daysSinceCreation, loginUrl);
  await sendEmail(to, data.subject, buildEmailHtml(data));
}

export async function sendRoleChanged(to: string, firstName: string, changedBy: string, oldRole: string, newRole: string, workspaceName: string, profileUrl: string): Promise<void> {
  const data = Factory.buildRoleChanged(firstName, changedBy, oldRole, newRole, workspaceName, profileUrl);
  await sendEmail(to, data.subject, buildEmailHtml(data));
}

export async function sendLeaveRequestSubmitted(to: string, firstName: string, leaveType: string, startDate: string, endDate: string, duration: string, reason: string, leaveUrl: string): Promise<void> {
  const data = Factory.buildLeaveRequestSubmitted(firstName, leaveType, startDate, endDate, duration, reason, leaveUrl);
  await sendEmail(to, data.subject, buildEmailHtml(data));
}

export async function sendLeaveRequestApproved(to: string, firstName: string, leaveType: string, startDate: string, endDate: string, duration: string, approvedBy: string, leaveUrl: string): Promise<void> {
  const data = Factory.buildLeaveRequestApproved(firstName, leaveType, startDate, endDate, duration, approvedBy, leaveUrl);
  await sendEmail(to, data.subject, buildEmailHtml(data));
}

export async function sendLeaveRequestRejected(to: string, firstName: string, leaveType: string, startDate: string, endDate: string, rejectedBy: string, reason: string, leaveUrl: string): Promise<void> {
  const data = Factory.buildLeaveRequestRejected(firstName, leaveType, startDate, endDate, rejectedBy, reason, leaveUrl);
  await sendEmail(to, data.subject, buildEmailHtml(data));
}

export async function sendEmployeeDeactivated(to: string, firstName: string, deactivatedBy: string, reason: string, supportEmail?: string): Promise<void> {
  const data = Factory.buildEmployeeDeactivated(firstName, deactivatedBy, reason, supportEmail || "support@workspace.com");
  await sendEmail(to, data.subject, buildEmailHtml(data));
}

export async function sendEmployeeReactivated(to: string, firstName: string, reactivatedBy: string, loginUrl: string): Promise<void> {
  const data = Factory.buildEmployeeReactivated(firstName, reactivatedBy, loginUrl);
  await sendEmail(to, data.subject, buildEmailHtml(data));
}

export async function sendEmployeeProfileUpdated(to: string, firstName: string, updatedBy: string, changes: string, profileUrl: string): Promise<void> {
  const data = Factory.buildEmployeeProfileUpdated(firstName, updatedBy, changes, profileUrl);
  await sendEmail(to, data.subject, buildEmailHtml(data));
}

export async function sendWorkAnniversary(to: string, firstName: string, years: number, workspaceName: string, profileUrl: string): Promise<void> {
  const data = Factory.buildWorkAnniversary(firstName, years, workspaceName, profileUrl);
  await sendEmail(to, data.subject, buildEmailHtml(data));
}

export async function sendLeaveRequestActionNeeded(to: string, firstName: string, employeeName: string, leaveType: string, startDate: string, endDate: string, duration: string, reviewUrl: string): Promise<void> {
  const data = Factory.buildLeaveRequestActionNeeded(firstName, employeeName, leaveType, startDate, endDate, duration, reviewUrl);
  await sendEmail(to, data.subject, buildEmailHtml(data));
}

// ============================================================
// PROJECT MANAGEMENT MODULE
// ============================================================

export async function sendProjectCreated(to: string, firstName: string, projectName: string, createdBy: string, startDate: string, endDate: string, projectUrl: string): Promise<void> {
  const data = Factory.buildProjectCreated(firstName, projectName, createdBy, startDate, endDate, projectUrl);
  await sendEmail(to, data.subject, buildEmailHtml(data));
}

export async function sendProjectUpdated(to: string, firstName: string, projectName: string, updatedBy: string, changes: string, projectUrl: string): Promise<void> {
  const data = Factory.buildProjectUpdated(firstName, projectName, updatedBy, changes, projectUrl);
  await sendEmail(to, data.subject, buildEmailHtml(data));
}

export async function sendProjectMilestoneReached(to: string, firstName: string, projectName: string, milestoneName: string, achievedBy: string, progressPercent: number, projectUrl: string): Promise<void> {
  const data = Factory.buildProjectMilestoneReached(firstName, projectName, milestoneName, achievedBy, progressPercent, projectUrl);
  await sendEmail(to, data.subject, buildEmailHtml(data));
}

export async function sendProjectDeadlineExtended(to: string, firstName: string, projectName: string, extendedBy: string, oldDeadline: string, newDeadline: string, reason: string, projectUrl: string): Promise<void> {
  const data = Factory.buildProjectDeadlineExtended(firstName, projectName, extendedBy, oldDeadline, newDeadline, reason, projectUrl);
  await sendEmail(to, data.subject, buildEmailHtml(data));
}

export async function sendProjectCompleted(to: string, firstName: string, projectName: string, completedBy: string, totalTasks: number, projectUrl: string): Promise<void> {
  const data = Factory.buildProjectCompleted(firstName, projectName, completedBy, totalTasks, projectUrl);
  await sendEmail(to, data.subject, buildEmailHtml(data));
}

export async function sendProjectMemberAdded(to: string, firstName: string, projectName: string, addedBy: string, memberName: string, memberRole: string, projectUrl: string): Promise<void> {
  const data = Factory.buildProjectMemberAdded(firstName, projectName, addedBy, memberName, memberRole, projectUrl);
  await sendEmail(to, data.subject, buildEmailHtml(data));
}

export async function sendProjectMemberRemoved(to: string, firstName: string, projectName: string, removedBy: string, memberName: string, projectUrl: string): Promise<void> {
  const data = Factory.buildProjectMemberRemoved(firstName, projectName, removedBy, memberName, projectUrl);
  await sendEmail(to, data.subject, buildEmailHtml(data));
}

export async function sendProjectStatusChanged(to: string, firstName: string, projectName: string, changedBy: string, oldStatus: string, newStatus: string, projectUrl: string): Promise<void> {
  const data = Factory.buildProjectStatusChanged(firstName, projectName, changedBy, oldStatus, newStatus, projectUrl);
  await sendEmail(to, data.subject, buildEmailHtml(data));
}

export async function sendProjectWeeklySummary(to: string, firstName: string, projectName: string, tasksCompleted: number, tasksAdded: number, tasksOverdue: number, upcomingDeadlines: string, projectUrl: string): Promise<void> {
  const data = Factory.buildProjectWeeklySummary(firstName, projectName, tasksCompleted, tasksAdded, tasksOverdue, upcomingDeadlines, projectUrl);
  await sendEmail(to, data.subject, buildEmailHtml(data));
}

// ============================================================
// APPROVALS MODULE
// ============================================================

export async function sendApprovalRequested(to: string, firstName: string, itemName: string, itemType: string, requestedBy: string, projectName: string, reason: string, approvalUrl: string): Promise<void> {
  const data = Factory.buildApprovalRequested(firstName, itemName, itemType, requestedBy, projectName, reason, approvalUrl);
  await sendEmail(to, data.subject, buildEmailHtml(data));
}

export async function sendApprovalApproved(to: string, firstName: string, itemName: string, itemType: string, approvedBy: string, projectName: string, comments: string, approvalUrl: string): Promise<void> {
  const data = Factory.buildApprovalApproved(firstName, itemName, itemType, approvedBy, projectName, comments, approvalUrl);
  await sendEmail(to, data.subject, buildEmailHtml(data));
}

export async function sendApprovalRejected(to: string, firstName: string, itemName: string, itemType: string, rejectedBy: string, projectName: string, reason: string, feedback: string, approvalUrl: string): Promise<void> {
  const data = Factory.buildApprovalRejected(firstName, itemName, itemType, rejectedBy, projectName, reason, feedback, approvalUrl);
  await sendEmail(to, data.subject, buildEmailHtml(data));
}

export async function sendApprovalReminder(to: string, firstName: string, itemName: string, itemType: string, requestedBy: string, daysPending: number, projectName: string, approvalUrl: string): Promise<void> {
  const data = Factory.buildApprovalReminder(firstName, itemName, itemType, requestedBy, daysPending, projectName, approvalUrl);
  await sendEmail(to, data.subject, buildEmailHtml(data));
}

export async function sendDocumentApprovalRequested(to: string, firstName: string, documentName: string, requestedBy: string, projectName: string, documentUrl: string, approvalUrl: string): Promise<void> {
  const data = Factory.buildDocumentApprovalRequested(firstName, documentName, requestedBy, projectName, documentUrl, approvalUrl);
  await sendEmail(to, data.subject, buildEmailHtml(data));
}

export async function sendDocumentApproved(to: string, firstName: string, documentName: string, approvedBy: string, projectName: string, comments: string, documentUrl: string): Promise<void> {
  const data = Factory.buildDocumentApproved(firstName, documentName, approvedBy, projectName, comments, documentUrl);
  await sendEmail(to, data.subject, buildEmailHtml(data));
}

export async function sendDocumentRejected(to: string, firstName: string, documentName: string, rejectedBy: string, projectName: string, reason: string, feedback: string, documentUrl: string): Promise<void> {
  const data = Factory.buildDocumentRejected(firstName, documentName, rejectedBy, projectName, reason, feedback, documentUrl);
  await sendEmail(to, data.subject, buildEmailHtml(data));
}

export async function sendFileReviewRequested(to: string, firstName: string, fileName: string, requestedBy: string, projectName: string, dueDate: string, reviewUrl: string): Promise<void> {
  const data = Factory.buildFileReviewRequested(firstName, fileName, requestedBy, projectName, dueDate, reviewUrl);
  await sendEmail(to, data.subject, buildEmailHtml(data));
}

export async function sendFileReviewCompleted(to: string, firstName: string, fileName: string, reviewedBy: string, projectName: string, verdict: string, comments: string, fileUrl: string): Promise<void> {
  const data = Factory.buildFileReviewCompleted(firstName, fileName, reviewedBy, projectName, verdict, comments, fileUrl);
  await sendEmail(to, data.subject, buildEmailHtml(data));
}

// ============================================================
// FILE MANAGEMENT MODULE
// ============================================================

export async function sendFileUploaded(to: string, firstName: string, fileName: string, uploadedBy: string, projectName: string, fileSize: string, fileType: string, fileUrl: string): Promise<void> {
  const data = Factory.buildFileUploaded(firstName, fileName, uploadedBy, projectName, fileSize, fileType, fileUrl);
  await sendEmail(to, data.subject, buildEmailHtml(data));
}

export async function sendFileDownloaded(to: string, firstName: string, fileName: string, downloadedBy: string, projectName: string, ipAddress: string, fileUrl: string): Promise<void> {
  const data = Factory.buildFileDownloaded(firstName, fileName, downloadedBy, projectName, ipAddress, fileUrl);
  await sendEmail(to, data.subject, buildEmailHtml(data));
}

export async function sendFileShared(to: string, firstName: string, fileName: string, sharedBy: string, projectName: string, sharedWith: string, permission: string, fileUrl: string): Promise<void> {
  const data = Factory.buildFileShared(firstName, fileName, sharedBy, projectName, sharedWith, permission, fileUrl);
  await sendEmail(to, data.subject, buildEmailHtml(data));
}

export async function sendFileVersionUpdated(to: string, firstName: string, fileName: string, updatedBy: string, projectName: string, versionNumber: string, changeSummary: string, fileUrl: string): Promise<void> {
  const data = Factory.buildFileVersionUpdated(firstName, fileName, updatedBy, projectName, versionNumber, changeSummary, fileUrl);
  await sendEmail(to, data.subject, buildEmailHtml(data));
}

export async function sendFileAccessChanged(to: string, firstName: string, fileName: string, changedBy: string, projectName: string, oldPermission: string, newPermission: string, fileUrl: string): Promise<void> {
  const data = Factory.buildFileAccessChanged(firstName, fileName, changedBy, projectName, oldPermission, newPermission, fileUrl);
  await sendEmail(to, data.subject, buildEmailHtml(data));
}

export async function sendFileDeleted(to: string, firstName: string, fileName: string, deletedBy: string, projectName: string, permanentlyDeleted: boolean, fileUrl: string): Promise<void> {
  const data = Factory.buildFileDeleted(firstName, fileName, deletedBy, projectName, permanentlyDeleted, fileUrl);
  await sendEmail(to, data.subject, buildEmailHtml(data));
}

export async function sendFileRenamed(to: string, firstName: string, oldFileName: string, newFileName: string, renamedBy: string, projectName: string, fileUrl: string): Promise<void> {
  const data = Factory.buildFileRenamed(firstName, oldFileName, newFileName, renamedBy, projectName, fileUrl);
  await sendEmail(to, data.subject, buildEmailHtml(data));
}

export async function sendFolderShared(to: string, firstName: string, folderName: string, sharedBy: string, projectName: string, sharedWith: string, permission: string, folderUrl: string): Promise<void> {
  const data = Factory.buildFolderShared(firstName, folderName, sharedBy, projectName, sharedWith, permission, folderUrl);
  await sendEmail(to, data.subject, buildEmailHtml(data));
}

export async function sendFileRestored(to: string, firstName: string, fileName: string, restoredBy: string, projectName: string, fileUrl: string): Promise<void> {
  const data = Factory.buildFileRestored(firstName, fileName, restoredBy, projectName, fileUrl);
  await sendEmail(to, data.subject, buildEmailHtml(data));
}

export async function sendStorageQuotaWarning(to: string, firstName: string, workspaceName: string, usedStorage: string, totalStorage: string, usagePercent: number, manageUrl: string): Promise<void> {
  const data = Factory.buildStorageQuotaWarning(firstName, workspaceName, usedStorage, totalStorage, usagePercent, manageUrl);
  await sendEmail(to, data.subject, buildEmailHtml(data));
}

// ============================================================
// NOTIFICATION SUMMARY MODULE
// ============================================================

export async function sendDailyDigest(to: string, firstName: string, date: string, taskUpdates: { title: string; description?: string; status?: import("./templates/types.js").StatusType; url?: string; meta?: string }[], pendingApprovals: { title: string; description?: string; status?: import("./templates/types.js").StatusType; url?: string; meta?: string }[], fileUpdates: { title: string; description?: string; status?: import("./templates/types.js").StatusType; url?: string; meta?: string }[], totalNotifications: number, dashboardUrl: string): Promise<void> {
  const data = Factory.buildDailyDigest(firstName, date, taskUpdates, pendingApprovals, fileUpdates, totalNotifications, dashboardUrl);
  await sendEmail(to, data.subject, buildEmailHtml(data));
}

export async function sendWeeklyDigest(to: string, firstName: string, weekLabel: string, tasksCompleted: number, tasksCreated: number, projectsUpdated: number, filesUploaded: number, approvalsHandled: number, topItems: { title: string; description?: string; status?: import("./templates/types.js").StatusType; url?: string; meta?: string }[], dashboardUrl: string): Promise<void> {
  const data = Factory.buildWeeklyDigest(firstName, weekLabel, tasksCompleted, tasksCreated, projectsUpdated, filesUploaded, approvalsHandled, topItems, dashboardUrl);
  await sendEmail(to, data.subject, buildEmailHtml(data));
}

export async function sendUnreadNotificationsReminder(to: string, firstName: string, unreadCount: number, topNotifications: { title: string; description?: string; status?: import("./templates/types.js").StatusType; url?: string; meta?: string }[], notificationsUrl: string): Promise<void> {
  const data = Factory.buildUnreadNotificationsReminder(firstName, unreadCount, topNotifications, notificationsUrl);
  await sendEmail(to, data.subject, buildEmailHtml(data));
}
