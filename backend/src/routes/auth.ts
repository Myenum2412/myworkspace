import { Router, Response } from "express";
import { hash, compare } from "bcryptjs";
import { v4 as uuid } from "uuid";
import crypto from "crypto";
import { User } from "../lib/db/models/User.js";
import { ClientUser } from "../lib/db/models/ClientUser.js";
import { PendingSignup } from "../lib/db/models/PendingSignup.js";
import { Organization } from "../lib/db/models/Organization.js";
import { OrgMember } from "../lib/db/models/OrgMember.js";
import { Session } from "../lib/db/models/Session.js";
import { RefreshToken } from "../lib/db/models/RefreshToken.js";
import { getNextSequence } from "../lib/db/models/Counter.js";
import { signToken, signRefreshToken, verifyRefreshToken } from "../config/auth.js";
import { getUserOrgId } from "../lib/org-utils.js";
import { env } from "../config/env.js";
import { AuthRequest, authenticate } from "../middleware/auth.js";
import { AppError } from "../middleware/error.js";
import { sendWelcomeEmail, sendPasswordResetEmail, sendVerificationEmail, sendOrganizationInviteEmail, sendClientWelcomeEmail, sendEmployeeOnboarded, sendSignupOtpEmail, sendPasswordDeliveredEmail } from "../lib/mail/index.js";
import { mongoose } from "../lib/db/index.js";
import jwt from "jsonwebtoken";
import { JwtPayload } from "../types/index.js";
import { requireString, optionalString } from "../lib/validate.js";
import { validatePasswordStrength } from "../services/validation.service.js";
import { recordAuditLog } from "../services/audit.service.js";

const router = Router();
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000;

router.get("/socket-token", authenticate, (req: AuthRequest, res: Response) => {
  const purpose: JwtPayload = {
    userId: req.user!.userId,
    email: req.user!.email,
    role: req.user!.role,
    orgId: req.user!.orgId,
    permissions: req.user!.permissions,
  } as JwtPayload;
  const token = jwt.sign({ ...purpose, purpose: "socket" }, env.JWT_SECRET, { expiresIn: "60s" } as jwt.SignOptions);
  res.json({ success: true, token });
});

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

async function getUserPrimaryOrgId(userId: string): Promise<string | null> {
  const member = await OrgMember.findOne({ userId }).select("orgId").lean();
  return member ? member.orgId : null;
}

router.post("/login", async (req: AuthRequest, res: Response) => {
  const email = requireString(req.body.email || "", "email", { min: 1, max: 254 }).toLowerCase();
  const password = requireString(req.body.password || "", "password", { min: 1, max: 1000 });
  const deviceFingerprint = optionalString(req.body.deviceFingerprint, "deviceFingerprint", { max: 256 });

  const user = await User.findOne({ email })
    .select("id email password name role permissions status isActive lockedUntil failedLoginAttempts twoFactorEnabled orgId emailVerified image userNumber lastLogin tokenVersion");
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
  const ipAddress = req.ip || req.socket.remoteAddress || "unknown";
  const userAgent = req.headers["user-agent"] || "unknown";

  if (user.twoFactorEnabled) {
    const tempToken = jwt.sign(
      { userId: user.id, email: user.email, purpose: "2fa" },
      env.JWT_SECRET,
      { expiresIn: "5m" } as jwt.SignOptions,
    );

    res.json({
      success: true,
      data: {
        requiresTwoFactor: true,
        tempToken,
        email: user.email,
      },
    });
    return;
  }

  await recordAuditLog({
    orgId: resolvedOrgId,
    userId: user.id,
    createdBy: user.id,
    action: "user.login",
    entityType: "user",
    entityId: user.id,
    description: `${user.name} logged in from ${ipAddress}`,
    metadata: JSON.stringify({ ipAddress, userAgent }),
  });

  await Session.updateMany(
    { userId: user.id, logoutTime: { $exists: false } },
    {
      $set: { logoutTime: new Date(), currentStatus: "offline" },
      $push: { statusTransitions: { status: "offline", timestamp: new Date() } },
    },
  );

  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const session = await Session.create({
    userId: user.id, orgId: resolvedOrgId,
    loginTime: new Date(), currentStatus: "online",
    statusTransitions: [{ status: "online", timestamp: new Date() }],
    totalBreakDuration: 0, expiresAt,
    deviceFingerprint: deviceFingerprint || undefined,
    ipAddress, userAgent,
  });

  await recordAuditLog({
    orgId: resolvedOrgId, userId: user.id, createdBy: user.id,
    action: "session.start", entityType: "session",
    entityId: session._id.toString(),
    description: `Session started for ${user.name}`,
  });

  const refreshFamily = uuid();
  const refreshTokenStr = signRefreshToken({
    userId: user.id,
    orgId: resolvedOrgId,
    tokenVersion: user.tokenVersion || 0,
    family: refreshFamily,
  });

  await RefreshToken.create({
    token: crypto.createHash("sha256").update(refreshTokenStr).digest("hex"),
    userId: user.id, orgId: resolvedOrgId,
    family: refreshFamily,
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    deviceFingerprint: deviceFingerprint || undefined,
    ipAddress, userAgent,
  });

  const token = signToken({
    userId: user.id, email: user.email, role: user.role,
    permissions: user.permissions || [], orgId: resolvedOrgId,
    tokenVersion: user.tokenVersion || 0,
  });

  res.json({
    success: true,
    data: {
      token,
      refreshToken: refreshTokenStr,
      sessionId: session._id.toString(),
      user: {
        id: user.id, userNumber: user.userNumber, name: user.name,
        email: user.email, image: user.image, role: user.role,
        permissions: user.permissions || [], status: "online",
        orgId: resolvedOrgId, emailVerified: user.emailVerified || false,
      },
      orgId: resolvedOrgId,
    },
  });
});

router.post("/refresh", async (req: AuthRequest, res: Response) => {
  const refreshTokenStr = requireString(req.body.refreshToken || "", "refreshToken", { min: 1, max: 2000 });
  const deviceFingerprint = optionalString(req.body.deviceFingerprint, "deviceFingerprint", { max: 256 });

  const { verifyRefreshTokenPipeline } = await import("../services/auth-pipeline.service.js");
  const result = await verifyRefreshTokenPipeline(
    refreshTokenStr,
    deviceFingerprint,
    req.ip || "unknown",
    req.headers["user-agent"] as string,
  );

  if ("requiresTwoFactor" in result) {
    res.json({
      success: true,
      data: {
        requiresTwoFactor: true,
        message: result.message,
      },
    });
    return;
  }

  res.json({
    success: true,
    data: {
      token: result.token,
      refreshToken: result.refreshToken,
      sessionId: result.sessionId,
    },
  });
});

router.post("/signup", async (req: AuthRequest, res: Response) => {
  const name = requireString(req.body.name, "name", { min: 1, max: 200 });
  const email = requireString(req.body.email, "email", { min: 5, max: 254 }).toLowerCase();
  const password = requireString(req.body.password, "password", { min: 8, max: 1000 });
  const company = optionalString(req.body.company, "company", { max: 200 });

  validatePasswordStrength(password);

  const existingUser = await User.findOne({ email }).select("_id").lean();
  if (existingUser) {
    throw new AppError(409, "An account with this email already exists");
  }

  const existingClient = await ClientUser.findOne({ email }).select("_id").lean();
  if (existingClient) {
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
        role: "members",
        emailVerified: false,
        emailVerificationToken: null,
        emailVerificationExpires: null,
      }], { session });
      user = createdUser;

      const trialEnd = new Date(Date.now() + env.TRIAL_DAYS * 24 * 60 * 60 * 1000);
      const [createdOrg] = await Organization.create([{
        id: orgId,
        name: orgName,
        slug,
        plan: "trial",
        trialEnd,
        subscriptionStatus: "trialing",
        ownerId: userId,
      }], { session });
      org = createdOrg;

      await OrgMember.create([{
        orgId,
        userId,
        role: "members",
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
    role: "members",
    permissions: [],
    orgId: org.id,
    tokenVersion: user.tokenVersion || 0,
  });

  sendWelcomeEmail(email, name).catch((err) => {
    console.error("[mail] welcome email failed:", err?.message || err);
  });

  const verificationToken = crypto.randomBytes(32).toString("hex");
  await User.updateOne(
    { id: user.id },
    {
      $set: {
        emailVerificationToken: verificationToken,
        emailVerificationExpires: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    },
  );

  const verificationUrl = `${env.APP_URL}/verify-email?token=${verificationToken}&email=${encodeURIComponent(email)}`;
  sendVerificationEmail(email, name, verificationUrl).catch((err) => {
    console.error("[mail] verification email failed:", err?.message || err);
  });

  res.status(201).json({
    success: true,
    data: {
      token,
      user: {
        id: user.id,
        userNumber: user.userNumber,
        name,
        email,
        role: "members",
        status: "online",
        orgId: org.id,
        emailVerified: false,
      },
      orgId: org.id,
    },
  });
});

router.post("/verify-email", async (req: AuthRequest, res: Response) => {
  const { token, email } = req.body;
  if (!token || !email) {
    throw new AppError(400, "Token and email are required");
  }

  const user = await User.findOne({
    email: email.toLowerCase().trim(),
    emailVerificationToken: token,
    emailVerificationExpires: { $gt: new Date() },
  }).select("_id").lean();

  if (!user) {
    throw new AppError(400, "Invalid or expired verification token");
  }

  await User.updateOne(
    { _id: user._id },
    {
      $set: {
        emailVerified: true,
        emailVerificationToken: null,
        emailVerificationExpires: null,
      },
    },
  );

  res.json({ success: true, message: "Email verified successfully" });
});

router.post("/resend-verification", authenticate, async (req: AuthRequest, res: Response) => {
  const user = await User.findOne({ id: req.user!.userId }).select("_id email name emailVerified").lean();
  if (!user) throw new AppError(404, "User not found");
  if (user.emailVerified) {
    throw new AppError(400, "Email is already verified");
  }

  const verificationToken = crypto.randomBytes(32).toString("hex");
  await User.updateOne(
    { _id: user._id },
    {
      $set: {
        emailVerificationToken: verificationToken,
        emailVerificationExpires: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    },
  );

  const verificationUrl = `${env.APP_URL}/verify-email?token=${verificationToken}&email=${encodeURIComponent(user.email)}`;
  sendVerificationEmail(user.email, user.name, verificationUrl).catch((err) => {
    console.error("[mail] verification email failed:", err?.message || err);
  });

  res.json({ success: true, message: "Verification email sent" });
});

router.post("/logout-all", authenticate, async (req: AuthRequest, res: Response) => {
  const userId = req.user!.userId;
  await User.updateOne({ id: userId }, { $inc: { tokenVersion: 1 } });
  await RefreshToken.updateMany({ userId, revokedAt: { $exists: false } }, { revokedAt: new Date() });
  await Session.updateMany(
    { userId, logoutTime: { $exists: false } },
    { $set: { logoutTime: new Date(), currentStatus: "offline" } },
  );
  res.json({ success: true, message: "All sessions revoked" });
});

router.post("/logout", authenticate, async (req: AuthRequest, res: Response) => {
  const userId = req.user!.userId;
  const orgId = req.user!.orgId;

  await RefreshToken.updateMany(
    { userId, revokedAt: { $exists: false } },
    { revokedAt: new Date() },
  );

  const activeSession = await Session.findOne({ userId, logoutTime: { $exists: false } }).sort({ loginTime: -1 }).select("_id currentStatus statusTransitions loginTime totalBreakDuration duration logoutTime");
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
    activeSession.duration = Math.max(0, activeSession.logoutTime.getTime() - activeSession.loginTime.getTime() - activeSession.totalBreakDuration);
    await activeSession.save();

    await recordAuditLog({
      orgId: orgId || userId,
      userId,
      createdBy: userId,
      action: "session.end",
      entityType: "session",
      entityId: activeSession._id.toString(),
      description: `Session ended via logout. Active: ${Math.round((activeSession.duration || 0) / 60000)} min`,
    });

  }

  await User.findOneAndUpdate({ id: userId }, { status: "offline" });

  res.json({ success: true });
});

router.post("/forgot-password", async (req: AuthRequest, res: Response) => {
  const email = requireString(req.body.email || "", "email", { min: 1, max: 254 }).toLowerCase();

  // Rate limit: max 3 reset requests per email per hour
  const recentResets = await User.findOne({
    email,
    resetTokenExpires: { $gt: new Date(Date.now() - 3600000) },
  }).select("_id").lean();

  if (recentResets) {
    // Check how many tokens were generated recently (rate limit)
    const resetCount = await User.countDocuments({
      email,
      resetTokenExpires: { $gt: new Date(Date.now() - 3600000) },
    });

    if (resetCount >= 3) {
      // Still return success to prevent email enumeration
      res.json({
        success: true,
        message: "If an account exists with that email, a reset link has been sent.",
      });
      return;
    }
  }

  const user = await User.findOne({ email }).select("_id name").lean();
  if (user) {
    // Generate one-time use token with shorter expiry (15 minutes)
    const resetToken = crypto.randomBytes(32).toString("hex");
    const resetTokenHash = crypto.createHash("sha256").update(resetToken).digest("hex");
    const resetTokenExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    await User.updateOne(
      { _id: user._id },
      { $set: { resetToken: resetTokenHash, resetTokenExpires } },
    );

    const resetLink = `${env.APP_URL}/reset-password?token=${resetToken}&email=${encodeURIComponent(email)}`;

    // Audit log for password reset request
    await recordAuditLog({
      orgId: "system",
      userId: user._id.toString(),
      action: "password.reset.requested",
      entityType: "user",
      entityId: user._id.toString(),
      description: `Password reset requested for ${email}`,
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"] as string,
      success: true,
    });

    sendPasswordResetEmail(email, user.name, resetLink).catch((err) => {
      console.error("[auth] Failed to send password reset email:", err?.message || err);
    });
  }

  // Always return success to prevent email enumeration
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

  validatePasswordStrength(password);

  // Hash the token to compare with stored hash
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

  const user = await User.findOne({
    email,
    resetToken: tokenHash,
    resetTokenExpires: { $gt: new Date() },
  }).select("_id").lean();

  if (!user) {
    // Audit log for failed reset attempt
    await recordAuditLog({
      orgId: "system",
      userId: "unknown",
      action: "password.reset.failed",
      entityType: "user",
      entityId: email,
      description: `Password reset failed for ${email} - invalid or expired token`,
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"] as string,
      success: false,
    });

    throw new AppError(400, "Invalid or expired reset token");
  }

  const hashedPassword = await hash(password, 12);

  // Increment tokenVersion to revoke all existing sessions
  await User.updateOne(
    { _id: user._id },
    {
      $set: {
        password: hashedPassword,
        resetToken: null,
        resetTokenExpires: null,
      },
      $inc: { tokenVersion: 1 },
    },
  );

  // Audit log for successful reset
  await recordAuditLog({
    orgId: "system",
    userId: user._id.toString(),
    action: "password.reset.completed",
    entityType: "user",
    entityId: user._id.toString(),
    description: `Password reset completed for ${email}`,
    ipAddress: req.ip,
    userAgent: req.headers["user-agent"] as string,
    success: true,
  });

  res.json({ success: true, message: "Password has been reset successfully." });
});

router.get("/me", authenticate, async (req: AuthRequest, res: Response) => {
  const user = await User.findOne({ id: req.user!.userId })
    .select("id userNumber name email image role permissions status isActive emailVerified twoFactorEnabled createdAt orgId")
    .lean();
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
      emailVerified: user.emailVerified || false,
      twoFactorEnabled: user.twoFactorEnabled,
      createdAt: user.createdAt,
      orgId: orgId || undefined,
    },
  });
});

// Send signup OTP
router.post("/send-signup-otp", async (req: AuthRequest, res: Response) => {
  const email = requireString(req.body.email, "email", { min: 5, max: 254 }).toLowerCase();
  const name = requireString(req.body.name, "name", { min: 1, max: 200 });
  const company = optionalString(req.body.company, "company", { max: 200 });
  const plan = optionalString(req.body.plan, "plan", { max: 50 });

  const [existingUser, existingClient] = await Promise.all([
    User.findOne({ email }).select("_id").lean(),
    ClientUser.findOne({ email }).select("_id").lean(),
  ]);
  if (existingUser || existingClient) {
    throw new AppError(409, "An account with this email already exists");
  }

  const otp = String(crypto.randomInt(100000, 999999));
  const otpExpires = new Date(Date.now() + 10 * 60 * 1000);

  await PendingSignup.updateOne(
    { email },
    { $set: { email, name, company, otp, otpExpires, plan, createdAt: new Date() } },
    { upsert: true }
  );

  sendSignupOtpEmail(email, name, otp).catch((err) => {
    console.error("[mail] signup OTP email failed:", err?.message || err);
  });

  res.json({ success: true, message: "Verification code sent to your email" });
});

// Verify signup OTP and create account
router.post("/verify-signup-otp", async (req: AuthRequest, res: Response) => {
  const email = requireString(req.body.email, "email", { min: 5, max: 254 }).toLowerCase();
  const otp = requireString(req.body.otp, "otp", { min: 6, max: 6 });

  const pending = await PendingSignup.findOne({ email }).select("email otp otpExpires name company plan").lean();
  if (!pending) {
    throw new AppError(400, "No verification code found. Please request a new one.");
  }

  if (pending.otp !== otp) {
    throw new AppError(400, "Invalid verification code");
  }

  if (pending.otpExpires < new Date()) {
    await PendingSignup.deleteOne({ email });
    throw new AppError(400, "Verification code has expired. Please request a new one.");
  }

  const password = crypto.randomBytes(4).toString("hex");
  const hashedPassword = await hash(password, 12);
  const userId = uuid();
  const orgId = uuid();
  const userNumber = await getNextSequence("userNumber");
  const company = pending.company;
  const name = pending.name;
  const plan = pending.plan;

  const orgName = company || `${name}'s Organization`;
  const slug = await generateUniqueSlug(company || `${name}-org`);

  const mongoSession = await mongoose.startSession();
  let user: any;
  let org: any;

  try {
    await mongoSession.withTransaction(async () => {
      const [createdUser] = await User.create([{
        id: userId,
        userNumber,
        orgId,
        name,
        email,
        password: hashedPassword,
        status: "online",
        role: "members",
        emailVerified: true,
      }], { session: mongoSession });
      user = createdUser;

      const trialEnd = new Date(Date.now() + env.TRIAL_DAYS * 24 * 60 * 60 * 1000);
      const [createdOrg] = await Organization.create([{
        id: orgId,
        name: orgName,
        slug,
        plan: plan || "trial",
        trialEnd: plan ? undefined : trialEnd,
        subscriptionStatus: plan || "trialing",
        ownerId: userId,
      }], { session: mongoSession });
      org = createdOrg;

      await OrgMember.create([{
        orgId,
        userId,
        role: "members",
      }], { session: mongoSession });
    }, {
      readPreference: "primary",
      readConcern: { level: "local" },
      writeConcern: { w: "majority" },
    });
  } finally {
    await mongoSession.endSession();
  }

  await PendingSignup.deleteOne({ email });

  const loginUrl = `${env.APP_URL}/login`;
  sendPasswordDeliveredEmail(email, name, email, password, loginUrl).catch((err) => {
    console.error("[mail] password delivery email failed:", err?.message || err);
  });

  sendWelcomeEmail(email, name).catch((err) => {
    console.error("[mail] welcome email failed:", err?.message || err);
  });

  const token = signToken({
    userId: user.id,
    email,
    role: "members",
    permissions: [],
    orgId: org.id,
    tokenVersion: user.tokenVersion || 0,
  });

  res.status(201).json({
    success: true,
    message: "Account created successfully",
    data: {
      token,
      password,
      user: {
        id: user.id,
        userNumber: user.userNumber,
        name,
        email,
        role: "members",
        status: "online",
        orgId: org.id,
      },
      orgId: org.id,
    },
  });
});
router.post("/send-welcome-email", async (req: AuthRequest, res: Response) => {
  try {
    const { email, name } = req.body;
    if (!email || !name) {
      return res.status(400).json({ success: false, message: "Email and name are required" });
    }
    await sendWelcomeEmail(email, name);
    res.json({ success: true, message: "Welcome email sent" });
  } catch (err) {
    console.error("[auth] send-welcome-email error:", err);
    res.status(500).json({ success: false, message: "Failed to send welcome email" });
  }
});

// Send organization invite email endpoint
router.post("/send-organization-invite-email", async (req: AuthRequest, res: Response) => {
  try {
    const { email, name, orgName, inviteUrl } = req.body;
    if (!email || !name || !orgName || !inviteUrl) {
      return res.status(400).json({ success: false, message: "Missing required fields" });
    }
    await sendOrganizationInviteEmail(email, name, orgName, inviteUrl);
    res.json({ success: true, message: "Organization invite email sent" });
  } catch (err) {
    console.error("[auth] send-organization-invite-email error:", err);
    res.status(500).json({ success: false, message: "Failed to send organization invite email" });
  }
});

// Send verification email endpoint
router.post("/send-verification-email", async (req: AuthRequest, res: Response) => {
  try {
    const { email, name, verificationUrl } = req.body;
    if (!email || !name || !verificationUrl) {
      return res.status(400).json({ success: false, message: "Missing required fields" });
    }
    await sendVerificationEmail(email, name, verificationUrl);
    res.json({ success: true, message: "Verification email sent" });
  } catch (err) {
    console.error("[auth] send-verification-email error:", err);
    res.status(500).json({ success: false, message: "Failed to send verification email" });
  }
});

// Send client welcome email endpoint
router.post("/send-client-welcome-email", async (req: AuthRequest, res: Response) => {
  try {
    const { email, clientName, username, tempPassword, loginUrl } = req.body;
    if (!email || !clientName || !username || !tempPassword || !loginUrl) {
      return res.status(400).json({ success: false, message: "Missing required fields" });
    }
    await sendClientWelcomeEmail(email, clientName, username, tempPassword, loginUrl);
    res.json({ success: true, message: "Client welcome email sent" });
  } catch (err) {
    console.error("[auth] send-client-welcome-email error:", err);
    res.status(500).json({ success: false, message: "Failed to send client welcome email" });
  }
});

router.post("/send-employee-onboarded-email", async (req: AuthRequest, res: Response) => {
  try {
    const { email, firstName, userEmail, workspaceName, loginUrl, tempPassword } = req.body;
    if (!email || !firstName || !userEmail || !workspaceName || !loginUrl || !tempPassword) {
      return res.status(400).json({ success: false, message: "Missing required fields" });
    }
    await sendEmployeeOnboarded(email, firstName, userEmail, workspaceName, loginUrl, tempPassword);
    res.json({ success: true, message: "Employee onboarded email sent", emailStatus: "sent" });
  } catch (err: any) {
    console.error("[auth] send-employee-onboarded-email error:", err);
    res.status(500).json({ success: false, message: "Failed to send employee onboarded email", emailStatus: "failed", error: err?.message || "Unknown error" });
  }
});

// Send password reset email endpoint
router.post("/send-password-reset-email", async (req: AuthRequest, res: Response) => {
  try {
    const { email, name, resetLink } = req.body;
    if (!email || !name || !resetLink) {
      return res.status(400).json({ success: false, message: "Missing required fields" });
    }
    await sendPasswordResetEmail(email, name, resetLink);
    res.json({ success: true, message: "Password reset email sent" });
  } catch (err) {
    console.error("[auth] send-password-reset-email error:", err);
    res.status(500).json({ success: false, message: "Failed to send password reset email" });
  }
});

export default router;
