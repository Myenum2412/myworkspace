import { Router, Response } from "express";
import { AuthRequest, authenticate } from "../middleware/auth.js";
import { orgAdminOnly, platformAdminOnly } from "../middleware/authorize.js";
import { checkNotificationHealth } from "../services/notification-health.service.js";
import { notificationMetrics } from "../services/notification-metrics.service.js";
import { EmailLog } from "../lib/db/models/EmailLog.js";
import { Notification } from "../lib/db/models/Notification.js";
import { logger } from "../lib/logger/index.js";

const router = Router();

router.use(authenticate);
router.use(platformAdminOnly());

// Health check
router.get("/health", async (_req: AuthRequest, res: Response) => {
  const health = await checkNotificationHealth();
  const statusCode = health.status === "healthy" ? 200 : health.status === "degraded" ? 200 : 503;
  res.status(statusCode).json({ success: true, data: health });
});

// Metrics
router.get("/metrics", async (req: AuthRequest, res: Response) => {
  const days = parseInt(req.query.days as string) || 30;
  const orgId = req.query.orgId as string | undefined;
  const stats = await notificationMetrics.getAggregatedStats(orgId, days);
  res.json({ success: true, data: stats });
});

// Real-time stats (in-memory)
router.get("/stats/live", async (_req: AuthRequest, res: Response) => {
  res.json({ success: true, data: notificationMetrics.getStats() });
});

// Email logs with analytics
router.get("/email-logs", async (req: AuthRequest, res: Response) => {
  const { limit = 50, offset = 0, status, startDate, endDate, search } = req.query;
  const filter: Record<string, any> = {};
  if (status) filter.status = status;
  if (startDate || endDate) {
    filter.createdAt = {};
    if (startDate) filter.createdAt.$gte = new Date(startDate as string);
    if (endDate) filter.createdAt.$lte = new Date(endDate as string);
  }
  if (search) {
    filter.$or = [
      { subject: { $regex: search, $options: "i" } },
      { to: { $regex: search, $options: "i" } },
    ];
  }

  const [logs, total] = await Promise.all([
    EmailLog.find(filter)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit as string, 10))
      .skip(parseInt(offset as string, 10))
      .lean(),
    EmailLog.countDocuments(filter),
  ]);

  const statusBreakdown = await EmailLog.aggregate([
    { $group: { _id: "$status", count: { $sum: 1 } } },
  ]);

  res.json({
    success: true,
    data: { logs, total, statusBreakdown },
  });
});

// Template management endpoints
router.get("/templates", async (_req: AuthRequest, res: Response) => {
  const TEMPLATE_MAP = {
    "task_assigned": "Task Assigned", "task_updated": "Task Updated",
    "task_due_soon": "Due Reminder", "task_overdue": "Overdue Notice",
    "task_completed": "Task Completed", "task_reopened": "Task Reopened",
    "task_comment_added": "New Comment", "task_priority_changed": "Priority Changed",
    "project_created": "Project Created", "project_updated": "Project Updated",
    "project_completed": "Project Completed",
    "approval_requested": "Approval Requested", "approval_approved": "Approved",
    "approval_rejected": "Rejected", "file_uploaded": "File Uploaded",
    "file_shared": "File Shared", "file_downloaded": "File Downloaded",
    "file_deleted": "File Deleted", "password_reset": "Password Reset",
    "password_changed": "Password Changed", "new_device_login": "New Device Login",
    "account_locked": "Account Locked", "account_suspended": "Account Suspended",
    "subscription_nearing_expiration": "Subscription Expiring",
    "leave_request_submitted": "Leave Request", "leave_approved": "Leave Approved",
    "leave_rejected": "Leave Rejected",
    "invoice_generated": "Invoice Generated", "invoice_paid": "Invoice Paid",
    "payment_failed": "Payment Failed",
    "system_outage": "System Outage", "scheduled_maintenance": "Scheduled Maintenance",
    "meeting_scheduled": "Meeting Scheduled", "meeting_reminder": "Meeting Reminder",
    "mention": "Mention", "chat_message": "New Message",
    "contract_signed": "Contract Signed", "client_invitation_sent": "Client Invitation",
  };

  res.json({
    success: true,
    data: Object.entries(TEMPLATE_MAP).map(([type, subject]) => ({
      type,
      subject,
      enabled: true,
      category: type.split("_")[0],
    })),
  });
});

export default router;
