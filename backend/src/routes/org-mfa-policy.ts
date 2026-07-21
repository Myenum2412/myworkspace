import { Router, Response } from "express";
import { authenticate } from "../middleware/auth.js";
import { orgAdminOnly } from "../middleware/authorize.js";
import { AuthRequest } from "../types/index.js";
import { AppError } from "../middleware/error.js";
import { OrgMfaPolicy } from "../lib/db/models/OrgMfaPolicy.js";
import { recordAuditLog } from "../services/audit.service.js";

const router = Router();

router.use(authenticate);
router.use(orgAdminOnly());

router.get("/", async (req: AuthRequest, res: Response) => {
  const orgId = req.user!.orgId || req.user!.userId;
  const policy = await OrgMfaPolicy.findOne({ orgId }).lean();

  if (!policy) {
    res.json({
      success: true,
      data: {
        enforcement: "optional",
        privilegedRoles: ["org_admin", "members", "manager", "hr", "finance"],
        gracePeriodDays: 14,
        gracePeriodEndsAt: null,
        allowExemption: false,
        exemptUserIds: [],
        requireTrustedDevice: false,
        trustDeviceDays: 30,
        requireStepUpHours: 1,
      },
    });
    return;
  }

  res.json({ success: true, data: policy });
});

router.put("/", async (req: AuthRequest, res: Response) => {
  const orgId = req.user!.orgId || req.user!.userId;
  const { enforcement, privilegedRoles, gracePeriodDays, allowExemption, exemptUserIds, requireTrustedDevice, trustDeviceDays, requireStepUpHours } = req.body;

  const updateData: Record<string, any> = { updatedBy: req.user!.userId };
  if (enforcement) updateData.enforcement = enforcement;
  if (privilegedRoles) updateData.privilegedRoles = privilegedRoles;
  if (gracePeriodDays !== undefined) {
    updateData.gracePeriodDays = gracePeriodDays;
    updateData.gracePeriodEndsAt = new Date(Date.now() + gracePeriodDays * 24 * 60 * 60 * 1000);
  }
  if (allowExemption !== undefined) updateData.allowExemption = allowExemption;
  if (exemptUserIds) updateData.exemptUserIds = exemptUserIds;
  if (requireTrustedDevice !== undefined) updateData.requireTrustedDevice = requireTrustedDevice;
  if (trustDeviceDays !== undefined) updateData.trustDeviceDays = trustDeviceDays;
  if (requireStepUpHours !== undefined) updateData.requireStepUpHours = requireStepUpHours;

  const policy = await OrgMfaPolicy.findOneAndUpdate(
    { orgId },
    { $set: updateData },
    { upsert: true, new: true },
  ).lean();

  await recordAuditLog({
    orgId,
    userId: req.user!.userId,
    createdBy: req.user!.userId,
    action: "org.mfa_policy.updated",
    entityType: "org_mfa_policy",
    entityId: orgId,
    description: `MFA policy updated for organization`,
    ipAddress: req.ip,
    userAgent: req.headers["user-agent"] as string,
    success: true,
    metadata: updateData,
    tags: ["mfa", "org-policy"],
  });

  res.json({ success: true, data: policy });
});

router.delete("/exempt/:userId", async (req: AuthRequest, res: Response) => {
  const orgId = req.user!.orgId || req.user!.userId;
  const targetUserId = req.params.userId;

  const policy = await OrgMfaPolicy.findOne({ orgId });
  if (!policy) throw new AppError(404, "No MFA policy configured");

  policy.exemptUserIds = policy.exemptUserIds.filter((id) => id !== targetUserId && id !== `user:${targetUserId}`);
  policy.updatedBy = req.user!.userId;
  await policy.save();

  await recordAuditLog({
    orgId,
    userId: req.user!.userId,
    createdBy: req.user!.userId,
    action: "org.mfa_exemption.removed",
    entityType: "user",
    entityId: targetUserId,
    description: `MFA exemption removed for user ${targetUserId}`,
    ipAddress: req.ip,
    userAgent: req.headers["user-agent"] as string,
    success: true,
    tags: ["mfa", "exemption"],
  });

  res.json({ success: true });
});

router.post("/exempt/:userId", async (req: AuthRequest, res: Response) => {
  const orgId = req.user!.orgId || req.user!.userId;
  const targetUserId = req.params.userId;

  const policy = await OrgMfaPolicy.findOne({ orgId });
  if (!policy) throw new AppError(404, "No MFA policy configured");
  if (!policy.allowExemption) throw new AppError(400, "Exemptions are not allowed by current policy");

  const exemptKey = `user:${targetUserId}`;
  if (!policy.exemptUserIds.includes(exemptKey)) {
    policy.exemptUserIds.push(exemptKey);
  }
  policy.updatedBy = req.user!.userId;
  await policy.save();

  await recordAuditLog({
    orgId,
    userId: req.user!.userId,
    createdBy: req.user!.userId,
    action: "org.mfa_exemption.granted",
    entityType: "user",
    entityId: targetUserId,
    description: `MFA exemption granted for user ${targetUserId}`,
    ipAddress: req.ip,
    userAgent: req.headers["user-agent"] as string,
    success: true,
    tags: ["mfa", "exemption"],
  });

  res.json({ success: true });
});

export default router;
