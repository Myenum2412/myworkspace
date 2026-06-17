import { Router } from "express";
import { Organization } from "../lib/db/models/Organization.js";
import { OrgMember } from "../lib/db/models/OrgMember.js";
import { authenticate } from "../middleware/auth.js";
import { AppError } from "../middleware/error.js";
const router = Router();
router.use(authenticate);
router.get("/", async (req, res) => {
    const orgs = await Organization.find().sort({ createdAt: -1 }).lean();
    res.json({ success: true, data: orgs });
});
router.get("/:id", async (req, res) => {
    const org = await Organization.findById(req.params.id).lean();
    if (!org)
        throw new AppError(404, "Organization not found");
    res.json({ success: true, data: org });
});
router.post("/", async (req, res) => {
    const { name, slug, domain, plan } = req.body;
    if (!name || !slug)
        throw new AppError(400, "Name and slug are required");
    const org = await Organization.create({
        name,
        slug,
        domain,
        plan: plan || "starter",
    });
    await OrgMember.create({
        orgId: org._id,
        userId: req.user.userId,
        role: "admin",
    });
    res.status(201).json({ success: true, data: { orgId: org._id } });
});
router.get("/:id/members", async (req, res) => {
    const members = await OrgMember.find({ orgId: req.params.id }).populate("userId", "name email image status").lean();
    res.json({ success: true, data: members });
});
export default router;
