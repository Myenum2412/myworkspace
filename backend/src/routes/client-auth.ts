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
import { signToken } from "../config/auth.js";
import { optionalAuth } from "../middleware/auth.js";
import { AppError } from "../middleware/error.js";
import { env } from "../config/env.js";
import { stripe } from "../config/stripe.js";
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

  const normalizedEmail = (email as string).toLowerCase();
  const escapedEmail = normalizedEmail.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  let clientUser = await ClientUser.findOne({ email: normalizedEmail });
  if (!clientUser) {
    clientUser = await ClientUser.findOne({
      email: { $regex: new RegExp(`^${escapedEmail}$`, 'i') }
    });
  }
  if (!clientUser) {
    throw new AppError(401, "Invalid email or password");
  }

  if (!clientUser.isActive) {
    throw new AppError(403, "Account is deactivated. Contact your administrator.");
  }

  if (clientUser.lockedUntil && clientUser.lockedUntil > new Date()) {
    throw new AppError(423, "Account is temporarily locked. Try again later.");
  }

  const valid = await compare(password, clientUser.password);
  if (!valid) {
    clientUser.failedLoginAttempts += 1;
    if (clientUser.failedLoginAttempts >= MAX_FAILED_ATTEMPTS) {
      clientUser.lockedUntil = new Date(Date.now() + LOCKOUT_DURATION_MS);
    }
    await clientUser.save();

    await ClientAuditLog.create({
      orgId: clientUser.orgId,
      clientId: clientUser.clientId,
      clientUserId: clientUser.id,
      action: "client.login.failed",
      entityType: "client_user",
      entityId: clientUser.id,
      description: `Failed login attempt for ${email}`,
      ipAddress: req.ip,
    });

    throw new AppError(401, "Invalid email or password");
  }

  clientUser.failedLoginAttempts = 0;
  clientUser.lockedUntil = undefined;
  clientUser.lastLogin = new Date();
  await clientUser.save();

  await ClientAuditLog.create({
    orgId: clientUser.orgId,
    clientId: clientUser.clientId,
    clientUserId: clientUser.id,
    action: "client.login.success",
    entityType: "client_user",
    entityId: clientUser.id,
    description: `${clientUser.name} logged in`,
    ipAddress: req.ip,
  });

  const token = signToken({
    userId: clientUser.id,
    email: clientUser.email,
    role: "client",
    permissions: [],
    orgId: clientUser.orgId,
  });

  res.json({
    success: true,
    data: {
      token,
      user: {
        id: clientUser.id,
        name: clientUser.name,
        email: clientUser.email,
        role: "client",
        mustChangePassword: clientUser.mustChangePassword,
        emailVerified: clientUser.emailVerified,
      },
      clientId: clientUser.clientId,
      orgId: clientUser.orgId,
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

router.get("/workspace-stats", optionalAuth, async (req: AuthRequest, res: Response) => {
  const clientUserId = req.user?.userId;
  if (!clientUserId) {
    throw new AppError(401, "Authentication required");
  }

  const clientUser = await ClientUser.findOne({ id: clientUserId }).lean();
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

router.get("/me", optionalAuth, async (req: AuthRequest, res: Response) => {
  const clientUserId = req.user?.userId;
  if (!clientUserId) {
    throw new AppError(401, "Authentication required");
  }

  const clientUser = await ClientUser.findOne({ id: clientUserId }).lean();
  if (!clientUser) {
    throw new AppError(404, "Client user not found");
  }

  const client = await Client.findOne({ id: clientUser.clientId, orgId: clientUser.orgId }).lean();

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

  const clientUser = await ClientUser.findOne({ email });
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

  const clientUser = await ClientUser.findOne({ email: email.toLowerCase().trim(), resetToken: token, resetTokenExpires: { $gt: new Date() } });
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

// GET /api/client-auth/billing-status
router.get("/billing-status", optionalAuth, async (req: AuthRequest, res: Response) => {
  const clientUserId = req.user?.userId;
  if (!clientUserId) {
    throw new AppError(401, "Authentication required");
  }

  const clientUser = await ClientUser.findOne({ id: clientUserId }).lean();
  if (!clientUser) {
    throw new AppError(404, "Client user not found");
  }

  const org = await Organization.findOne({ id: clientUser.orgId }).lean();
  if (!org) {
    res.json({ success: true, data: { plan: "free", subscriptionStatus: "none", invoices: [] } });
    return;
  }

  let stripeSubscription: Record<string, any> | null = null;
  if (org.stripeSubscriptionId) {
    try {
      stripeSubscription = await stripe.subscriptions.retrieve(org.stripeSubscriptionId);
    } catch {
      // subscription may have been deleted in Stripe
    }
  }

  let invoices: any[] = [];
  if (org.stripeCustomerId) {
    try {
      const stripeInvoices = await stripe.invoices.list({
        customer: org.stripeCustomerId,
        limit: 10,
      });
      invoices = stripeInvoices.data.map((inv) => ({
        id: inv.id,
        number: inv.number,
        amountDue: inv.amount_due,
        amountPaid: inv.amount_paid,
        currency: inv.currency,
        status: inv.status,
        pdfUrl: inv.invoice_pdf,
        hostedUrl: inv.hosted_invoice_url,
        createdAt: new Date(inv.created * 1000).toISOString(),
        periodStart: new Date(inv.period_start * 1000).toISOString(),
        periodEnd: new Date(inv.period_end * 1000).toISOString(),
      }));
    } catch {
      // invoices may fail silently
    }
  }

  res.json({
    success: true,
    data: {
      plan: org.plan,
      stripeCustomerId: org.stripeCustomerId,
      stripeSubscriptionId: org.stripeSubscriptionId,
      subscriptionStatus: org.subscriptionStatus,
      currentPeriodEnd: org.currentPeriodEnd,
      trialEnd: org.trialEnd,
      stripeSubscription,
      invoices,
      hasPaymentMethod: !!org.stripeCustomerId,
    },
  });
});

export default router;
