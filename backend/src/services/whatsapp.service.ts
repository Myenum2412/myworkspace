import path from "path";
import fs from "fs";
import { logger } from "../lib/logger/index.js";
import { socketIOManager } from "../lib/socketio/index.js";
import QRCode from "qrcode";
import { AIAgent } from "./ai/agent/agent.js";
import { ChatLogRepository } from "./ai/repositories/chat-log.repository.js";
import { AI_CONFIG } from "./ai/config.js";
import { User } from "../lib/db/models/User.js";
import { Settings } from "../lib/db/models/Settings.js";

// whatsapp-web.js is CommonJS, use dynamic import for ESM compatibility
let WhatsAppClient: any;
let WhatsAppLocalAuth: any;

async function loadWhatsAppWebjs() {
  if (!WhatsAppClient) {
    const wwebjs = await import("whatsapp-web.js");
    const mod = wwebjs.default || wwebjs;
    WhatsAppClient = mod.Client;
    WhatsAppLocalAuth = mod.LocalAuth;
  }
}

const AUTH_DIR = path.resolve("data", "whatsapp-webjs-auth");

export type WhatsAppClientStatus = "disconnected" | "initializing" | "qr" | "ready" | "authenticated" | "error";

export interface WhatsAppClientState {
  status: WhatsAppClientStatus;
  qrCode?: string;
  phoneNumber?: string;
  error?: string;
}

export interface WhatsAppInfo {
  me: string;
  phone: string;
  platform: string;
}

/* eslint-disable @typescript-eslint/no-explicit-any */

class WhatsAppService {
  private client: any = null;
  private state: WhatsAppClientState = { status: "disconnected" };
  private info: WhatsAppInfo | null = null;

  constructor() {
    if (!fs.existsSync(AUTH_DIR)) {
      fs.mkdirSync(AUTH_DIR, { recursive: true });
    }
  }

  getState(): WhatsAppClientState {
    return { ...this.state };
  }

  getInfo() {
    return this.info;
  }

  hasClient(): boolean {
    return !!this.client;
  }

  async start(): Promise<void> {
    if (this.state.status === "ready" || this.state.status === "initializing") {
      logger.info("WhatsApp client already running");
      return;
    }

    // Kill any existing client before creating a new one
    if (this.client) {
      try {
        await this.client.destroy();
      } catch {
        // ignore cleanup errors
      }
      this.client = null;
    }

    this.state = { status: "initializing" };
    this.emitState();

    try {
      await loadWhatsAppWebjs();

      const chromePath = process.env.CHROME_PATH || "/usr/bin/chromium";
      logger.info({ chromePath }, "Starting WhatsApp client with Chrome");

      this.client = new WhatsAppClient({
        authStrategy: new WhatsAppLocalAuth({ dataPath: AUTH_DIR }),
        puppeteer: {
          headless: true,
          executablePath: chromePath,
          args: [
            "--no-sandbox",
            "--disable-setuid-sandbox",
            "--disable-dev-shm-usage",
            "--disable-accelerated-2d-canvas",
            "--no-first-run",
            "--no-zygote",
            "--single-process",
            "--disable-gpu",
            "--disable-extensions",
          ],
        },
      });

      this.client.on("qr", async (qr: string) => {
        logger.info("WhatsApp QR code received");
        const qrDataUrl = await QRCode.toDataURL(qr, {
          width: 280,
          margin: 2,
          color: { dark: "#1a1a1a", light: "#ffffff" },
        });
        this.state = { status: "qr", qrCode: qrDataUrl };
        this.emitState();
      });

      this.client.on("ready", () => {
        const info = this.client!.info;
        this.info = {
          me: info.wid.user,
          phone: String(info.phone),
          platform: info.platform,
        };
        this.state = { status: "ready", phoneNumber: info.wid.user };
        this.emitState();
        logger.info({ phoneNumber: info.wid.user }, "WhatsApp client ready");
      });

      this.client.on("authenticated", () => {
        this.state = { ...this.state, status: "authenticated" };
        this.emitState();
        logger.info("WhatsApp authenticated");
      });

      this.client.on("auth_failure", (msg: string) => {
        this.state = { status: "error", error: `Auth failed: ${msg}` };
        this.emitState();
        logger.error({ msg }, "WhatsApp auth failure");
      });

      this.client.on("disconnected", (reason: string) => {
        this.state = { status: "disconnected" };
        this.info = null;
        this.emitState();
        logger.warn({ reason }, "WhatsApp disconnected");
      });

      this.client.on("message", async (msg: any) => {
        await this.handleMessage(msg);
      });

      await this.client.initialize();
    } catch (err: any) {
      this.state = { status: "error", error: err.message };
      this.emitState();
      logger.error({ err: err.message }, "Failed to start WhatsApp client");
      throw err;
    }
  }

  async stop(): Promise<void> {
    if (!this.client) {
      this.state = { status: "disconnected" };
      this.emitState();
      return;
    }

    try {
      await this.client.destroy();
      logger.info("WhatsApp client destroyed");
    } catch (err: any) {
      logger.error({ err: err.message }, "Error destroying WhatsApp client");
    }

    this.client = null;
    this.state = { status: "disconnected" };
    this.info = null;
    this.emitState();
  }

  async logout(): Promise<void> {
    if (!this.client) {
      this.state = { status: "disconnected" };
      this.emitState();
      return;
    }

    try {
      await this.client.logout();
      logger.info("WhatsApp client logged out");
    } catch (err: any) {
      logger.error({ err: err.message }, "Error logging out WhatsApp client");
    }

    this.client = null;
    this.state = { status: "disconnected" };
    this.info = null;
    this.emitState();
  }

  async sendMessage(chatId: string, content: string): Promise<boolean> {
    logger.info({ hasClient: !!this.client, status: this.state.status, hasInfo: !!this.info }, "sendMessage called");

    if (!this.client) {
      logger.warn("Cannot send message — client is null");
      return false;
    }

    if (!this.info) {
      logger.warn("Cannot send message — client info not available");
      return false;
    }

    if (this.state.status !== "ready") {
      logger.warn({ status: this.state.status }, "Cannot send message — status not ready");
      return false;
    }

    try {
      const jid = chatId.includes("@") ? chatId : `${chatId}@c.us`;
      await this.client.sendMessage(jid, content);
      logger.info({ to: chatId }, "WhatsApp message sent");
      return true;
    } catch (err: any) {
      logger.error({ err: err.message, to: chatId }, "Failed to send WhatsApp message");
      return false;
    }
  }

  private chatLogRepo = new ChatLogRepository();

  private async handleMessage(msg: any): Promise<void> {
    if (msg.fromMe) return;

    const from = msg.from;
    const body = msg.body;

    logger.info({ from, body }, "WhatsApp message received");

    // Emit message event for frontend to handle
    socketIOManager.getIO()?.emit("whatsapp:message", {
      from,
      body,
      timestamp: msg.timestamp,
    });

    // Auto-reply with AI
    await this.processWithAI(from, body, msg.timestamp);
  }

  private async processWithAI(from: string, body: string, timestamp: number): Promise<void> {
    const startTime = Date.now();

    // Look up user by phone to find their org
    let organizationId: string | undefined;
    let customerName: string | undefined;
    try {
      const phoneClean = from.replace(/@.*$/, "").replace(/[\s\-\(\)\+]/g, "");
      const last10 = phoneClean.slice(-10);
      const user = await User.findOne({
        phone: { $regex: last10 + "$" },
      }).lean();
      if (user?.orgId) {
        organizationId = user.orgId;
        customerName = user.name;
      }
    } catch {
      // Non-critical - proceed without org context
    }

    // Fallback: if no user found, try owning org
    if (!organizationId) {
      try {
        // Try looking up the bot's own phone number to find the owning user's org
        if (this.info?.me) {
          const owner = await User.findOne({
            phone: { $regex: this.info.me.replace(/[\s\-\(\)\+]/g, "").slice(-10) + "$" },
          }).lean();
          if (owner?.orgId) {
            organizationId = owner.orgId;
          }
        }
      } catch {
        // Non-critical
      }
    }
    if (!organizationId) {
      try {
        organizationId = process.env.WHATSAPP_ORG_ID;
        if (!organizationId) {
          const defaultSettings = await Settings.findOne({
            aiSoul: { $ne: "" },
            orgId: { $nin: [null, ""], $exists: true },
          }).lean();
          if (defaultSettings?.orgId) {
            organizationId = defaultSettings.orgId;
          }
        }
      } catch {
        // Non-critical
      }
    }

    try {
      const agent = new AIAgent();

      const result = await agent.run({
        userId: `whatsapp:${from}`,
        sessionId: `wa_${from}`,
        message: body,
        organizationId,
        customerPhone: from,
        customerName,
        stream: false,
      });

      const reply = result.reply;

      if (reply && reply.trim()) {
        await this.sendMessage(from, reply);
      }

      await this.chatLogRepo.log({
        customerPhone: from,
        incomingMessage: body,
        outgoingMessage: reply || "",
        intent: result.intent,
        intentConfidence: 1.0,
        entities: {},
        language: result.language,
        databaseOperations: [],
        processingTimeMs: Date.now() - startTime,
        aiModel: AI_CONFIG.model,
        tokensUsed: result.tokensUsed,
        status: "success",
        channel: "whatsapp",
      });
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : String(error);
      logger.error({ error: errMsg, from, body }, "AI processing failed for WhatsApp message");

      await this.chatLogRepo.log({
        customerPhone: from,
        incomingMessage: body,
        outgoingMessage: "",
        intent: "unknown",
        intentConfidence: 0,
        entities: {},
        language: AI_CONFIG.defaultLanguage,
        databaseOperations: [],
        processingTimeMs: Date.now() - startTime,
        aiModel: AI_CONFIG.model,
        tokensUsed: 0,
        status: "error",
        errorMessage: errMsg,
        channel: "whatsapp",
      }).catch((logErr) => {
        logger.error({ error: logErr }, "Failed to log WhatsApp AI error");
      });
    }
  }

  private emitState(): void {
    socketIOManager.getIO()?.emit("whatsapp:status", this.state);
  }
}

export const whatsappService = new WhatsAppService();
