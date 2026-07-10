import { Router, Request, Response } from "express";
import { whatsappLocalClient } from "../services/whatsapp-local.service.js";
import { logger } from "../lib/logger/index.js";

const router = Router();

router.get("/status", (_req: Request, res: Response) => {
  const state = whatsappLocalClient.getState();
  res.json({
    success: true,
    data: state,
  });
});

router.post("/start", async (_req: Request, res: Response) => {
  try {
    const state = whatsappLocalClient.getState();
    if (state.status === "connected") {
      return res.json({
        success: true,
        message: "WhatsApp client is already connected",
        data: state,
      });
    }

    whatsappLocalClient.start().catch((err) => {
      logger.error({ err: err.message }, "Failed to start WhatsApp local client");
    });

    res.json({
      success: true,
      message: "WhatsApp client starting...",
      data: whatsappLocalClient.getState(),
    });
  } catch (err: any) {
    logger.error({ err: err.message }, "Error starting WhatsApp client");
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post("/stop", async (_req: Request, res: Response) => {
  try {
    await whatsappLocalClient.stop();
    res.json({
      success: true,
      message: "WhatsApp client stopped",
      data: whatsappLocalClient.getState(),
    });
  } catch (err: any) {
    logger.error({ err: err.message }, "Error stopping WhatsApp client");
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post("/logout", async (_req: Request, res: Response) => {
  try {
    await whatsappLocalClient.logout();
    res.json({
      success: true,
      message: "WhatsApp client logged out",
      data: whatsappLocalClient.getState(),
    });
  } catch (err: any) {
    logger.error({ err: err.message }, "Error logging out WhatsApp client");
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post("/pair", async (req: Request, res: Response) => {
  const { phoneNumber } = req.body;
  if (!phoneNumber) {
    return res.status(400).json({ success: false, error: "Phone number is required" });
  }

  try {
    const state = whatsappLocalClient.getState();
    if (state.status === "connected") {
      return res.json({
        success: true,
        message: "WhatsApp client is already connected",
        data: state,
      });
    }

    whatsappLocalClient.startWithPairingCode(phoneNumber).catch((err) => {
      logger.error({ err: err.message }, "Failed to start WhatsApp with pairing code");
    });

    res.json({
      success: true,
      message: "Pairing code request sent",
      data: whatsappLocalClient.getState(),
    });
  } catch (err: any) {
    logger.error({ err: err.message }, "Error starting WhatsApp with pairing code");
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post("/send", async (req: Request, res: Response) => {
  const { to, message } = req.body;
  if (!to || !message) {
    return res.status(400).json({ success: false, error: "Both 'to' and 'message' are required" });
  }

  try {
    const sent = await whatsappLocalClient.sendMessage(to, message);
    if (sent) {
      res.json({ success: true, message: "Message sent" });
    } else {
      res.status(502).json({ success: false, error: "Failed to send message — client may not be connected" });
    }
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post("/auto-reply", (req: Request, res: Response) => {
  const { enabled } = req.body;
  if (typeof enabled !== "boolean") {
    return res.status(400).json({ success: false, error: "'enabled' boolean field is required" });
  }
  whatsappLocalClient.setAutoReply(enabled);
  res.json({
    success: true,
    message: `Auto-reply ${enabled ? "enabled" : "disabled"}`,
    data: whatsappLocalClient.getState(),
  });
});

router.post("/test-echo", async (req: Request, res: Response) => {
  const { to, message } = req.body;
  if (!to || !message) {
    return res.status(400).json({ success: false, error: "Both 'to' and 'message' are required" });
  }
  try {
    const sent = await whatsappLocalClient.sendMessage(to, message);
    res.json({ success: sent, message: sent ? "Test message sent" : "Send failed — check server logs" });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get("/qr", (_req: Request, res: Response) => {
  const state = whatsappLocalClient.getState();
  if (state.status === "qr" && state.qrCode) {
    res.json({ success: true, data: { qrCode: state.qrCode } });
  } else {
    res.json({ success: true, data: { qrCode: null, status: state.status } });
  }
});

export default router;
