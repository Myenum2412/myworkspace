import { Response, NextFunction } from "express";
import { Model } from "mongoose";
import { AuthRequest } from "./auth.js";
import { AppError } from "./error.js";
import { recordAuditLog } from "../services/audit.service.js";
import { logger } from "../lib/logger/index.js";

export function verifyOwnership(
  model: Model<any>,
  ownerField: string,
  idSource?: (req: AuthRequest) => string,
) {
  return async (req: AuthRequest, _res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new AppError(401, "Authentication required");
      }

      const resourceId = idSource ? idSource(req) : req.params.id;
      if (!resourceId) {
        throw new AppError(400, "Resource ID is required");
      }

      const doc = await model.findById(resourceId).lean();
      if (!doc) {
        throw new AppError(404, `${model.modelName} not found`);
      }

      const resource = doc as Record<string, unknown>;
      const ownerValue = (resource[ownerField] ?? "").toString();
      if (ownerValue !== req.user.userId) {
        logger.warn({
          userId: req.user.userId,
          resourceId,
          resourceType: model.modelName,
          ownerValue,
          ip: req.ip,
          path: req.originalUrl,
        }, "Unauthorized data access attempt");

        await recordAuditLog({
          orgId: req.user.orgId || "system",
          userId: req.user.userId,
          createdBy: req.user.userId,
          action: "ownership.denied",
          entityType: model.modelName.toLowerCase(),
          entityId: resourceId,
          description: `Unauthorized access attempt to ${model.modelName} ${resourceId} by user ${req.user.userId}`,
          metadata: JSON.stringify({
            ip: req.ip,
            userAgent: req.headers["user-agent"],
            method: req.method,
            path: req.originalUrl,
            ownerField,
            ownerValue,
          }),
        });

        throw new AppError(403, "Forbidden: you do not own this resource");
      }

      (req as any).resource = resource;
      next();
    } catch (err) {
      if (err instanceof AppError) {
        next(err);
      } else {
        next(new AppError(500, "Ownership verification failed"));
      }
    }
  };
}
