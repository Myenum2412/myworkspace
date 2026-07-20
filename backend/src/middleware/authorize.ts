import { Response, NextFunction } from "express";
import crypto from "crypto";
import { AuthRequest } from "./auth.js";
import { AppError } from "./error.js";
import { ROLES, isPlatformRole, isAdminRole } from "../lib/rbac/index.js";
import { recordAuditLog } from "../services/audit.service.js";

/**
 * Extract correlation ID from request headers or generate one.
 */
function getCorrelationId(req: AuthRequest): string {
  return (req.headers["x-correlation-id"] as string) ||
    (req.headers["x-request-id"] as string) ||
    crypto.randomUUID();
}

/**
 * Extract trace ID from request headers.
 */
function getTraceId(req: AuthRequest): string | undefined {
  return (req.headers["x-trace-id"] as string) ||
    (req.headers["x-b3-traceid"] as string) ||
    undefined;
}

/**
 * Role-based authorization middleware with comprehensive audit logging.
 */
export function authorizeRole(...roles: string[]) {
  return async (req: AuthRequest, _res: Response, next: NextFunction) => {
    if (!req.user) {
      throw new AppError(401, "Authentication required");
    }

    const allowed = roles.includes(req.user.role);

    await recordAuditLog({
      orgId: req.user?.orgId || "system",
      userId: req.user?.userId || "system",
      action: allowed ? "authorization.role.granted" : "authorization.role.denied",
      entityType: "access",
      entityId: req.user?.userId || "unknown",
      description: allowed
        ? `Role-based access granted: ${req.user?.role} for ${req.method} ${req.originalUrl}`
        : `Role-based access denied: ${req.user?.role} not in [${roles.join(", ")}] for ${req.method} ${req.originalUrl}`,
      correlationId: getCorrelationId(req),
      traceId: getTraceId(req),
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"] as string | undefined,
      success: allowed,
      failureReason: allowed ? undefined : `Role ${req.user?.role} not authorized`,
      riskScore: allowed ? 0 : 20,
      riskFactors: allowed ? [] : ["authorization_failure"],
      metadata: {
        method: req.method,
        path: req.originalUrl,
        requiredRoles: roles,
        userRole: req.user?.role,
      },
      tags: ["authorization", "role-based"],
    });

    if (!allowed) {
      throw new AppError(403, "Forbidden: insufficient role permissions");
    }

    next();
  };
}

/**
 * Platform admin only middleware with audit logging.
 */
export function orgAdminOnly() {
  return async (req: AuthRequest, _res: Response, next: NextFunction) => {
    if (!req.user) {
      throw new AppError(401, "Authentication required");
    }

    const allowed = isPlatformRole(req.user.role);

    await recordAuditLog({
      orgId: req.user?.orgId || "system",
      userId: req.user?.userId,
      action: allowed ? "authorization.platform.granted" : "authorization.platform.denied",
      entityType: "access",
      entityId: req.ip || "unknown",
      description: allowed
        ? `Platform admin access granted for ${req.method} ${req.originalUrl}`
        : `Unauthorized platform admin access attempt by ${req.user?.email || "unknown"}`,
      correlationId: getCorrelationId(req),
      traceId: getTraceId(req),
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"] as string | undefined,
      success: allowed,
      failureReason: allowed ? undefined : `Role ${req.user?.role} is not platform admin`,
      riskScore: allowed ? 0 : 30,
      riskFactors: allowed ? [] : ["privilege_escalation", "unauthorized_admin_access"],
      metadata: {
        method: req.method,
        path: req.originalUrl,
        userRole: req.user?.role,
      },
      tags: ["authorization", "platform-admin"],
    });

    if (!allowed) {
      throw new AppError(403, "Forbidden: only org_admin can access this area");
    }

    next();
  };
}

export function platformAdminOnly() {
  return orgAdminOnly();
}

/**
 * Members only middleware with audit logging.
 */
export function membersOnly() {
  return async (req: AuthRequest, _res: Response, next: NextFunction) => {
    if (!req.user) {
      throw new AppError(401, "Authentication required");
    }

    const allowed = isAdminRole(req.user.role);

    await recordAuditLog({
      orgId: req.user?.orgId || "system",
      userId: req.user?.userId,
      action: allowed ? "authorization.members.granted" : "authorization.members.denied",
      entityType: "access",
      entityId: req.user?.userId,
      description: allowed
        ? `Members access granted for ${req.method} ${req.originalUrl}`
        : `Unauthorized members access attempt by ${req.user?.email || "unknown"}`,
      correlationId: getCorrelationId(req),
      traceId: getTraceId(req),
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"] as string | undefined,
      success: allowed,
      failureReason: allowed ? undefined : `Role ${req.user?.role} is not a member`,
      riskScore: allowed ? 0 : 20,
      riskFactors: allowed ? [] : ["authorization_failure"],
      metadata: {
        method: req.method,
        path: req.originalUrl,
        userRole: req.user?.role,
      },
      tags: ["authorization", "members-only"],
    });

    if (!allowed) {
      throw new AppError(403, "Forbidden: only company owners can perform this action");
    }

    next();
  };
}

/**
 * Audit log middleware for tracking endpoint usage.
 * Records both successful and failed operations.
 */
export function auditLog(action: string, entityType: string) {
  return async (req: AuthRequest, _res: Response, next: NextFunction) => {
    const startTime = Date.now();
    const correlationId = getCorrelationId(req);

    const originalSend = _res.json.bind(_res);
    _res.json = function (body: any) {
      const duration = Date.now() - startTime;
      const success = _res.statusCode < 400;

      recordAuditLog({
        orgId: req.user?.orgId || "system",
        userId: req.user?.userId || "system",
        createdBy: req.user?.userId,
        action,
        entityType,
        entityId: req.params?.id || req.body?.id || "unknown",
        description: `${action} ${success ? "completed" : "failed"} by ${req.user?.email || "unknown"}`,
        correlationId,
        traceId: getTraceId(req),
        ipAddress: req.ip,
        userAgent: req.headers["user-agent"] as string | undefined,
        success,
        failureReason: success ? undefined : `HTTP ${_res.statusCode}`,
        riskScore: success ? 0 : 10,
        riskFactors: success ? [] : ["operation_failed"],
        metadata: {
          method: req.method,
          path: req.originalUrl,
          statusCode: _res.statusCode,
          duration,
        },
        tags: ["endpoint", action],
      });

      return originalSend(body);
    };

    next();
  };
}

/**
 * Data mutation audit middleware.
 * Captures previous and new values for update operations.
 */
export function auditDataMutation(action: string, entityType: string) {
  return async (req: AuthRequest, _res: Response, next: NextFunction) => {
    const startTime = Date.now();
    const correlationId = getCorrelationId(req);

    // Store request body for change tracking
    const requestBody = { ...req.body };

    const originalSend = _res.json.bind(_res);
    _res.json = function (body: any) {
      const duration = Date.now() - startTime;
      const success = _res.statusCode < 400;

      // Extract previous values from response if available
      const previousValues = (body as any)?.data?.previousValues;
      const newValues = success ? requestBody : undefined;

      recordAuditLog({
        orgId: req.user?.orgId || "system",
        userId: req.user?.userId || "system",
        createdBy: req.user?.userId,
        action,
        entityType,
        entityId: req.params?.id || req.body?.id || "unknown",
        description: `${action} ${success ? "completed" : "failed"} by ${req.user?.email || "unknown"}`,
        correlationId,
        traceId: getTraceId(req),
        ipAddress: req.ip,
        userAgent: req.headers["user-agent"] as string | undefined,
        previousValues,
        newValues,
        success,
        failureReason: success ? undefined : `HTTP ${_res.statusCode}`,
        metadata: {
          method: req.method,
          path: req.originalUrl,
          statusCode: _res.statusCode,
          duration,
        },
        tags: ["data-mutation", action],
      });

      return originalSend(body);
    };

    next();
  };
}
