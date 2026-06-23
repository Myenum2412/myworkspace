import { Router, Response } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { User } from "../lib/db/models/User.js";
import { Session } from "../lib/db/models/Session.js";
import { OrgMember } from "../lib/db/models/OrgMember.js";
import { Organization } from "../lib/db/models/Organization.js";
import { AuthRequest, authenticate } from "../middleware/auth.js";
import { AppError } from "../middleware/error.js";
import { socketIOManager } from "../lib/socketio/index.js";

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

const isObjectId = (id: string) => /^[0-9a-fA-F]{24}$/.test(id);

router.get("/me", authenticate, async (req: AuthRequest, res: Response) => {
  const user = await User.findOne({ email: req.user!.email }).lean();
  if (!user) throw new AppError(404, "User not found");

  res.json({
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    image: user.image,
    role: user.role,
    status: user.status,
    createdAt: user.createdAt,
  });
});

router.get("/profile", authenticate, async (req: AuthRequest, res: Response) => {
  const user = await User.findOne({ email: req.user!.email }).lean();
  if (!user) throw new AppError(404, "User not found");

  const member = await OrgMember.findOne({ userId: user._id }).populate("orgId").lean();
  const org = member?.orgId as any;
  const memberCount = org ? await OrgMember.countDocuments({ orgId: org._id }) : 0;

  res.json({
    user: {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      image: user.image,
      status: user.status,
      role: user.role,
      createdAt: user.createdAt,
    },
    org: org
      ? {
          id: org._id.toString(),
          name: org.name,
          slug: org.slug,
          plan: org.plan,
          logo: org.logo,
        }
      : null,
    memberCount,
  });
});

router.get("/status", authenticate, async (req: AuthRequest, res: Response) => {
  const userId = (req.query.userId as string) || req.user?.userId;
  if (!userId) throw new AppError(400, "userId is required");

  let user;
  if (isObjectId(userId)) {
    user = await User.findById(userId).lean();
  } else {
    user = await User.findOne({ id: userId }).lean();
  }
  res.json({ status: user?.status || "offline" });
});

router.post("/status", authenticate, async (req: AuthRequest, res: Response) => {
  const { status, userId: bodyUserId } = req.body;
  if (!status) throw new AppError(400, "Status is required");
  if (!["online", "offline", "break"].includes(status)) throw new AppError(400, "Invalid status");

  const targetUserId = bodyUserId || req.user?.userId;
  if (!targetUserId) throw new AppError(400, "userId is required");

  if (isObjectId(targetUserId)) {
    await User.findByIdAndUpdate(targetUserId, { status });
  } else {
    await User.findOneAndUpdate({ id: targetUserId }, { status });
  }

  // Update active session if this is the current user
  if (!bodyUserId || bodyUserId === req.user?.userId) {
    const activeSession = await Session.findOne({
      userId: isObjectId(targetUserId) ? targetUserId : req.user?.userId,
      logoutTime: { $exists: false },
    }).sort({ loginTime: -1 });

    if (activeSession && activeSession.currentStatus !== status) {
      if (activeSession.currentStatus === "break" && status !== "break") {
        const breakStart = [...activeSession.statusTransitions].reverse().find(t => t.status === "break");
        if (breakStart) {
          activeSession.totalBreakDuration += Date.now() - breakStart.timestamp.getTime();
        }
      }
      activeSession.statusTransitions.push({ status, timestamp: new Date() });
      activeSession.currentStatus = status;
      await activeSession.save();

      socketIOManager.emitToUser(targetUserId, "session:status:updated", {
        sessionId: activeSession._id.toString(),
        status,
        previousStatus: activeSession.currentStatus,
        timestamp: new Date().toISOString(),
      });
    }
  }

  res.json({ success: true });
});

router.get("/banner", authenticate, async (req: AuthRequest, res: Response) => {
  const user = await User.findOne({ email: req.user!.email }).select("image").lean();
  res.json({ bannerUrl: user?.image || null });
});

router.post("/banner", authenticate, upload.single("banner"), async (req: AuthRequest, res: Response) => {
  let bannerUrl = req.body.url;

  if (req.file) {
    const bannersDir = path.resolve("public", "banners");
    if (!fs.existsSync(bannersDir)) {
      fs.mkdirSync(bannersDir, { recursive: true });
    }
    const ext = path.extname(req.file.originalname) || ".jpg";
    const filename = `${req.user!.userId}${ext}`;
    fs.writeFileSync(path.join(bannersDir, filename), req.file.buffer);
    bannerUrl = `/banners/${filename}`;
  }

  if (bannerUrl) {
    await User.findOneAndUpdate({ email: req.user!.email }, { image: bannerUrl });
  }

  res.json({ bannerUrl });
});

export default router;
