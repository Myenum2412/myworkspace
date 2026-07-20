import { Response, NextFunction } from "express";
import { AuthRequest } from "./auth.js";
import { AppError } from "./error.js";
import { recordAuditLog } from "../services/audit.service.js";
import { logger } from "../lib/logger/index.js";

/**
 * Tenant Isolation Middleware
 * Validates organization context on every API request.
 * Prevents cross-tenant data access at the middleware level.
 */

export interface TenantIsolationOptions {
  /** Require valid orgId (default: true) */
  requireOrgId?: boolean;
  /** Allow platform admins to bypass org check */
  allowPlatformAdmin?: boolean;
  /** Custom error message */
  errorMessage?: string;
  /** Skip validation for specific paths */
  skipPaths?: string[];
}

const DEFAULT_OPTIONS: TenantIsolationOptions = {
  requireOrgId: true,
  allowPlatformAdmin: true,
  skipPaths: ["/api/health", "/api/config/public", "/api/metrics"],
};

/**
 * Middleware that validates tenant isolation on every request.
 * Ensures:
 * 1. User is authenticated
 * 2. User has valid orgId
 * 3. Request is within user's organization scope
 */
export function tenantIsolation(options: TenantIsolationOptions = {}) {
  const config = { ...DEFAULT_OPTIONS, ...options };

  return async (req: AuthRequest, _res: Response, next: NextFunction) => {
    // Skip for public paths
    if (config.skipPaths?.some(path => req.path.startsWith(path))) {
      next();
      return;
    }

    // Must be authenticated
    if (!req.user) {
      throw new AppError(401, "Authentication required");
    }

    // Platform admins can bypass if configured
    if (config.allowPlatformAdmin && req.user.role === "org_admin") {
      // Still set orgId if available
      if (req.user.orgId) {
        req.orgId = req.user.orgId;
      }
      next();
      return;
    }

    // Validate orgId is present
    const orgId = req.orgId || req.user.orgId;

    if (config.requireOrgId && !orgId) {
      logger.warn({
        userId: req.user.userId,
        role: req.user.role,
        path: req.originalUrl,
        method: req.method,
      }, "Tenant isolation: missing orgId");

      await recordAuditLog({
        orgId: "system",
        userId: req.user.userId,
        action: "tenant.isolation.missing_org",
        entityType: "security",
        description: `Request missing orgId: ${req.method} ${req.originalUrl}`,
        ipAddress: req.ip,
        userAgent: req.headers["user-agent"] as string,
        success: false,
        riskScore: 40,
        riskFactors: ["missing_tenant_context"],
        metadata: {
          method: req.method,
          path: req.originalUrl,
        },
        tags: ["security", "tenant-isolation"],
      });

      throw new AppError(400, config.errorMessage || "Organization context is required");
    }

    // Validate orgId from query/body matches user's orgId (if both present)
    const queryOrgId = req.query.orgId as string | undefined;
    const bodyOrgId = req.body?.orgId as string | undefined;
    const requestOrgId = queryOrgId || bodyOrgId;

    if (requestOrgId && orgId && requestOrgId !== orgId) {
      logger.error({
        userId: req.user.userId,
        contextOrgId: orgId,
        requestOrgId,
        path: req.originalUrl,
        method: req.method,
      }, "Tenant isolation violation: orgId mismatch in request");

      await recordAuditLog({
        orgId,
        userId: req.user.userId,
        action: "tenant.isolation.violation",
        entityType: "security",
        description: `OrgId mismatch: context=${orgId}, request=${requestOrgId} for ${req.method} ${req.originalUrl}`,
        ipAddress: req.ip,
        userAgent: req.headers["user-agent"] as string,
        success: false,
        riskScore: 80,
        riskFactors: ["tenant_escape", "org_id_mismatch"],
        metadata: {
          contextOrgId: orgId,
          requestOrgId,
          method: req.method,
          path: req.originalUrl,
        },
        tags: ["security", "tenant-isolation", "violation"],
      });

      throw new AppError(403, "Access denied: organization mismatch");
    }

    // Set orgId on request if not already set
    if (!req.orgId && orgId) {
      req.orgId = orgId;
    }

    next();
  };
}

/**
 * Middleware that validates resource belongs to user's org.
 * Use after fetching resource to ensure tenant isolation.
 */
export function validateResourceOrg(
  getResourceOrgId: (req: AuthRequest) => string | Promise<string | null>,
) {
  return async (req: AuthRequest, _res: Response, next: NextFunction) => {
    if (!req.user) {
      throw new AppError(401, "Authentication required");
    }

    // Platform admins bypass resource org check
    if (req.user.role === "org_admin") {
      next();
      return;
    }

    const resourceOrgId = await getResourceOrgId(req);

    if (resourceOrgId && req.orgId && resourceOrgId !== req.orgId) {
      logger.error({
        userId: req.user.userId,
        contextOrgId: req.orgId,
        resourceOrgId,
        path: req.originalUrl,
      }, "Tenant isolation violation: resource belongs to different org");

      await recordAuditLog({
        orgId: req.orgId,
        userId: req.user.userId,
        action: "tenant.isolation.resource_mismatch",
        entityType: "security",
        description: `Resource org mismatch: resource=${resourceOrgId}, context=${req.orgId}`,
        ipAddress: req.ip,
        userAgent: req.headers["user-agent"] as string,
        success: false,
        riskScore: 90,
        riskFactors: ["tenant_escape", "cross_tenant_resource_access"],
        metadata: {
          contextOrgId: req.orgId,
          resourceOrgId,
          path: req.originalUrl,
        },
        tags: ["security", "tenant-isolation", "violation"],
      });

      throw new AppError(403, "Access denied: resource belongs to another organization");
    }

    next();
  };
}

/**
 * Middleware that adds tenant context to request for downstream use.
 */
export function enrichTenantContext() {
  return async (req: AuthRequest, _res: Response, next: NextFunction) => {
    if (!req.user) {
      next();
      return;
    }

    // Ensure orgId is set from user's JWT
    if (!req.orgId && req.user.orgId) {
      req.orgId = req.user.orgId;
    }

    // Add tenant context helper to request
    (req as any).tenantContext = {
      orgId: req.orgId,
      userId: req.user.userId,
      role: req.user.role,
    };

    next();
  };
}
