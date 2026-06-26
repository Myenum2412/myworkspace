import { Response, NextFunction } from "express";
import { OrgMember } from "../lib/db/models/OrgMember.js";
import { AuthRequest } from "./auth.js";
import { AppError } from "./error.js";

/**
 * Middleware: Resolve and attach organization context to the request.
 * Uses orgId from JWT token if available, otherwise looks up from OrgMember.
 * Attaches req.orgId for downstream use.
 */
export async function resolveOrgContext(req: AuthRequest, _res: Response, next: NextFunction): Promise<void> {
  console.log(`[ORG CONTEXT] ========== RESOLVE ORG CONTEXT START ==========`);
  console.log(`[ORG CONTEXT] Request URL: ${req.url}`);
  console.log(`[ORG CONTEXT] User present: ${!!req.user}`);
  
  if (!req.user) {
    console.log(`[ORG CONTEXT] No user, throwing 401`);
    throw new AppError(401, "Authentication required");
  }

  console.log(`[ORG CONTEXT] User ID: ${req.user.userId}`);
  console.log(`[ORG CONTEXT] User orgId from token: ${req.user.orgId || 'NOT SET'}`);

  // Use orgId from token if available
  if (req.user.orgId) {
    req.orgId = req.user.orgId;
    console.log(`[ORG CONTEXT] Using orgId from token: ${req.orgId}`);
    console.log(`[ORG CONTEXT] ========== RESOLVE ORG CONTEXT SUCCESS (from token) ==========`);
    next();
    return;
  }

  // Look up from membership
  console.log(`[ORG CONTEXT] No orgId in token, looking up OrgMember for userId: ${req.user.userId}`);
  const member = await OrgMember.findOne({ userId: req.user.userId }).lean();
  if (member) {
    req.orgId = member.orgId.toString();
    console.log(`[ORG CONTEXT] Found OrgMember: orgId=${member.orgId}, role=${member.role}`);
    console.log(`[ORG CONTEXT] Using orgId from membership: ${req.orgId}`);
  } else {
    console.log(`[ORG CONTEXT] No OrgMember found for userId: ${req.user.userId}`);
  }

  console.log(`[ORG CONTEXT] Final orgId: ${req.orgId || 'NOT SET'}`);
  console.log(`[ORG CONTEXT] ========== RESOLVE ORG CONTEXT END ==========`);
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
