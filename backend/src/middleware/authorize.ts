import { Response, NextFunction } from "express";
import { User } from "../lib/db/models/User.js";
import { AuthRequest } from "./auth.js";
import { AppError } from "./error.js";
import { env } from "../config/env.js";
import { recordAuditLog } from "../services/audit.service.js";

const permCache = new Map<string, { permissions: string[]; expiresAt: number }>();
const PERM_CACHE_TTL = 60_000;

function getCachedPermissions(userId: string): string[] | null {
  const cached = permCache.get(`perm:${userId}`);
  if (cached && cached.expiresAt > Date.now()) return cached.permissions;
  permCache.delete(`perm:${userId}`);
  return null;
}

function setCachedPermissions(userId: string, permissions: string[]): void {
  permCache.set(`perm:${userId}`, { permissions, expiresAt: Date.now() + PERM_CACHE_TTL });
}

export function authorizeRole(...roles: string[]) {
  return async (req: AuthRequest, _res: Response, next: NextFunction) => {
    if (!req.user) {
      throw new AppError(401, "Authentication required");
    }
    if (!roles.includes(req.user.role)) {
      throw new AppError(403, "Forbidden: insufficient role permissions");
    }
    recordAuditLog({
      orgId: req.user?.orgId || "system",
      userId: req.user?.userId || "system",
      createdBy: req.user?.userId || "system",
      action: "authorization.role",
      entityType: "access",
      entityId: req.user?.userId || "unknown",
      description: `Role-based access granted: ${req.user?.role} for ${req.method} ${req.originalUrl}`,
      metadata: JSON.stringify({ roles, ip: req.ip, userAgent: req.headers["user-agent"] }),
    });
    next();
  };
}

export function authorizePermission(...permissions: string[]) {
  return async (req: AuthRequest, _res: Response, next: NextFunction) => {
    if (!req.user) {
      throw new AppError(401, "Authentication required");
    }

    if (req.user.role === "ORG_MENU_ADMIN") {
      const cached = getCachedPermissions(req.user.userId);
      if (cached) {
        req.user.permissions = cached;
      } else {
        try {
          const user = await User.findById(req.user.userId);
          if (user) {
            req.user.permissions = user.permissions;
            setCachedPermissions(req.user.userId, user.permissions || []);
          }
        } catch {
          // proceed with token permissions
        }
      }
    }

    const userPermissions = req.user.permissions || [];
    const hasAll = permissions.every((p) => userPermissions.includes(p));
    if (!hasAll) {
      throw new AppError(403, "Forbidden: missing required permissions");
    }
    recordAuditLog({
      orgId: req.user?.orgId || "system",
      userId: req.user?.userId || "system",
      createdBy: req.user?.userId || "system",
      action: "authorization.permission",
      entityType: "access",
      entityId: req.user?.userId || "unknown",
      description: `Permission-based access granted for ${req.method} ${req.originalUrl}`,
      metadata: JSON.stringify({ permissions, ip: req.ip, userAgent: req.headers["user-agent"] }),
    });
    next();
  };
}

export function orgMenuAdminOnly() {
  return async (req: AuthRequest, _res: Response, next: NextFunction) => {
    if (!req.user) {
      throw new AppError(401, "Authentication required");
    }

    const userEmail = req.user.email?.toLowerCase().trim();
    const adminEmail = env.ADMIN_EMAIL.toLowerCase().trim();

    if (userEmail !== adminEmail) {
      await recordAuditLog({
        orgId: req.user?.orgId || "system",
        userId: req.user?.userId,
        createdBy: req.user?.userId || "system",
        action: "orgmenu.unauthorized",
        entityType: "access",
        entityId: req.ip || "unknown",
        description: `Unauthorized orgmenu access attempt by ${req.user?.email || "unknown"}`,
        metadata: JSON.stringify({
          ip: req.ip,
          userAgent: req.headers["user-agent"],
          method: req.method,
          path: req.originalUrl,
        }),
      });
      throw new AppError(403, "Forbidden: only the authorized administrator can access this area");
    }
    next();
  };
}

export function auditLog(action: string, entityType: string) {
  return async (req: AuthRequest, _res: Response, next: NextFunction) => {
    const originalSend = _res.json.bind(_res);
    _res.json = function (body: any) {
      if (_res.statusCode < 400) {
        recordAuditLog({
          orgId: req.user?.orgId || "system",
          userId: req.user?.userId || "system",
          createdBy: req.user?.userId || "system",
          action,
          entityType,
          entityId: req.params?.id || req.body?.id || "unknown",
          description: `${action} performed by ${req.user?.email || "unknown"}`,
          metadata: JSON.stringify({
            ip: req.ip,
            userAgent: req.headers["user-agent"],
            method: req.method,
            path: req.originalUrl,
          }),
        });
      }
      return originalSend(body);
    };
    next();
  };
}
