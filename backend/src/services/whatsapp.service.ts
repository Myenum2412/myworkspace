import path from "path";
import fs from "fs";
import { logger } from "../lib/logger/index.js";
import { socketIOManager } from "../lib/socketio/index.js";
import QRCode from "qrcode";

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

const AUTH_DIR = path.resolve("data", "whatsapp-auth");

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

  private async handleMessage(msg: any): Promise<void> {
    if (msg.fromMe) return;

    const from = msg.from;
    const body = msg.body;

    logger.info({ from, body }, "WhatsApp message received");

    socketIOManager.getIO()?.emit("whatsapp:message", {
      from,
      body,
      timestamp: msg.timestamp,
    });
  }

  private emitState(): void {
    socketIOManager.getIO()?.emit("whatsapp:status", this.state);
  }
}

export const whatsappService = new WhatsAppService();
