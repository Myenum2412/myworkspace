import { Notification, NotificationType } from "../lib/db/models/Notification.js";
import { NotificationSettings } from "../lib/db/models/NotificationSettings.js";
import { logger } from "../lib/logger/index.js";
import { sendDailyDigest, sendWeeklyDigest, sendUnreadNotificationsReminder } from "../lib/mail/index.js";
import { createNotification } from "./notification.service.js";
import { User } from "../lib/db/models/User.js";

const DIGEST_BATCH_SIZE = 100;

export async function processHourlyDigests(): Promise<void> {
  logger.info("Processing hourly digest notifications");
  const users = await NotificationSettings.find({
    frequency: "hourly",
    doNotDisturb: { $ne: true },
  }).lean();

  for (const user of users) {
    try {
      await sendUserDigest(user.userId, user.orgId, "hourly");
    } catch (err) {
      logger.error({ err, userId: user.userId }, "Hourly digest failed");
    }
  }
}

export async function processDailyDigests(): Promise<void> {
  logger.info("Processing daily digest notifications");
  const users = await NotificationSettings.find({
    frequency: "daily",
    doNotDisturb: { $ne: true },
  }).lean();

  for (const user of users) {
    try {
      await sendUserDigest(user.userId, user.orgId, "daily");
    } catch (err) {
      logger.error({ err, userId: user.userId }, "Daily digest failed");
    }
  }
}

export async function processWeeklyDigests(): Promise<void> {
  logger.info("Processing weekly digest notifications");
  const users = await NotificationSettings.find({
    frequency: "weekly",
    doNotDisturb: { $ne: true },
  }).lean();

  for (const user of users) {
    try {
      await sendUserDigest(user.userId, user.orgId, "weekly");
    } catch (err) {
      logger.error({ err, userId: user.userId }, "Weekly digest failed");
    }
  }
}

async function sendUserDigest(userId: string, orgId: string, frequency: "hourly" | "daily" | "weekly"): Promise<void> {
  const period = frequency === "hourly" ? 1 : frequency === "daily" ? 24 : 168;
  const since = new Date(Date.now() - period * 60 * 60 * 1000);

  const unread = await Notification.countDocuments({
    userId,
    read: false,
    createdAt: { $gte: since },
  });

  if (unread === 0) return;

  const pendingApprovals = await Notification.find({
    userId,
    type: { $in: ["approval_requested", "approval_pending"] },
    read: false,
    createdAt: { $gte: since },
  })
    .sort({ createdAt: -1 })
    .limit(20)
    .lean();

  const taskUpdates = await Notification.find({
    userId,
    category: "tasks",
    read: false,
    createdAt: { $gte: since },
  })
    .sort({ createdAt: -1 })
    .limit(20)
    .lean();

  const fileUpdates = await Notification.find({
    userId,
    category: "files",
    read: false,
    createdAt: { $gte: since },
  })
    .sort({ createdAt: -1 })
    .limit(20)
    .lean();

  const user = await User.findById(userId).lean();
  if (!user) return;

  const firstName = (user as any).firstName || (user as any).name || "User";
  const email = (user as any).email;
  if (!email) return;

  const mapItem = (n: any) => ({
    title: n.title,
    description: n.message,
    status: n.priority === "high" || n.priority === "critical" ? "error" as const
      : n.priority === "medium" ? "warning" as const
      : "info" as const,
    url: n.link || "/notifications",
    meta: n.type.replace(/_/g, " "),
  });

  try {
    if (frequency === "weekly") {
      await sendWeeklyDigest(
        email,
        firstName,
        "this week",
        taskUpdates.length,
        fileUpdates.length,
        0,
        0,
        pendingApprovals.length,
        [...pendingApprovals, ...taskUpdates, ...fileUpdates].slice(0, 10).map(mapItem),
        `${process.env.APP_URL || "http://localhost:3000"}/notifications`
      );
    } else if (frequency === "daily") {
      await sendDailyDigest(
        email,
        firstName,
        new Date().toLocaleDateString(),
        taskUpdates.map(mapItem),
        pendingApprovals.map(mapItem),
        fileUpdates.map(mapItem),
        unread,
        `${process.env.APP_URL || "http://localhost:3000"}/notifications`
      );
    }
  } catch (err) {
    logger.error({ err, userId, frequency }, "Failed to send digest email");
  }
}

export async function processUnreadReminders(): Promise<void> {
  logger.info("Processing unread notification reminders");
  const users = await Notification.aggregate([
    {
      $group: {
        _id: "$userId",
        orgId: { $first: "$orgId" },
        count: { $sum: { $cond: [{ $eq: ["$read", false] }, 1, 0] } },
      },
    },
    { $match: { count: { $gte: 5 } } },
    { $sort: { count: -1 } },
    { $limit: 200 },
  ]);

  for (const user of users) {
    try {
      const userDoc = await User.findById(user._id).lean();
      if (!userDoc || !(userDoc as any).email) continue;

      const topNotifications = await Notification.find({
        userId: user._id,
        read: false,
      })
        .sort({ createdAt: -1 })
        .limit(5)
        .lean();

      await sendUnreadNotificationsReminder(
        (userDoc as any).email,
        (userDoc as any).firstName || (userDoc as any).name || "User",
        user.count,
        topNotifications.map((n: any) => ({
          title: n.title,
          description: n.message,
          status: n.priority === "high" || n.priority === "critical" ? "error" as const : "info" as const,
          url: n.link || "/notifications",
          meta: n.type.replace(/_/g, " "),
        })),
        `${process.env.APP_URL || "http://localhost:3000"}/notifications`
      );
    } catch (err) {
      logger.error({ err, userId: user._id }, "Unread reminder failed");
    }
  }
}
