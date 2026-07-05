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
import { cacheManager } from "../lib/cache.js";

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

const isObjectId = (id: string) => /^[0-9a-fA-F]{24}$/.test(id);

router.get("/me", authenticate, async (req: AuthRequest, res: Response) => {
  const user = await User.findOne({ id: req.user!.userId }).lean();
  if (!user) throw new AppError(404, "User not found");

  res.json({
    success: true,
    data: {
      id: user.id || user._id.toString(),
      name: user.name,
      email: user.email,
      image: user.image,
      role: user.role,
      status: user.status,
      createdAt: user.createdAt,
    },
  });
});

router.get("/profile", authenticate, async (req: AuthRequest, res: Response) => {
  const user = await User.findOne({ id: req.user!.userId }).lean();
  if (!user) throw new AppError(404, "User not found");

  const userId = user.id || (user as any)._id?.toString();
  const member = await OrgMember.findOne({ userId }).lean();
  let org = null;
  let memberCount = 0;
  if (member) {
    org = await Organization.findById(member.orgId).lean();
    memberCount = org ? await OrgMember.countDocuments({ orgId: member.orgId }) : 0;
  }

  res.json({
    success: true,
    data: { user: {
      id: user._id.toString(),
      name: user.name || "",
      email: user.email || "",
      phone: user.phone || "",
      department: user.department || "",
      company: user.company || "",
      address: user.address || "",
      city: user.city || "",
      state: user.state || "",
      country: user.country || "",
      zipCode: user.zipCode || "",
      status: user.status || "offline",
      role: user.role || "member",
      image: user.image || "",
      bannerUrl: user.bannerUrl || "",
      createdAt: user.createdAt || new Date().toISOString(),
    },
    org: org
      ? {
          id: org._id.toString(),
          name: org.name || "",
          slug: org.slug || "",
          domain: org.domain || "",
          businessType: org.businessType || "",
          industry: org.industry || "",
          gstNumber: org.gstNumber || "",
          panNumber: org.panNumber || "",
          cinNumber: org.cinNumber || "",
          companyEmail: org.companyEmail || "",
          mobileNumber: org.mobileNumber || "",
          alternateMobileNumber: org.alternateMobileNumber || "",
          website: org.website || "",
          addressLine1: org.addressLine1 || "",
          addressLine2: org.addressLine2 || "",
          city: org.city || "",
          state: org.state || "",
          pincode: org.pincode || "",
          country: org.country || "India",
          logoUrl: org.logo || "",
          authorizedPersonName: org.authorizedPersonName || "",
          designation: org.designation || "",
          authorizedPersonEmail: org.authorizedPersonEmail || "",
          authorizedPersonMobile: org.authorizedPersonMobile || "",
          numberOfEmployees: org.numberOfEmployees || 0,
          companyDescription: org.companyDescription || "",
          plan: org.plan || "free",
          createdAt: org.createdAt || new Date().toISOString(),
        }
      : null,
    memberCount,
  } });
});

router.patch("/profile", authenticate, async (req: AuthRequest, res: Response) => {
  const user = await User.findOne({ id: req.user!.userId });
  if (!user) throw new AppError(404, "User not found");

  const {
    name, email, phone, department, company,
    address, city, state, country, zipCode,
    companyName, companyDomain,
    businessType, industry, gstNumber, panNumber, cinNumber,
    companyEmail, mobileNumber, alternateMobileNumber, orgWebsite,
    addressLine1, addressLine2, orgCity, orgState, pincode, orgCountry,
    authorizedPersonName, designation, authorizedPersonEmail, authorizedPersonMobile,
    numberOfEmployees, companyDescription,
  } = req.body;

  // Update user fields
  const userUpdates: Record<string, unknown> = {};
  const userFieldMap: Record<string, unknown> = {
    name, email, phone, department, company,
    address, city, state, country, zipCode,
  };
  for (const [key, val] of Object.entries(userFieldMap)) {
    if (val !== undefined) userUpdates[key] = val;
  }
  if (Object.keys(userUpdates).length > 0) {
    userUpdates.updatedAt = new Date();
    await User.findByIdAndUpdate(user._id, { $set: userUpdates });
  }

  // Update org fields
  const member = await OrgMember.findOne({ userId: user.id }).populate("orgId").lean();
  const org = member?.orgId as any;
  if (org) {
    const orgUpdates: Record<string, unknown> = {};
    const orgFieldMap: Record<string, unknown> = {
      name: companyName,
      domain: companyDomain,
      businessType, industry, gstNumber, panNumber, cinNumber,
      companyEmail, mobileNumber, alternateMobileNumber,
      website: orgWebsite,
      addressLine1, addressLine2,
      city: orgCity, state: orgState, pincode,
      country: orgCountry,
      authorizedPersonName, designation, authorizedPersonEmail, authorizedPersonMobile,
      numberOfEmployees: numberOfEmployees !== undefined ? Number(numberOfEmployees) : undefined,
      companyDescription,
    };
    for (const [key, val] of Object.entries(orgFieldMap)) {
      if (val !== undefined) orgUpdates[key] = val;
    }
    if (Object.keys(orgUpdates).length > 0) {
      orgUpdates.updatedAt = new Date();
      await Organization.findByIdAndUpdate(org._id, { $set: orgUpdates });
    }
  }

  cacheManager.invalidatePattern(`user:${req.user!.userId}:profile`);

  res.json({ success: true, message: "Profile updated successfully" });
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
  res.json({ success: true, data: { status: user?.status || "offline" } });
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
      const previousStatus = activeSession.currentStatus;
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
        previousStatus,
        timestamp: new Date().toISOString(),
      });
    }
  }

  cacheManager.invalidatePattern(`user:${req.user!.userId}:profile`);

  res.json({ success: true });
});

router.get("/banner", authenticate, async (req: AuthRequest, res: Response) => {
  const user = await User.findOne({ id: req.user!.userId }).select("image").lean();
  res.json({ success: true, data: { bannerUrl: user?.image || null } });
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
    await User.findOneAndUpdate({ id: req.user!.userId }, { image: bannerUrl });
  }

  cacheManager.invalidatePattern(`user:${req.user!.userId}:profile`);

  res.json({ bannerUrl });
});

export default router;
