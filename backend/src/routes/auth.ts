import { Router, Response } from "express";
import { hash, compare } from "bcryptjs";
import { v4 as uuid } from "uuid";
import crypto from "crypto";
import { User } from "../lib/db/models/User.js";
import { Organization } from "../lib/db/models/Organization.js";
import { OrgMember } from "../lib/db/models/OrgMember.js";
import { Session } from "../lib/db/models/Session.js";
import { ActivityLog } from "../lib/db/models/ActivityLog.js";
import { getNextSequence } from "../lib/db/models/Counter.js";
import { signToken } from "../config/auth.js";
import { getUserOrgId } from "../lib/org-utils.js";
import { env } from "../config/env.js";
import { AuthRequest, authenticate } from "../middleware/auth.js";
import { AppError } from "../middleware/error.js";
import { sendWelcomeEmail, sendPasswordResetEmail } from "../lib/mail/index.js";
import { mongoose } from "../lib/db/index.js";
import { socketIOManager } from "../lib/socketio/index.js";

const router = Router();
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000;

// Helper: generate unique slug
async function generateUniqueSlug(base: string): Promise<string> {
  const slugBase = base.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "org";
  let slug = slugBase;
  let counter = 0;
  while (await Organization.exists({ slug })) {
    counter++;
    slug = `${slugBase}-${counter}`;
  }
  return slug;
}

// Helper: get user's primary orgId
async function getUserPrimaryOrgId(userId: string): Promise<string | null> {
  const member = await OrgMember.findOne({ userId }).lean();
  return member ? member.orgId : null;
}

router.post("/login", async (req: AuthRequest, res: Response) => {
  const { email, password } = req.body;
  if (!email || !password) {
    throw new AppError(400, "Email and password are required");
  }

  const user = await User.findOne({ email });
  if (!user || !user.password) {
    throw new AppError(401, "Invalid email or password");
  }

  if (!user.isActive) {
    throw new AppError(403, "Account is deactivated");
  }

  if (user.lockedUntil && user.lockedUntil > new Date()) {
    throw new AppError(423, "Account is temporarily locked. Try again later.");
  }

  const valid = await compare(password, user.password);
  if (!valid) {
    user.failedLoginAttempts = (user.failedLoginAttempts || 0) + 1;
    if (user.failedLoginAttempts >= MAX_FAILED_ATTEMPTS) {
      user.lockedUntil = new Date(Date.now() + LOCKOUT_DURATION_MS);
    }
    await user.save();
    throw new AppError(401, "Invalid email or password");
  }

  user.failedLoginAttempts = 0;
  user.lockedUntil = undefined;
  user.lastLogin = new Date();
  user.status = "online";
  await user.save();

  const resolvedOrgId = user.orgId || await getUserPrimaryOrgId(user.id) || "";

  await ActivityLog.create({
    orgId: resolvedOrgId,
    userId: user.id,
    createdBy: user.id,
    action: "user.login",
    entityType: "user",
    entityId: user.id,
    description: `${user.name} logged in`,
  });

  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const session = await Session.create({
    userId: user.id,
    orgId: resolvedOrgId,
    loginTime: new Date(),
    currentStatus: "online",
    statusTransitions: [{ status: "online", timestamp: new Date() }],
    totalBreakDuration: 0,
    expiresAt,
  });

  await ActivityLog.create({
    orgId: resolvedOrgId,
    userId: user.id,
    createdBy: user.id,
    action: "session.start",
    entityType: "session",
    entityId: session._id.toString(),
    description: `Session started for ${user.name}`,
  });

  socketIOManager.emitToUser(user.id, "session:started", {
    sessionId: session._id.toString(),
    loginTime: session.loginTime,
  });

  socketIOManager.emitToOrg(resolvedOrgId, "user:status:changed", {
    userId: user.id,
    status: "online",
    timestamp: new Date().toISOString(),
  });

  const token = signToken({
    userId: user.id,
    email: user.email,
    role: user.role,
    permissions: user.permissions || [],
    orgId: resolvedOrgId,
  });

  res.json({
    success: true,
    data: {
      token,
      sessionId: session._id.toString(),
      user: {
        id: user.id,
        userNumber: user.userNumber,
        name: user.name,
        email: user.email,
        image: user.image,
        role: user.role,
        permissions: user.permissions || [],
        status: "online",
        orgId: resolvedOrgId,
      },
      orgId: resolvedOrgId,
    },
  });
});

router.post("/signup", async (req: AuthRequest, res: Response) => {
  const { name, email, password, company } = req.body;
  if (!name || !email || !password) {
    throw new AppError(400, "Name, email, and password are required");
  }
  if (password.length < 8) {
    throw new AppError(400, "Password must be at least 8 characters");
  }

  const existing = await User.findOne({ email });
  if (existing) {
    throw new AppError(409, "An account with this email already exists");
  }

  const hashedPassword = await hash(password, 12);
  const orgName = company || `${name}'s Organization`;
  const slug = await generateUniqueSlug(company || `${name}-org`);

  const session = await mongoose.startSession();
  let user: any;
  let org: any;

  try {
    await session.withTransaction(async () => {
      const userId = uuid();
      const orgId = uuid();
      const userNumber = await getNextSequence("userNumber");

      const [createdUser] = await User.create([{
        id: userId,
        userNumber,
        orgId,
        name,
        email,
        password: hashedPassword,
        status: "online",
        role: "admin",
      }], { session });
      user = createdUser;

      const [createdOrg] = await Organization.create([{
        id: orgId,
        name: orgName,
        slug,
        plan: "starter",
        ownerId: userId,
      }], { session });
      org = createdOrg;

      await OrgMember.create([{
        orgId,
        userId,
        role: "admin",
      }], { session });
    }, {
      readPreference: "primary",
      readConcern: { level: "local" },
      writeConcern: { w: "majority" },
    });
  } finally {
    await session.endSession();
  }

  const token = signToken({
    userId: user.id,
    email,
    role: "admin",
    permissions: [],
    orgId: org.id,
  });

  sendWelcomeEmail(email, name).catch((err) => {
    console.error("[mail] welcome email failed:", err?.message || err);
  });

  res.status(201).json({
    success: true,
    data: {
      token,
      user: { id: user.id, userNumber: user.userNumber, name, email, role: "admin", status: "online", orgId: org.id },
      orgId: org.id,
    },
  });
});

router.post("/logout", authenticate, async (req: AuthRequest, res: Response) => {
  const userId = req.user!.userId;
  const orgId = req.user!.orgId;

  // Close active session
  const activeSession = await Session.findOne({ userId, logoutTime: { $exists: false } }).sort({ loginTime: -1 });
  if (activeSession) {
    if (activeSession.currentStatus === "break") {
      const breakStart = [...activeSession.statusTransitions].reverse().find(t => t.status === "break");
      if (breakStart) {
        activeSession.totalBreakDuration += Date.now() - breakStart.timestamp.getTime();
      }
    }
    activeSession.statusTransitions.push({ status: "offline", timestamp: new Date() });
    activeSession.logoutTime = new Date();
    activeSession.currentStatus = "offline";
    activeSession.duration = activeSession.logoutTime.getTime() - activeSession.loginTime.getTime() - activeSession.totalBreakDuration;
    await activeSession.save();

    await ActivityLog.create({
      orgId: orgId || userId,
      userId,
      createdBy: userId,
      action: "session.end",
      entityType: "session",
      entityId: activeSession._id.toString(),
      description: `Session ended via logout. Active: ${Math.round((activeSession.duration || 0) / 60000)} min`,
    });

    socketIOManager.emitToUser(userId, "session:ended", {
      sessionId: activeSession._id.toString(),
      logoutTime: activeSession.logoutTime,
      duration: activeSession.duration,
    });
  }

  await User.findOneAndUpdate({ id: userId }, { status: "offline" });

  if (orgId) {
    socketIOManager.emitToOrg(orgId, "user:status:changed", {
      userId,
      status: "offline",
      timestamp: new Date().toISOString(),
    });
  }

  res.json({ success: true });
});

router.post("/forgot-password", async (req: AuthRequest, res: Response) => {
  const { email } = req.body;
  if (!email) throw new AppError(400, "Email is required");

  const user = await User.findOne({ email });
  if (user) {
    const resetToken = crypto.randomBytes(32).toString("hex");
    const resetTokenExpires = new Date(Date.now() + 3600000);
    await User.updateOne({ _id: user._id }, { $set: { resetToken, resetTokenExpires } });

    const resetLink = `${env.APP_URL}/reset-password?token=${resetToken}&email=${encodeURIComponent(email)}`;
    sendPasswordResetEmail(email, user.name, resetLink).catch((err) => {
      console.error("[auth] Failed to send password reset email:", err?.message || err);
    });
  }
  res.json({
    success: true,
    message: "If an account exists with that email, a reset link has been sent.",
  });
});

router.post("/reset-password", async (req: AuthRequest, res: Response) => {
  const { token, email, password } = req.body;
  if (!token || !email || !password) {
    throw new AppError(400, "Token, email, and new password are required");
  }

  const user = await User.findOne({ email, resetToken: token, resetTokenExpires: { $gt: new Date() } });
  if (!user) {
    throw new AppError(400, "Invalid or expired reset token");
  }

  const hashedPassword = await hash(password, 12);
  await User.updateOne(
    { _id: user._id },
    { $set: { password: hashedPassword, resetToken: null, resetTokenExpires: null } }
  );

  res.json({ success: true, message: "Password has been reset successfully." });
});

router.get("/me", authenticate, async (req: AuthRequest, res: Response) => {
  const user = await User.findOne({ id: req.user!.userId });
  if (!user) throw new AppError(404, "User not found");

  const orgId = user.orgId || req.user!.orgId;

  res.json({
    success: true,
    data: {
      id: user.id,
      userNumber: user.userNumber,
      name: user.name,
      email: user.email,
      image: user.image,
      role: user.role,
      permissions: user.permissions || [],
      status: user.status,
      isActive: user.isActive,
      createdAt: user.createdAt,
      orgId: orgId || undefined,
    },
  });
});

export default router;
