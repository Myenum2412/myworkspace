import { Router } from "express";
import { Organization } from "../lib/db/models/Organization.js";
import { OrgMember } from "../lib/db/models/OrgMember.js";
import { authenticate } from "../middleware/auth.js";
import { AppError } from "../middleware/error.js";
import { signToken } from "../config/auth.js";
const router = Router();
router.use(authenticate);
// Helper: verify user is member of org
async function requireOrgMembership(userId, orgId) {
    const membership = await OrgMember.findOne({ orgId, userId }).lean();
    if (!membership)
        throw new AppError(403, "Not a member of this organization");
}
// GET /api/organizations -- list all orgs for current user
router.get("/", async (req, res) => {
    const memberships = await OrgMember.find({ userId: req.user.userId }).lean();
    const orgIds = memberships.map(m => m.orgId);
    const orgs = await Organization.find({ _id: { $in: orgIds } }).sort({ createdAt: -1 }).lean();
    // Attach membership role to each org
    const membershipMap = new Map(memberships.map(m => [m.orgId.toString(), m.role]));
    const result = orgs.map(org => ({
        ...org,
        userRole: membershipMap.get(org._id.toString()) || "member",
    }));
    res.json({ success: true, data: result });
});
// POST /api/organizations/switch -- switch active org context (returns new token)
router.post("/switch", async (req, res) => {
    const orgId = req.body.orgId || "";
    if (!orgId)
        throw new AppError(400, "orgId is required");
    // Verify membership
    await requireOrgMembership(req.user.userId, orgId);
    const org = await Organization.findById(orgId).lean();
    if (!org)
        throw new AppError(404, "Organization not found");
    // Issue new token with updated orgId
    const token = signToken({
        userId: req.user.userId,
        email: req.user.email,
        role: req.user.role,
        permissions: req.user.permissions || [],
        orgId,
    });
    res.json({
        success: true,
        data: {
            token,
            orgId,
            orgName: org.name,
            orgSlug: org.slug,
        },
    });
});
// GET /api/organizations/:id -- get single org (with tenant isolation)
router.get("/:id", async (req, res) => {
    const org = await Organization.findById(req.params.id).lean();
    if (!org)
        throw new AppError(404, "Organization not found");
    // Tenant isolation: verify membership
    await requireOrgMembership(req.user.userId, req.params.id);
    res.json({ success: true, data: org });
});
// POST /api/organizations -- create new org
router.post("/", async (req, res) => {
    const { name, slug, domain, plan } = req.body;
    if (!name || !slug)
        throw new AppError(400, "Name and slug are required");
    // Ensure slug uniqueness
    const existing = await Organization.findOne({ slug });
    if (existing)
        throw new AppError(409, "An organization with this slug already exists");
    const org = await Organization.create({
        name,
        slug,
        domain,
        plan: plan || "starter",
        ownerId: req.user.userId,
    });
    await OrgMember.create({
        orgId: org._id,
        userId: req.user.userId,
        role: "admin",
    });
    res.status(201).json({ success: true, data: { orgId: org._id } });
});
// PUT /api/organizations/:id -- update org (admin only)
router.put("/:id", async (req, res) => {
    const org = await Organization.findById(req.params.id);
    if (!org)
        throw new AppError(404, "Organization not found");
    // Only org admin or owner can update
    const membership = await OrgMember.findOne({ orgId: org._id, userId: req.user.userId }).lean();
    if (!membership || membership.role !== "admin") {
        throw new AppError(403, "Only organization admins can update organization details");
    }
    const { name, slug, domain, plan } = req.body;
    if (name)
        org.name = name;
    if (slug) {
        const existing = await Organization.findOne({ slug, _id: { $ne: org._id } });
        if (existing)
            throw new AppError(409, "Slug already in use");
        org.slug = slug;
    }
    if (domain !== undefined)
        org.domain = domain;
    if (plan)
        org.plan = plan;
    await org.save();
    res.json({ success: true, data: org });
});
// DELETE /api/organizations/:id -- delete org (owner only)
router.delete("/:id", async (req, res) => {
    const org = await Organization.findById(req.params.id);
    if (!org)
        throw new AppError(404, "Organization not found");
    // Only owner can delete
    if (!org.ownerId || org.ownerId.toString() !== req.user.userId) {
        throw new AppError(403, "Only the organization owner can delete the organization");
    }
    // Clean up related data
    await OrgMember.deleteMany({ orgId: org._id });
    await org.deleteOne();
    res.json({ success: true, message: "Organization deleted successfully" });
});
// GET /api/organizations/:id/members -- list members
router.get("/:id/members", async (req, res) => {
    const orgId = req.params.id;
    await requireOrgMembership(req.user.userId, orgId);
    const members = await OrgMember.find({ orgId }).populate("userId", "name email image status").lean();
    res.json({ success: true, data: members });
});
export default router;
