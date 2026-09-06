// @ts-nocheck
import type { FastifyInstance } from "fastify";
import { isAdminRole } from "../lib/rbac/index.js";
import { requireString } from "../lib/validate.js";
import { type AuthRequest, authenticate } from "../middleware/auth.js";
import { AppError } from "../middleware/error.js";
import {
  createStaffAccount,
  getStaffAccount,
  listStaffAccounts,
  setStaffAccountStatus,
  terminateStaffAccount,
} from "../services/account.service.js";

export default async function plugin(fastify: FastifyInstance) {
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
fastify.get("/staffs", async (req: AuthRequest, reply: any) => {
  if (!req.user!.orgId) throw new AppError(403, "You are not part of an organization");
  if (!isAdminRole(req.user!.role))
    throw new AppError(403, "Only workspace members can create staff accounts");

  assertNoOrgOverride(req);

  const result = await createStaffAccount(actor(req), req.body || {});

  reply.send(201).json({
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
fastify.get("/staffs", async (req: AuthRequest, reply: any) => {
  if (!req.user!.orgId) throw new AppError(403, "You are not part of an organization");
  assertNoOrgOverride(req);

  const staff = await listStaffAccounts(actor(req));
  reply.send({ success: true, data: staff, total: staff.length });
});

// ── Get a single staff account (own org only) ──
fastify.get("/staffs/:userId", async (req: AuthRequest, reply: any) => {
  if (!req.user!.orgId) throw new AppError(403, "You are not part of an organization");
  const userId = requireString(req.params.userId, "userId", { min: 1, max: 128 });
  const staff = await getStaffAccount(actor(req), userId);
  reply.send({ success: true, data: staff });
});

// ── Deactivate a staff account (revokes all access) ──
fastify.get("/staffs/:userId/deactivate", async (req: AuthRequest, reply: any) => {
  if (!req.user!.orgId) throw new AppError(403, "You are not part of an organization");
  if (!isAdminRole(req.user!.role))
    throw new AppError(403, "Only workspace members can deactivate accounts");
  assertNoOrgOverride(req);

  const userId = requireString(req.params.userId, "userId", { min: 1, max: 128 });
  const result = await setStaffAccountStatus(actor(req), userId, false);
  reply.send({ success: true, data: result });
});

// ── Reactivate a staff account ──
fastify.get("/staffs/:userId/reactivate", async (req: AuthRequest, reply: any) => {
  if (!req.user!.orgId) throw new AppError(403, "You are not part of an organization");
  if (!isAdminRole(req.user!.role))
    throw new AppError(403, "Only workspace members can reactivate accounts");
  assertNoOrgOverride(req);

  const userId = requireString(req.params.userId, "userId", { min: 1, max: 128 });
  const result = await setStaffAccountStatus(actor(req), userId, true);
  reply.send({ success: true, data: result });
});

// ── Terminate (permanently remove) a staff account ──
fastify.get("/staffs/:userId", async (req: AuthRequest, reply: any) => {
  if (!req.user!.orgId) throw new AppError(403, "You are not part of an organization");
  if (!isAdminRole(req.user!.role))
    throw new AppError(403, "Only workspace members can terminate accounts");
  assertNoOrgOverride(req);

  const userId = requireString(req.params.userId, "userId", { min: 1, max: 128 });
  await terminateStaffAccount(actor(req), userId);
  reply.send({ success: true, message: "Account terminated and all sessions revoked" });
});
}
