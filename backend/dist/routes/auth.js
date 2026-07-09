import { Router } from "express";
import { hash, compare } from "bcryptjs";
import { v4 as uuid } from "uuid";
import crypto from "crypto";
import { User } from "../lib/db/models/User.js";
import { ClientUser } from "../lib/db/models/ClientUser.js";
import { Organization } from "../lib/db/models/Organization.js";
import { OrgMember } from "../lib/db/models/OrgMember.js";
import { Session } from "../lib/db/models/Session.js";
import { getNextSequence } from "../lib/db/models/Counter.js";
import { signToken } from "../config/auth.js";
import { env } from "../config/env.js";
import { authenticate } from "../middleware/auth.js";
import { AppError } from "../middleware/error.js";
import { sendWelcomeEmail, sendPasswordResetEmail, sendVerificationEmail, sendOrganizationInviteEmail, sendClientWelcomeEmail, sendEmployeeOnboarded } from "../lib/mail/index.js";
import { mongoose } from "../lib/db/index.js";
import jwt from "jsonwebtoken";
import { socketIOManager } from "../lib/socketio/index.js";
import { requireString, optionalString } from "../lib/validate.js";
import { validatePasswordStrength } from "../services/validation.service.js";
import { recordAuditLog } from "../services/audit.service.js";
const router = Router();
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000;
router.get("/socket-token", authenticate, (req, res) => {
    const purpose = {
        userId: req.user.userId,
        email: req.user.email,
        role: req.user.role,
        orgId: req.user.orgId,
        permissions: req.user.permissions,
    };
    const token = jwt.sign({ ...purpose, purpose: "socket" }, env.JWT_SECRET, { expiresIn: "60s" });
    res.json({ success: true, token });
});
async function generateUniqueSlug(base) {
    const slugBase = base.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "org";
    let slug = slugBase;
    let counter = 0;
    while (await Organization.exists({ slug })) {
        counter++;
        slug = `${slugBase}-${counter}`;
    }
    return slug;
}
async function getUserPrimaryOrgId(userId) {
    const member = await OrgMember.findOne({ userId }).lean();
    return member ? member.orgId : null;
}
router.post("/login", async (req, res) => {
    const email = requireString(req.body.email || "", "email", { min: 1, max: 254 }).toLowerCase();
    const password = requireString(req.body.password || "", "password", { min: 1, max: 1000 });
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
    if (user.twoFactorEnabled) {
        const tempToken = jwt.sign({ userId: user.id, email: user.email, purpose: "2fa" }, env.JWT_SECRET, { expiresIn: "5m" });
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
    await recordAuditLog({
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
                emailVerified: user.emailVerified || false,
            },
            orgId: resolvedOrgId,
        },
    });
});
router.post("/signup", async (req, res) => {
    const name = requireString(req.body.name, "name", { min: 1, max: 200 });
    const email = requireString(req.body.email, "email", { min: 5, max: 254 }).toLowerCase();
    const password = requireString(req.body.password, "password", { min: 8, max: 1000 });
    const company = optionalString(req.body.company, "company", { max: 200 });
    validatePasswordStrength(password);
    const existingUser = await User.findOne({ email });
    if (existingUser) {
        throw new AppError(409, "An account with this email already exists");
    }
    const existingClient = await ClientUser.findOne({ email });
    if (existingClient) {
        throw new AppError(409, "An account with this email already exists");
    }
    const hashedPassword = await hash(password, 12);
    const orgName = company || `${name}'s Organization`;
    const slug = await generateUniqueSlug(company || `${name}-org`);
    const session = await mongoose.startSession();
    let user;
    let org;
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
                    role: "admin",
                }], { session });
        }, {
            readPreference: "primary",
            readConcern: { level: "local" },
            writeConcern: { w: "majority" },
        });
    }
    finally {
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
    const verificationToken = crypto.randomBytes(32).toString("hex");
    await User.updateOne({ id: user.id }, {
        $set: {
            emailVerificationToken: verificationToken,
            emailVerificationExpires: new Date(Date.now() + 24 * 60 * 60 * 1000),
        },
    });
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
                role: "admin",
                status: "online",
                orgId: org.id,
                emailVerified: false,
            },
            orgId: org.id,
        },
    });
});
router.post("/verify-email", async (req, res) => {
    const { token, email } = req.body;
    if (!token || !email) {
        throw new AppError(400, "Token and email are required");
    }
    const user = await User.findOne({
        email: email.toLowerCase().trim(),
        emailVerificationToken: token,
        emailVerificationExpires: { $gt: new Date() },
    });
    if (!user) {
        throw new AppError(400, "Invalid or expired verification token");
    }
    await User.updateOne({ _id: user._id }, {
        $set: {
            emailVerified: true,
            emailVerificationToken: null,
            emailVerificationExpires: null,
        },
    });
    res.json({ success: true, message: "Email verified successfully" });
});
router.post("/resend-verification", authenticate, async (req, res) => {
    const user = await User.findOne({ id: req.user.userId });
    if (!user)
        throw new AppError(404, "User not found");
    if (user.emailVerified) {
        throw new AppError(400, "Email is already verified");
    }
    const verificationToken = crypto.randomBytes(32).toString("hex");
    await User.updateOne({ _id: user._id }, {
        $set: {
            emailVerificationToken: verificationToken,
            emailVerificationExpires: new Date(Date.now() + 24 * 60 * 60 * 1000),
        },
    });
    const verificationUrl = `${env.APP_URL}/verify-email?token=${verificationToken}&email=${encodeURIComponent(user.email)}`;
    sendVerificationEmail(user.email, user.name, verificationUrl).catch((err) => {
        console.error("[mail] verification email failed:", err?.message || err);
    });
    res.json({ success: true, message: "Verification email sent" });
});
router.post("/logout", authenticate, async (req, res) => {
    const userId = req.user.userId;
    const orgId = req.user.orgId;
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
        await recordAuditLog({
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
router.post("/forgot-password", async (req, res) => {
    const email = requireString(req.body.email || "", "email", { min: 1, max: 254 }).toLowerCase();
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
router.post("/reset-password", async (req, res) => {
    const { token, email, password } = req.body;
    if (!token || !email || !password) {
        throw new AppError(400, "Token, email, and new password are required");
    }
    validatePasswordStrength(password);
    const user = await User.findOne({ email, resetToken: token, resetTokenExpires: { $gt: new Date() } });
    if (!user) {
        throw new AppError(400, "Invalid or expired reset token");
    }
    const hashedPassword = await hash(password, 12);
    await User.updateOne({ _id: user._id }, { $set: { password: hashedPassword, resetToken: null, resetTokenExpires: null } });
    res.json({ success: true, message: "Password has been reset successfully." });
});
router.get("/me", authenticate, async (req, res) => {
    const user = await User.findOne({ id: req.user.userId })
        .select("id userNumber name email image role permissions status isActive emailVerified twoFactorEnabled createdAt orgId")
        .lean();
    if (!user)
        throw new AppError(404, "User not found");
    const orgId = user.orgId || req.user.orgId;
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
// Send welcome email endpoint (for frontend to call)
router.post("/send-welcome-email", async (req, res) => {
    try {
        const { email, name } = req.body;
        if (!email || !name) {
            return res.status(400).json({ success: false, message: "Email and name are required" });
        }
        await sendWelcomeEmail(email, name);
        res.json({ success: true, message: "Welcome email sent" });
    }
    catch (err) {
        console.error("[auth] send-welcome-email error:", err);
        res.status(500).json({ success: false, message: "Failed to send welcome email" });
    }
});
// Send organization invite email endpoint
router.post("/send-organization-invite-email", async (req, res) => {
    try {
        const { email, name, orgName, inviteUrl } = req.body;
        if (!email || !name || !orgName || !inviteUrl) {
            return res.status(400).json({ success: false, message: "Missing required fields" });
        }
        await sendOrganizationInviteEmail(email, name, orgName, inviteUrl);
        res.json({ success: true, message: "Organization invite email sent" });
    }
    catch (err) {
        console.error("[auth] send-organization-invite-email error:", err);
        res.status(500).json({ success: false, message: "Failed to send organization invite email" });
    }
});
// Send verification email endpoint
router.post("/send-verification-email", async (req, res) => {
    try {
        const { email, name, verificationUrl } = req.body;
        if (!email || !name || !verificationUrl) {
            return res.status(400).json({ success: false, message: "Missing required fields" });
        }
        await sendVerificationEmail(email, name, verificationUrl);
        res.json({ success: true, message: "Verification email sent" });
    }
    catch (err) {
        console.error("[auth] send-verification-email error:", err);
        res.status(500).json({ success: false, message: "Failed to send verification email" });
    }
});
// Send client welcome email endpoint
router.post("/send-client-welcome-email", async (req, res) => {
    try {
        const { email, clientName, username, tempPassword, loginUrl } = req.body;
        if (!email || !clientName || !username || !tempPassword || !loginUrl) {
            return res.status(400).json({ success: false, message: "Missing required fields" });
        }
        await sendClientWelcomeEmail(email, clientName, username, tempPassword, loginUrl);
        res.json({ success: true, message: "Client welcome email sent" });
    }
    catch (err) {
        console.error("[auth] send-client-welcome-email error:", err);
        res.status(500).json({ success: false, message: "Failed to send client welcome email" });
    }
});
router.post("/send-employee-onboarded-email", async (req, res) => {
    try {
        const { email, firstName, userEmail, workspaceName, loginUrl, tempPassword } = req.body;
        if (!email || !firstName || !userEmail || !workspaceName || !loginUrl || !tempPassword) {
            return res.status(400).json({ success: false, message: "Missing required fields" });
        }
        await sendEmployeeOnboarded(email, firstName, userEmail, workspaceName, loginUrl, tempPassword);
        res.json({ success: true, message: "Employee onboarded email sent" });
    }
    catch (err) {
        console.error("[auth] send-employee-onboarded-email error:", err);
        res.status(500).json({ success: false, message: "Failed to send employee onboarded email" });
    }
});
// Send password reset email endpoint
router.post("/send-password-reset-email", async (req, res) => {
    try {
        const { email, name, resetLink } = req.body;
        if (!email || !name || !resetLink) {
            return res.status(400).json({ success: false, message: "Missing required fields" });
        }
        await sendPasswordResetEmail(email, name, resetLink);
        res.json({ success: true, message: "Password reset email sent" });
    }
    catch (err) {
        console.error("[auth] send-password-reset-email error:", err);
        res.status(500).json({ success: false, message: "Failed to send password reset email" });
    }
});
router.post("/test-mail", async (req, res) => {
    try {
        const { email } = req.body;
        if (!email)
            return res.status(400).json({ success: false, message: "Email is required" });
        const { sendWelcomeEmail } = await import("../lib/mail/index.js");
        await sendWelcomeEmail(email, "Test User");
        res.json({ success: true, message: "Test email sent" });
    }
    catch (err) {
        console.error("[auth] test-mail error:", err);
        res.status(500).json({ success: false, message: err?.message || "Failed to send test email" });
    }
});
export default router;
