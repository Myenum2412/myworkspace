import { Router, Response } from "express";
import { Session } from "../lib/db/models/Session.js";
import { User } from "../lib/db/models/User.js";
import { recordAuditLog } from "../services/audit.service.js";
import { AuthRequest, authenticate } from "../middleware/auth.js";
import { AppError } from "../middleware/error.js";
import { processEvent } from "../services/notification-engine.service.js";
import { cacheManager } from "../lib/cache.js";

const router = Router();

// Start a new session (called after login)
router.post("/start", authenticate, async (req: AuthRequest, res: Response) => {
  const userId = req.user!.userId;
  const orgId = req.user!.orgId;

  // Close any open sessions for this user
  await Session.updateMany(
    { userId, logoutTime: { $exists: false } },
    {
      $set: {
        logoutTime: new Date(),
        currentStatus: "offline",
        duration: 0,
      },
      $push: {
        statusTransitions: { status: "offline", timestamp: new Date() },
      },
    }
  );

  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

  const session = await Session.create({
    userId,
    orgId: orgId || undefined,
    loginTime: new Date(),
    currentStatus: "online",
    statusTransitions: [{ status: "online", timestamp: new Date() }],
    totalBreakDuration: 0,
    expiresAt,
  });

  await User.findByIdAndUpdate(userId, { status: "online" });

  await recordAuditLog({
    orgId: orgId || userId,
    userId,
    createdBy: userId,
    action: "session.start",
    entityType: "session",
    entityId: session._id.toString(),
    description: `Session started`,
  });

  cacheManager.invalidatePattern(`sessions:${userId}`);
  cacheManager.invalidatePattern(`users:${orgId || userId}:sessions`);

  processEvent({ type: "new_device_login", category: "auth", userId, orgId: orgId || userId, createdBy: userId, title: "New device login" }).catch(() => {});

  res.status(201).json({
    success: true,
    data: {
      sessionId: session._id,
      loginTime: session.loginTime,
      currentStatus: session.currentStatus,
    },
  });
});

// Transition status (online / break)
router.patch("/:id/status", authenticate, async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { status } = req.body as { status: "online" | "break" | "offline" };
  const userId = req.user!.userId;

  if (!["online", "break", "offline"].includes(status)) {
    throw new AppError(400, "Invalid status. Must be online, break, or offline");
  }

  const session = await Session.findOne({ _id: id, userId, logoutTime: { $exists: false } }).select("_id currentStatus statusTransitions totalBreakDuration loginTime");
  if (!session) {
    throw new AppError(404, "Active session not found");
  }

  const previousStatus = session.currentStatus;

  // Calculate break duration if coming back from break
  if (previousStatus === "break" && status !== "break") {
    const breakStart = [...session.statusTransitions].reverse().find(t => t.status === "break");
    if (breakStart) {
      session.totalBreakDuration += Date.now() - breakStart.timestamp.getTime();
    }
  }

  session.statusTransitions.push({ status, timestamp: new Date() });
  session.currentStatus = status;
  await session.save();

  await User.findByIdAndUpdate(userId, { status });

  await recordAuditLog({
    orgId: req.user!.orgId || userId,
    userId,
    createdBy: userId,
    action: "session.status",
    entityType: "session",
    entityId: id,
    description: `Status changed from ${previousStatus} to ${status}`,
    metadata: JSON.stringify({ previousStatus, newStatus: status }),
  });

  cacheManager.invalidatePattern(`sessions:${userId}`);

  if (req.body.status === "suspicious") {
    processEvent({ type: "suspicious_login", category: "security", userId, orgId: req.user!.orgId || userId, createdBy: userId, title: "Suspicious login detected" }).catch(() => {});
  }

  res.json({
    success: true,
    data: {
      sessionId: session._id,
      currentStatus: session.currentStatus,
      totalBreakDuration: session.totalBreakDuration,
      statusTransitions: session.statusTransitions,
    },
  });
});

// Close / end session (called on logout)
router.patch("/:id/close", authenticate, async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const userId = req.user!.userId;

  const session = await Session.findOne({ _id: id, userId, logoutTime: { $exists: false } }).select("_id currentStatus statusTransitions totalBreakDuration loginTime logoutTime duration");
  if (!session) {
    throw new AppError(404, "Active session not found");
  }

  // Finalize break if currently on break
  if (session.currentStatus === "break") {
    const breakStart = [...session.statusTransitions].reverse().find(t => t.status === "break");
    if (breakStart) {
      session.totalBreakDuration += Date.now() - breakStart.timestamp.getTime();
    }
  }

  session.statusTransitions.push({ status: "offline", timestamp: new Date() });
  session.logoutTime = new Date();
  session.currentStatus = "offline";
  session.duration = Math.max(0, session.logoutTime.getTime() - session.loginTime.getTime() - session.totalBreakDuration);
  await session.save();

  await User.findByIdAndUpdate(userId, { status: "offline" });

  await recordAuditLog({
    orgId: req.user!.orgId || userId,
    userId,
    createdBy: userId,
    action: "session.end",
    entityType: "session",
    entityId: id,
    description: `Session ended. Duration: ${Math.round((session.duration || 0) / 60000)} min active`,
    metadata: JSON.stringify({
      loginTime: session.loginTime,
      logoutTime: session.logoutTime,
      duration: session.duration,
      totalBreakDuration: session.totalBreakDuration,
    }),
  });

  cacheManager.invalidatePattern(`sessions:${userId}`);

  processEvent({ type: "system", category: "auth", userId, orgId: req.user!.orgId || userId, createdBy: userId, title: "Session closed" }).catch(() => {});

  res.json({
    success: true,
    data: {
      sessionId: session._id,
      loginTime: session.loginTime,
      logoutTime: session.logoutTime,
      duration: session.duration,
      totalBreakDuration: session.totalBreakDuration,
    },
  });
});

// Get current active session
router.get("/active", authenticate, async (req: AuthRequest, res: Response) => {
  const userId = req.user!.userId;
  const session = await Session.findOne({ userId, logoutTime: { $exists: false } })
    .sort({ loginTime: -1 })
    .select("_id loginTime currentStatus totalBreakDuration statusTransitions duration")
    .lean();

  if (!session) {
    res.json({ success: true, data: null });
    return;
  }

  res.json({
    success: true,
    data: session,
  });
});

// Get session history for current user
router.get("/history", authenticate, async (req: AuthRequest, res: Response) => {
  const userId = req.user!.userId;
  const limit = Math.min(parseInt(req.query.limit as string) || 30, 100);
  const skip = parseInt(req.query.skip as string) || 0;

  const sessions = await Session.find({ userId })
    .sort({ loginTime: -1 })
    .skip(skip)
    .limit(limit)
    .select("_id userId orgId loginTime logoutTime currentStatus statusTransitions totalBreakDuration duration expiresAt createdAt")
    .lean();

  const total = await Session.countDocuments({ userId });

  res.json({
    success: true,
    data: { sessions, total, limit, skip },
  });
});

// Get today's session summary
router.get("/today", authenticate, async (req: AuthRequest, res: Response) => {
  const userId = req.user!.userId;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const sessions = await Session.find({
    userId,
    loginTime: { $gte: today, $lt: tomorrow },
  }).sort({ loginTime: 1 }).select("_id userId loginTime logoutTime currentStatus statusTransitions totalBreakDuration duration").lean();

  const activeSession = sessions.find(s => !s.logoutTime);
  const completedSessions = sessions.filter(s => s.logoutTime);

  const totalActiveTime = completedSessions.reduce((acc, s) => acc + ((s as any).duration || 0), 0);
  const totalBreakTime = completedSessions.reduce((acc, s) => acc + ((s as any).totalBreakDuration || 0), 0);

  res.json({
    success: true,
    data: {
      date: today.toISOString(),
      sessions,
      activeSession: activeSession || null,
      summary: {
        totalSessions: sessions.length,
        completedSessions: completedSessions.length,
        totalActiveTime,
        totalBreakTime,
      },
    },
  });
});

export default router;
