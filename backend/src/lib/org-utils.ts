import { OrgMember } from "./db/models/OrgMember.js";
import { User } from "./db/models/User.js";
import { ClientUser } from "./db/models/ClientUser.js";
import { ClientWorkspace } from "./db/models/ClientWorkspace.js";
import { AuthRequest } from "../types/index.js";
import { AppError } from "../middleware/error.js";
import { cacheManager } from "./cache.js";

const ORG_CACHE_TTL = 30;

/**
 * Resolve a possible stale userId by looking up the user by email as a fallback.
 * This handles cases where the JWT's userId was generated before a user document
 * was re-created, leaving orphaned org_member records with the new userId.
 */
async function resolveUserId(userId: string, email?: string): Promise<string> {
  if (!email) return userId;
  const member = await OrgMember.findOne({ userId }).lean();
  if (member) return userId;
  const user = await User.findOne({ email }).lean();
  if (!user) return userId;
  return user.id || (user as any)._id?.toString() || userId;
}

/**
 * Get the organization ID for a user from their JWT token or membership record.
 */
export async function getUserOrgId(userId: string, email?: string): Promise<string | null> {
  const resolvedId = await resolveUserId(userId, email);
  const member = await OrgMember.findOne({ userId: resolvedId }).lean();
  if (!member) return null;
  return member.orgId;
}

/**
 * Require that the user belongs to an organization. Throws AppError if not.
 *
 * Trust the JWT's orgId first: it's set at login/signup and kept in sync by
 * /switch. Only fall back to a DB lookup when the token carries no orgId
 * (legacy sessions). When a specific `orgId` is supplied and the token
 * already matches it, skip the membership query entirely.
 */
export async function requireOrgMembership(userId: string, orgId?: string, email?: string, tokenOrgId?: string): Promise<string> {
  // Token already carries a valid orgId — prefer it over a DB round-trip.
  if (tokenOrgId && (!orgId || tokenOrgId === orgId)) return tokenOrgId;

  // Cache hit skips both the resolveUserId lookup and the membership query.
  const cacheKey = `org:${userId}`;
  const cached = cacheManager.get<string>(cacheKey);
  if (cached && (!orgId || cached === orgId)) {
    if (tokenOrgId === undefined && cached) return cached;
    if (!tokenOrgId) return cached;
  }

  const resolvedId = await resolveUserId(userId, email);
  const query = orgId ? { userId: resolvedId, orgId } : { userId: resolvedId };
  const member = await OrgMember.findOne(query).lean();
  if (!member) {
    // No DB row, but token claims an org → keep the session usable instead of
    // hard-failing. Caller can still enforce stricter checks where needed.
    if (tokenOrgId && !orgId) return tokenOrgId;
    if (orgId) throw new AppError(403, "Not a member of this organization");
    throw new AppError(400, "User is not associated with any organization");
  }
  cacheManager.set(cacheKey, member.orgId, ORG_CACHE_TTL);
  return member.orgId;
}

/**
 * Get orgId from AuthRequest. Trusts req.user.orgId from the JWT first;
 * only throws when neither the token nor a membership record yields one.
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
  return requireOrgMembership(req.user!.userId, orgId, req.user!.email, req.user!.orgId);
}

/**
 * Verify that a user has access to an organization's files and folders.
 * Checks multiple access paths:
 * 1. OrgMember record (existing)
 * 2. User.orgId matching the org (users without OrgMember record)
 * 3. ClientUser with active workspace (for client portal access)
 * 4. ORG_MENU_ADMIN super admin bypass
 */
export async function verifyOrgAccess(userId: string, orgId: string): Promise<void> {
  const member = await OrgMember.findOne({ userId, orgId }).lean();
  if (member) return;

  const user = await User.findOne({ id: userId, orgId }).lean();
  if (user) return;

  const clientUser = await ClientUser.findOne({ id: userId, orgId }).lean();
  if (clientUser) {
    const workspace = await ClientWorkspace.findOne({ clientId: clientUser.clientId }).lean();
    if (workspace?.fileManagementEnabled) return;
  }

  const superAdmin = await User.findOne({ id: userId, role: "ORG_MENU_ADMIN" }).lean();
  if (superAdmin) return;

  throw new AppError(403, "Not authorized");
}
