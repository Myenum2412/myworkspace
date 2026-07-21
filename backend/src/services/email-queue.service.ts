import { EmailLog } from "../lib/db/models/EmailLog.js";
import { User } from "../lib/db/models/User.js";
import { Notification } from "../lib/db/models/Notification.js";
import { NotificationSettings } from "../lib/db/models/NotificationSettings.js";
import { buildEmailHtml } from "../lib/mail/templates/builder.js";
import * as TemplateFactory from "../lib/mail/templates/factory.js";
import { sendEmail } from "../lib/mail/sender.js";
import { logger } from "../lib/logger/index.js";
import { v4 as uuid } from "uuid";
import type { EmailData } from "../lib/mail/templates/types.js";

const TEMPLATE_MAP: Record<string, string> = {
  task_assigned: "Task Assigned",
  task_updated: "Task Updated",
  task_due_soon: "Due Reminder",
  task_overdue: "Overdue Notice",
  task_completed: "Task Completed",
  task_reopened: "Task Reopened",
  task_comment_added: "New Comment",
  task_priority_changed: "Priority Changed",
  project_created: "Project Created",
  project_updated: "Project Updated",
  project_completed: "Project Completed",
  approval_requested: "Approval Requested",
  approval_approved: "Approved",
  approval_rejected: "Rejected",
  file_uploaded: "File Uploaded",
  file_shared: "File Shared",
  file_downloaded: "File Downloaded",
  file_deleted: "File Deleted",
  invoice_generated: "Invoice Generated",
  invoice_paid: "Invoice Paid",
  payment_failed: "Payment Failed",
  mention: "Mention",
  chat_message: "New Message",
  password_reset: "Password Reset",
  password_changed: "Password Changed",
  new_device_login: "New Device Login",
  account_locked: "Account Locked",
  account_suspended: "Account Suspended",
  subscription_nearing_expiration: "Subscription Expiring",
  leave_request_submitted: "Leave Request",
  leave_approved: "Leave Approved",
  leave_rejected: "Leave Rejected",
  training_assigned: "Training Assigned",
  client_invitation_sent: "Client Invitation",
  contract_signed: "Contract Signed",
  meeting_scheduled: "Meeting Scheduled",
  meeting_reminder: "Meeting Reminder",
  system_outage: "System Outage",
  scheduled_maintenance: "Scheduled Maintenance",
};

export async function processEmailQueue(): Promise<void> {
  const pendingEmails = await EmailLog.find({ status: "queued" })
    .sort({ createdAt: 1 })
    .limit(50)
    .lean();

  for (const email of pendingEmails) {
    try {
      await deliverEmail(email._id.toString());
    } catch (err) {
      logger.error({ err, emailId: email._id }, "Email delivery failed");
    }
  }
}

export async function queueNotificationEmail(
  notificationId: string,
  userId: string,
  orgId: string,
  type: string,
  title: string,
  message?: string,
  link?: string,
  category?: string,
  correlationId?: string,
): Promise<void> {
  const user = await User.findById(userId).lean();
  if (!user || !(user as any).email) return;

  const settings = await NotificationSettings.findOne({ userId }).lean() as any;
  if (settings) {
    const typeSetting = settings.typeSettings?.find((s: any) => s.type === type);
    if (typeSetting && typeSetting.channels?.email === false) return;
    if (settings.doNotDisturb && settings.dndUntil && new Date(settings.dndUntil) > new Date()) return;
  }

  await EmailLog.create({
    orgId,
    userId,
    to: (user as any).email,
    subject: title,
    template: type,
    status: "queued",
    provider: "smtp",
    correlationId: correlationId || uuid(),
    notificationId,
    category: category || "notification",
    createdAt: new Date(),
  });
}

async function deliverEmail(emailId: string): Promise<void> {
  const email = await EmailLog.findById(emailId);
  if (!email) return;

  email.deliveryAttempts += 1;
  email.lastAttemptAt = new Date();

  const user = await User.findById(email.userId).lean();
  if (!user) {
    email.status = "failed";
    email.error = "User not found";
    await email.save();
    return;
  }

  const firstName = (user as any).firstName || (user as any).name || "User";

  let htmlBody: string;
  try {
    const templateName = TEMPLATE_MAP[email.template] || email.template;
    const emailData = buildEmailDataForNotification(email.template, firstName, email.subject, email.data, email.notificationId);
    if (emailData) {
      htmlBody = buildEmailHtml(emailData);
    } else {
      htmlBody = buildEmailHtml({
        subject: email.subject,
        previewText: email.subject,
        greeting: `Hi ${firstName},`,
        intro: [email.subject],
        metadata: { module: "Notification", timestamp: new Date().toLocaleString(), action: "Notification" },
        supportEmail: "support@workspace.com",
      });
    }
  } catch (err: any) {
    email.status = "failed";
    email.error = `Template error: ${err.message}`;
    await email.save();
    return;
  }

  try {
    await sendEmail(email.to, email.subject, htmlBody);
    email.status = "sent";
    email.deliveredAt = new Date();

    if (email.notificationId) {
      await Notification.updateOne({ _id: email.notificationId }, { emailSent: true });
    }
  } catch (err: any) {
    email.error = err.message;
    if (email.deliveryAttempts >= 3) {
      email.status = "failed";
    }
  }

  await email.save();
}

function buildEmailDataForNotification(template: string, firstName: string, subject: string, dataStr?: string, notificationId?: string): EmailData | null {
  try {
    const data = dataStr ? JSON.parse(dataStr) : {};

    switch (template) {
      case "task_assigned":
      case "task_created":
        return TemplateFactory.buildTaskAssigned(firstName, data.taskTitle || "Task", data.projectName || "", data.assignedBy || "Someone", data.dueDate || "TBD", data.priority || "Normal", data.link || "#");

      case "task_updated":
        return TemplateFactory.buildTaskUpdated(firstName, data.taskTitle || "Task", data.projectName || "", data.updatedBy || "Someone", data.changes || "No details", data.link || "#");

      case "task_due_soon":
      case "task_due_today":
      case "task_overdue":
        return TemplateFactory.buildTaskDueSoon(firstName, data.taskTitle || "Task", data.projectName || "", data.dueDate || "TBD", data.daysRemaining || 0, data.link || "#");

      case "task_completed":
        return TemplateFactory.buildTaskCompleted(firstName, data.taskTitle || "Task", data.projectName || "", data.completedBy || "Someone", data.link || "#");

      case "task_comment_added":
        return TemplateFactory.buildTaskCommentAdded(firstName, data.taskTitle || "Task", data.projectName || "", data.commentAuthor || "Someone", data.commentText || "", data.link || "#");

      case "project_created":
        return TemplateFactory.buildProjectCreated(firstName, data.projectName || "Project", data.createdBy || "Someone", data.startDate || "TBD", data.endDate || "TBD", data.link || "#");

      case "project_completed":
        return TemplateFactory.buildProjectCompleted(firstName, data.projectName || "Project", data.completedBy || "Someone", data.totalTasks || 0, data.link || "#");

      case "approval_requested":
        return TemplateFactory.buildApprovalRequested(firstName, data.itemName || "Item", data.itemType || "document", data.requestedBy || "Someone", data.projectName || "", data.reason || "", data.link || "#");

      case "approval_approved":
        return TemplateFactory.buildApprovalApproved(firstName, data.itemName || "Item", data.itemType || "document", data.approvedBy || "Someone", data.projectName || "", data.comments || "", data.link || "#");

      case "approval_rejected":
        return TemplateFactory.buildApprovalRejected(firstName, data.itemName || "Item", data.itemType || "document", data.rejectedBy || "Someone", data.projectName || "", data.reason || "", data.feedback || "", data.link || "#");

      case "file_uploaded":
        return TemplateFactory.buildFileUploaded(firstName, data.fileName || "File", data.uploadedBy || "Someone", data.projectName || "", data.fileSize || "0 B", data.fileType || "unknown", data.link || "#");

      case "file_shared":
        return TemplateFactory.buildFileShared(firstName, data.fileName || "File", data.sharedBy || "Someone", data.projectName || "", data.sharedWith || "", data.permission || "view", data.link || "#");

      case "password_reset":
        return TemplateFactory.buildPasswordReset(firstName, data.link || "#");

      case "password_changed":
        return TemplateFactory.buildPasswordChanged(firstName);

      case "new_device_login":
        return TemplateFactory.buildNewDeviceLogin(firstName, data.deviceName || "Unknown device", data.location || "Unknown location");

      case "task_reopened":
        return TemplateFactory.buildTaskReopened(firstName, data.taskTitle, data.projectName, data.reopenedBy, data.reason, data.link);

      case "task_priority_changed":
        return TemplateFactory.buildTaskPriorityChanged(firstName, data.taskTitle, data.projectName, data.changedBy, data.oldPriority, data.newPriority, data.link);

      case "project_updated":
        return TemplateFactory.buildProjectUpdated(firstName, data.projectName, data.updatedBy, data.changes, data.link);

      case "file_downloaded":
        return TemplateFactory.buildFileDownloaded(firstName, data.fileName, data.downloadedBy, data.projectName, data.ipAddress, data.link);

      case "file_deleted":
        return TemplateFactory.buildFileDeleted(firstName, data.fileName, data.deletedBy, data.projectName, data.permanentlyDeleted, data.link);

      case "account_locked":
      case "account_suspended":
        return TemplateFactory.buildAccountDeactivated(firstName);

      case "leave_request_submitted":
        return TemplateFactory.buildLeaveRequestSubmitted(firstName, data.leaveType, data.startDate, data.endDate, data.duration, data.reason, data.link);

      case "leave_approved":
        return TemplateFactory.buildLeaveRequestApproved(firstName, data.leaveType, data.startDate, data.endDate, data.duration, data.approvedBy, data.link);

      case "leave_rejected":
        return TemplateFactory.buildLeaveRequestRejected(firstName, data.leaveType, data.startDate, data.endDate, data.rejectedBy, data.reason, data.link);

      case "contract_signed":
        return TemplateFactory.buildFileShared(firstName, data.contractName || "Contract", data.signedBy, data.projectName, data.userId, "view", data.link);

      case "meeting_scheduled":
      case "meeting_reminder":
        return {
          subject: TEMPLATE_MAP[template] || "Meeting Notification",
          previewText: data.message || `Meeting: ${data.title}`,
          greeting: `Hello ${firstName},`,
          intro: [data.message || `You have a meeting: ${data.title}`],
          details: data.details ? data.details : undefined,
          button: data.link ? { text: "View Meeting", url: data.link } : undefined,
          metadata: { module: "Meetings", timestamp: new Date().toISOString(), action: template },
          supportEmail: "support@workspace.com",
        };

      case "system_outage":
        return {
          subject: "System Outage Notice",
          previewText: data.message || "We are experiencing a system outage",
          greeting: `Hello ${firstName},`,
          intro: [data.message || "A system outage has been detected. Our team is working on it."],
          statusIndicator: { type: "error", label: "Outage Detected" },
          warning: data.message || "Some services may be unavailable during this time.",
          metadata: { module: "System", timestamp: new Date().toISOString(), action: "system_outage" },
          supportEmail: "support@workspace.com",
        };

      case "scheduled_maintenance":
        return {
          subject: "Scheduled Maintenance",
          previewText: data.message || "Scheduled maintenance upcoming",
          greeting: `Hello ${firstName},`,
          intro: [data.message || "We will be performing scheduled maintenance."],
          statusIndicator: { type: "info", label: "Maintenance Scheduled" },
          details: data.details ? data.details : undefined,
          metadata: { module: "System", timestamp: new Date().toISOString(), action: "scheduled_maintenance" },
          supportEmail: "support@workspace.com",
        };

      case "invoice_generated":
        return {
          subject: `Invoice ${data.invoiceNumber || ""}`,
          previewText: `Invoice for ${data.amount || ""}`,
          greeting: `Hello ${firstName},`,
          intro: [`Invoice ${data.invoiceNumber || ""} for ${data.amount || ""} has been generated.`],
          details: data.details ? data.details : undefined,
          button: data.link ? { text: "View Invoice", url: data.link } : undefined,
          metadata: { module: "Billing", timestamp: new Date().toISOString(), action: "invoice_generated" },
          supportEmail: "support@workspace.com",
        };

      case "invoice_paid":
        return {
          subject: "Payment Received",
          previewText: `Payment of ${data.amount || ""} received`,
          greeting: `Hello ${firstName},`,
          intro: [`Thank you! Your payment of ${data.amount || ""} has been received.`],
          statusIndicator: { type: "success", label: "Payment Received" },
          button: data.link ? { text: "View Receipt", url: data.link } : undefined,
          metadata: { module: "Billing", timestamp: new Date().toISOString(), action: "invoice_paid" },
          supportEmail: "support@workspace.com",
        };

      case "payment_failed":
        return {
          subject: "Payment Failed",
          previewText: `Payment of ${data.amount || ""} failed`,
          greeting: `Hello ${firstName},`,
          intro: [`Your payment of ${data.amount || ""} could not be processed.`],
          statusIndicator: { type: "error", label: "Payment Failed" },
          warning: data.reason || "Please check your payment method and try again.",
          button: data.link ? { text: "Update Payment", url: data.link } : undefined,
          metadata: { module: "Billing", timestamp: new Date().toISOString(), action: "payment_failed" },
          supportEmail: "support@workspace.com",
        };

      case "mention":
        return {
          subject: "You were mentioned",
          previewText: data.message || "Someone mentioned you",
          greeting: `Hello ${firstName},`,
          intro: [data.message || "You were mentioned in a conversation."],
          button: data.link ? { text: "View", url: data.link } : undefined,
          metadata: { module: "Messages", timestamp: new Date().toISOString(), action: "mention" },
          supportEmail: "support@workspace.com",
        };

      case "chat_message":
        return {
          subject: "New Message",
          previewText: data.message || "You have a new message",
          greeting: `Hello ${firstName},`,
          intro: [data.message || "You received a new message."],
          button: data.link ? { text: "View Message", url: data.link } : undefined,
          metadata: { module: "Messages", timestamp: new Date().toISOString(), action: "chat_message" },
          supportEmail: "support@workspace.com",
        };

      case "subscription_nearing_expiration":
        return {
          subject: "Subscription Expiring",
          previewText: "Your subscription is expiring soon",
          greeting: `Hello ${firstName},`,
          intro: ["Your subscription will expire soon. Renew to continue enjoying all features."],
          statusIndicator: { type: "warning", label: "Expiring Soon" },
          button: data.link ? { text: "Renew Now", url: data.link } : undefined,
          metadata: { module: "Billing", timestamp: new Date().toISOString(), action: "subscription_nearing_expiration" },
          supportEmail: "support@workspace.com",
        };

      case "client_invitation_sent":
        return TemplateFactory.buildEmployeeInvited(firstName, data.inviterName || "Admin", data.workspaceName || "Workspace", "Client", data.link);

      case "training_assigned":
        return {
          subject: "Training Assigned",
          previewText: data.trainingName || "New training assigned",
          greeting: `Hello ${firstName},`,
          intro: [`You have been assigned training: ${data.trainingName || "Training"}`],
          button: data.link ? { text: "Start Training", url: data.link } : undefined,
          metadata: { module: "Employee Management", timestamp: new Date().toISOString(), action: "training_assigned" },
          supportEmail: "support@workspace.com",
        };

      default:
        return null;
    }
  } catch {
    return null;
  }
}
