import { Router, Response } from "express";
import { AuthRequest, authenticate } from "../middleware/auth.js";
import { AppError } from "../middleware/error.js";
import { requireOrgMembership } from "../lib/org-utils.js";
import { aiRateLimit } from "../middleware/ai-rate-limit.js";
import { AIService } from "../services/ai/ai.service.js";
import { ConversationService } from "../services/ai/conversation.service.js";
import { AIAuditLogger } from "../services/ai/audit-logger.service.js";
import { AI_ACTIONS } from "../services/ai/ai-actions.js";
import { AiSettings } from "../lib/db/models/AiSettings.js";
import { AiConversation } from "../lib/db/models/AiConversation.js";
import type { AIProvider } from "../services/ai/types.js";

const router = Router();
const aiService = new AIService();
const conversationService = new ConversationService();
const auditLogger = new AIAuditLogger();

router.use(authenticate);

// ── Chat ──
router.post("/chat", aiRateLimit, async (req: AuthRequest, res: Response) => {
  try {
    const orgId = await requireOrgMembership(req.user!.userId, undefined, req.user!.email, req.user!.orgId);
    const { conversationId, prompt, context, workspaceContext, files, streaming } = req.body;

    if (!prompt || !context) {
      throw new AppError(400, "Prompt and context are required");
    }

    if (!["workspace", "staff"].includes(context)) {
      throw new AppError(400, "Context must be 'workspace' or 'staff'");
    }

    const result = await aiService.chat({
      orgId,
      userId: req.user!.userId,
      conversationId,
      prompt,
      context,
      workspaceContext,
      files,
      streaming: streaming !== false,
      ip: req.ip,
      userAgent: req.headers["user-agent"],
    });

    if (streaming !== false) {
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");
      res.setHeader("X-Conversation-Id", result.conversationId);

      const stream = result.response as AsyncIterable<import("../services/ai/types.js").AIStreamChunk>;
      for await (const chunk of stream) {
        if (chunk.done) {
          res.write(`data: ${JSON.stringify({ ...chunk, conversationId: result.conversationId })}\n\n`);
        } else {
          res.write(`data: ${JSON.stringify(chunk)}\n\n`);
        }
      }
      res.end();
    } else {
      res.json({
        success: true,
        data: result.response,
        conversationId: result.conversationId,
      });
    }
  } catch (err: any) {
    if (err instanceof AppError) throw err;
    throw new AppError(500, err.message || "AI chat failed");
  }
});

// ── Quick Actions ──
router.post("/actions/:action", aiRateLimit, async (req: AuthRequest, res: Response) => {
  try {
    const orgId = await requireOrgMembership(req.user!.userId, undefined, req.user!.email, req.user!.orgId);
    const { action } = req.params;
    const { prompt, context, workspaceContext } = req.body;

    const validAction = AI_ACTIONS.find(a => a.id === action);
    if (!validAction) {
      throw new AppError(400, `Unknown action: ${action}`);
    }

    const result = await aiService.quickAction({
      orgId,
      userId: req.user!.userId,
      action,
      prompt,
      context,
      workspaceContext,
    });

    res.json({ success: true, data: result });
  } catch (err: any) {
    if (err instanceof AppError) throw err;
    throw new AppError(500, err.message || "AI action failed");
  }
});

// ── Regenerate ──
router.post("/chat/:id/regenerate", aiRateLimit, async (req: AuthRequest, res: Response) => {
  try {
    const orgId = await requireOrgMembership(req.user!.userId, undefined, req.user!.email, req.user!.orgId);
    const result = await aiService.regenerate(req.params.id, orgId, req.user!.userId);

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    const stream = result.response as AsyncIterable<import("../services/ai/types.js").AIStreamChunk>;
    for await (const chunk of stream) {
      if (chunk.done) {
        res.write(`data: ${JSON.stringify({ ...chunk, conversationId: req.params.id })}\n\n`);
      } else {
        res.write(`data: ${JSON.stringify(chunk)}\n\n`);
      }
    }
    res.end();
  } catch (err: any) {
    if (err instanceof AppError) throw err;
    throw new AppError(500, err.message || "Regeneration failed");
  }
});

// ── Continue Response ──
router.post("/chat/:id/continue", aiRateLimit, async (req: AuthRequest, res: Response) => {
  try {
    const orgId = await requireOrgMembership(req.user!.userId, undefined, req.user!.email, req.user!.orgId);
    const result = await aiService.continueResponse(req.params.id, orgId, req.user!.userId);

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    const stream = result.response;
    for await (const chunk of stream) {
      if (chunk.done) {
        res.write(`data: ${JSON.stringify({ ...chunk, conversationId: req.params.id })}\n\n`);
      } else {
        res.write(`data: ${JSON.stringify(chunk)}\n\n`);
      }
    }
    res.end();
  } catch (err: any) {
    if (err instanceof AppError) throw err;
    throw new AppError(500, err.message || "Continue response failed");
  }
});

// ── Conversations ──
router.get("/conversations", async (req: AuthRequest, res: Response) => {
  try {
    const orgId = await requireOrgMembership(req.user!.userId, undefined, req.user!.email, req.user!.orgId);
    const { userId, context, search, page, limit } = req.query;

    const isAdmin = ["admin", "manager", "ORG_MENU_ADMIN"].includes(req.user!.role);
    const filterUserId = isAdmin && userId ? userId as string : req.user!.userId;

    const result = await conversationService.findByOrg(orgId, {
      userId: filterUserId,
      context: context as "workspace" | "staff" | undefined,
      search: search as string,
      page: page ? parseInt(page as string) : 1,
      limit: limit ? parseInt(limit as string) : 50,
    });

    res.json({ success: true, data: result.data, pagination: { total: result.total, page: result.page, totalPages: result.totalPages } });
  } catch (err: any) {
    if (err instanceof AppError) throw err;
    throw new AppError(500, err.message || "Failed to fetch conversations");
  }
});

router.get("/conversations/:id", async (req: AuthRequest, res: Response) => {
  try {
    const orgId = await requireOrgMembership(req.user!.userId, undefined, req.user!.email, req.user!.orgId);
    const conv = await conversationService.findById(req.params.id);

    if (!conv || conv.orgId !== orgId) {
      throw new AppError(404, "Conversation not found");
    }

    if (conv.userId !== req.user!.userId && !["admin", "manager", "ORG_MENU_ADMIN"].includes(req.user!.role)) {
      throw new AppError(403, "Access denied");
    }

    res.json({ success: true, data: conv });
  } catch (err: any) {
    if (err instanceof AppError) throw err;
    throw new AppError(500, err.message || "Failed to fetch conversation");
  }
});

router.get("/conversations/:id/messages", async (req: AuthRequest, res: Response) => {
  try {
    const orgId = await requireOrgMembership(req.user!.userId, undefined, req.user!.email, req.user!.orgId);
    const conv = await conversationService.findById(req.params.id);

    if (!conv || conv.orgId !== orgId) {
      throw new AppError(404, "Conversation not found");
    }

    if (conv.userId !== req.user!.userId && !["admin", "manager", "ORG_MENU_ADMIN"].includes(req.user!.role)) {
      throw new AppError(403, "Access denied");
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 100;

    const result = await conversationService.getMessages(req.params.id, page, limit);
    res.json({ success: true, data: result.data, pagination: { total: result.total, page, limit } });
  } catch (err: any) {
    if (err instanceof AppError) throw err;
    throw new AppError(500, err.message || "Failed to fetch messages");
  }
});

router.patch("/conversations/:id/title", async (req: AuthRequest, res: Response) => {
  try {
    const orgId = await requireOrgMembership(req.user!.userId, undefined, req.user!.email, req.user!.orgId);
    const conv = await conversationService.findById(req.params.id);

    if (!conv || conv.orgId !== orgId) {
      throw new AppError(404, "Conversation not found");
    }

    if (conv.userId !== req.user!.userId) {
      throw new AppError(403, "Access denied");
    }

    await conversationService.updateTitle(req.params.id, req.body.title);
    res.json({ success: true });
  } catch (err: any) {
    if (err instanceof AppError) throw err;
    throw new AppError(500, err.message || "Failed to update title");
  }
});

router.post("/conversations/:id/pin", async (req: AuthRequest, res: Response) => {
  try {
    const orgId = await requireOrgMembership(req.user!.userId, undefined, req.user!.email, req.user!.orgId);
    const conv = await conversationService.findById(req.params.id);

    if (!conv || conv.orgId !== orgId) {
      throw new AppError(404, "Conversation not found");
    }

    if (conv.userId !== req.user!.userId) {
      throw new AppError(403, "Access denied");
    }

    await conversationService.togglePin(req.params.id);
    res.json({ success: true });
  } catch (err: any) {
    if (err instanceof AppError) throw err;
    throw new AppError(500, err.message || "Failed to toggle pin");
  }
});

router.delete("/conversations/:id", async (req: AuthRequest, res: Response) => {
  try {
    const orgId = await requireOrgMembership(req.user!.userId, undefined, req.user!.email, req.user!.orgId);
    const conv = await conversationService.findById(req.params.id);

    if (!conv || conv.orgId !== orgId) {
      throw new AppError(404, "Conversation not found");
    }

    if (conv.userId !== req.user!.userId && !["admin", "manager", "ORG_MENU_ADMIN"].includes(req.user!.role)) {
      throw new AppError(403, "Access denied");
    }

    await conversationService.softDelete(req.params.id, orgId, req.user!.userId);
    res.json({ success: true });
  } catch (err: any) {
    if (err instanceof AppError) throw err;
    throw new AppError(500, err.message || "Failed to delete conversation");
  }
});

// ── Message Feedback ──
router.post("/messages/:id/feedback", async (req: AuthRequest, res: Response) => {
  try {
    const { feedback } = req.body;
    if (!["like", "dislike", null].includes(feedback)) {
      throw new AppError(400, "Feedback must be 'like', 'dislike', or null");
    }
    await conversationService.setFeedback(req.params.id, feedback);
    res.json({ success: true });
  } catch (err: any) {
    if (err instanceof AppError) throw err;
    throw new AppError(500, err.message || "Failed to set feedback");
  }
});

// ── Actions List ──
router.get("/actions", (_req: AuthRequest, res: Response) => {
  res.json({ success: true, data: AI_ACTIONS });
});

// ── Settings ──
router.get("/settings", async (req: AuthRequest, res: Response) => {
  try {
    const orgId = await requireOrgMembership(req.user!.userId, undefined, req.user!.email, req.user!.orgId);

    if (!["admin", "manager", "ORG_MENU_ADMIN"].includes(req.user!.role)) {
      throw new AppError(403, "Access denied. Only admins can view AI settings.");
    }

    const settings = await AiSettings.findOne({ orgId }).lean();
    res.json({ success: true, data: settings || {} });
  } catch (err: any) {
    if (err instanceof AppError) throw err;
    throw new AppError(500, err.message || "Failed to fetch AI settings");
  }
});

router.put("/settings", async (req: AuthRequest, res: Response) => {
  try {
    const orgId = await requireOrgMembership(req.user!.userId, undefined, req.user!.email, req.user!.orgId);

    if (!["admin", "manager", "ORG_MENU_ADMIN"].includes(req.user!.role)) {
      throw new AppError(403, "Access denied. Only admins can modify AI settings.");
    }

    const allowedFields = [
      "provider", "aiModel", "temperature", "maxTokens", "responseLength",
      "streamingEnabled", "systemPrompt", "allowedFileTypes", "maxUploadSize",
      "conversationRetentionDays", "rateLimitRequests", "rateLimitWindowMs",
    ];

    const update: Record<string, unknown> = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        update[field] = req.body[field];
      }
    }

    update.updatedBy = req.user!.userId;

    const settings = await AiSettings.findOneAndUpdate(
      { orgId },
      { $set: update },
      { upsert: true, new: true },
    );

    res.json({ success: true, data: settings });
  } catch (err: any) {
    if (err instanceof AppError) throw err;
    throw new AppError(500, err.message || "Failed to update AI settings");
  }
});

// ── Audit Logs ──
router.get("/audit-logs", async (req: AuthRequest, res: Response) => {
  try {
    const orgId = await requireOrgMembership(req.user!.userId, undefined, req.user!.email, req.user!.orgId);

    if (!["admin", "manager", "ORG_MENU_ADMIN"].includes(req.user!.role)) {
      throw new AppError(403, "Access denied. Only admins can view audit logs.");
    }

    const { userId, action, status, startDate, endDate, page, limit } = req.query;

    const result = await auditLogger.getAuditLogs(orgId, {
      userId: userId as string,
      action: action as string,
      status: status as "success" | "failure" | undefined,
      startDate: startDate ? new Date(startDate as string) : undefined,
      endDate: endDate ? new Date(endDate as string) : undefined,
      page: page ? parseInt(page as string) : 1,
      limit: limit ? parseInt(limit as string) : 50,
    });

    res.json({ success: true, data: result.data, pagination: { total: result.total, page: result.page, totalPages: result.totalPages } });
  } catch (err: any) {
    if (err instanceof AppError) throw err;
    throw new AppError(500, err.message || "Failed to fetch audit logs");
  }
});

// ── Usage Stats ──
router.get("/usage", async (req: AuthRequest, res: Response) => {
  try {
    const orgId = await requireOrgMembership(req.user!.userId, undefined, req.user!.email, req.user!.orgId);

    if (!["admin", "manager", "ORG_MENU_ADMIN"].includes(req.user!.role)) {
      throw new AppError(403, "Access denied. Only admins can view usage stats.");
    }

    const { userId, startDate, endDate } = req.query;

    const stats = await auditLogger.getUsageStats(orgId, {
      userId: userId as string,
      startDate: startDate ? new Date(startDate as string) : undefined,
      endDate: endDate ? new Date(endDate as string) : undefined,
    });

    res.json({ success: true, data: stats });
  } catch (err: any) {
    if (err instanceof AppError) throw err;
    throw new AppError(500, err.message || "Failed to fetch usage stats");
  }
});

export default router;
