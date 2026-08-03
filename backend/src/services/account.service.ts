import { hash } from "bcryptjs";
import { v4 as uuid } from "uuid";
import { User } from "../lib/db/models/User.js";
import { ClientUser } from "../lib/db/models/ClientUser.js";
import { OrgMember } from "../lib/db/models/OrgMember.js";
import { RefreshToken } from "../lib/db/models/RefreshToken.js";
import { Session } from "../lib/db/models/Session.js";
import { getNextSequence } from "../lib/db/models/Counter.js";
import { AppError } from "../middleware/error.js";
import { recordAuditLog } from "./audit.service.js";
import { socketIOManager } from "../lib/socketio/index.js";
import { invalidateUserAuthCache } from "../middleware/auth.js";
import { requireEmail, optionalString } from "../lib/validate.js";
import { validatePasswordStrength } from "./validation.service.js";
import { Organization } from "../lib/db/models/Organization.js";
import { env } from "../config/env.js";
import { sendEmployeeOnboarded } from "../lib/mail/index.js";
import { logger } from "../lib/logger/index.js";

/**
 * Account Service
 *
 * Single source of truth for account lifecycle (create / list / get /
 * deactivate / reactivate) within a tenant.
 *
 * HARD RULES:
 *  - Accounts can only be created by an authenticated Workspace Member for
 *    their OWN organization. The orgId is ALWAYS derived from the authenticated
 *    session, never from the request body.
 *  - Every query is filtered by the actor's orgId. No cross-tenant reads or
 *    writes are possible, even with a guessed/forged id.
 *  - Deactivation / termination revokes ALL access: sessions, refresh tokens,
 *    JWTs (tokenVersion), device sessions and WebSocket connections.
 */

/**
 * Roles that a Workspace Member may create for staff.
 * NEVER creatable via this API: "clients" (separate flow), "org_admin",
 * "members" (company owner, signup-only) and system roles.
 */
const CREATABLE_ROLES = new Set([
  "staffs", "team_staff", "hr", "manager", "team_leader", "finance", "contractors", "guest",
]);
const PROTECTED_ROLES = new Set(["org_admin", "members", "clients", "api_token", "service_account", "automation_bot"]);

export interface AccountActor {
  userId: string;
  orgId: string;
  email: string;
  role: string;
}

export interface CreateStaffInput {
  name: string;
  email: string;
  password?: string;
  department?: string;
  role?: string;
  status?: string;
  phone?: string;
  designation?: string;
  joiningDate?: string;
  [key: string]: unknown;
}

function assertActor(actor: AccountActor): void {
  if (!actor?.userId) throw new AppError(401, "Authentication required");
  if (!actor?.orgId) throw new AppError(403, "You are not part of an organization");
}

/**
 * Reject any attempt to influence the orgId. The frontend must never send
 * orgId; if it is sent and mismatches, it is a tenant-escape attempt -> 403.
 */
function assertNoOrgIdOverride(actor: AccountActor, bodyOrgId: unknown): void {
  if (bodyOrgId === undefined || bodyOrgId === null || bodyOrgId === "") return;
  if (String(bodyOrgId) !== actor.orgId) {
    throw new AppError(403, "Access denied: organization mismatch");
  }
}

function generateTempPassword(length = 12): string {
  const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const lower = "abcdefghijkmnopqrstuvwxyz";
  const digits = "23456789";
  const special = "!@#$%&*";
  const all = upper + lower + digits + special;
  let pwd = "";
  pwd += upper[Math.floor(Math.random() * upper.length)];
  pwd += lower[Math.floor(Math.random() * lower.length)];
  pwd += digits[Math.floor(Math.random() * digits.length)];
  pwd += special[Math.floor(Math.random() * special.length)];
  for (let i = 4; i < length; i++) {
    pwd += all[Math.floor(Math.random() * all.length)];
  }
  return pwd.split("").sort(() => Math.random() - 0.5).join("");
}

/**
 * Create a Staff account inside the actor's own organization.
 * The orgId is taken exclusively from the authenticated session.
 */
export async function createStaffAccount(actor: AccountActor, data: CreateStaffInput): Promise<{
  user: { id: string; userNumber: number; name: string; email: string; role: string; orgId: string; isActive: boolean };
  tempPassword: string;
  emailStatus: "sent" | "failed" | "skipped";
  emailError?: string;
}> {
  assertActor(actor);
  assertNoOrgIdOverride(actor, data.orgId);

  const email = requireEmail(data.email, "email");

  // The form sends firstName/lastName; derive a display name when absent.
  const name =
    (typeof data.name === "string" ? data.name : "").trim() ||
    [data.firstName, data.lastName]
      .filter((part): part is string => typeof part === "string" && part.trim().length > 0)
      .map((part) => part.trim())
      .join(" ") ||
    email.split("@")[0] ||
    "Employee";

  const role = String(data.role || data.roleName || "staffs").toLowerCase();
  if (!CREATABLE_ROLES.has(role)) {
    throw new AppError(403, "You are not allowed to create accounts with this role");
  }

  const status = (data.status || "active").toLowerCase();
  if (!["active", "inactive", "terminated", "on leave", "on_leave"].includes(status)) {
    throw new AppError(400, "Invalid account status");
  }

  const tempPassword = data.password || generateTempPassword();
  validatePasswordStrength(tempPassword);
  const hashedPassword = await hash(tempPassword, 12);

  // Duplicate email checks span both account stores.
  const [existingUser, existingClient] = await Promise.all([
    User.findOne({ email }).select("_id").lean(),
    ClientUser.findOne({ email }).select("_id").lean(),
  ]);
  if (existingUser || existingClient) {
    throw new AppError(409, "An account with this email already exists");
  }

  const userId = uuid();
  const userNumber = await getNextSequence("userNumber");

  const allowedFields: Record<string, unknown> = {
    id: userId,
    userNumber,
    orgId: actor.orgId,
    name,
    email,
    password: hashedPassword,
    role,
    status: status === "active" ? "offline" : "offline",
    isActive: status !== "inactive" && status !== "terminated",
    emailVerified: false,
    tokenVersion: 0,
    createdBy: actor.userId,
  };

  for (const field of [
    "department", "phone", "designation", "joiningDate", "displayId",
    "firstName", "lastName", "location", "shift", "employmentType",
    "sourceOfHire", "alternateEmail", "address", "city", "state", "country",
    "zipCode", "linkedin", "github", "twitter", "website", "company",
  ]) {
    if (data[field] !== undefined && data[field] !== null) {
      allowedFields[field] = data[field];
    }
  }

  await User.create([allowedFields]);
  await OrgMember.create([{
    orgId: actor.orgId,
    userId,
    role,
    createdBy: actor.userId,
    joinedAt: new Date(),
  }]);

  await recordAuditLog({
    orgId: actor.orgId,
    userId: actor.userId,
    createdBy: actor.userId,
    action: "account.staff.created",
    entityType: "user",
    entityId: userId,
    description: `Staff account ${email} (${role}) created in ${actor.orgId}`,
  });

  let emailStatus: "sent" | "failed" | "skipped" = "skipped";
  let emailError: string | undefined;
  try {
    let workspaceName = "MyWorkspace";
    const org = await Organization.findOne({ id: actor.orgId }).select("name").lean();
    if (org?.name) workspaceName = org.name;
    const loginUrl = `${env.APP_URL}/login`;
    const firstName = name.split(" ")[0] || name;
    await sendEmployeeOnboarded(email, firstName, email, workspaceName, loginUrl, tempPassword);
    emailStatus = "sent";
  } catch (err: any) {
    const msg = err?.message || "Failed to send credentials email";
    emailStatus = msg.includes("Neither SMTP nor RESEND_API_KEY configured") ? "skipped" : "failed";
    emailError = msg;
    logger.error({ err, email }, "Failed to send credentials email after staff account creation");
  }

  return {
    user: {
      id: userId,
      userNumber,
      name,
      email,
      role,
      orgId: actor.orgId,
      isActive: allowedFields.isActive as boolean,
    },
    tempPassword,
    emailStatus,
    emailError,
  };
}

/** List staff accounts that belong to the actor's organization only. */
export async function listStaffAccounts(actor: AccountActor): Promise<any[]> {
  assertActor(actor);

  const members = await OrgMember.find({ orgId: actor.orgId })
    .select("userId role createdBy joinedAt")
    .lean();

  const userIds = [...new Set(members.map((m) => m.userId).filter(Boolean))];

  let users: any[] = [];
  if (userIds.length > 0) {
    users = await User.find({ id: { $in: userIds } })
      .select(
        "id userNumber name email role status isActive department phone image createdAt createdBy orgId"
      )
      .lean();
  }

  const userMap = new Map(users.map((u) => [u.id, u]));

  return members
    .filter((m) => userMap.has(m.userId))
    .map((m) => {
      const u = userMap.get(m.userId)!;
      return {
        id: u.id,
        userNumber: u.userNumber,
        name: u.name,
        email: u.email,
        role: u.role || m.role || "staffs",
        memberRole: m.role,
        status: u.status || "offline",
        isActive: u.isActive !== false,
        department: u.department || "",
        phone: u.phone || "",
        image: u.image || "",
        createdAt: u.createdAt || undefined,
        orgId: u.orgId || actor.orgId,
      };
    });
}

/** Fetch a single staff account, strictly scoped to the actor's org. */
export async function getStaffAccount(actor: AccountActor, userId: string): Promise<any> {
  assertActor(actor);

  const member = await OrgMember.findOne({ orgId: actor.orgId, userId }).lean();
  if (!member) throw new AppError(404, "User not found in this organization");

  const user = await User.findOne({ id: userId, orgId: actor.orgId })
    .select("id userNumber name email role status isActive department phone image createdAt createdBy orgId")
    .lean();
  if (!user) throw new AppError(404, "User not found in this organization");

  return {
    id: user.id,
    userNumber: user.userNumber,
    name: user.name,
    email: user.email,
    role: user.role || member.role || "staffs",
    memberRole: member.role,
    status: user.status || "offline",
    isActive: user.isActive !== false,
    department: user.department || "",
    phone: user.phone || "",
    image: user.image || "",
    createdAt: user.createdAt || undefined,
    orgId: user.orgId || actor.orgId,
  };
}

/**
 * Revoke EVERY credential and live connection for a user:
 *  - increment tokenVersion (invalidates all JWTs, including NextAuth cookies)
 *  - revoke all refresh tokens
 *  - close all device sessions
 *  - disconnect WebSocket / Socket.IO connections
 *  - bust in-memory auth caches
 */
export async function revokeUserAccess(userId: string, orgId: string, reason = "account_terminated"): Promise<void> {
  const now = new Date();

  await Promise.all([
    User.updateOne(
      { id: userId },
      { $inc: { tokenVersion: 1 }, $set: { status: "offline" } },
    ),
    ClientUser.updateOne(
      { id: userId },
      { $inc: { tokenVersion: 1 } },
    ),
    RefreshToken.updateMany(
      { userId, revokedAt: { $exists: false } },
      { $set: { revokedAt: now } },
    ),
    Session.updateMany(
      { userId, logoutTime: { $exists: false } },
      { $set: { logoutTime: now, currentStatus: "offline" } },
    ),
  ]);

  invalidateUserAuthCache(userId);

  socketIOManager.emitToUser(userId, "auth:revoked", { reason });
  socketIOManager.disconnectUser(userId, reason);
}

/** Deactivate (or reactivate) a staff account. Deactivation revokes all access. */
export async function setStaffAccountStatus(actor: AccountActor, targetUserId: string, active: boolean): Promise<any> {
  assertActor(actor);

  const member = await OrgMember.findOne({ orgId: actor.orgId, userId: targetUserId }).lean();
  if (!member) throw new AppError(404, "User not found in this organization");

  const user = await User.findOne({ id: targetUserId, orgId: actor.orgId });
  if (!user) throw new AppError(404, "User not found in this organization");

  if (user.isActive === active) {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      isActive: active,
      already: true,
    };
  }

  if (!active) {
    await revokeUserAccess(targetUserId, actor.orgId, "account_deactivated");
  }

  user.isActive = active;
  user.status = active ? (user.status === "offline" ? "offline" : user.status) : "offline";
  user.updatedBy = actor.userId;
  await user.save();

  await recordAuditLog({
    orgId: actor.orgId,
    userId: actor.userId,
    createdBy: actor.userId,
    action: active ? "account.staff.reactivated" : "account.staff.deactivated",
    entityType: "user",
    entityId: targetUserId,
    description: `${active ? "Reactivated" : "Deactivated"} staff account ${user.email}${active ? "" : " and revoked all sessions"} `,
  });

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    isActive: user.isActive,
    accessRevoked: !active,
  };
}

/** Permanently remove an account and revoke every credential. */
export async function terminateStaffAccount(actor: AccountActor, targetUserId: string): Promise<void> {
  assertActor(actor);

  const member = await OrgMember.findOne({ orgId: actor.orgId, userId: targetUserId }).lean();
  if (!member) throw new AppError(404, "User not found in this organization");

  await revokeUserAccess(targetUserId, actor.orgId, "account_terminated");

  await Promise.all([
    User.deleteOne({ id: targetUserId, orgId: actor.orgId }),
    OrgMember.deleteOne({ orgId: actor.orgId, userId: targetUserId }),
  ]);

  await recordAuditLog({
    orgId: actor.orgId,
    userId: actor.userId,
    createdBy: actor.userId,
    action: "account.staff.terminated",
    entityType: "user",
    entityId: targetUserId,
    description: `Terminated staff account and revoked all sessions`,
  });
}

export async function getStaffByEmail(orgId: string, email: string): Promise<any | null> {
  const user = await User.findOne({ orgId, email }).select("id name email role isActive status").lean();
  if (!user) return null;
  const member = await OrgMember.findOne({ orgId, userId: user.id }).select("role").lean();
  return { ...user, memberRole: member?.role };
}

export { optionalString };
