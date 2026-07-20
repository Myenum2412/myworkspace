import { Response, NextFunction } from "express";
import { AuthRequest } from "./auth.js";
import { AppError } from "./error.js";
import { enforce, buildFileResource, buildFolderResource } from "../config/casbin.js";
import { rbacLogger } from "../lib/logger/index.js";

export type ResourceType = "file" | "folder" | "upload";

export type ActionType = "view" | "upload" | "download" | "edit" | "delete" | "share" | "restore" | "archive" | "create" | "resume" | "cancel" | "pause";

export interface FileResourceParams {
  orgId?: string;
  projectId?: string;
  clientId?: string;
  workspaceId?: string;
  fileId?: string;
}

export interface FolderResourceParams {
  orgId?: string;
  projectId?: string;
  clientId?: string;
}

export function casbinAuthorize(resourceType: ResourceType, action: ActionType) {
  return async (req: AuthRequest, _res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new AppError(401, "Authentication required");
      }

      const role = req.user.role || "guest";
      let resource: string;

      if (resourceType === "file") {
        const params: FileResourceParams = {
          orgId: req.user.orgId || req.body?.orgId || req.query?.orgId as string,
          projectId: req.body?.projectId || req.query?.projectId as string,
          clientId: req.body?.clientId || req.query?.clientId as string,
          fileId: req.params?.id || req.body?.fileId,
        };
        resource = buildFileResource(params);
      } else if (resourceType === "folder") {
        const params: FolderResourceParams = {
          orgId: req.user.orgId || req.body?.orgId || req.query?.orgId as string,
          projectId: req.body?.projectId || req.query?.projectId as string,
          clientId: req.body?.clientId || req.query?.clientId as string,
        };
        resource = buildFolderResource(params);
      } else {
        // Upload scope is NEVER taken from client input - always derive from auth context
        if (req.user.role === "org_admin") {
          resource = ":org_upload";
        } else if (req.user.orgId) {
          resource = ":org_upload";
        } else {
          resource = ":project_upload";
        }
      }

      const allowed = await enforce(role, resource, action);

      if (!allowed) {
        rbacLogger.warn({ userId: req.user.userId, role, resource, action }, "Casbin access denied");
        throw new AppError(403, `Forbidden: insufficient permissions to ${action} this ${resourceType}`);
      }

      rbacLogger.debug({ userId: req.user.userId, role, resource, action }, "Casbin access granted");
      next();
    } catch (err) {
      if (err instanceof AppError) {
        next(err);
      } else {
        next(new AppError(500, "Authorization check failed"));
      }
    }
  };
}

export function casbinCheckFileAccess(action: ActionType) {
  return casbinAuthorize("file", action);
}

export function casbinCheckFolderAccess(action: ActionType) {
  return casbinAuthorize("folder", action);
}

export function casbinCheckUploadAccess(action: ActionType) {
  return casbinAuthorize("upload", action);
}
