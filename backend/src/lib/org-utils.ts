import mongoose from "mongoose";
import { OrgMember } from "./db/models/OrgMember.js";
import { User } from "./db/models/User.js";
import { ClientUser } from "./db/models/ClientUser.js";
import { ClientWorkspace } from "./db/models/ClientWorkspace.js";
import { Organization } from "./db/models/Organization.js";
import { AuthRequest } from "../types/index.js";
import { AppError } from "../middleware/error.js";
import { cacheManager } from "./cache.js";

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
export async function requireOrgMembership(userId: string, orgId?: string, email?: string, tokenOrgId?: string): Promise<string> {
  if (tokenOrgId && (!orgId || tokenOrgId === orgId)) return tokenOrgId;

  const cacheKey = `org:${userId}`;
  const cached = cacheManager.get<string>(cacheKey);
  if (cached && (!orgId || cached === orgId)) {
    if (tokenOrgId === undefined && cached) return cached;
    if (!tokenOrgId) return cached;
  }

  const resolvedId = await resolveUserId(userId, email);

  // Parallelize all membership lookups
  const queries: Promise<any>[] = [
    OrgMember.findOne(orgId ? { userId: resolvedId, orgId } : { userId: resolvedId }).lean(),
  ];

  if (mongoose.Types.ObjectId.isValid(resolvedId)) {
    const db = mongoose.connection.db;
    if (db) {
      const oidFilter: Record<string, any> = { userId: new mongoose.Types.ObjectId(resolvedId) };
      if (orgId) oidFilter.orgId = orgId;
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
      if (orgId) nextAuthFilter.orgId = orgId;
      const nextAuthMember = await db.collection("org_members").findOne(nextAuthFilter);
      if (nextAuthMember) {
        const orgIdVal = typeof nextAuthMember.orgId === "string" ? nextAuthMember.orgId : String(nextAuthMember.orgId);
        cacheManager.set(cacheKey, orgIdVal, ORG_CACHE_TTL);
        return orgIdVal;
      }
    }
  } catch {}

  if (tokenOrgId && !orgId) return tokenOrgId;
  if (orgId) throw new AppError(403, "Not a member of this organization");
  throw new AppError(400, "User is not associated with any organization");
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
export async function requireOrgMembershipFromRequest(req: AuthRequest, orgId?: string): Promise<string> {
  return requireOrgMembership(req.user!.userId, orgId, req.user!.email || undefined, req.user!.orgId);
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
    User.findOne({ id: userId, role: "ORG_MENU_ADMIN" }).lean(),
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
