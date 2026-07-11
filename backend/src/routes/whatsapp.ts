import { Router, Request, Response } from "express";
import mongoose from "mongoose";
import { whatsappService } from "../services/whatsapp.service.js";
import { ChatLogRepository } from "../services/ai/repositories/chat-log.repository.js";
import { collections } from "../lib/db/collections.js";
import { authenticate, AuthRequest } from "../middleware/auth.js";
import { logger } from "../lib/logger/index.js";

const router = Router();
const chatLogRepo = new ChatLogRepository();

// Category page expects GET /api/whatsapp to return { installed: boolean }
router.get("/", (_req: Request, res: Response) => {
  res.json({ installed: true });
});

router.get("/status", (_req: Request, res: Response) => {
  const state = whatsappService.getState();
  const info = whatsappService.getInfo();
  res.json({ success: true, data: { ...state, info } });
});

router.post("/start", async (_req: Request, res: Response) => {
  try {
    const state = whatsappService.getState();
    if (state.status === "ready") {
      return res.json({
        success: true,
        message: "WhatsApp client is already connected",
        data: state,
      });
    }

    whatsappService.start().catch((err) => {
      logger.error({ err: err.message }, "Failed to start WhatsApp client");
    });

    res.json({
      success: true,
      message: "WhatsApp client starting...",
      data: whatsappService.getState(),
    });
  } catch (err: any) {
    logger.error({ err: err.message }, "Error starting WhatsApp client");
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post("/stop", async (_req: Request, res: Response) => {
  try {
    await whatsappService.stop();
    res.json({
      success: true,
      message: "WhatsApp client stopped",
      data: whatsappService.getState(),
    });
  } catch (err: any) {
    logger.error({ err: err.message }, "Error stopping WhatsApp client");
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post("/logout", async (_req: Request, res: Response) => {
  try {
    await whatsappService.logout();
    res.json({
      success: true,
      message: "WhatsApp client logged out",
      data: whatsappService.getState(),
    });
  } catch (err: any) {
    logger.error({ err: err.message }, "Error logging out WhatsApp client");
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post("/send", async (req: Request, res: Response) => {
  const { to, message } = req.body;
  if (!to || !message) {
    return res.status(400).json({ success: false, error: "Both 'to' and 'message' are required" });
  }

  try {
    const sent = await whatsappService.sendMessage(to, message);
    if (sent) {
      res.json({ success: true, message: "Message sent" });
    } else {
      res.status(502).json({ success: false, error: "Failed to send message — client may not be connected" });
    }
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get("/qr", (_req: Request, res: Response) => {
  const state = whatsappService.getState();
  if (state.status === "qr" && state.qrCode) {
    res.json({ success: true, data: { qrCode: state.qrCode } });
  } else {
    res.json({ success: true, data: { qrCode: null, status: state.status } });
  }
});

// Debug endpoint to check actual client state
router.get("/debug", (_req: Request, res: Response) => {
  const state = whatsappService.getState();
  const info = whatsappService.getInfo();
  res.json({
    success: true,
    data: {
      state,
      info,
      hasClient: whatsappService.hasClient(),
    }
  });
});

// ── Session Records (Conversations) ──

router.get("/conversations", authenticate, async (_req: AuthRequest, res: Response) => {
  try {
    const collection = mongoose.connection.db!.collection(collections.chatLogs);
    const results = await collection.aggregate([
      { $sort: { createdAt: -1 } },
      {
        $group: {
          _id: "$customerPhone",
          customerName: { $first: "$customerName" },
          messageCount: { $sum: 1 },
          lastMessage: { $first: "$incomingMessage" },
          lastReply: { $first: "$outgoingMessage" },
          lastIntent: { $first: "$intent" },
          lastStatus: { $first: "$status" },
          lastActivity: { $first: "$createdAt" },
        },
      },
      { $sort: { lastActivity: -1 } },
      { $limit: 50 },
    ]).toArray();

    const conversations = results.map((r: any) => ({
      phone: r._id,
      customerName: r.customerName || r._id,
      messageCount: r.messageCount,
      lastMessage: r.lastMessage,
      lastReply: r.lastReply,
      lastIntent: r.lastIntent,
      lastStatus: r.lastStatus,
      lastActivity: r.lastActivity,
    }));

    res.json({ success: true, data: conversations });
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error);
    logger.error({ error: errMsg }, "Failed to fetch conversations");
    res.status(500).json({ success: false, error: errMsg });
  }
});

router.get("/conversations/:phone", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { phone } = req.params;
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);
    const offset = parseInt(req.query.offset as string) || 0;

    const logs = await chatLogRepo.getLogsByCustomer(phone, { limit, offset });
    res.json({ success: true, data: logs });
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error);
    res.status(500).json({ success: false, error: errMsg });
  }
});

router.delete("/conversations/:phone", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { phone } = req.params;
    const collection = mongoose.connection.db!.collection(collections.chatLogs);
    const result = await collection.deleteMany({ customerPhone: phone });
    res.json({
      success: true,
      data: { deletedCount: result.deletedCount },
    });
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error);
    res.status(500).json({ success: false, error: errMsg });
  }
});

// ── Stats ──

router.get("/stats", authenticate, async (_req: AuthRequest, res: Response) => {
  try {
    const [stats, totalMessages] = await Promise.all([
      chatLogRepo.getStats(),
      chatLogRepo.countTotal(),
    ]);
    const messageLimit = parseInt(process.env.WHATSAPP_MESSAGE_LIMIT || "1000", 10);
    res.json({
      success: true,
      data: {
        ...stats,
        messageLimit,
        messagesRemaining: Math.max(0, messageLimit - totalMessages),
      },
    });
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error);
    res.status(500).json({ success: false, error: errMsg });
  }
});

// ── AI Memory Records ──

router.get("/memories", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const collection = mongoose.connection.db!.collection(collections.aiAgentMemory);
    const memories = await collection
      .find({})
      .sort({ updatedAt: -1 })
      .limit(100)
      .toArray();

    const mapped = memories.map((m: any) => ({
      id: m.id,
      content: m.content,
      type: m.type,
      source: m.source,
      tags: m.tags || [],
      userId: m.userId,
      createdAt: m.createdAt,
      updatedAt: m.updatedAt,
    }));

    res.json({ success: true, data: mapped });
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error);
    res.status(500).json({ success: false, error: errMsg });
  }
});

router.delete("/memories", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.query;
    const collection = mongoose.connection.db!.collection(collections.aiAgentMemory);
    if (id) {
      await collection.deleteOne({ id });
    } else {
      await collection.deleteMany({});
    }
    res.json({ success: true, message: id ? "Memory deleted" : "All memories cleared" });
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error);
    res.status(500).json({ success: false, error: errMsg });
  }
});

export default router;
