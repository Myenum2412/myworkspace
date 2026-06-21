import { Response, NextFunction } from "express";
import { User } from "../lib/db/models/User.js";
import { AuthRequest } from "./auth.js";
import { AppError } from "./error.js";
import { ActivityLog } from "../lib/db/models/ActivityLog.js";
import { env } from "../config/env.js";

export function authorizeRole(...roles: string[]) {
  return async (req: AuthRequest, _res: Response, next: NextFunction) => {
    if (!req.user) {
      throw new AppError(401, "Authentication required");
    }
    if (!roles.includes(req.user.role)) {
      throw new AppError(403, "Forbidden: insufficient role permissions");
    }
    next();
  };
}

export function authorizePermission(...permissions: string[]) {
  return async (req: AuthRequest, _res: Response, next: NextFunction) => {
    if (!req.user) {
      throw new AppError(401, "Authentication required");
    }

    if (req.user.role === "ORG_MENU_ADMIN") {
      try {
        const user = await User.findById(req.user.userId);
        if (user) {
          req.user.permissions = user.permissions;
        }
      } catch {
        // proceed with token permissions
      }
    }

    const userPermissions = req.user.permissions || [];
    const hasAll = permissions.every((p) => userPermissions.includes(p));
    if (!hasAll) {
      throw new AppError(403, "Forbidden: missing required permissions");
    }
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
      ActivityLog.create({
        orgId: req.user?.userId || "system",
        userId: req.user?.userId,
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
      }).catch(() => {});
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
        ActivityLog.create({
          orgId: req.user?.userId || "system",
          userId: req.user?.userId,
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
        }).catch(() => {});
      }
      return originalSend(body);
    };
    next();
  };
}
