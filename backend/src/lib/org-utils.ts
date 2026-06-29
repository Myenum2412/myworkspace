import { OrgMember } from "./db/models/OrgMember.js";
import { User } from "./db/models/User.js";
import { AuthRequest } from "../types/index.js";
import { AppError } from "../middleware/error.js";

// Short-lived in-memory cache for org membership. The JWT already carries orgId;
// this cache exists for the (common) case where routes re-derive it from the DB
// on every request. 30s TTL bounds stale reads while cutting 1-2 Mongo round-trips
// off the hot path. Fine for a single-process backend; if you scale to multiple
// processes, swap this for the shared `node-cache` instance.
const ORG_TTL_MS = 30_000;
const orgCache = new Map<string, { orgId: string; exp: number }>();

function orgCacheGet(userId: string): string | null {
  const hit = orgCache.get(userId);
  if (!hit) return null;
  if (Date.now() > hit.exp) {
    orgCache.delete(userId);
    return null;
  }
  return hit.orgId;
}

function orgCacheSet(userId: string, orgId: string): void {
  orgCache.set(userId, { orgId, exp: Date.now() + ORG_TTL_MS });
}

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
 */
export async function requireOrgMembership(userId: string, orgId?: string, email?: string): Promise<string> {
  // Cache hit skips both the resolveUserId lookup and the membership query.
  const cached = orgCacheGet(userId);
  if (cached && (!orgId || cached === orgId)) return cached;

  const resolvedId = await resolveUserId(userId, email);
  const query = orgId ? { userId: resolvedId, orgId } : { userId: resolvedId };
  const member = await OrgMember.findOne(query).lean();
  if (!member) {
    if (orgId) throw new AppError(403, "Not a member of this organization");
    throw new AppError(400, "User is not associated with an organization");
  }
  orgCacheSet(resolvedId, member.orgId);
  return member.orgId;
}

/**
 * Get orgId from AuthRequest, throwing if missing.
 */
export function getOrgIdFromRequest(req: AuthRequest): string {
  if (!req.user) throw new AppError(401, "Authentication required");
  const orgId = req.user.orgId;
  if (!orgId) throw new AppError(400, "User is not associated with an organization");
  return orgId;
}

/**
 * Convenience wrapper that passes the email from the authenticated request.
 */
export async function requireOrgMembershipFromRequest(req: AuthRequest, orgId?: string): Promise<string> {
  return requireOrgMembership(req.user!.userId, orgId, req.user!.email);
}
