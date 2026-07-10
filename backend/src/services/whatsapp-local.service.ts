import {
  makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  Browsers,
  WASocket,
  WAVersion,
  proto,
} from "@whiskeysockets/baileys";
import { fetchLatestBaileysVersion, promiseTimeout } from "@whiskeysockets/baileys/lib/Utils/generics.js";
import { Boom } from "@hapi/boom";
import path from "path";
import fs from "fs";
import { logger } from "../lib/logger/index.js";
import { socketIOManager } from "../lib/socketio/index.js";
import { parseMessage, generateConfirmationMessage, generateMissingInfoMessage, generateHelpMessage, extractPhone, extractDate, extractTime, normalizeToTimeSlot, ParsedAppointmentRequest } from "./hermes-agent.service.js";
import { Appointment } from "../lib/db/models/Appointment.js";
import { v4 as uuid } from "uuid";
import { env } from "../config/env.js";

const AUTH_DIR = path.resolve("data", "whatsapp-auth");

export type LocalClientStatus = "disconnected" | "connecting" | "qr" | "pairing_code" | "connected" | "error";

export interface LocalClientState {
  status: LocalClientStatus;
  qrCode?: string;
  pairingCode?: string;
  phoneNumber?: string;
  error?: string;
  autoReply?: boolean;
}

const MAX_RECONNECT_ATTEMPTS = 5;
const RECONNECT_INTERVAL_MS = 10_000;

class WhatsAppLocalClient {
  private sock: WASocket | null = null;
  private state: LocalClientState = { status: "disconnected", autoReply: true };
  private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
  private isShuttingDown = false;
  private qrTimeout: ReturnType<typeof setTimeout> | null = null;
  private reconnectAttempts = 0;

  getState(): Readonly<LocalClientState> {
    return this.state;
  }

  private setState(update: Partial<LocalClientState>) {
    this.state = { ...this.state, ...update };
    socketIOManager.getIO()?.emit("whatsapp:status", this.state);
  }

  /** Check for saved auth and auto-start if present */
  async init(): Promise<void> {
    if (this.state.status === "connected") return;
    const hasAuth = fs.existsSync(path.join(AUTH_DIR, "creds.json"));
    if (hasAuth) {
      logger.info("WhatsApp saved auth found — auto-connecting");
      this.start().catch((err) => logger.error({ err: err.message }, "WhatsApp auto-start failed"));
    } else {
      logger.info("No saved WhatsApp auth found — waiting for manual connect");
    }
  }

  async start(): Promise<void> {
    if (this.sock) {
      logger.info("WhatsApp local client already running — restarting");
      await this.stop();
    }

    this.isShuttingDown = false;
    this.reconnectAttempts = 0;
    this.setState({ status: "connecting", qrCode: undefined, pairingCode: undefined, error: undefined });

    fs.mkdirSync(AUTH_DIR, { recursive: true });

    try {
      const { state: authState, saveCreds } = await useMultiFileAuthState(AUTH_DIR);

      const { version, isLatest } = await fetchLatestBaileysVersion().catch(() => {
        logger.warn("Failed to fetch latest Baileys version — using local version");
        return { version: [2, 3000, 1035194821] as WAVersion, isLatest: false };
      });

      logger.info({ version, isLatest }, "Starting WhatsApp local client");

      const sock = makeWASocket({
        version,
        auth: authState,
        browser: Browsers.ubuntu("Chrome"),
        syncFullHistory: false,
        markOnlineOnConnect: false,
        generateHighQualityLinkPreview: false,
        connectTimeoutMs: 60_000,
        keepAliveIntervalMs: 30_000,
        logger: logger as any,
        printQRInTerminal: false,
        qrTimeout: 120_000,
      });

      this.sock = sock;

      sock.ev.on("creds.update", saveCreds);

      sock.ev.on("connection.update", (update) => {
        logger.info({ ...update, connection: update.connection }, "WhatsApp connection.update raw");

        const { connection, lastDisconnect, qr, receivedPendingNotifications, isNewLogin } = update;

        if (qr) {
          logger.info("WhatsApp QR code generated");
          this.setState({ status: "qr", qrCode: qr });
        }

        if (isNewLogin) {
          logger.info("WhatsApp new login detected — credentials saved, waiting for restart");
          this.setState({ status: "connecting", qrCode: undefined, pairingCode: undefined });
        }

        if (receivedPendingNotifications) {
          logger.info("WhatsApp history sync complete");
        }

        if (connection === "open") {
          const phoneNumber = sock.user?.id?.split(":")[0];
          logger.info({ phoneNumber }, "WhatsApp local client connected");
          this.reconnectAttempts = 0;
          this.sock = sock;
          this.setState({
            status: "connected",
            qrCode: undefined,
            pairingCode: undefined,
            phoneNumber,
            error: undefined,
          });
        }

        if (connection === "close") {
          const statusCode = (lastDisconnect?.error as Boom)?.output?.statusCode;
          const errorMsg = (lastDisconnect?.error as Boom)?.message || "";

          logger.info(
            { statusCode, error: errorMsg, isShuttingDown: this.isShuttingDown },
            "WhatsApp local client disconnected"
          );

          const isRestart = statusCode === DisconnectReason.restartRequired;
          const isLoggedOut = statusCode === DisconnectReason.loggedOut;
          const isBadSession = statusCode === DisconnectReason.badSession;
          const isMultideviceMismatch = statusCode === DisconnectReason.multideviceMismatch;
          const isForbidden = statusCode === DisconnectReason.forbidden;

          if (isRestart) {
            logger.info("WhatsApp restart required — reconnecting immediately with saved credentials");
            this.setState({ status: "connecting", qrCode: undefined, pairingCode: undefined, phoneNumber: undefined });
            this.sock = null;
            setTimeout(() => {
              this.start().catch((err) => logger.error({ err: err.message }, "Restart failed"));
            }, 500);
          } else if (isLoggedOut || isBadSession || this.isShuttingDown) {
            this.setState({
              status: "disconnected",
              qrCode: undefined,
              pairingCode: undefined,
              phoneNumber: undefined,
            });
            this.sock = null;
            if (isLoggedOut || isBadSession) {
              this.cleanupAuth();
            }
          } else if (isMultideviceMismatch) {
            this.setState({
              status: "error",
              error: "Your WhatsApp account doesn't have multi-device enabled. Please update WhatsApp and enable Linked Devices.",
            });
            this.sock = null;
          } else if (isForbidden) {
            this.setState({
              status: "error",
              error: "Connection forbidden. This may be because you already have too many linked devices. Disconnect one from WhatsApp > Linked Devices.",
            });
            this.sock = null;
            this.cleanupAuth();
          } else {
            this.reconnectAttempts++;
            if (this.reconnectAttempts > MAX_RECONNECT_ATTEMPTS) {
              logger.warn({ attempts: this.reconnectAttempts }, "Max reconnect attempts reached — stopping");
              this.setState({
                status: "error",
                error: `Could not connect after ${MAX_RECONNECT_ATTEMPTS} attempts. Click Retry to try again.`,
              });
              this.sock = null;
            } else {
              logger.info({ attempt: this.reconnectAttempts, max: MAX_RECONNECT_ATTEMPTS }, "Scheduling reconnect");
              this.setState({
                status: "connecting",
                qrCode: undefined,
                pairingCode: undefined,
                phoneNumber: undefined,
              });
              this.scheduleReconnect();
            }
          }
        }
      });

      sock.ev.on("messages.upsert", async ({ messages, type }) => {
        logger.info({ type, count: messages.length }, "WhatsApp messages.upsert received");

        for (const msg of messages) {
          const fromMe = msg.key?.fromMe;
          const hasMsg = !!msg.message;
          const hasText = msg.message ? this.extractTextContent(msg.message) : null;
          logger.info({ type, fromMe, hasMsg, hasText, remoteJid: msg.key?.remoteJid }, "Processing message");
          await this.handleIncomingMessage(msg);
        }
      });

    } catch (err: any) {
      logger.error({ err: err.message }, "Failed to start WhatsApp local client");
      this.setState({ status: "error", error: err.message });
    }
  }

  async startWithPairingCode(phoneNumber: string): Promise<void> {
    if (this.sock) {
      await this.stop();
    }

    this.isShuttingDown = false;
    this.reconnectAttempts = 0;
    this.setState({ status: "connecting", qrCode: undefined, pairingCode: undefined, error: undefined });

    const cleanedPhone = phoneNumber.replace(/[^0-9]/g, "");
    if (cleanedPhone.length < 10) {
      this.setState({ status: "error", error: "Invalid phone number. Include country code (e.g., 911234567890)." });
      return;
    }

    fs.mkdirSync(AUTH_DIR, { recursive: true });

    try {
      const { state: authState, saveCreds } = await useMultiFileAuthState(AUTH_DIR);

      const { version } = await fetchLatestBaileysVersion().catch(() => {
        logger.warn("Failed to fetch latest Baileys version for pairing — using local version");
        return { version: [2, 3000, 1035194821] as WAVersion, isLatest: false };
      });

      logger.info({ version, phoneNumber: cleanedPhone }, "Starting WhatsApp with pairing code");

      const sock = makeWASocket({
        version,
        auth: authState,
        browser: Browsers.ubuntu("Chrome"),
        syncFullHistory: false,
        markOnlineOnConnect: false,
        generateHighQualityLinkPreview: false,
        connectTimeoutMs: 60_000,
        keepAliveIntervalMs: 30_000,
        logger: logger as any,
        printQRInTerminal: false,
      });

      this.sock = sock;

      sock.ev.on("creds.update", saveCreds);

      sock.ev.on("connection.update", async (update) => {
        logger.info({ ...update, connection: update.connection }, "WhatsApp pairing connection.update raw");

        const { connection, lastDisconnect, qr, isNewLogin } = update;

        if (qr) {
          if (!this.state.pairingCode) {
            try {
              const code = await sock.requestPairingCode(cleanedPhone);
              const formattedCode = code.match(/.{1,4}/g)?.join("-") || code;
              this.setState({ status: "pairing_code", pairingCode: formattedCode });
              logger.info({ pairingCode: formattedCode }, "Pairing code generated");
            } catch (pairErr: any) {
              logger.error({ err: pairErr.message }, "Failed to get pairing code, falling back to QR");
              this.setState({ status: "qr", qrCode: qr });
            }
          }
        }

        if (isNewLogin) {
          logger.info("WhatsApp pairing successful — credentials saved, waiting for restart");
          this.setState({ status: "connecting", qrCode: undefined, pairingCode: undefined });
        }

        if (connection === "open") {
          const num = sock.user?.id?.split(":")[0];
          logger.info({ phoneNumber: num }, "WhatsApp paired successfully");
          this.reconnectAttempts = 0;
          this.sock = sock;
          this.setState({
            status: "connected",
            qrCode: undefined,
            pairingCode: undefined,
            phoneNumber: num,
            error: undefined,
          });
        }

        if (connection === "close") {
          const statusCode = (lastDisconnect?.error as Boom)?.output?.statusCode;
          const errorMsg = (lastDisconnect?.error as Boom)?.message || "";

          logger.info({ statusCode, error: errorMsg }, "WhatsApp pairing disconnected");

          const isRestart = statusCode === DisconnectReason.restartRequired;
          const isLoggedOut = statusCode === DisconnectReason.loggedOut;
          const isBadSession = statusCode === DisconnectReason.badSession;
          const isForbidden = statusCode === DisconnectReason.forbidden;

          if (isRestart) {
            logger.info("WhatsApp restart required — reconnecting with saved credentials");
            this.sock = null;
            this.setState({ status: "connecting", qrCode: undefined, pairingCode: undefined, phoneNumber: undefined });
            setTimeout(() => {
              this.start().catch((err) => logger.error({ err: err.message }, "Restart failed"));
            }, 500);
          } else if (isLoggedOut || isBadSession || this.isShuttingDown) {
            this.setState({ status: "disconnected" });
            this.sock = null;
            if (isLoggedOut || isBadSession) this.cleanupAuth();
          } else if (isForbidden) {
            this.setState({
              status: "error",
              error: "Connection forbidden. You may have too many linked devices.",
            });
            this.sock = null;
            this.cleanupAuth();
          } else {
            this.setState({ status: "error", error: errorMsg || "Connection closed unexpectedly" });
            this.sock = null;
          }
        }
      });

      sock.ev.on("messages.upsert", async ({ messages, type }) => {
        logger.info({ type, count: messages.length }, "WhatsApp messages.upsert received (pairing)");

        for (const msg of messages) {
          const fromMe = msg.key?.fromMe;
          const hasMsg = !!msg.message;
          const hasText = msg.message ? this.extractTextContent(msg.message) : null;
          logger.info({ type, fromMe, hasMsg, hasText, remoteJid: msg.key?.remoteJid }, "Processing message (pairing)");
          await this.handleIncomingMessage(msg);
        }
      });

    } catch (err: any) {
      logger.error({ err: err.message }, "Failed to start WhatsApp with pairing code");
      this.setState({ status: "error", error: err.message });
    }
  }

  async stop(): Promise<void> {
    this.isShuttingDown = true;

    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    if (this.qrTimeout) {
      clearTimeout(this.qrTimeout);
      this.qrTimeout = null;
    }

    if (this.sock) {
      try {
        this.sock.end(undefined);
        this.sock = null;
      } catch (err: any) {
        logger.warn({ err: err.message }, "Error stopping WhatsApp client");
      }
    }

    this.setState({ status: "disconnected", qrCode: undefined, pairingCode: undefined });
    logger.info("WhatsApp local client stopped");
  }

  async logout(): Promise<void> {
    this.isShuttingDown = true;

    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    if (this.qrTimeout) {
      clearTimeout(this.qrTimeout);
      this.qrTimeout = null;
    }

    if (this.sock) {
      try {
        await this.sock.logout();
        this.sock = null;
      } catch (err: any) {
        logger.warn({ err: err.message }, "Error logging out WhatsApp client");
      }
    }

    this.cleanupAuth();
    this.setState({ status: "disconnected", qrCode: undefined, pairingCode: undefined });
    logger.info("WhatsApp local client logged out");
  }

  async sendMessage(to: string, content: string): Promise<boolean> {
    if (!this.sock || this.state.status !== "connected") {
      logger.warn("Cannot send message — WhatsApp not connected");
      return false;
    }

    try {
      const jid = this.normalizeJid(to);
      await this.sock.sendMessage(jid, { text: content });
      logger.info({ to: jid }, "WhatsApp message sent");
      return true;
    } catch (err: any) {
      logger.error({ err: err.message }, "Failed to send WhatsApp message");
      return false;
    }
  }

  setAutoReply(enabled: boolean): void {
    this.state.autoReply = enabled;
    socketIOManager.getIO()?.emit("whatsapp:status", { ...this.state });
    logger.info({ autoReply: enabled }, "WhatsApp auto-reply toggled");
  }

  private normalizeJid(to: string): string {
    const cleaned = to.replace(/[^0-9]/g, "");
    return `${cleaned}@s.whatsapp.net`;
  }

  private scheduleReconnect(): void {
    if (this.isShuttingDown) return;
    this.reconnectTimeout = setTimeout(() => {
      logger.info("Attempting WhatsApp reconnection...");
      this.sock = null;
      this.start().catch((err) => {
        logger.error({ err: err.message }, "Reconnection failed");
      });
    }, RECONNECT_INTERVAL_MS);
  }

  private cleanupAuth(): void {
    try {
      if (fs.existsSync(AUTH_DIR)) {
        fs.rmSync(AUTH_DIR, { recursive: true, force: true });
        logger.info("WhatsApp auth data cleaned up");
      }
    } catch (err: any) {
      logger.warn({ err: err.message }, "Failed to cleanup auth data");
    }
  }

  private async handleIncomingMessage(msg: proto.IWebMessageInfo): Promise<void> {
    try {
      const hasKey = !!msg.key;
      const fromMe = msg.key?.fromMe;
      const remoteJid = msg.key?.remoteJid;
      const hasMsg = !!msg.message;
      const textContent = this.extractTextContent(msg.message);
      const id = msg.key?.id;

      logger.info({ hasKey, fromMe, remoteJid, hasMsg, textContent, id, autoReply: this.state.autoReply },
        "WhatsApp incoming message received");

      if (!hasKey || fromMe) return;
      if (!remoteJid || !hasMsg || !textContent) return;

      const from = remoteJid;
      const sender = from.split("@")[0];

      if (!this.state.autoReply) {
        logger.debug("Auto-reply disabled — ignoring message");
        return;
      }

      const trimmedText = textContent.trim().toLowerCase();
      if (trimmedText === "help" || trimmedText === "hi" || trimmedText === "hello" || trimmedText === "hey") {
        await this.sendMessage(from, generateHelpMessage());
        return;
      }

      const result = parseMessage(textContent, sender);

      if (!result.detected) {
        await this.sendMessage(
          from,
          `*Hello!* 🤖\n\nI'm Hermes, your appointment assistant. I can help you book, cancel, reschedule, or check appointments.\n\nReply with something like:\n"Book appointment for John on Monday at 10 AM for a fever"\n\nOr type "Help" to see all options.`
        );
        return;
      }

      if (result.intent === "book_appointment") {
        await this.handleBooking(from, result.data as ParsedAppointmentRequest, textContent);
      } else if (result.intent === "cancel_appointment") {
        await this.handleCancel(from, sender, textContent);
      } else if (result.intent === "reschedule") {
        await this.handleReschedule(from, sender, textContent);
      } else if (result.intent === "check_status") {
        await this.handleCheckStatus(from, sender);
      }
    } catch (err: any) {
      logger.error({ err: err.message, stack: err.stack }, "Error handling incoming WhatsApp message");
    }
  }

  private extractTextContent(message: proto.IMessage | null | undefined): string | null {
    if (!message) return null;
    if (message.conversation) return message.conversation;
    if (message.extendedTextMessage?.text) return message.extendedTextMessage.text;
    if (message.imageMessage?.caption) return message.imageMessage.caption;
    return null;
  }

  private async handleBooking(from: string, data: ParsedAppointmentRequest, originalText: string): Promise<void> {
    const missingFields: string[] = [];
    if (!data.patientName) missingFields.push("Your full name");
    if (!data.appointmentDate) missingFields.push("Preferred date (e.g., tomorrow, Monday)");
    if (!data.preferredTime) missingFields.push("Preferred time (e.g., 10 AM, 2:30 PM)");

    if (missingFields.length > 0) {
      await this.sendMessage(from, generateMissingInfoMessage(missingFields));
      return;
    }

    const orgId = env.HERMES_DEFAULT_ORG_ID || "default";
    const appointmentId = this.generateAppointmentId();

    try {
      const appointment = await Appointment.create({
        id: uuid(),
        orgId,
        appointmentId,
        patientName: data.patientName!,
        mobileNumber: data.mobileNumber!,
        email: "",
        doctorId: data.doctorId || "",
        doctorName: "",
        appointmentDate: data.appointmentDate!,
        preferredTime: data.preferredTime!,
        reasonForVisit: data.reasonForVisit || "General consultation",
        notes: `Booked via WhatsApp QR: ${originalText}`,
        status: "Pending",
        bookingDatetime: new Date().toISOString(),
        createdBy: "hermes-agent",
        source: "whatsapp",
      });

      const doc = appointment.toObject();
      const { _id, __v, ...rest } = doc as any;
      const serialized = { ...rest, id: rest.id };

      socketIOManager.emitToOrg(orgId, "appointment:created", serialized);

      const confirmation = generateConfirmationMessage(data, appointmentId);
      await this.sendMessage(from, confirmation);

      logger.info({ appointmentId, from, orgId }, "Appointment booked via WhatsApp QR local client");
    } catch (err: any) {
      logger.error({ err: err.message }, "Failed to create appointment from WhatsApp local message");
      await this.sendMessage(from, "Sorry, I encountered an error booking your appointment. Please try again.");
    }
  }

  private async handleCancel(from: string, sender: string, text: string): Promise<void> {
    const orgId = env.HERMES_DEFAULT_ORG_ID || "default";
    const phone = extractPhone(sender);

    try {
      const idMatch = text.match(/APT-[\w-]+/i);
      const appointment = idMatch
        ? await Appointment.findOne({ orgId, appointmentId: idMatch[0].toUpperCase() })
        : await Appointment.findOne({ orgId, mobileNumber: phone, status: { $in: ["Pending", "Confirmed"] } })
            .sort({ createdAt: -1 });

      if (!appointment) {
        await this.sendMessage(
          from,
          `*No appointment found* 🤖\n\nI couldn't find a pending or confirmed appointment for your number. Please provide your Appointment ID if you have it, or visit our clinic to check.`
        );
        return;
      }

      appointment.status = "Cancelled";
      appointment.notes = (appointment.notes || "") + `\nCancelled via WhatsApp on ${new Date().toISOString()}`;
      await appointment.save();

      const doc = appointment.toObject();
      const { _id, __v, ...rest } = doc as any;
      socketIOManager.emitToOrg(orgId, "appointment:updated", { ...rest, id: rest.id });

      await this.sendMessage(
        from,
        `✅ *Appointment Cancelled*\n\nYour appointment *${appointment.appointmentId}* on ${appointment.appointmentDate} at ${appointment.preferredTime} has been cancelled.\n\nIf you'd like to book a new one, just let me know!`
      );

      logger.info({ appointmentId: appointment.appointmentId, from, orgId }, "Appointment cancelled via WhatsApp");
    } catch (err: any) {
      logger.error({ err: err.message }, "Failed to cancel appointment via WhatsApp");
      await this.sendMessage(from, "Sorry, I encountered an error cancelling your appointment. Please try again or contact the clinic.");
    }
  }

  private async handleReschedule(from: string, sender: string, text: string): Promise<void> {
    const orgId = env.HERMES_DEFAULT_ORG_ID || "default";
    const phone = extractPhone(sender);

    try {
      const idMatch = text.match(/APT-[\w-]+/i);
      const appointment = idMatch
        ? await Appointment.findOne({ orgId, appointmentId: idMatch[0].toUpperCase() })
        : await Appointment.findOne({ orgId, mobileNumber: phone, status: { $in: ["Pending", "Confirmed"] } })
            .sort({ createdAt: -1 });

      if (!appointment) {
        await this.sendMessage(
          from,
          `*No appointment found* 🤖\n\nI couldn't find an appointment to reschedule. Please provide your Appointment ID or visit our clinic.`
        );
        return;
      }

      const newDate = extractDate(text);
      const newTime = extractTime(text);

      if (newDate) appointment.appointmentDate = newDate;
      if (newTime) {
        const formatted = normalizeToTimeSlot(newTime);
        appointment.preferredTime = formatted;
      }

      if (!newDate && !newTime) {
        await this.sendMessage(
          from,
          `*Reschedule Request* 🤖\n\nI found your appointment *${appointment.appointmentId}* on ${appointment.appointmentDate} at ${appointment.preferredTime}.\n\nPlease tell me the new date and time you'd like.\n\nExample: "Reschedule to Friday at 2 PM"`
        );
        return;
      }

      appointment.notes = (appointment.notes || "") + `\nRescheduled via WhatsApp on ${new Date().toISOString()}`;
      await appointment.save();

      const doc = appointment.toObject();
      const { _id, __v, ...rest } = doc as any;
      socketIOManager.emitToOrg(orgId, "appointment:updated", { ...rest, id: rest.id });

      await this.sendMessage(
        from,
        `✅ *Appointment Rescheduled*\n\nYour appointment *${appointment.appointmentId}* has been updated:\n📅 New Date: ${appointment.appointmentDate}\n⏰ New Time: ${appointment.preferredTime}\n\nThank you!`
      );

      logger.info({ appointmentId: appointment.appointmentId, from, orgId }, "Appointment rescheduled via WhatsApp");
    } catch (err: any) {
      logger.error({ err: err.message }, "Failed to reschedule appointment via WhatsApp");
      await this.sendMessage(from, "Sorry, I encountered an error rescheduling your appointment. Please try again or contact the clinic.");
    }
  }

  private async handleCheckStatus(from: string, sender: string): Promise<void> {
    const orgId = env.HERMES_DEFAULT_ORG_ID || "default";
    const phone = extractPhone(sender);

    try {
      const appointments = await Appointment.find({ orgId, mobileNumber: phone })
        .sort({ createdAt: -1 })
        .limit(3);

      if (appointments.length === 0) {
        await this.sendMessage(
          from,
          `*No appointments found* 🤖\n\nI couldn't find any appointments linked to your number. If you've booked via the website, your Appointment ID would be in your email.\n\nType "Help" to see what I can do!`
        );
        return;
      }

      const lines = appointments.map((a, i) => {
        const statusEmoji = a.status === "Cancelled" ? "❌" : a.status === "Completed" ? "✅" : a.status === "Confirmed" ? "📌" : "⏳";
        return `${i + 1}. ${statusEmoji} *${a.appointmentId}* — ${a.appointmentDate} at ${a.preferredTime}\n   ${a.patientName} — ${a.status}`;
      });

      const msg = [
        `*Your Appointments* 📋`,
        ``,
        ...lines,
        ``,
        `Reply with "Help" to see all options.`,
      ].join("\n");

      await this.sendMessage(from, msg);
      logger.info({ from, orgId, count: appointments.length }, "Appointment status checked via WhatsApp");
    } catch (err: any) {
      logger.error({ err: err.message }, "Failed to check appointment status via WhatsApp");
      await this.sendMessage(from, "Sorry, I encountered an error fetching your appointments. Please try again.");
    }
  }

  private generateAppointmentId(): string {
    const prefix = "APT";
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `${prefix}-${timestamp}-${random}`;
  }
}

export const whatsappLocalClient = new WhatsAppLocalClient();
