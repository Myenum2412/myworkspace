import { DailyTaskEmailScheduler, EmailAuditLog } from "../lib/db/models/DailyTaskEmailScheduler.js";
import { Task } from "../lib/db/models/Task.js";
import { User } from "../lib/db/models/User.js";
import { OrgMember } from "../lib/db/models/OrgMember.js";
import { NotificationSettings } from "../lib/db/models/NotificationSettings.js";
import { sendEmail } from "../lib/mail/sender.js";
import { buildDailyTaskEmail } from "../lib/mail/templates/factory-task.js";
import { logger } from "../lib/logger/index.js";
import { v4 as uuid } from "uuid";

function getTimeInTimezone(timezone: string): string {
  const now = new Date();
  try {
    const formatter = new Intl.DateTimeFormat("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone: timezone,
    });
    return formatter.format(now);
  } catch {
    const h = String(now.getHours()).padStart(2, "0");
    const m = String(now.getMinutes()).padStart(2, "0");
    return `${h}:${m}`;
  }
}

// ── Types ────────────────────────────────────────────────────────────

interface TaskWithDetails {
  id: string;
  title: string;
  status: string;
  priority: string;
  dueDate?: Date;
  project?: string;
  estimatedDuration?: string;
  description?: string;
}

interface UserWithTasks {
  userId: string;
  email: string;
  name: string;
  orgId: string;
  tasks: TaskWithDetails[];
  pendingTasks: TaskWithDetails[];
  overdueTasks: TaskWithDetails[];
  highPriorityTasks: TaskWithDetails[];
}

// ── Scheduler Configuration ──────────────────────────────────────────

export async function getOrCreateScheduler(orgId: string) {
  let scheduler = await DailyTaskEmailScheduler.findOne({ orgId });
  
  if (!scheduler) {
    scheduler = await DailyTaskEmailScheduler.create({
      orgId,
      enabled: true,
      paused: false,
      sendTime: "08:00",
      timezone: "UTC",
      daysEnabled: {
        monday: true,
        tuesday: true,
        wednesday: true,
        thursday: true,
        friday: true,
        saturday: false,
        sunday: false,
      },
      recipients: "both",
    });
  }
  
  return scheduler;
}

export async function updateSchedulerSettings(orgId: string, settings: Partial<any>) {
  return DailyTaskEmailScheduler.findOneAndUpdate(
    { orgId },
    { $set: settings },
    { new: true, upsert: true }
  );
}

export async function getSchedulerSettings(orgId: string) {
  return DailyTaskEmailScheduler.findOne({ orgId });
}

// ── User Email Preferences ───────────────────────────────────────────

export async function getUserEmailPreferences(userId: string) {
  const settings = await NotificationSettings.findOne({ userId });
  
  if (!settings) {
    return {
      dailyTaskEmail: true,
      weekendEmails: true,
      overdueReminders: true,
      highPriorityAlerts: true,
    };
  }
  
  return {
    dailyTaskEmail: settings.emailDigestTime !== "disabled",
    weekendEmails: true,
    overdueReminders: true,
    highPriorityAlerts: true,
  };
}

export async function updateUserEmailPreferences(userId: string, preferences: {
  dailyTaskEmail?: boolean;
  weekendEmails?: boolean;
  overdueReminders?: boolean;
  highPriorityAlerts?: boolean;
}) {
  const updateData: any = {};
  
  if (preferences.dailyTaskEmail !== undefined) {
    updateData.emailDigestTime = preferences.dailyTaskEmail ? "08:00" : "disabled";
  }
  
  await NotificationSettings.findOneAndUpdate(
    { userId },
    { $set: updateData },
    { upsert: true }
  );
}

// ── Task Fetching ────────────────────────────────────────────────────

async function getTasksForUser(userId: string, orgId: string): Promise<TaskWithDetails[]> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  // Get tasks assigned to the user
  const tasks = await Task.find({
    orgId,
    assigneeId: userId,
    status: { $nin: ["completed", "cancelled", "closed"] },
  }).lean();
  
  return tasks.map((task: any) => ({
    id: task.id || task._id?.toString(),
    title: task.title,
    status: task.status,
    priority: task.priority || "medium",
    dueDate: task.dueDate,
    project: task.project,
    estimatedDuration: task.estimatedDuration,
    description: task.description,
  }));
}

function categorizeTasks(tasks: TaskWithDetails[]) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  const todayTasks = tasks.filter(task => {
    if (!task.dueDate) return false;
    const dueDate = new Date(task.dueDate);
    return dueDate >= today && dueDate < tomorrow;
  });
  
  const pendingTasks = tasks.filter(task => 
    task.status === "pending" || task.status === "assigned" || task.status === "in_progress"
  );
  
  const overdueTasks = tasks.filter(task => {
    if (!task.dueDate) return false;
    return new Date(task.dueDate) < today;
  });
  
  const highPriorityTasks = tasks.filter(task => 
    task.priority === "high" || task.priority === "urgent"
  );
  
  return {
    todayTasks,
    pendingTasks,
    overdueTasks,
    highPriorityTasks,
  };
}

// ── Email Sending ────────────────────────────────────────────────────

async function sendDailyTaskEmail(
  user: UserWithTasks,
  scheduler: any,
  orgId: string
): Promise<boolean> {
  const auditLog = await EmailAuditLog.create({
    orgId,
    schedulerId: scheduler.id,
    userId: user.userId,
    userEmail: user.email,
    status: "queued",
    subject: `Daily Task Summary - ${new Date().toLocaleDateString()}`,
    taskCount: user.tasks.length,
    pendingCount: user.pendingTasks.length,
    overdueCount: user.overdueTasks.length,
    highPriorityCount: user.highPriorityTasks.length,
  });
  
  try {
    // Build email content
    const emailHtml = buildDailyTaskEmail({
      firstName: user.name,
      date: new Date().toLocaleDateString(),
      totalTasks: user.tasks.length,
      pendingTasks: user.pendingTasks,
      overdueTasks: user.overdueTasks,
      highPriorityTasks: user.highPriorityTasks,
      includeProjectGrouping: scheduler.includeProjectGrouping,
      includeTaskLinks: scheduler.includeTaskLinks,
      includeCompanyBranding: scheduler.includeCompanyBranding,
      dashboardUrl: `${process.env.APP_URL || "http://localhost:3000"}/dashboard`,
    });
    
    // Send email
    await sendEmail(user.email, `Daily Task Summary - ${new Date().toLocaleDateString()}`, emailHtml);
    
    // Update audit log
    auditLog.status = "sent";
    auditLog.sentAt = new Date();
    await auditLog.save();
    
    // Update scheduler stats
    scheduler.emailsSentToday += 1;
    scheduler.totalEmailsSent += 1;
    await scheduler.save();
    
    logger.info(`Daily task email sent to ${user.email}`);
    return true;
    
  } catch (error: any) {
    // Update audit log
    auditLog.status = "failed";
    auditLog.errorMessage = error.message;
    auditLog.retryCount += 1;
    await auditLog.save();
    
    // Update scheduler stats
    scheduler.emailsFailedToday += 1;
    scheduler.lastFailedRun = new Date();
    scheduler.lastError = error.message;
    await scheduler.save();
    
    logger.error(`Failed to send daily task email to ${user.email}: ${error.message}`);
    return false;
  }
}

// ── Main Scheduler Logic ─────────────────────────────────────────────

export async function runDailyTaskEmailScheduler(orgId?: string): Promise<{
  success: number;
  failed: number;
  skipped: number;
}> {
  const results = { success: 0, failed: 0, skipped: 0 };
  
  // Get schedulers to process
  const query: any = { enabled: true, paused: false };
  if (orgId) query.orgId = orgId;
  
  let schedulers = await DailyTaskEmailScheduler.find(query);
  
  // Auto-create scheduler configs for orgs that have users but no scheduler
  if (!orgId) {
    const orgsWithSchedulers = new Set(schedulers.map((s: any) => s.orgId));
    const orgMembers = await OrgMember.distinct("orgId");
    for (const oid of orgMembers) {
      if (!orgsWithSchedulers.has(oid)) {
        try {
          const created = await getOrCreateScheduler(oid);
          schedulers.push(created);
          logger.info(`Auto-created daily task email scheduler for org ${oid}`);
        } catch (err: any) {
          logger.error(`Failed to auto-create scheduler for org ${oid}: ${err.message}`);
        }
      }
    }
  }
  
  const now = new Date();
  
  // Reset daily counters at midnight (UTC check)
  {
    const utcH = String(now.getUTCHours()).padStart(2, "0");
    const utcM = String(now.getUTCMinutes()).padStart(2, "0");
    if (`${utcH}:${utcM}` === "00:00") {
      await DailyTaskEmailScheduler.updateMany({}, {
        $set: { emailsSentToday: 0, emailsFailedToday: 0 }
      });
    }
  }
  
  for (const scheduler of schedulers) {
    try {
      // Get current time in the scheduler's configured timezone
      const tz = scheduler.timezone || "UTC";
      const currentTime = getTimeInTimezone(tz);
      
      // Check if current time matches the configured send time
      const configuredTime = scheduler.sendTime || "08:00";
      if (currentTime !== configuredTime) {
        continue;
      }
      // Only send once per day per org (check lastSuccessfulRun date)
      if (scheduler.lastSuccessfulRun) {
        const lastRunDate = new Date(scheduler.lastSuccessfulRun);
        const todayStart = new Date(now);
        todayStart.setHours(0, 0, 0, 0);
        if (lastRunDate >= todayStart) {
          continue;
        }
      }
      
      // Check if today is an enabled day
      const dayOfWeek = now.getDay(); // 0 = Sunday, 1 = Monday, etc.
      const dayNames = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
      const todayDayName = dayNames[dayOfWeek];
      
      if (!scheduler.daysEnabled[todayDayName as keyof typeof scheduler.daysEnabled]) {
        logger.info(`Skipping ${scheduler.orgId} - ${todayDayName} not enabled`);
        continue;
      }
      
      // Get users in this organization
      const orgMembers = await OrgMember.find({ orgId: scheduler.orgId }).lean();
      const userIds = orgMembers.map((m: any) => m.userId);
      
      if (userIds.length === 0) continue;
      
      // Filter users based on recipients setting
      let usersToEmail: any[] = [];
      
      if (scheduler.recipients === "both") {
        usersToEmail = await User.find({ id: { $in: userIds }, isActive: true }).lean();
      } else if (scheduler.recipients === "staff") {
        usersToEmail = await User.find({ id: { $in: userIds }, role: { $in: ["staffs", "team_staff"] }, isActive: true }).lean();
      } else if (scheduler.recipients === "users") {
        usersToEmail = await User.find({ id: { $in: userIds }, role: { $in: ["members", "team_leader"] }, isActive: true }).lean();
      }
      
      if (usersToEmail.length === 0) continue;
      
      // Process each user
      let orgSuccess = 0;
      let orgFailed = 0;
      
      for (const user of usersToEmail) {
        try {
          // Check user email preferences
          const preferences = await getUserEmailPreferences((user as any).id);
          
          if (!preferences.dailyTaskEmail) {
            results.skipped++;
            continue;
          }
          
          // Get tasks for this user
          const tasks = await getTasksForUser((user as any).id, scheduler.orgId);
          
          // Skip if no tasks
          if (tasks.length === 0) {
            results.skipped++;
            continue;
          }
          
          // Categorize tasks
          const categorized = categorizeTasks(tasks);
          
          // Build user with tasks
          const userWithTasks: UserWithTasks = {
            userId: (user as any).id,
            email: (user as any).email,
            name: (user as any).name || "User",
            orgId: scheduler.orgId,
            tasks,
            ...categorized,
          };
          
          // Send email
          const sent = await sendDailyTaskEmail(userWithTasks, scheduler, scheduler.orgId);
          
          if (sent) {
            results.success++;
            orgSuccess++;
          } else {
            results.failed++;
            orgFailed++;
          }
          
        } catch (error: any) {
          logger.error(`Error processing user ${(user as any).id}: ${error.message}`);
          results.failed++;
          orgFailed++;
        }
      }
      
      // Update scheduler last successful run
      scheduler.lastSuccessfulRun = new Date();
      scheduler.emailsSentToday = (scheduler.emailsSentToday || 0) + orgSuccess;
      scheduler.emailsFailedToday = (scheduler.emailsFailedToday || 0) + orgFailed;
      await scheduler.save();
      
    } catch (error: any) {
      logger.error(`Error running scheduler for org ${scheduler.orgId}: ${error.message}`);
      scheduler.lastFailedRun = new Date();
      scheduler.lastError = error.message;
      await scheduler.save();
      results.failed++;
    }
  }
  
  return results;
}

// ── Audit Log Functions ──────────────────────────────────────────────

export async function getAuditLogs(orgId: string, limit = 50, offset = 0) {
  return EmailAuditLog.find({ orgId })
    .sort({ createdAt: -1 })
    .skip(offset)
    .limit(limit)
    .lean();
}

export async function getAuditLogStats(orgId: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const [totalSent, totalFailed, sentToday, failedToday] = await Promise.all([
    EmailAuditLog.countDocuments({ orgId, status: "sent" }),
    EmailAuditLog.countDocuments({ orgId, status: "failed" }),
    EmailAuditLog.countDocuments({ orgId, status: "sent", createdAt: { $gte: today } }),
    EmailAuditLog.countDocuments({ orgId, status: "failed", createdAt: { $gte: today } }),
  ]);
  
  return {
    totalSent,
    totalFailed,
    sentToday,
    failedToday,
  };
}

// ── Retry Failed Emails ──────────────────────────────────────────────

export async function retryFailedEmails(orgId: string): Promise<number> {
  const failedEmails = await EmailAuditLog.find({
    orgId,
    status: "failed",
    retryCount: { $lt: 3 },
  }).limit(10);
  
  let retriedCount = 0;
  
  for (const email of failedEmails) {
    try {
      // Get user
      const user = await User.findById(email.userId).lean();
      if (!user) continue;
      
      // Get scheduler
      const scheduler = await DailyTaskEmailScheduler.findOne({ orgId });
      if (!scheduler) continue;
      
      // Get tasks for user
      const tasks = await getTasksForUser(email.userId, orgId);
      const categorized = categorizeTasks(tasks);
      
      const userWithTasks: UserWithTasks = {
        userId: email.userId,
        email: email.userEmail,
        name: (user as any).name || "User",
        orgId,
        tasks,
        ...categorized,
      };
      
      // Retry sending
      const sent = await sendDailyTaskEmail(userWithTasks, scheduler, orgId);
      
      if (sent) {
        retriedCount++;
      }
      
    } catch (error: any) {
      logger.error(`Error retrying email for ${email.userEmail}: ${error.message}`);
    }
  }
  
  return retriedCount;
}
