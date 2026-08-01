import { Router, Response } from "express";
import { AuthRequest, authenticate } from "../middleware/auth.js";
import { AppError } from "../middleware/error.js";
import { isAdminRole } from "../lib/rbac/index.js";
import { requireString } from "../lib/validate.js";
import {
  createStaffAccount,
  listStaffAccounts,
  getStaffAccount,
  setStaffAccountStatus,
  terminateStaffAccount,
} from "../services/account.service.js";

const router = Router();

router.use(authenticate);

/**
 * Every endpoint derives orgId exclusively from the authenticated session.
 * A body/query orgId that does not match the session is a tenant-escape
 * attempt and is rejected with 403.
 */
function assertNoOrgOverride(req: AuthRequest): void {
  const requestOrg = (req.body?.orgId as unknown) ?? (req.query?.orgId as unknown);
  if (requestOrg === undefined || requestOrg === null || requestOrg === "") return;
  if (String(requestOrg) !== String(req.user!.orgId)) {
    throw new AppError(403, "Access denied: organization mismatch");
  }
}

function actor(req: AuthRequest) {
  return {
    userId: req.user!.userId,
    orgId: req.user!.orgId!,
    email: req.user!.email!,
    role: req.user!.role!,
  };
}

// ── Create a staff account (Workspace Member only, own org) ──
router.post("/staffs", async (req: AuthRequest, res: Response) => {
  if (!req.user!.orgId) throw new AppError(403, "You are not part of an organization");
  if (!isAdminRole(req.user!.role)) throw new AppError(403, "Only workspace members can create staff accounts");

  assertNoOrgOverride(req);

  const result = await createStaffAccount(actor(req), req.body || {});

  res.status(201).json({
    success: true,
    data: {
      user: result.user,
      tempPassword: result.tempPassword,
      credentialsDeliveredByEmail: result.emailStatus === "sent",
      emailStatus: result.emailStatus,
      emailError: result.emailError,
    },
  });
});

// ── List staff accounts (own org only) ──
router.get("/staffs", async (req: AuthRequest, res: Response) => {
  if (!req.user!.orgId) throw new AppError(403, "You are not part of an organization");
  assertNoOrgOverride(req);

  const staff = await listStaffAccounts(actor(req));
  res.json({ success: true, data: staff, total: staff.length });
});

// ── Get a single staff account (own org only) ──
router.get("/staffs/:userId", async (req: AuthRequest, res: Response) => {
  if (!req.user!.orgId) throw new AppError(403, "You are not part of an organization");
  const userId = requireString(req.params.userId, "userId", { min: 1, max: 128 });
  const staff = await getStaffAccount(actor(req), userId);
  res.json({ success: true, data: staff });
});

// ── Deactivate a staff account (revokes all access) ──
router.post("/staffs/:userId/deactivate", async (req: AuthRequest, res: Response) => {
  if (!req.user!.orgId) throw new AppError(403, "You are not part of an organization");
  if (!isAdminRole(req.user!.role)) throw new AppError(403, "Only workspace members can deactivate accounts");
  assertNoOrgOverride(req);

  const userId = requireString(req.params.userId, "userId", { min: 1, max: 128 });
  const result = await setStaffAccountStatus(actor(req), userId, false);
  res.json({ success: true, data: result });
});

// ── Reactivate a staff account ──
router.post("/staffs/:userId/reactivate", async (req: AuthRequest, res: Response) => {
  if (!req.user!.orgId) throw new AppError(403, "You are not part of an organization");
  if (!isAdminRole(req.user!.role)) throw new AppError(403, "Only workspace members can reactivate accounts");
  assertNoOrgOverride(req);

  const userId = requireString(req.params.userId, "userId", { min: 1, max: 128 });
  const result = await setStaffAccountStatus(actor(req), userId, true);
  res.json({ success: true, data: result });
});

// ── Terminate (permanently remove) a staff account ──
router.delete("/staffs/:userId", async (req: AuthRequest, res: Response) => {
  if (!req.user!.orgId) throw new AppError(403, "You are not part of an organization");
  if (!isAdminRole(req.user!.role)) throw new AppError(403, "Only workspace members can terminate accounts");
  assertNoOrgOverride(req);

  const userId = requireString(req.params.userId, "userId", { min: 1, max: 128 });
  await terminateStaffAccount(actor(req), userId);
  res.json({ success: true, message: "Account terminated and all sessions revoked" });
});

export default router;
