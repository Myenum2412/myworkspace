import mongoose from "mongoose";
import { Router, Response } from "express";
import { Organization } from "../lib/db/models/Organization.js";
import { OrgMember } from "../lib/db/models/OrgMember.js";
import { User } from "../lib/db/models/User.js";
import { StorageQuota, getPlanLimits } from "../lib/db/models/StorageQuota.js";
import { AuthRequest, authenticate } from "../middleware/auth.js";
import { AppError } from "../middleware/error.js";
import { signToken } from "../config/auth.js";
import { requireOrgMembership } from "../lib/org-utils.js";
import { env } from "../config/env.js";
import { sendOrganizationInviteEmail } from "../lib/mail/index.js";
import { ROLES, isAdminRole } from "../lib/rbac/index.js";
import { processEvent } from "../services/notification-engine.service.js";

const router = Router();

router.use(authenticate);

// GET /api/organizations -- list all orgs for current user
router.get("/", async (req: AuthRequest, res: Response) => {
  const memberships = await OrgMember.find({ userId: req.user!.userId }).select("orgId role").lean();
  const orgIds = memberships.map(m => m.orgId);
  const orgs = await Organization.find({ _id: { $in: orgIds } }).sort({ createdAt: -1 }).select("id name slug domain plan businessType industry ownerId logo createdAt updatedAt").lean();

  // Attach membership role to each org
  const membershipMap = new Map(memberships.map(m => [m.orgId.toString(), m.role]));
  const result = orgs.map(org => ({
    ...org,
    userRole: membershipMap.get(org._id.toString()) || "staffs",
  }));

  res.json({ success: true, data: result });
});

// POST /api/organizations/switch -- switch active org context (returns new token)
router.post("/switch", async (req: AuthRequest, res: Response) => {
  const orgId = (req.body.orgId as string) || "";
  if (!orgId) throw new AppError(400, "orgId is required");

  // Verify membership
  await requireOrgMembership(req.user!.userId, orgId);

  let org = await Organization.findOne({ id: orgId }).select("name slug").lean();
  if (!org && orgId.match(/^[0-9a-fA-F]{24}$/)) {
    org = await Organization.findById(orgId).select("name slug").lean();
  }
  if (!org) throw new AppError(404, "Organization not found");

  // Issue new token with updated orgId
  const userRecord = await User.findOne({ id: req.user!.userId }).select("tokenVersion").lean();
  const token = signToken({
    userId: req.user!.userId,
    email: req.user!.email,
    role: req.user!.role,
    permissions: req.user!.permissions || [],
    orgId,
    tokenVersion: userRecord?.tokenVersion ?? 0,
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

// POST /api/organizations/invite -- invite members by email
router.post("/invite", async (req: AuthRequest, res: Response) => {
  const { emails, orgId } = req.body;
  if (!emails || !Array.isArray(emails) || emails.length === 0) {
    throw new AppError(400, "At least one email is required");
  }

  const targetOrgId = orgId || req.user!.orgId;
  if (!targetOrgId) throw new AppError(400, "orgId is required");

  // Verify sender is an admin of the target org
  const membership = await OrgMember.findOne({ orgId: targetOrgId, userId: req.user!.userId }).select("role").lean();
  if (!membership || !isAdminRole(membership.role)) {
    throw new AppError(403, "Only organization admins can invite members");
  }

  let org = await Organization.findOne({ id: targetOrgId }).select("name").lean();
  if (!org && targetOrgId.match(/^[0-9a-fA-F]{24}$/)) {
    org = await Organization.findById(targetOrgId).select("name").lean();
  }
  const orgName = org?.name || "Organization";

  const normalizedEmails = emails
    .filter((e: string) => e && e.includes("@"))
    .map((e: string) => e.toLowerCase().trim());

  if (normalizedEmails.length === 0) {
    throw new AppError(400, "No valid email addresses provided");
  }

  const existingUsers = await User.find({ email: { $in: normalizedEmails } })
    .select("_id name email")
    .lean();
  const userByEmail = new Map(existingUsers.map(u => [u.email, u]));

  const existingMemberships = await OrgMember.find({
    orgId: targetOrgId,
    userId: { $in: existingUsers.map(u => u._id.toString()) },
  })
    .select("userId")
    .lean();
  const existingMemberIds = new Set(existingMemberships.map(m => m.userId.toString()));

  const toCreate: { orgId: string; userId: string; role: string }[] = [];
  const results: { email: string; status: "invited" | "already_member" | "not_found"; userId?: string }[] = [];

  for (const email of normalizedEmails) {
    const user = userByEmail.get(email);
    if (!user) {
      results.push({ email, status: "not_found" });
      continue;
    }

    const userId = user._id.toString();
    if (existingMemberIds.has(userId)) {
      results.push({ email, status: "already_member" });
      continue;
    }

    toCreate.push({ orgId: targetOrgId, userId, role: "staffs" });
    results.push({ email, status: "invited", userId });
  }

  if (toCreate.length > 0) {
    await OrgMember.insertMany(toCreate);
    await Promise.all(
      toCreate.map(m => {
        const user = userByEmail.get(m.userId);
        return sendOrganizationInviteEmail(
          user?.email || m.userId,
          user?.name || m.userId,
          orgName,
          `${env.APP_URL}/orgmenu`
        );
      })
    );
  }

  processEvent({ type: "user_invited", category: "auth", userId: req.user!.userId, orgId: targetOrgId, createdBy: req.user!.userId, title: "User invited" }).catch(() => {});
  console.log(`[INVITE] ${req.user!.email} invited ${normalizedEmails.length} users to org ${targetOrgId}:`, results);
  res.status(201).json({ success: true, data: { results } });
});

// GET /api/organizations/:id -- get single org (with tenant isolation)
router.get("/:id", async (req: AuthRequest, res: Response) => {
  const org = await resolveOrg(req.params.id).select("id name slug domain plan businessType industry ownerId logo gstNumber panNumber cinNumber companyEmail mobileNumber alternateMobileNumber website addressLine1 addressLine2 city state pincode country authorizedPersonName designation authorizedPersonEmail authorizedPersonMobile numberOfEmployees companyDescription createdAt updatedAt").lean();
  if (!org) throw new AppError(404, "Organization not found");

  // Tenant isolation: verify membership
  await requireOrgMembership(req.user!.userId, req.params.id as string);

  res.json({ success: true, data: org });
});

// POST /api/organizations -- create new org
router.post("/", async (req: AuthRequest, res: Response) => {
  const { name, slug, domain, plan } = req.body;
  if (!name || !slug) throw new AppError(400, "Name and slug are required");

  // Ensure slug uniqueness
  const existing = await Organization.findOne({ slug }).select("_id").lean();
  if (existing) throw new AppError(409, "An organization with this slug already exists");

  const orgPlan = plan || "free";
  const org = await Organization.create({
    name,
    slug,
    domain,
    plan: orgPlan,
    ownerId: req.user!.userId,
  });

  await OrgMember.create({
    orgId: org._id,
    userId: req.user!.userId,
    role: "members",
  });

  const limits = getPlanLimits(orgPlan);
  await StorageQuota.updateOne(
    { orgId: org._id.toString() },
    {
      $setOnInsert: {
        maxStorageBytes: limits.maxStorageBytes,
        maxFileSizeBytes: limits.maxFileSizeBytes,
        userStorageLimitBytes: limits.userStorageLimitBytes,
        usedStorageBytes: 0,
        versioningEnabled: true,
        retentionDays: 30,
        allowedMimeTypes: [],
      },
    },
    { upsert: true }
  );

  processEvent({ type: "organization_created", category: "auth", userId: req.user!.userId, orgId: org._id.toString(), createdBy: req.user!.userId, title: "Organization created" }).catch(() => {});
  res.status(201).json({ success: true, data: { orgId: org._id } });
});

function resolveOrg(orgId: string) {
  const filter: Record<string, unknown>[] = [{ id: orgId }];
  if (mongoose.Types.ObjectId.isValid(orgId)) {
    filter.push({ _id: new mongoose.Types.ObjectId(orgId) });
  }
  return Organization.findOne({ $or: filter }).select("_id id name slug domain plan businessType industry ownerId logo gstNumber panNumber cinNumber companyEmail mobileNumber alternateMobileNumber website addressLine1 addressLine2 city state pincode country authorizedPersonName designation authorizedPersonEmail authorizedPersonMobile numberOfEmployees companyDescription createdAt updatedAt");
}

// PUT /api/organizations/:id -- update org (admin only)
router.put("/:id", async (req: AuthRequest, res: Response) => {
  const org = await resolveOrg(req.params.id);
  if (!org) throw new AppError(404, "Organization not found");

  // Only org admin or owner can update
  // Query both string and ObjectId userId — some orgmembers entries store userId as ObjectId
  const adminFilter: Record<string, any>[] = [{ orgId: org._id, userId: req.user!.userId }];
  if (mongoose.Types.ObjectId.isValid(req.user!.userId)) {
    adminFilter.push({ orgId: org._id, userId: new mongoose.Types.ObjectId(req.user!.userId) });
  }
  const membership = await OrgMember.findOne({ $or: adminFilter }).select("role").lean();
  if (!membership || !isAdminRole(membership.role)) {
    throw new AppError(403, "Only organization admins can update organization details");
  }

  const { name, slug, domain, plan } = req.body;
  if (name) org.name = name;
  if (slug) {
    const slugExists = await Organization.findOne({ slug, _id: { $ne: org._id } }).select("_id").lean();
    if (slugExists) throw new AppError(409, "Slug already in use");
    org.slug = slug;
  }
  if (domain !== undefined) org.domain = domain;
  if (plan && plan !== org.plan) {
    org.plan = plan;
    const limits = getPlanLimits(plan);
    await StorageQuota.updateOne(
      { orgId: org._id.toString() },
      { $set: { maxStorageBytes: limits.maxStorageBytes, maxFileSizeBytes: limits.maxFileSizeBytes, userStorageLimitBytes: limits.userStorageLimitBytes } },
      { upsert: true }
    );
  } else if (plan) {
    org.plan = plan;
  }

  await org.save();
  processEvent({ type: "permission_updated", category: "permissions", userId: req.user!.userId, orgId: org._id.toString(), createdBy: req.user!.userId, title: "Organization updated" }).catch(() => {});
  res.json({ success: true, data: org });
});

// DELETE /api/organizations/:id -- delete org (owner only)
router.delete("/:id", async (req: AuthRequest, res: Response) => {
  const org = await resolveOrg(req.params.id);
  if (!org) throw new AppError(404, "Organization not found");

  // Only owner can delete
  if (!org.ownerId || org.ownerId.toString() !== req.user!.userId) {
    throw new AppError(403, "Only the organization owner can delete the organization");
  }

  processEvent({ type: "account_deleted", category: "auth", userId: req.user!.userId, orgId: org._id.toString(), createdBy: req.user!.userId, title: "Organization deleted" }).catch(() => {});
  // Clean up related data
  await OrgMember.deleteMany({ orgId: org._id });
  await org.deleteOne();

  res.json({ success: true, message: "Organization deleted successfully" });
});

// GET /api/organizations/:id/members -- list members
router.get("/:id/members", async (req: AuthRequest, res: Response) => {
  const orgId = req.params.id as string;
  await requireOrgMembership(req.user!.userId, orgId);
  const members = await OrgMember.find({ orgId }).limit(200).select("orgId userId role joinedAt").populate("userId", "name email image status").lean();
  res.json({ success: true, data: members });
});

export default router;
