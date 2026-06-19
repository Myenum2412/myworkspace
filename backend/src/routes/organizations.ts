import { Router, Response } from "express";
import { Organization } from "../lib/db/models/Organization.js";
import { OrgMember } from "../lib/db/models/OrgMember.js";
import { AuthRequest, authenticate } from "../middleware/auth.js";
import { AppError } from "../middleware/error.js";

const router = Router();

router.use(authenticate);

router.get("/", async (req: AuthRequest, res: Response) => {
  const memberships = await OrgMember.find({ userId: req.user!.userId }).lean();
  const orgIds = memberships.map(m => m.orgId);
  const orgs = await Organization.find({ _id: { $in: orgIds } }).sort({ createdAt: -1 }).lean();
  res.json({ success: true, data: orgs });
});

router.get("/:id", async (req: AuthRequest, res: Response) => {
  const org = await Organization.findById(req.params.id).lean();
  if (!org) throw new AppError(404, "Organization not found");
  res.json({ success: true, data: org });
});

router.post("/", async (req: AuthRequest, res: Response) => {
  const { name, slug, domain, plan } = req.body;
  if (!name || !slug) throw new AppError(400, "Name and slug are required");

  const org = await Organization.create({
    name,
    slug,
    domain,
    plan: plan || "starter",
  });

  await OrgMember.create({
    orgId: org._id,
    userId: req.user!.userId,
    role: "admin",
  });

  res.status(201).json({ success: true, data: { orgId: org._id } });
});

router.get("/:id/members", async (req: AuthRequest, res: Response) => {
  const membership = await OrgMember.findOne({ orgId: req.params.id, userId: req.user!.userId }).lean();
  if (!membership) throw new AppError(403, "Not a member of this organization");
  const members = await OrgMember.find({ orgId: req.params.id }).populate("userId", "name email image status").lean();
  res.json({ success: true, data: members });
});

export default router;
