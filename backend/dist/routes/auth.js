import { Router } from "express";
import { hash, compare } from "bcryptjs";
import { User } from "../lib/db/models/User.js";
import { Organization } from "../lib/db/models/Organization.js";
import { OrgMember } from "../lib/db/models/OrgMember.js";
import { ActivityLog } from "../lib/db/models/ActivityLog.js";
import { signToken } from "../config/auth.js";
import { authenticate } from "../middleware/auth.js";
import { AppError } from "../middleware/error.js";
const router = Router();
router.post("/login", async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        throw new AppError(400, "Email and password are required");
    }
    const user = await User.findOne({ email });
    if (!user || !user.password) {
        throw new AppError(401, "Invalid email or password");
    }
    const valid = await compare(password, user.password);
    if (!valid) {
        throw new AppError(401, "Invalid email or password");
    }
    user.status = "online";
    await user.save();
    await ActivityLog.create({
        orgId: (await OrgMember.findOne({ userId: user._id }))?.orgId,
        userId: user._id,
        action: "user.login",
        entityType: "user",
        entityId: user._id.toString(),
        description: `${user.name} logged in`,
    });
    const token = signToken({ userId: user._id.toString(), email: user.email, role: user.role });
    res.json({
        success: true,
        data: {
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                image: user.image,
                role: user.role,
                status: "online",
            },
        },
    });
});
router.post("/signup", async (req, res) => {
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
    const user = await User.create({
        name,
        email,
        password: hashedPassword,
        status: "online",
        role: "admin",
    });
    const org = await Organization.create({
        name: company || `${name}'s Organization`,
        slug: company?.toLowerCase().replace(/\s+/g, "-") || `org-${user._id.toString().slice(0, 8)}`,
        plan: "starter",
    });
    await OrgMember.create({
        orgId: org._id,
        userId: user._id,
        role: "admin",
    });
    const token = signToken({ userId: user._id.toString(), email, role: "admin" });
    res.status(201).json({
        success: true,
        data: {
            token,
            user: { id: user._id, name, email, role: "admin", status: "online" },
            orgId: org._id,
        },
    });
});
router.post("/logout", authenticate, async (req, res) => {
    if (req.user) {
        await User.findByIdAndUpdate(req.user.userId, { status: "offline" });
    }
    res.json({ success: true });
});
router.post("/forgot-password", async (req, res) => {
    const { email } = req.body;
    if (!email)
        throw new AppError(400, "Email is required");
    const user = await User.findOne({ email });
    if (user) {
        // In production, send a reset email here
    }
    res.json({
        success: true,
        message: "If an account exists, a reset link has been sent",
    });
});
router.get("/me", authenticate, async (req, res) => {
    const user = await User.findById(req.user.userId);
    if (!user)
        throw new AppError(404, "User not found");
    res.json({
        success: true,
        data: {
            id: user._id,
            name: user.name,
            email: user.email,
            image: user.image,
            role: user.role,
            status: user.status,
            createdAt: user.createdAt,
        },
    });
});
export default router;
