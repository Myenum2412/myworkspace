import mongoose from "mongoose";
import { AppError } from "../middleware/error.js";
import type { AuthRequest } from "../types/index.js";
import { cacheManager } from "./cache.js";
import { ClientUser } from "./db/models/ClientUser.js";
import { ClientWorkspace } from "./db/models/ClientWorkspace.js";
import { Organization } from "./db/models/Organization.js";
import { OrgMember } from "./db/models/OrgMember.js";
import { User } from "./db/models/User.js";

const ORG_CACHE_TTL = 120;

/**
 * Resolve a possible stale userId by looking up the user by email.
 */
async function resolveUserId(userId: string, email?: string): Promise<string> {
  if (email) {
    const resolveKey = `resolve:${userId}:${email}`;
    const cached = cacheManager.get<string>(resolveKey);
    if (cached !== undefined) return cached;

    const user = await User.findOne({ email }).lean();
    if (user) {
      const authoritativeId = user.id || (user as any)._id?.toString();
      if (authoritativeId) {
        cacheManager.set(resolveKey, authoritativeId, ORG_CACHE_TTL);
        return authoritativeId;
      }
    }
    cacheManager.set(resolveKey, userId, 30);
  }
  return userId;
}

/**
 * Get the organization ID for a user from their JWT token or membership record.
 */
export async function getUserOrgId(userId: string, email?: string): Promise<string | null> {
  const cacheKey = `org:${userId}`;
  const cached = cacheManager.get<string>(cacheKey);
  if (cached) return cached;

  const resolvedId = await resolveUserId(userId, email);
  const member = await OrgMember.findOne({ userId: resolvedId }).lean();
  if (member) {
    cacheManager.set(cacheKey, member.orgId, ORG_CACHE_TTL);
    return member.orgId;
  }

  // Fallback to user document's orgId (which stores MongoDB _id as string)
  const user = await User.findOne({ id: resolvedId }).select("orgId").lean();
  if (user?.orgId) {
    cacheManager.set(cacheKey, user.orgId, ORG_CACHE_TTL);
    return user.orgId;
  }
  return null;
}

/**
 * Require that the user belongs to an organization. Throws AppError if not.
 *
 * Optimized: trusts JWT orgId first, uses cache, parallelizes fallbacks.
 */
export async function requireOrgMembership(
  userId: string,
  orgId?: string,
  email?: string,
  tokenOrgId?: string,
): Promise<string> {
  if (tokenOrgId && (!orgId || tokenOrgId === orgId)) return tokenOrgId;

  const cacheKey = `org:${userId}`;
  const cached = cacheManager.get<string>(cacheKey);
  if (cached && (!orgId || cached === orgId)) {
    if (tokenOrgId === undefined && cached) return cached;
    if (!tokenOrgId) return cached;
  }

  const resolvedId = await resolveUserId(userId, email);

  // The user's own orgId field is authoritative — the JWT orgId is derived from
  // it at login and re-validated against it by verifyActiveUser on every
  // request. Prefer it when resolving the "current" org so that multi-org
  // users (who may have several org_members rows) are resolved deterministically
  // to the same org the frontend displays, instead of whichever row MongoDB's
  // findOne happens to return.
  const userRecord = await User.findOne({ id: resolvedId }).select("orgId").lean();
  const userOrgId = userRecord?.orgId || undefined;
  const preferredOrg = orgId || userOrgId;

  // Parallelize all membership lookups
  const queries: Promise<any>[] = [
    OrgMember.findOne(
      preferredOrg ? { userId: resolvedId, orgId: preferredOrg } : { userId: resolvedId },
    ).lean(),
  ];

  if (mongoose.Types.ObjectId.isValid(resolvedId)) {
    const db = mongoose.connection.db;
    if (db) {
      const oidFilter: Record<string, any> = { userId: new mongoose.Types.ObjectId(resolvedId) };
      if (preferredOrg) oidFilter.orgId = preferredOrg;
      queries.push(db.collection("orgmembers").findOne(oidFilter));
    }
  }

  const [stringMember, oidMember] = await Promise.all(queries);

  const member = oidMember || stringMember;
  if (member) {
    const orgIdVal = typeof member.orgId === "string" ? member.orgId : String(member.orgId);
    cacheManager.set(cacheKey, orgIdVal, ORG_CACHE_TTL);
    return orgIdVal;
  }

  // Fallback: NextAuth org_members collection
  try {
    const db = mongoose.connection.db;
    if (db) {
      const nextAuthFilter: Record<string, unknown> = {
        userId: { $in: [...new Set([resolvedId, userId].filter(Boolean))] },
      };
      if (preferredOrg) nextAuthFilter.orgId = preferredOrg;
      const nextAuthMember = await db.collection("org_members").findOne(nextAuthFilter);
      if (nextAuthMember) {
        const orgIdVal =
          typeof nextAuthMember.orgId === "string"
            ? nextAuthMember.orgId
            : String(nextAuthMember.orgId);
        cacheManager.set(cacheKey, orgIdVal, ORG_CACHE_TTL);
        return orgIdVal;
      }
    }
  } catch {}

  // The user's own orgId field is authoritative even when no membership row
  // exists (accounts created without a member record).
  if (userOrgId && !orgId) {
    cacheManager.set(cacheKey, userOrgId, ORG_CACHE_TTL);
    return userOrgId;
  }

  if (tokenOrgId && !orgId) return tokenOrgId;
  if (orgId) throw new AppError(403, "Not a member of this organization");
  throw new AppError(400, "User is not associated with any organization");
}

/**
 * Check whether a user belongs to an organization, tolerating the various
 * shapes membership data takes across this app:
 *   - `org_members` rows keyed by the user's business `id` or MongoDB `_id`
 *   - legacy `orgmembers` rows keyed by the MongoDB `_id`
 *   - `users.orgId` fallback for accounts created without a member row
 *
 * This mirrors the semantics of `requireOrgMembership` so that assignment
 * validation never rejects a legitimate in-org member just because their
 * membership record stores a differently-typed id.
 */
export async function isUserInOrg(userId: string, orgId: string): Promise<boolean> {
  if (!userId || !orgId) return false;

  const isOid = mongoose.Types.ObjectId.isValid(userId);
  const filters: Array<{ userId: any; orgId: string }> = [{ userId, orgId }];
  if (isOid) filters.push({ userId: new mongoose.Types.ObjectId(userId), orgId });

  // 1) Primary membership collection (string or ObjectId reference).
  const member = await OrgMember.findOne({ $or: filters }).lean();
  if (member) return true;

  // 2) Legacy "orgmembers" collection (userId historically stored as ObjectId).
  try {
    const db = mongoose.connection.db;
    if (db) {
      const legacy = await db.collection("orgmembers").findOne({ $or: filters });
      if (legacy) return true;
    }
  } catch {}

  // 3) users.orgId fallback for accounts without a member row.
  const user = await User.findOne({
    $or: [{ id: userId }, ...(isOid ? [{ _id: userId }] : [])],
    orgId,
  }).lean();
  if (user) return true;

  return false;
}

/**
 * Get orgId from AuthRequest. Trusts req.user.orgId from the JWT first.
 */
export function getOrgIdFromRequest(req: AuthRequest, strict = false): string {
  if (!req.user) throw new AppError(401, "Authentication required");
  if (req.user.orgId) return req.user.orgId;
  if (strict) throw new AppError(400, "User is not associated with any organization");
  return "";
}

/**
 * Convenience wrapper that passes the email from the authenticated request.
 */
export async function requireOrgMembershipFromRequest(
  req: AuthRequest,
  orgId?: string,
): Promise<string> {
  return requireOrgMembership(
    req.user!.userId,
    orgId,
    req.user!.email || undefined,
    req.user!.orgId,
  );
}

/**
 * Verify that a user has access to an organization's files and folders.
 * Parallelized: all checks run concurrently.
 */
export async function verifyOrgAccess(userId: string, orgId: string): Promise<void> {
  const cacheKey = `orgAccess:${userId}:${orgId}`;
  const cached = cacheManager.get<boolean>(cacheKey);
  if (cached === true) return;

  const [member, user, clientUser, superAdmin, ownedOrg] = await Promise.all([
    OrgMember.findOne({ userId, orgId }).lean(),
    User.findOne({ id: userId, orgId }).lean(),
    ClientUser.findOne({ id: userId, orgId }).lean(),
    User.findOne({ id: userId, role: "org_admin" }).lean(),
    Organization.findOne({ id: orgId, ownerId: userId }).select("_id").lean(),
  ]);

  if (member || user || superAdmin || ownedOrg) {
    cacheManager.set(cacheKey, true, 60);
    return;
  }

  if (clientUser) {
    const workspace = await ClientWorkspace.findOne({ clientId: clientUser.clientId }).lean();
    if (workspace?.fileManagementEnabled) {
      cacheManager.set(cacheKey, true, 60);
      return;
    }
  }

  throw new AppError(403, "Not authorized");
}
