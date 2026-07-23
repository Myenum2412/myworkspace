import { Router, Response } from "express";
import { hash, compare } from "bcryptjs";
import crypto from "crypto";
import { v4 as uuid } from "uuid";
import { ClientUser } from "../lib/db/models/ClientUser.js";
import { Client } from "../lib/db/models/Client.js";
import { ClientAuditLog } from "../lib/db/models/ClientAuditLog.js";
import { Folder } from "../lib/db/models/Folder.js";
import { FileAttachment } from "../lib/db/models/FileAttachment.js";
import { Organization } from "../lib/db/models/Organization.js";
import { Invoice } from "../lib/db/models/Invoice.js";
import { signToken } from "../config/auth.js";
import { optionalAuth } from "../middleware/auth.js";
import { AppError } from "../middleware/error.js";
import { env } from "../config/env.js";
import { sendPasswordResetEmail } from "../lib/mail/index.js";
import { validatePasswordStrength } from "../services/validation.service.js";
import type { AuthRequest } from "../types/index.js";

const router = Router();
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000;

router.post("/login", async (req: AuthRequest, res: Response) => {
  const { email, password } = req.body;
  if (!email || !password) {
    throw new AppError(400, "Email and password are required");
  }

  const { executeAuthPipeline } = await import("../services/auth-pipeline.service.js");

  const result = await executeAuthPipeline({
    email: (email as string).toLowerCase(),
    password: password as string,
    deviceFingerprint: req.body.deviceFingerprint as string | undefined,
    authMethod: "password",
    ipAddress: req.ip,
    userAgent: req.headers["user-agent"] as string,
  });

  await ClientAuditLog.create({
    orgId: result.orgId || "",
    clientId: result.user?.id || "",
    clientUserId: result.user?.id || "",
    createdBy: result.user?.id || "",
    action: "client.login.success",
    entityType: "client_user",
    entityId: result.user?.id || "",
    description: `${result.user?.name || email} logged in`,
    ipAddress: req.ip,
  });

  res.json({
    success: true,
    data: {
      token: result.token,
      refreshToken: result.refreshToken,
      sessionId: result.sessionId,
      user: {
        id: result.user?.id,
        name: result.user?.name,
        email: result.user?.email,
        role: "clients",
        mustChangePassword: false,
        emailVerified: result.user?.emailVerified || false,
      },
      clientId: req.body.clientId || result.orgId,
      orgId: result.orgId,
    },
  });
});

router.post("/change-password", optionalAuth, async (req: AuthRequest, res: Response) => {
  const { currentPassword, newPassword } = req.body;
  const clientUserId = req.body.clientUserId || req.user?.userId;

  if (!clientUserId) {
    throw new AppError(401, "Authentication required");
  }
  if (!currentPassword || !newPassword) {
    throw new AppError(400, "Current password and new password are required");
  }
  if (newPassword.length < 8) {
    throw new AppError(400, "New password must be at least 8 characters");
  }

  const clientUser = await ClientUser.findOne({ id: clientUserId });
  if (!clientUser) {
    throw new AppError(404, "Client user not found");
  }

  const valid = await compare(currentPassword, clientUser.password);
  if (!valid) {
    throw new AppError(400, "Current password is incorrect");
  }

  clientUser.password = await hash(newPassword, 12);
  clientUser.mustChangePassword = false;
  await clientUser.save();

  await ClientAuditLog.create({
    orgId: clientUser.orgId,
    clientId: clientUser.clientId,
    clientUserId: clientUser.id,
    action: "client.password.changed",
    entityType: "client_user",
    entityId: clientUser.id,
    description: `${clientUser.name} changed password`,
  });

  res.json({ success: true, message: "Password changed successfully" });
});

async function lookupClientUser(userId: string, email?: string) {
  let user = await ClientUser.findOne({ id: userId }).select("orgId clientId").lean();
  if (!user && email) {
    user = await ClientUser.findOne({ email }).select("orgId clientId").lean();
  }
  return user;
}

router.get("/workspace-stats", optionalAuth, async (req: AuthRequest, res: Response) => {
  const clientUserId = req.user?.userId;
  if (!clientUserId) {
    throw new AppError(401, "Authentication required");
  }

  const clientUser = await lookupClientUser(clientUserId, req.user?.email);
  if (!clientUser) {
    throw new AppError(404, "Client user not found");
  }

  const { orgId, clientId } = clientUser;

  const [folderCount, fileCount, recentFiles] = await Promise.all([
    Folder.countDocuments({ orgId, clientId: clientId || null, deletedAt: null }),
    FileAttachment.countDocuments({ orgId, clientId: clientId || null, deletedAt: null }),
    FileAttachment.find({ orgId, clientId: clientId || null, deletedAt: null })
      .select("id originalName mimeType size createdAt category")
      .sort({ createdAt: -1 })
      .limit(5)
      .lean(),
  ]);

  res.json({
    success: true,
    data: {
      folderCount,
      fileCount,
      recentFiles: recentFiles.map((f) => ({
        id: f.id,
        name: f.originalName,
        mimeType: f.mimeType,
        size: f.size,
        category: f.category,
        createdAt: f.createdAt,
      })),
    },
  });
});

router.get("/billing-status", optionalAuth, async (req: AuthRequest, res: Response) => {
  const clientUserId = req.user?.userId;
  if (!clientUserId) throw new AppError(401, "Authentication required");

  const clientUser = await lookupClientUser(clientUserId, req.user?.email);
  if (!clientUser) throw new AppError(404, "Client user not found");

  const orgId = clientUser.orgId;
  if (!orgId) {
    res.json({ success: true, data: { pendingCount: 0, totalDue: 0, invoices: [] } });
    return;
  }

  const invoices = await     Invoice.find({
    orgId,
    status: { $in: ["open", "past_due"] },
  })
    .sort({ createdAt: -1 })
    .limit(50)
    .select("id number total amountPaid currency status pdfUrl hostedUrl createdAt periodStart periodEnd")
    .lean();

  const totalDue = invoices.reduce((sum, inv) => sum + (inv.total || 0), 0);

  res.json({
    success: true,
    data: {
      pendingCount: invoices.length,
      totalDue,
      invoices: invoices.map((inv) => ({
        id: inv.id,
        number: inv.number,
        amountDue: inv.total,
        amountPaid: inv.amountPaid,
        currency: inv.currency,
        status: inv.status,
        pdfUrl: inv.pdfUrl,
        hostedUrl: inv.hostedUrl,
        createdAt: inv.createdAt,
        periodStart: inv.periodStart,
        periodEnd: inv.periodEnd,
      })),
    },
  });
});

router.get("/me", optionalAuth, async (req: AuthRequest, res: Response) => {
  const clientUserId = req.user?.userId;
  if (!clientUserId) {
    throw new AppError(401, "Authentication required");
  }

  const clientUser = await ClientUser.findOne({ id: clientUserId }).select("id username name email isActive emailVerified mustChangePassword lastLogin createdAt orgId clientId").lean();
  if (!clientUser) {
    throw new AppError(404, "Client user not found");
  }

  const client = await Client.findOne({ id: clientUser.clientId, orgId: clientUser.orgId }).select("id name company status projects").lean();

  res.json({
    success: true,
    data: {
      user: {
        id: clientUser.id,
        username: clientUser.username,
        name: clientUser.name,
        email: clientUser.email,
        isActive: clientUser.isActive,
        emailVerified: clientUser.emailVerified,
        mustChangePassword: clientUser.mustChangePassword,
        lastLogin: clientUser.lastLogin,
        createdAt: clientUser.createdAt,
      },
      client: client ? {
        id: client.id,
        name: client.name,
        company: client.company,
        status: client.status,
        projects: client.projects,
      } : null,
      orgId: clientUser.orgId,
    },
  });
});

router.put("/profile", optionalAuth, async (req: AuthRequest, res: Response) => {
  const clientUserId = req.user?.userId;
  if (!clientUserId) {
    throw new AppError(401, "Authentication required");
  }

  const allowedFields = ["name", "mobileNumber", "preferredContactMethod", "preferredTimeZone"];
  const updates: Record<string, string> = {};
  for (const field of allowedFields) {
    if (req.body[field] !== undefined) {
      updates[field] = req.body[field];
    }
  }

  const clientUser = await ClientUser.findOne({ id: clientUserId });
  if (!clientUser) {
    throw new AppError(404, "Client user not found");
  }

  if (updates.name) clientUser.name = updates.name;
  await clientUser.save();

  if (updates.mobileNumber || updates.preferredContactMethod || updates.preferredTimeZone) {
    await Client.findOneAndUpdate(
      { id: clientUser.clientId, orgId: clientUser.orgId },
      { $set: updates }
    );
  }

  res.json({ success: true, message: "Profile updated" });
});

router.post("/verify-email", optionalAuth, async (req: AuthRequest, res: Response) => {
  const clientUserId = req.user?.userId;
  if (!clientUserId) {
    throw new AppError(401, "Authentication required");
  }

  const clientUser = await ClientUser.findOne({ id: clientUserId });
  if (!clientUser) {
    throw new AppError(404, "Client user not found");
  }

  if (clientUser.emailVerified) {
    res.json({ success: true, message: "Email already verified" });
    return;
  }

  clientUser.emailVerified = true;
  await clientUser.save();

  await ClientAuditLog.create({
    orgId: clientUser.orgId,
    clientId: clientUser.clientId,
    clientUserId: clientUser.id,
    action: "client.email.verified",
    entityType: "client_user",
    entityId: clientUser.id,
    description: `${clientUser.name} verified email`,
  });

  res.json({ success: true, message: "Email verified successfully" });
});

router.post("/forgot-password", async (req: AuthRequest, res: Response) => {
  const email = (req.body.email || "").toLowerCase().trim();
  if (!email) {
    throw new AppError(400, "Email is required");
  }

  const clientUser = await ClientUser.findOne({ email }).select("_id name").lean();
  if (clientUser) {
    const resetToken = crypto.randomBytes(32).toString("hex");
    const resetTokenExpires = new Date(Date.now() + 3600000);
    await ClientUser.updateOne({ _id: clientUser._id }, { $set: { resetToken, resetTokenExpires } });

    const resetLink = `${env.APP_URL}/client/reset-password?token=${resetToken}&email=${encodeURIComponent(email)}`;
    sendPasswordResetEmail(email, clientUser.name, resetLink).catch((err) => {
      console.error("[client-auth] Failed to send password reset email:", err?.message || err);
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

  validatePasswordStrength(password);

  const clientUser = await ClientUser.findOne({ email: email.toLowerCase().trim(), resetToken: token, resetTokenExpires: { $gt: new Date() } }).select("_id name orgId clientId").lean();
  if (!clientUser) {
    throw new AppError(400, "Invalid or expired reset token");
  }

  const hashedPassword = await hash(password, 12);
  await ClientUser.updateOne(
    { _id: clientUser._id },
    { $set: { password: hashedPassword, resetToken: null, resetTokenExpires: null, mustChangePassword: false } }
  );

  await ClientAuditLog.create({
    orgId: clientUser.orgId,
    clientId: clientUser.clientId,
    clientUserId: clientUser.id,
    action: "client.password.reset",
    entityType: "client_user",
    entityId: clientUser.id,
    description: `${clientUser.name} reset their password`,
  });

  res.json({ success: true, message: "Password has been reset successfully." });
});

export default router;
