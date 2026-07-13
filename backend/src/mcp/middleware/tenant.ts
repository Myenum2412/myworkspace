import { Response, NextFunction } from "express";
import type { MCPAuthenticatedRequest } from "./auth.js";
import { AppError } from "../../middleware/error.js";

export function enforceTenantIsolation(orgIdParam?: string) {
  return (req: MCPAuthenticatedRequest, _res: Response, next: NextFunction): void => {
    const userOrgId = req.mcpContext?.orgId;
    if (!userOrgId) {
      next(new AppError(403, "MCP: No org context for tenant isolation"));
      return;
    }

    const targetOrgId = orgIdParam
      ? (req.query[orgIdParam] as string) || (req.body[orgIdParam] as string)
      : userOrgId;

    if (targetOrgId && targetOrgId !== userOrgId) {
      next(new AppError(403, "MCP: Cross-tenant access denied"));
      return;
    }

    next();
  };
}
