import { Router, Response } from "express";
import { hash, compare } from "bcryptjs";
import { User } from "../lib/db/models/User.js";
import { Organization } from "../lib/db/models/Organization.js";
import { OrgMember } from "../lib/db/models/OrgMember.js";
import { ActivityLog } from "../lib/db/models/ActivityLog.js";
import { signToken } from "../config/auth.js";
import { AuthRequest, authenticate } from "../middleware/auth.js";
import { AppError } from "../middleware/error.js";
import { mongoose } from "../lib/db/index.js";

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
  return member ? member.orgId.toString() : null;
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

  // Resolve org context
  const orgId = await getUserPrimaryOrgId(user._id.toString());

  await ActivityLog.create({
    orgId: orgId || user._id, // fallback to userId if no org
    userId: user._id,
    action: "user.login",
    entityType: "user",
    entityId: user._id.toString(),
    description: `${user.name} logged in`,
  });

  const token = signToken({
    userId: user._id.toString(),
    email: user.email,
    role: user.role,
    permissions: user.permissions || [],
    orgId: orgId || undefined,
  });

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
        permissions: user.permissions || [],
        status: "online",
      },
      orgId: orgId || undefined,
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

  // Use transaction to ensure atomicity
  const session = await mongoose.startSession();
  let user: any;
  let org: any;

  try {
    await session.withTransaction(async () => {
      // Create user
      const [createdUser] = await User.create([{
        name,
        email,
        password: hashedPassword,
        status: "online",
        role: "admin",
      }], { session });
      user = createdUser;

      // Create organization
      const [createdOrg] = await Organization.create([{
        name: orgName,
        slug,
        plan: "starter",
        ownerId: user._id,
      }], { session });
      org = createdOrg;

      // Create org membership
      await OrgMember.create([{
        orgId: org._id,
        userId: user._id,
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
    userId: user._id.toString(),
    email,
    role: "admin",
    permissions: [],
    orgId: org._id.toString(),
  });

  res.status(201).json({
    success: true,
    data: {
      token,
      user: { id: user._id, name, email, role: "admin", status: "online" },
      orgId: org._id,
    },
  });
});

router.post("/logout", authenticate, async (req: AuthRequest, res: Response) => {
  if (req.user) {
    await User.findByIdAndUpdate(req.user.userId, { status: "offline" });
  }
  res.json({ success: true });
});

router.post("/forgot-password", async (req: AuthRequest, res: Response) => {
  const { email } = req.body;
  if (!email) throw new AppError(400, "Email is required");

  const user = await User.findOne({ email });
  if (user) {
    // In production, send a reset email here
  }
  res.json({
    success: true,
    message: "If an account exists, a reset link has been sent",
  });
});

router.get("/me", authenticate, async (req: AuthRequest, res: Response) => {
  const user = await User.findById(req.user!.userId);
  if (!user) throw new AppError(404, "User not found");

  // Resolve org context (use token orgId or look up fresh)
  let orgId = req.user!.orgId;
  if (!orgId) {
    orgId = await getUserPrimaryOrgId(user._id.toString()) || undefined;
  }

  res.json({
    success: true,
    data: {
      id: user._id,
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
