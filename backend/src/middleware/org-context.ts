import { Response, NextFunction } from "express";
import { OrgMember } from "../lib/db/models/OrgMember.js";
import { AuthRequest } from "./auth.js";
import { AppError } from "./error.js";

const ORG_CACHE_TTL = 60_000;
const orgCache = new Map<string, { orgId: string | null; exp: number }>();

function orgCacheGet(userId: string): string | null | undefined {
  const hit = orgCache.get(userId);
  if (!hit) return undefined;
  if (Date.now() > hit.exp) { orgCache.delete(userId); return undefined; }
  return hit.orgId;
}

function orgCacheSet(userId: string, orgId: string | null): void {
  orgCache.set(userId, { orgId, exp: Date.now() + ORG_CACHE_TTL });
}

/**
 * Middleware: Resolve and attach organization context to the request.
 * Uses orgId from JWT token if available, otherwise looks up from OrgMember.
 * Attaches req.orgId for downstream use.
 */
export async function resolveOrgContext(req: AuthRequest, _res: Response, next: NextFunction): Promise<void> {
  if (!req.user) {
    throw new AppError(401, "Authentication required");
  }

  // Use orgId from token if available
  if (req.user.orgId) {
    req.orgId = req.user.orgId;
    next();
    return;
  }

  // Check cache before DB lookup
  const cached = orgCacheGet(req.user.userId);
  if (cached !== undefined) {
    req.orgId = cached || undefined;
    next();
    return;
  }

  // Look up from membership
  const member = await OrgMember.findOne({ userId: req.user.userId }).lean();
  const orgId = member ? member.orgId.toString() : null;
  orgCacheSet(req.user.userId, orgId);
  if (orgId) {
    req.orgId = orgId;
  }

  next();
}

/**
 * Middleware: Require that the user has an organization context.
 * Use after resolveOrgContext.
 */
export function requireOrgContext(req: AuthRequest, _res: Response, next: NextFunction): void {
  if (!req.user) {
    throw new AppError(401, "Authentication required");
  }
  if (!req.orgId) {
    throw new AppError(400, "User is not associated with an organization");
  }
  next();
}
