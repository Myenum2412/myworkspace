import { EmailLog } from "../lib/db/models/EmailLog.js";
import { User } from "../lib/db/models/User.js";
import { Notification } from "../lib/db/models/Notification.js";
import { NotificationSettings } from "../lib/db/models/NotificationSettings.js";
import { buildEmailHtml } from "../lib/mail/templates/builder.js";
import * as TemplateFactory from "../lib/mail/templates/factory.js";
import { sendEmail } from "../lib/mail/sender.js";
import { logger } from "../lib/logger/index.js";
import { v4 as uuid } from "uuid";

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

function buildEmailDataForNotification(template: string, firstName: string, subject: string, dataStr?: string, notificationId?: string) {
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

      case "invoice_generated":
      case "invoice_paid":
      case "payment_failed":
        return null;

      default:
        return null;
    }
  } catch {
    return null;
  }
}
