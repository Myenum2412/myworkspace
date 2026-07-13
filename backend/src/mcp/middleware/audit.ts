import { Response, NextFunction } from "express";
import { v4 as uuidv4 } from "uuid";
import { MCPAudit } from "../models/mcp-audit.js";
import type { MCPAuthenticatedRequest } from "./auth.js";

export function auditLog(action: string, tool: string) {
  return async (req: MCPAuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    const start = Date.now();
    const originalJson = res.json.bind(res);

    res.json = function (body: unknown) {
      const durationMs = Date.now() - start;
      const result = (body as Record<string, unknown>)?.success === false ? "error" : "success";

      MCPAudit.create({
        requestId: uuidv4(),
        sessionId: req.mcpContext?.sessionId || "",
        userId: req.mcpContext?.userId || "",
        orgId: req.mcpContext?.orgId || "",
        action,
        tool,
        params: { ...req.body, ...req.query },
        result,
        ip: req.ip || req.socket?.remoteAddress || "",
        timestamp: new Date(),
        durationMs,
      }).catch((err) => {
        console.error("MCP audit log error:", err);
      });

      return originalJson(body);
    } as typeof res.json;

    next();
  };
}
