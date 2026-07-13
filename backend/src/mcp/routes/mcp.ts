import { Router, Response } from "express";
import { v4 as uuidv4 } from "uuid";
import { authenticateMCP, type MCPAuthenticatedRequest } from "../middleware/auth.js";
import { enforceTenantIsolation } from "../middleware/tenant.js";
import { auditLog } from "../middleware/audit.js";
import { toolRegistry } from "../tools/registry.js";
import { mcpSessionManager } from "../session/manager.js";
import { mcpMemoryManager } from "../memory/manager.js";
import type { MCPContext, MCPResponse } from "../types.js";

const router = Router();

router.use(authenticateMCP);
router.use(enforceTenantIsolation());

// POST /api/mcp/execute — Execute an MCP tool
router.post(
  "/execute",
  auditLog("execute", "mcp"),
  async (req: MCPAuthenticatedRequest, res: Response): Promise<void> => {
    const requestId = uuidv4();

    try {
      const { action, params, sessionId } = req.body as {
        action: string;
        params?: Record<string, unknown>;
        sessionId?: string;
      };

      if (!action) {
        res.status(400).json({
          success: false,
          error: "Missing 'action' field",
          sessionId: sessionId || "",
          requestId,
        } as MCPResponse);
        return;
      }

      const auth = req.mcpContext!;

      let session;
      if (sessionId) {
        const existing = await mcpSessionManager.getSession(sessionId);
        if (!existing) {
          res.status(401).json({
            success: false,
            error: "Session expired or not found. Create a new session first.",
            sessionId: "",
            requestId,
          } as MCPResponse);
          return;
        }
        session = existing.session;
        auth.sessionId = existing.auth.sessionId;
      } else {
        const created = await mcpSessionManager.createSession(auth);
        auth.sessionId = created.sessionId;

        const { Organization } = await import("../../lib/db/models/Organization.js");
        const org = await Organization.findOne({ id: auth.orgId }).lean();

        session = {
          sessionId: created.sessionId,
          userId: auth.userId,
          orgId: auth.orgId,
          role: auth.role,
          soulContent: created.soulContent,
          context: created.context,
          expiresAt: new Date(Date.now() + 86400000),
          createdAt: new Date(),
          lastActivityAt: new Date(),
        };

        const soulLoadResult = await toolRegistry.execute("soul.load", {}, {
          user: auth,
          org: { id: auth.orgId, name: org?.name || "", slug: org?.slug || "" },
        });

        if (soulLoadResult.success) {
          session.soulContent = (soulLoadResult.data as Record<string, string>).soul || "";
        }
      }

      const { Organization } = await import("../../lib/db/models/Organization.js");
      const org = await Organization.findOne({ id: auth.orgId }).lean();

      const ctx: MCPContext = {
        user: auth,
        org: {
          id: auth.orgId,
          name: org?.name || session.context.companyName,
          slug: org?.slug || "",
        },
      };

      const result = await toolRegistry.execute(action, params || {}, ctx);

      res.json(result as MCPResponse);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Internal MCP error";
      res.status(500).json({
        success: false,
        error: message,
        sessionId: req.mcpContext?.sessionId || "",
        requestId,
      } as MCPResponse);
    }
  }
);

// POST /api/mcp/session/create — Create a new MCP session explicitly
router.post(
  "/session/create",
  auditLog("session.create", "session"),
  async (req: MCPAuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const auth = req.mcpContext!;
      const { sessionId, soulContent, context } = await mcpSessionManager.createSession(auth);

      const result = await toolRegistry.execute("soul.load", {}, {
        user: auth,
        org: { id: auth.orgId, name: context.companyName, slug: "" },
      });

      res.json({
        success: true,
        data: {
          sessionId,
          context,
          soulLoaded: result.success,
          expiresAt: new Date(Date.now() + 86400000),
        },
        sessionId,
        requestId: uuidv4(),
      } as MCPResponse);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to create session";
      res.status(500).json({
        success: false,
        error: message,
        sessionId: "",
        requestId: uuidv4(),
      } as MCPResponse);
    }
  }
);

// POST /api/mcp/session/destroy — Destroy an MCP session
router.post(
  "/session/destroy",
  auditLog("session.destroy", "session"),
  async (req: MCPAuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { sessionId } = req.body as { sessionId?: string };
      if (!sessionId) {
        res.status(400).json({
          success: false,
          error: "sessionId is required",
          sessionId: "",
          requestId: uuidv4(),
        } as MCPResponse);
        return;
      }

      await mcpSessionManager.destroySession(sessionId);
      await mcpMemoryManager.clearSessionMemory(
        sessionId,
        req.mcpContext!.userId,
        req.mcpContext!.orgId
      );

      res.json({
        success: true,
        data: { destroyed: true, sessionId },
        sessionId: "",
        requestId: uuidv4(),
      } as MCPResponse);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to destroy session";
      res.status(500).json({
        success: false,
        error: message,
        sessionId: "",
        requestId: uuidv4(),
      } as MCPResponse);
    }
  }
);

// GET /api/mcp/tools — List available tools for the current user
router.get(
  "/tools",
  async (req: MCPAuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const role = req.mcpContext!.role;
      const allTools = toolRegistry.listTools();

      const allowed = allTools
        .filter((t) => t.requiredRole.some((r) => r === role))
        .map((t) => ({
          name: t.name,
          description: t.description,
        }));

      res.json({
        success: true,
        data: { tools: allowed, count: allowed.length },
        sessionId: req.mcpContext?.sessionId || "",
        requestId: uuidv4(),
      } as MCPResponse);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to list tools";
      res.status(500).json({
        success: false,
        error: message,
        sessionId: "",
        requestId: uuidv4(),
      } as MCPResponse);
    }
  }
);

// GET /api/mcp/memory — Get conversation history for the current session
router.get(
  "/memory",
  async (req: MCPAuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { sessionId } = req.query as { sessionId?: string };
      if (!sessionId) {
        res.status(400).json({
          success: false,
          error: "sessionId query parameter is required",
          sessionId: "",
          requestId: uuidv4(),
        } as MCPResponse);
        return;
      }

      const history = await mcpMemoryManager.getConversationHistory(
        sessionId,
        req.mcpContext!.userId,
        req.mcpContext!.orgId
      );

      res.json({
        success: true,
        data: { history, count: history.length },
        sessionId,
        requestId: uuidv4(),
      } as MCPResponse);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to get memory";
      res.status(500).json({
        success: false,
        error: message,
        sessionId: "",
        requestId: uuidv4(),
      } as MCPResponse);
    }
  }
);

// POST /api/mcp/memory — Add an entry to conversation memory
router.post(
  "/memory",
  async (req: MCPAuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { sessionId, role, content, metadata } = req.body as {
        sessionId: string;
        role: "user" | "assistant" | "system";
        content: string;
        metadata?: Record<string, unknown>;
      };

      if (!sessionId || !role || !content) {
        res.status(400).json({
          success: false,
          error: "sessionId, role, and content are required",
          sessionId: sessionId || "",
          requestId: uuidv4(),
        } as MCPResponse);
        return;
      }

      await mcpMemoryManager.addEntry({
        sessionId,
        userId: req.mcpContext!.userId,
        orgId: req.mcpContext!.orgId,
        role,
        content,
        metadata,
      });

      res.json({
        success: true,
        data: { stored: true },
        sessionId,
        requestId: uuidv4(),
      } as MCPResponse);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to store memory";
      res.status(500).json({
        success: false,
        error: message,
        sessionId: "",
        requestId: uuidv4(),
      } as MCPResponse);
    }
  }
);

export default router;
