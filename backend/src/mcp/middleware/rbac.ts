import { Response, NextFunction } from "express";
import type { MCPRole } from "../types.js";
import type { MCPAuthenticatedRequest } from "./auth.js";
import { AppError } from "../../middleware/error.js";

const RBAC_MATRIX: Record<MCPRole, Record<string, "allow" | "deny">> = {
  admin: {
    "profile.get": "allow",
    "profile.list": "allow",
    "soul.load": "allow",
    "engagement.create": "allow",
    "engagement.update": "allow",
    "engagement.get": "allow",
    "engagement.list": "allow",
    "engagement.delete": "allow",
    "stocks.search": "allow",
    "stocks.compare": "allow",
    "stocks.recommend": "allow",
    "stocks.get": "allow",
    "appointment.create": "allow",
    "session.destroy": "allow",
  },
  manager: {
    "profile.get": "allow",
    "profile.list": "allow",
    "soul.load": "allow",
    "engagement.create": "allow",
    "engagement.update": "allow",
    "engagement.get": "allow",
    "engagement.list": "allow",
    "stocks.search": "allow",
    "stocks.compare": "allow",
    "stocks.recommend": "allow",
    "stocks.get": "allow",
    "appointment.create": "allow",
  },
  member: {
    "profile.get": "allow",
    "soul.load": "allow",
    "engagement.create": "allow",
    "engagement.update": "allow",
    "engagement.get": "allow",
    "stocks.search": "allow",
    "stocks.compare": "allow",
    "stocks.recommend": "allow",
    "stocks.get": "allow",
  },
};

export function requireToolAccess(toolAction: string) {
  return (req: MCPAuthenticatedRequest, _res: Response, next: NextFunction): void => {
    const role = req.mcpContext?.role;
    if (!role) {
      next(new AppError(403, "MCP: No role context"));
      return;
    }

    const matrix = RBAC_MATRIX[role];
    if (!matrix) {
      next(new AppError(403, `MCP: Unknown role '${role}'`));
      return;
    }

    const permission = matrix[toolAction];
    if (!permission || permission === "deny") {
      next(new AppError(403, `MCP: Role '${role}' is not authorized for '${toolAction}'`));
      return;
    }

    next();
  };
}
