import { Router, Request, Response } from "express";
import { whatsappService } from "../services/whatsapp.service.js";
import { logger } from "../lib/logger/index.js";
import { authenticate } from "../middleware/auth.js";
import type { AuthRequest } from "../types/index.js";
import { isAdminRole } from "../lib/rbac/index.js";
import { User } from "../lib/db/models/User.js";
import { sendEmail } from "../lib/mail/sender.js";

const router = Router();
router.use(authenticate);

// Category page expects GET /api/whatsapp to return { installed: boolean }
router.get("/", (_req: Request, res: Response) => {
  res.json({ installed: true });
});

router.get("/status", (_req: Request, res: Response) => {
  const state = whatsappService.getState();
  const info = whatsappService.getInfo();
  res.json({ success: true, data: { ...state, info } });
});

router.post("/start", async (req: AuthRequest, res: Response) => {
  if (!isAdminRole(req.user!.role)) {
    res.status(403).json({ success: false, error: "Only admins can start WhatsApp client" });
    return;
  }
  try {
    const state = whatsappService.getState();
    if (state.status === "ready") {
      res.json({
        success: true,
        message: "WhatsApp client is already connected",
        data: state,
      });
      return;
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

router.post("/stop", async (req: AuthRequest, res: Response) => {
  if (!isAdminRole(req.user!.role)) {
    res.status(403).json({ success: false, error: "Only admins can stop WhatsApp client" });
    return;
  }
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

router.post("/logout", async (req: AuthRequest, res: Response) => {
  if (!isAdminRole(req.user!.role)) {
    res.status(403).json({ success: false, error: "Only admins can logout WhatsApp client" });
    return;
  }
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

router.post("/send", async (req: AuthRequest, res: Response) => {
  if (!isAdminRole(req.user!.role)) {
    res.status(403).json({ success: false, error: "Only admins can send WhatsApp messages" });
    return;
  }
  const { to, message } = req.body;
  if (!to || !message) {
    res.status(400).json({ success: false, error: "Both 'to' and 'message' are required" });
    return;
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

// Send email notification when WhatsApp connects
router.post("/notify-connect", async (req: AuthRequest, res: Response) => {
  try {
    const { phoneNumber } = req.body;
    const userId = req.user!.userId;

    // Get user email
    const user = await User.findById(userId).lean();
    if (!user?.email) {
      res.status(400).json({ success: false, error: "User email not found" });
      return;
    }

    // Send email notification
    const subject = "WhatsApp Connected Successfully";
    const htmlBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #25D366;">WhatsApp Connected!</h2>
        <p>Your WhatsApp account has been successfully connected to the platform.</p>
        <div style="background-color: #f5f5f5; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 5px 0;"><strong>Phone Number:</strong> ${phoneNumber || "N/A"}</p>
          <p style="margin: 5px 0;"><strong>Connected At:</strong> ${new Date().toLocaleString()}</p>
        </div>
        <p>You can now receive and send WhatsApp messages through the platform.</p>
        <p style="color: #666; font-size: 12px; margin-top: 20px;">This is an automated notification from your workspace.</p>
      </div>
    `;

    await sendEmail(user.email, subject, htmlBody);
    logger.info({ userId, phoneNumber }, "WhatsApp connection email notification sent");

    res.json({ success: true, message: "Email notification sent" });
  } catch (err: any) {
    logger.error({ err: err.message }, "Failed to send WhatsApp connection email");
    res.status(500).json({ success: false, error: err.message });
  }
});

// Send WhatsApp message to multiple numbers
router.post("/send-broadcast", async (req: AuthRequest, res: Response) => {
  if (!isAdminRole(req.user!.role)) {
    res.status(403).json({ success: false, error: "Only admins can send broadcast messages" });
    return;
  }

  const { numbers, message } = req.body;
  if (!numbers || !Array.isArray(numbers) || numbers.length === 0 || !message) {
    res.status(400).json({ success: false, error: "Numbers array and message are required" });
    return;
  }

  try {
    const results = await Promise.allSettled(
      numbers.map((number: string) => whatsappService.sendMessage(number, message))
    );

    const successful = results.filter(r => r.status === "fulfilled" && r.value === true).length;
    const failed = results.length - successful;

    logger.info({ total: numbers.length, successful, failed }, "WhatsApp broadcast completed");

    res.json({
      success: true,
      message: `Broadcast sent: ${successful} successful, ${failed} failed`,
      data: { total: numbers.length, successful, failed },
    });
  } catch (err: any) {
    logger.error({ err: err.message }, "Failed to send WhatsApp broadcast");
    res.status(500).json({ success: false, error: err.message });
  }
});

// Send notification to configured WhatsApp numbers
router.post("/notify-numbers", async (req: AuthRequest, res: Response) => {
  if (!isAdminRole(req.user!.role)) {
    res.status(403).json({ success: false, error: "Only admins can send notifications" });
    return;
  }

  const { numbers, notification } = req.body;
  if (!numbers || !Array.isArray(numbers) || numbers.length === 0) {
    res.status(400).json({ success: false, error: "Numbers array is required" });
    return;
  }

  try {
    const notificationMessage = notification || "You have a new notification from the platform.";
    const results = await Promise.allSettled(
      numbers.map((number: string) => whatsappService.sendMessage(number, notificationMessage))
    );

    const successful = results.filter(r => r.status === "fulfilled" && r.value === true).length;
    const failed = results.length - successful;

    logger.info({ total: numbers.length, successful, failed }, "WhatsApp notifications sent");

    res.json({
      success: true,
      message: `Notifications sent: ${successful} successful, ${failed} failed`,
      data: { total: numbers.length, successful, failed },
    });
  } catch (err: any) {
    logger.error({ err: err.message }, "Failed to send WhatsApp notifications");
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
