import { OrgMember } from "./db/models/OrgMember.js";
import { AuthRequest } from "../types/index.js";
import { AppError } from "../middleware/error.js";

/**
 * Get the organization ID for a user from their JWT token or membership record.
 */
export async function getUserOrgId(userId: string): Promise<string | null> {
  const member = await OrgMember.findOne({ userId }).lean();
  if (!member) return null;
  return member.orgId;
}

/**
 * Require that the user belongs to an organization. Throws AppError if not.
 */
export async function requireOrgMembership(userId: string, orgId?: string): Promise<string> {
  const query = orgId ? { userId, orgId } : { userId };
  const member = await OrgMember.findOne(query).lean();
  if (!member) {
    if (orgId) throw new AppError(403, "Not a member of this organization");
    throw new AppError(400, "User is not associated with an organization");
  }
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
