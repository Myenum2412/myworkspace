import { Router, Request, Response } from "express";
import { AIAgent, type AgentRequest } from "../services/ai/agent/agent.js";
import { ChatLogRepository } from "../services/ai/repositories/chat-log.repository.js";
import { MemoryManager } from "../services/ai/memory/memory-manager.js";
import { ToolRegistry } from "../services/ai/tools/registry.js";
import { AI_CONFIG } from "../services/ai/config.js";
import { logger } from "../lib/logger/index.js";
import { authenticate } from "../middleware/auth.js";

const router = Router();
const chatLogRepo = new ChatLogRepository();

router.post("/agent/chat", authenticate, async (req: Request, res: Response) => {
  const startTime = Date.now();

  try {
    const { message, sessionId, customerPhone, customerName } = req.body;
    const userId = (req as any).user?.userId || "anonymous";
    const organizationId = (req as any).orgId;

    if (!message || typeof message !== "string" || !message.trim()) {
      res.status(400).json({ success: false, error: "Message is required" });
      return;
    }

    const agentSessionId = sessionId || `agent_${userId}_${Date.now()}`;

    const agent = new AIAgent();

    const agentRequest: AgentRequest = {
      userId,
      sessionId: agentSessionId,
      message: message.trim(),
      organizationId,
      customerName,
      customerPhone,
      stream: false,
    };

    const result = await agent.run(agentRequest);

    await chatLogRepo.log({
      customerPhone: customerPhone || userId,
      customerName,
      incomingMessage: message.trim(),
      outgoingMessage: result.reply,
      intent: result.intent,
      intentConfidence: 1.0,
      entities: {},
      language: result.language,
      databaseOperations: [],
      processingTimeMs: result.durationMs,
      aiModel: AI_CONFIG.model,
      tokensUsed: result.tokensUsed,
      status: "success",
      channel: "whatsapp",
    });

    logger.info({
      sessionId: agentSessionId,
      userId,
      durationMs: result.durationMs,
      tokensUsed: result.tokensUsed,
      toolCalls: result.toolCalls,
      intent: result.intent,
    }, "AI Agent request completed");

    res.json({
      success: true,
      data: {
        reply: result.reply,
        sessionId: agentSessionId,
        turnCount: result.turnCount,
        tokensUsed: result.tokensUsed,
        processingTimeMs: result.durationMs,
        toolCalls: result.toolCalls,
        intent: result.intent,
        language: result.language,
      },
    });
  } catch (error: unknown) {
    const durationMs = Date.now() - startTime;
    const errMsg = error instanceof Error ? error.message : String(error);
    logger.error({ error: errMsg, durationMs }, "AI Agent chat endpoint error");

    const message = (req as any).body?.message || "";
    const userId = (req as any).user?.userId || "anonymous";

    await chatLogRepo.log({
      customerPhone: userId,
      customerName: (req as any).body?.customerName,
      incomingMessage: message,
      outgoingMessage: "",
      intent: "unknown",
      intentConfidence: 0,
      entities: {},
      language: AI_CONFIG.defaultLanguage,
      databaseOperations: [],
      processingTimeMs: durationMs,
      aiModel: AI_CONFIG.model,
      tokensUsed: 0,
      status: "error",
      errorMessage: errMsg,
      channel: "whatsapp",
    }).catch((logErr) => {
      logger.error({ error: logErr }, "Failed to log error to chat log");
    });

    res.status(500).json({
      success: false,
      error: "AI processing failed. Please try again.",
    });
  }
});

router.get("/agent/session/:sessionId", authenticate, async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    const session = MemoryManager.getInstance().getSessionManager().getSession(String(sessionId));

    if (!session) {
      res.status(404).json({ success: false, error: "Session not found" });
      return;
    }

    res.json({
      success: true,
      data: {
        sessionId: session.sessionId,
        turnCount: session.metadata.turnCount,
        tokenCount: session.metadata.tokenCount,
        compressed: session.metadata.compressed,
        createdAt: session.createdAt,
        updatedAt: session.updatedAt,
        messageCount: session.messages.length,
      },
    });
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error);
    logger.error({ error: errMsg }, "Failed to fetch session");
    res.status(500).json({ success: false, error: errMsg });
  }
});

router.delete("/agent/session/:sessionId", authenticate, async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    await MemoryManager.getInstance().getSessionManager().clearSession(String(sessionId));
    res.json({ success: true, message: "Session cleared" });
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error);
    res.status(500).json({ success: false, error: errMsg });
  }
});

router.get("/agent/tools", authenticate, async (_req: Request, res: Response) => {
  try {
    const registry = ToolRegistry.getInstance();
    await registry.initializeBuiltInTools();

    res.json({
      success: true,
      data: {
        toolsets: registry.getToolsetNames(),
        toolCount: registry.getToolCount(),
        definitions: registry.getDefinitions(),
      },
    });
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error);
    res.status(500).json({ success: false, error: errMsg });
  }
});

router.post("/agent/memory", authenticate, async (req: Request, res: Response) => {
  try {
    const { content, type, tags } = req.body;
    const userId = (req as any).user?.userId || "anonymous";

    if (!content) {
      res.status(400).json({ success: false, error: "Content is required" });
      return;
    }

    const entry = await MemoryManager.getInstance().getPersistentMemory().addMemory(
      userId,
      String(content),
      type || "fact",
      "user",
      tags || []
    );

    res.json({ success: true, data: { id: entry.id, content: entry.content } });
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error);
    res.status(500).json({ success: false, error: errMsg });
  }
});

router.get("/agent/memory", authenticate, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.userId || "anonymous";
    const memories = await MemoryManager.getInstance().getPersistentMemory().getMemories(userId);

    res.json({
      success: true,
      data: memories.map((m) => ({
        id: m.id,
        content: m.content,
        type: m.type,
        source: m.source,
        tags: m.tags,
        createdAt: m.createdAt,
        updatedAt: m.updatedAt,
      })),
    });
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error);
    res.status(500).json({ success: false, error: errMsg });
  }
});

export default router;
