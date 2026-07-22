import { Request, Response, NextFunction } from "express";
import { recordAuditLog } from "../services/audit.service.js";

export type CalendarAuditAction =
  | "calendar.connect"
  | "calendar.disconnect"
  | "calendar.sync"
  | "calendar.event.create"
  | "calendar.event.update"
  | "calendar.event.delete"
  | "calendar.webhook.received"
  | "calendar.settings.update";

interface CalendarAuditRequest extends Request {
  user?: {
    userId: string;
    email: string;
    role: string;
    orgId: string;
    permissions: string[];
  };
  calendarAudit?: {
    action: CalendarAuditAction;
    entityType: string;
    entityId?: string;
    metadata?: Record<string, unknown>;
  };
}

export function calendarAuditMiddleware(
  action: CalendarAuditAction,
  entityType: string = "calendar"
) {
  return async (req: CalendarAuditRequest, res: Response, next: NextFunction) => {
    // Store audit info for later use
    req.calendarAudit = {
      action,
      entityType,
      metadata: {},
    };

    // Capture the original json method
    const originalJson = res.json.bind(res);

    res.json = function (body: unknown) {
      // Record audit log after response
      if (req.user) {
        const responseBody = body as Record<string, unknown>;
        const success = responseBody.success !== false && res.statusCode < 400;

        recordAuditLog({
          orgId: req.user.orgId,
          userId: req.user.userId,
          createdBy: req.user.userId,
          action: req.calendarAudit?.action || action,
          entityType: req.calendarAudit?.entityType || entityType,
          entityId: req.calendarAudit?.entityId,
          description: `Calendar operation: ${action}`,
          metadata: JSON.stringify({
            ...req.calendarAudit?.metadata,
            method: req.method,
            path: req.path,
            statusCode: res.statusCode,
            success,
            userAgent: req.headers["user-agent"],
          }),
          ipAddress: req.ip,
          userAgent: req.headers["user-agent"] as string,
          success,
        }).catch((err) => {
          console.error("[Calendar Audit] Failed to record audit log:", err);
        });
      }

      return originalJson(body);
    };

    next();
  };
}

export function setCalendarAuditInfo(
  req: CalendarAuditRequest,
  info: {
    entityId?: string;
    metadata?: Record<string, unknown>;
  }
) {
  if (req.calendarAudit) {
    if (info.entityId) {
      req.calendarAudit.entityId = info.entityId;
    }
    if (info.metadata) {
      req.calendarAudit.metadata = {
        ...req.calendarAudit.metadata,
        ...info.metadata,
      };
    }
  }
}
