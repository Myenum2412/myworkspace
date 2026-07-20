import { Response, NextFunction } from "express";
import { Model } from "mongoose";
import { AuthRequest } from "./auth.js";
import { AppError } from "./error.js";
import { recordAuditLog } from "../services/audit.service.js";
import { logger } from "../lib/logger/index.js";
import { isAdminRole, hasAnyRole, ROLES } from "../lib/rbac/index.js";

export type OwnershipMode = "user" | "org" | "team" | "hierarchical";

export interface OwnershipOptions {
  model: Model<any>;
  ownerField: string;
  orgField?: string;
  teamField?: string;
  managerField?: string;
  idSource?: (req: AuthRequest) => string;
  mode?: OwnershipMode;
  adminBypass?: boolean;
}

/**
 * Enhanced ownership verification middleware.
 * Supports multiple ownership modes: user, org, team, hierarchical.
 */
export function verifyOwnership(
  modelOrOptions: Model<any> | OwnershipOptions,
  ownerField?: string,
  idSource?: (req: AuthRequest) => string,
) {
  // Support legacy signature: verifyOwnership(model, ownerField, idSource)
  const options: OwnershipOptions = typeof modelOrOptions === "object" && "model" in modelOrOptions
    ? modelOrOptions
    : { model: modelOrOptions as Model<any>, ownerField: ownerField!, idSource };

  const {
    model,
    ownerField: ownerFld,
    orgField = "orgId",
    teamField = "teamId",
    managerField = "managerId",
    idSource: idSrc,
    mode = "user",
    adminBypass = true,
  } = options;

  return async (req: AuthRequest, _res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new AppError(401, "Authentication required");
      }

      const resourceId = idSrc ? idSrc(req) : req.params.id;
      if (!resourceId) {
        throw new AppError(400, "Resource ID is required");
      }

      const doc = await model.findById(resourceId).lean();
      if (!doc) {
        throw new AppError(404, `${model.modelName} not found`);
      }

      const resource = doc as Record<string, unknown>;
      let isAuthorized = false;
      let denialReason = "";

      // Admin bypass: org admins and members can access any resource in their org
      if (adminBypass && isAdminRole(req.user.role)) {
        const resourceOrgId = (resource[orgField] ?? "").toString();
        if (resourceOrgId && resourceOrgId === req.user.orgId) {
          isAuthorized = true;
        }
      }

      if (!isAuthorized) {
        switch (mode) {
          case "user":
            // Direct user ownership
            const ownerValue = (resource[ownerFld] ?? "").toString();
            isAuthorized = ownerValue === req.user.userId;
            if (!isAuthorized) denialReason = `owner mismatch: expected ${req.user.userId}, got ${ownerValue}`;
            break;

          case "org":
            // Org-level ownership: resource belongs to user's org
            const resourceOrgId = (resource[orgField] ?? "").toString();
            isAuthorized = resourceOrgId === req.user.orgId;
            if (!isAuthorized) denialReason = `org mismatch: expected ${req.user.orgId}, got ${resourceOrgId}`;
            break;

          case "team":
            // Team-level ownership: resource belongs to user's team
            const resourceTeamId = (resource[teamField] ?? "").toString();
            // User must be a member of the team (simplified: check if user is in team members array)
            const teamMembers = (resource.teamMembers ?? resource.members ?? []) as string[];
            isAuthorized = teamMembers.includes(req.user.userId) || resourceTeamId === (resource as any).teamId;
            if (!isAuthorized) denialReason = `not a team member`;
            break;

          case "hierarchical":
            // Hierarchical ownership: user owns resource OR is manager of owner
            const directOwner = (resource[ownerFld] ?? "").toString();
            if (directOwner === req.user.userId) {
              isAuthorized = true;
            } else {
              // Check if user is manager of the owner
              const resourceManager = (resource[managerField] ?? "").toString();
              if (resourceManager === req.user.userId) {
                isAuthorized = true;
              } else {
                // Check if user has manager/HR role and same org
                const resourceOrgId = (resource[orgField] ?? "").toString();
                if (resourceOrgId === req.user.orgId && hasAnyRole(req.user.role, [ROLES.ORG_ADMIN, ROLES.MEMBERS, ROLES.MANAGER, ROLES.HR])) {
                  isAuthorized = true;
                }
              }
            }
            if (!isAuthorized) denialReason = `not owner, manager, or admin`;
            break;
        }
      }

      if (!isAuthorized) {
        logger.warn({
          userId: req.user.userId,
          role: req.user.role,
          resourceId,
          resourceType: model.modelName,
          mode,
          denialReason,
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
          description: `Unauthorized access attempt to ${model.modelName} ${resourceId} by user ${req.user.userId} (${denialReason})`,
          metadata: JSON.stringify({
            ip: req.ip,
            userAgent: req.headers["user-agent"],
            method: req.method,
            path: req.originalUrl,
            mode,
            ownerField: ownerFld,
            denialReason,
          }),
        });

        throw new AppError(403, "Forbidden: you do not have access to this resource");
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

/**
 * Legacy verifyOwnership for backward compatibility.
 */
export function verifyOwnershipLegacy(
  model: Model<any>,
  ownerField: string,
  idSource?: (req: AuthRequest) => string,
) {
  return verifyOwnership({ model, ownerField, idSource, mode: "user" });
}
