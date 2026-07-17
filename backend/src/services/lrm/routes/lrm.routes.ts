import { Router, Request, Response } from "express";
import { authenticate } from "../../../middleware/auth.js";
import { requireOrgMembership } from "../../../lib/org-utils.js";
import { LRMService } from "../lrm.service.js";
import { logger } from "../../../lib/logger/index.js";

const router = Router();
const lrm = new LRMService();

router.use(authenticate);

// POST /api/lrm/query - Main LRM query endpoint
router.post("/query", async (req: Request, res: Response) => {
  try {
    const { query, context, options } = req.body;
    if (!query || typeof query !== "string") {
      return res.status(400).json({ success: false, error: "Query is required" });
    }

    const userId = (req as any).user?.id || (req as any).user?.userId;
    await requireOrgMembership(userId, req.body.orgId);

    const result = await lrm.query({
      userId,
      orgId: req.body.orgId,
      query,
      context: context || {},
      options: { stream: false, ...options },
    });

    return res.json({ success: true, data: result });
  } catch (err: any) {
    logger.warn({ err }, "LRM query failed");
    return res.status(err.status || 500).json({
      success: false,
      error: err.message || "LRM query failed",
    });
  }
});

// POST /api/lrm/query/stream - Streaming query
router.post("/query/stream", async (req: Request, res: Response) => {
  try {
    const { query, context, options } = req.body;
    if (!query || typeof query !== "string") {
      return res.status(400).json({ success: false, error: "Query is required" });
    }

    const userId = (req as any).user?.id || (req as any).user?.userId;
    await requireOrgMembership(userId, req.body.orgId);

    const result = await lrm.query({
      userId,
      orgId: req.body.orgId,
      query,
      context: context || {},
      options: { stream: false, ...options },
    });

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    const lines = result.response.split(" ");
    for (let i = 0; i < lines.length; i += 3) {
      const chunk = lines.slice(i, i + 3).join(" ") + " ";
      res.write(`data: ${JSON.stringify({ content: chunk })}\n\n`);
      await new Promise(r => setTimeout(r, 30));
    }
    res.write(`data: ${JSON.stringify({ done: true, confidence: result.confidence, sources: result.sources })}\n\n`);
    res.end();
  } catch (err: any) {
    logger.warn({ err }, "LRM stream query failed");
    res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
    res.end();
  }
});

// POST /api/lrm/council - Convene council deliberation
router.post("/council", async (req: Request, res: Response) => {
  try {
    const { problem, mode, members } = req.body;
    if (!problem || typeof problem !== "string") {
      return res.status(400).json({ success: false, error: "Problem is required" });
    }

    const userId = (req as any).user?.id || (req as any).user?.userId;
    await requireOrgMembership(userId, req.body.orgId);

    const verdict = await lrm.council.deliberate({
      problem,
      mode: mode || "quick",
      members: members || undefined,
      userId,
      orgId: req.body.orgId,
    });

    return res.json({ success: true, data: verdict });
  } catch (err: any) {
    return res.status(err.status || 500).json({
      success: false,
      error: err.message || "Council deliberation failed",
    });
  }
});

// GET /api/lrm/council/agents - List all council agents
router.get("/council/agents", (_req: Request, res: Response) => {
  const { ALL_AGENTS } = require("../council/agents.js");
  return res.json({
    success: true,
    data: ALL_AGENTS.map((a: any) => ({
      id: a.id, figure: a.figure, domain: a.domain, polarity: a.polarity,
    })),
  });
});

// POST /api/lrm/memory/search - Search memory
router.post("/memory/search", async (req: Request, res: Response) => {
  try {
    const { query, tier, limit } = req.body;
    const userId = (req as any).user?.id || (req as any).user?.userId;
    await requireOrgMembership(userId, req.body.orgId);

    const memories = await lrm.stm.recall(req.body.orgId, userId, tier, limit || 20);
    return res.json({ success: true, data: memories });
  } catch (err: any) {
    return res.status(err.status || 500).json({
      success: false,
      error: err.message || "Memory search failed",
    });
  }
});

// POST /api/lrm/memory/store - Store a memory
router.post("/memory/store", async (req: Request, res: Response) => {
  try {
    const { content, tier, importance } = req.body;
    if (!content) return res.status(400).json({ success: false, error: "Content is required" });

    const userId = (req as any).user?.id || (req as any).user?.userId;
    await requireOrgMembership(userId, req.body.orgId);

    const id = await lrm.stm.store({
      orgId: req.body.orgId, userId, content, tier: tier || "short-term",
      metadata: req.body.metadata || {}, importance: importance || 0.5,
    });

    return res.json({ success: true, data: { id } });
  } catch (err: any) {
    return res.status(err.status || 500).json({
      success: false,
      error: err.message || "Memory store failed",
    });
  }
});

// POST /api/lrm/rag/search - RAG search
router.post("/rag/search", async (req: Request, res: Response) => {
  try {
    const { query, topK } = req.body;
    if (!query) return res.status(400).json({ success: false, error: "Query is required" });

    const userId = (req as any).user?.id || (req as any).user?.userId;
    await requireOrgMembership(userId, req.body.orgId);

    const results = await lrm.rag.search(query, req.body.orgId, topK || 5);
    return res.json({ success: true, data: results });
  } catch (err: any) {
    return res.status(err.status || 500).json({
      success: false,
      error: err.message || "RAG search failed",
    });
  }
});

// POST /api/lrm/rag/index - Index content for RAG
router.post("/rag/index", async (req: Request, res: Response) => {
  try {
    const { content, source } = req.body;
    if (!content || !source) {
      return res.status(400).json({ success: false, error: "Content and source are required" });
    }

    const userId = (req as any).user?.id || (req as any).user?.userId;
    await requireOrgMembership(userId, req.body.orgId);

    const chunkIds = await lrm.rag.indexDocument(content, source, req.body.orgId);
    return res.json({ success: true, data: { chunkIds, count: chunkIds.length } });
  } catch (err: any) {
    return res.status(err.status || 500).json({
      success: false,
      error: err.message || "RAG indexing failed",
    });
  }
});

// POST /api/lrm/rag/query - RAG query with context
router.post("/rag/query", async (req: Request, res: Response) => {
  try {
    const { query } = req.body;
    if (!query) return res.status(400).json({ success: false, error: "Query is required" });

    const userId = (req as any).user?.id || (req as any).user?.userId;
    await requireOrgMembership(userId, req.body.orgId);

    const result = await lrm.rag.queryWithContext(query, req.body.orgId, req.body.systemPrompt);
    return res.json({ success: true, data: result });
  } catch (err: any) {
    return res.status(err.status || 500).json({
      success: false,
      error: err.message || "RAG query failed",
    });
  }
});

// GET /api/lrm/graph/entities - Search entities
router.get("/graph/entities", async (req: Request, res: Response) => {
  try {
    const orgId = req.query.orgId as string;
    const query = req.query.query as string || "";
    const type = req.query.type as string;
    const userId = (req as any).user?.id || (req as any).user?.userId;
    await requireOrgMembership(userId, orgId);

    const entities = await lrm.graphStore.searchEntities(
      query, orgId, type as any,
      parseInt(req.query.limit as string) || 20
    );
    return res.json({ success: true, data: entities });
  } catch (err: any) {
    return res.status(err.status || 500).json({
      success: false,
      error: err.message || "Entity search failed",
    });
  }
});

// GET /api/lrm/graph/connected/:entityId - Find connected entities
router.get("/graph/connected/:entityId", async (req: Request, res: Response) => {
  try {
    const orgId = req.query.orgId as string;
    const userId = (req as any).user?.id || (req as any).user?.userId;
    await requireOrgMembership(userId, orgId);

    const entityId = req.params.entityId as string;
    const connected = await lrm.relationshipIntelligence.discoverConnections(
      entityId, orgId
    );
    return res.json({ success: true, data: connected });
  } catch (err: any) {
    return res.status(err.status || 500).json({
      success: false,
      error: err.message || "Failed to discover connections",
    });
  }
});

// POST /api/lrm/graph/discover - Auto-discover relationships
router.post("/graph/discover", async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id || (req as any).user?.userId;
    await requireOrgMembership(userId, req.body.orgId);

    const result = await lrm.discoverAndLink(req.body.orgId);
    return res.json({ success: true, data: result });
  } catch (err: any) {
    return res.status(err.status || 500).json({
      success: false,
      error: err.message || "Discovery failed",
    });
  }
});

// GET /api/lrm/recommendations/next-best-actions
router.get("/recommendations/next-best-actions", async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id || (req as any).user?.userId;
    await requireOrgMembership(userId, req.query.orgId as string);

    const actions = await lrm.recommendations.getNextBestActions(userId, req.query.orgId as string);
    return res.json({ success: true, data: actions });
  } catch (err: any) {
    return res.status(err.status || 500).json({
      success: false,
      error: err.message || "Failed to get recommendations",
    });
  }
});

// POST /api/lrm/feedback - Record feedback for learning
router.post("/feedback", async (req: Request, res: Response) => {
  try {
    const { messageId, rating } = req.body;
    if (!messageId || !rating) {
      return res.status(400).json({ success: false, error: "messageId and rating are required" });
    }

    const userId = (req as any).user?.id || (req as any).user?.userId;
    await requireOrgMembership(userId, req.body.orgId);

    await lrm.learning.processFeedback(userId, req.body.orgId, messageId, rating);
    return res.json({ success: true, data: { recorded: true } });
  } catch (err: any) {
    return res.status(err.status || 500).json({
      success: false,
      error: err.message || "Failed to record feedback",
    });
  }
});

// GET /api/lrm/profile - Get user profile
router.get("/profile", async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id || (req as any).user?.userId;
    await requireOrgMembership(userId, req.query.orgId as string);

    const profile = await lrm.learning.getUserProfile(userId, req.query.orgId as string);
    const patterns = await lrm.profiler.analyzePatterns(userId, req.query.orgId as string);
    return res.json({ success: true, data: { profile, patterns } });
  } catch (err: any) {
    return res.status(err.status || 500).json({
      success: false,
      error: err.message || "Failed to get profile",
    });
  }
});

// POST /api/lrm/consolidate - Consolidate memories
router.post("/consolidate", async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id || (req as any).user?.userId;
    await requireOrgMembership(userId, req.body.orgId);

    await lrm.consolidateMemories(req.body.orgId, userId);
    return res.json({ success: true, data: { consolidated: true } });
  } catch (err: any) {
    return res.status(err.status || 500).json({
      success: false,
      error: err.message || "Consolidation failed",
    });
  }
});

export default router;
