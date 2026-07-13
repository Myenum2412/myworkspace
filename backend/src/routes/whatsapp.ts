import { Router, Request, Response } from "express";
import { whatsappService } from "../services/whatsapp.service.js";
import { logger } from "../lib/logger/index.js";

const router = Router();

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

export default router;
