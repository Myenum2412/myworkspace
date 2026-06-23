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
  if (!req.user) {
    throw new AppError(401, "Authentication required");
  }

  // Use orgId from token if available
  if (req.user.orgId) {
    req.orgId = req.user.orgId;
    next();
    return;
  }

  // Look up from membership
  const member = await OrgMember.findOne({ userId: req.user.userId }).lean();
  if (member) {
    req.orgId = member.orgId.toString();
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
