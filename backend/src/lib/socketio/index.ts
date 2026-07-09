import { Server as HttpServer } from "http";
import { Server, Socket } from "socket.io";
import { createAdapter } from "@socket.io/redis-adapter";
import jwt from "jsonwebtoken";
import { Redis } from "ioredis";
import { env } from "../../config/env.js";
import { JwtPayload } from "../../types/index.js";
import { isRedisConnected } from "../redis.js";
import { logger } from "../logger/index.js";
import { metricsRegistry } from "../monitoring/index.js";
import { sendMessage } from "../../services/chat.service.js";

interface AuthenticatedSocket extends Socket {
  userId?: string;
  orgId?: string;
  lastActivity?: number;
  reconnectAttempt?: number;
}

const HEARTBEAT_TIMEOUT = 30_000;
const HEARTBEAT_INTERVAL = 25_000;
const RECONNECT_GRACE_PERIOD = 60_000;

export class SocketIOManager {
  private io: Server | null = null;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private userSockets: Map<string, Set<string>> = new Map();
  private orgUserPresence: Map<string, Set<string>> = new Map();
  private presenceCache: Map<string, { status: string; timestamp: number }> = new Map();

  initialize(server: HttpServer) {
    this.io = new Server(server, {
      path: "/api/socketio",
      cors: {
        origin: env.CORS_ORIGIN,
        credentials: true,
      },
      pingInterval: HEARTBEAT_INTERVAL,
      pingTimeout: HEARTBEAT_TIMEOUT,
      transports: ["websocket", "polling"],
      allowEIO3: true,
      connectTimeout: 20_000,
      maxHttpBufferSize: 1e6,
    });

    if (isRedisConnected()) {
      try {
        const pubClient = new Redis(env.REDIS_URL, {
          maxRetriesPerRequest: 3,
          retryStrategy(times: number): number | null {
            if (times > 5) return null;
            return Math.min(times * 200, 2000);
          },
          lazyConnect: true,
        });
        const subClient = pubClient.duplicate();
        this.io.adapter(createAdapter(pubClient, subClient));
        logger.info("Socket.IO Redis adapter initialized");
      } catch (err) {
        logger.warn({ err: (err as Error).message }, "Socket.IO Redis adapter failed, falling back to in-memory");
      }
    } else {
      logger.info("Socket.IO using in-memory adapter (single instance)");
    }

    // ── Authentication middleware ──
    this.io.use((socket: AuthenticatedSocket, next) => {
      const token = socket.handshake.auth?.token || socket.handshake.query?.token;
      if (token) {
        try {
          const decoded = jwt.verify(token as string, env.JWT_SECRET) as JwtPayload;
          socket.userId = decoded.userId;
          socket.orgId = decoded.orgId;
          socket.lastActivity = Date.now();
        } catch {
          return next(new Error("Invalid token"));
        }
      } else {
        return next(new Error("Authentication required"));
      }
      next();
    });

    // ── Connection handler ──
    this.io.on("connection", (socket: AuthenticatedSocket) => {
      if (!socket.userId || !socket.orgId) return;

      const userId = socket.userId;
      const orgId = socket.orgId;

      // Track user sockets
      if (!this.userSockets.has(userId)) {
        this.userSockets.set(userId, new Set());
      }
      this.userSockets.get(userId)!.add(socket.id);
      this.presenceCache.set(userId, { status: "online", timestamp: Date.now() });

      // Track org presence
      if (!this.orgUserPresence.has(orgId)) {
        this.orgUserPresence.set(orgId, new Set());
      }
      this.orgUserPresence.get(orgId)!.add(userId);

      // Join rooms
      socket.join(`user:${userId}`);
      socket.join(`org:${orgId}`);

      // Notify org of presence
      this.io?.to(`org:${orgId}`).emit("user:status:changed", {
        userId,
        status: "online",
        timestamp: new Date().toISOString(),
      });

      // ── Events ──
      socket.on("presence:online", (data: { timestamp: number }) => {
        this.presenceCache.set(userId, { status: "online", timestamp: Date.now() });
      });

      socket.on("presence:offline", (data: { timestamp: number }) => {
        this.presenceCache.set(userId, { status: "offline", timestamp: Date.now() });
      });

      socket.on("session:status", async (data: { status: "online" | "break" | "offline"; sessionId?: string }) => {
        if (!socket.userId) return;
        this.io?.to(`user:${socket.userId}`).emit("session:status:updated", {
          userId: socket.userId,
          status: data.status,
          sessionId: data.sessionId,
          timestamp: new Date().toISOString(),
        });
        if (socket.orgId) {
          this.io?.to(`org:${socket.orgId}`).emit("user:status:changed", {
            userId: socket.userId,
            status: data.status,
            timestamp: new Date().toISOString(),
          });
        }
        this.presenceCache.set(userId, {
          status: data.status,
          timestamp: Date.now(),
        });
      });

      socket.on("session:break:start", (data: { sessionId: string }) => {
        if (!socket.userId) return;
        this.io?.to(`user:${socket.userId}`).emit("session:break:started", {
          sessionId: data.sessionId,
          timestamp: new Date().toISOString(),
        });
      });

      socket.on("session:break:end", (data: { sessionId: string }) => {
        if (!socket.userId) return;
        this.io?.to(`user:${socket.userId}`).emit("session:break:ended", {
          sessionId: data.sessionId,
          timestamp: new Date().toISOString(),
        });
      });

      socket.on("chat:send", async (data: {
        conversationId: string;
        content: string;
        messageType?: "text" | "system" | "file";
        replyTo?: string;
      }) => {
        if (!socket.userId || !socket.orgId) return;
        try {
          const message = await sendMessage({
            orgId: socket.orgId,
            senderId: socket.userId,
            createdBy: socket.userId,
            conversationId: data.conversationId,
            content: data.content,
            messageType: data.messageType,
            replyTo: data.replyTo,
          });
          socket.emit("chat:sent", { success: true, data: message });
          metricsRegistry.incrementCounter("chat_messages_sent", { orgId: socket.orgId });
        } catch (err) {
          socket.emit("chat:error", { error: (err as Error).message });
        }
      });

      socket.on("chat:typing", (data: { conversationId: string; isTyping: boolean }) => {
        if (!socket.userId || !socket.orgId) return;
        socket.to(`org:${socket.orgId}`).emit("chat:typing", {
          conversationId: data.conversationId,
          userId: socket.userId,
          isTyping: data.isTyping,
        });
      });

      socket.on("chat:read", (data: { conversationId: string; messageId: string }) => {
        if (!socket.userId) return;
        this.io?.to(`org:${orgId}`).emit("chat:read:receipt", {
          conversationId: data.conversationId,
          messageId: data.messageId,
          userId: socket.userId,
          timestamp: new Date().toISOString(),
        });
      });

      // ── Ping/pong heartbeat ──
      socket.on("ping", (cb: (response: unknown) => void) => {
        socket.lastActivity = Date.now();
        if (typeof cb === "function") cb({ pong: true, time: Date.now() });
      });

      // ── Disconnect ──
      socket.on("disconnect", (reason) => {
        socket.lastActivity = Date.now();

        // Remove user socket tracking
        const userSockets = this.userSockets.get(userId);
        if (userSockets) {
          userSockets.delete(socket.id);
          if (userSockets.size === 0) {
            this.userSockets.delete(userId);
            // Grace period before marking offline
            setTimeout(() => {
              if (!this.userSockets.has(userId)) {
                this.presenceCache.set(userId, { status: "offline", timestamp: Date.now() });
                this.io?.to(`org:${orgId}`).emit("user:status:changed", {
                  userId,
                  status: "offline",
                  timestamp: new Date().toISOString(),
                });
                this.orgUserPresence.get(orgId)?.delete(userId);
              }
            }, RECONNECT_GRACE_PERIOD);
          }
        }

        metricsRegistry.incrementCounter("socket_disconnections", { reason });
      });
    });

    // ── Heartbeat monitoring ──
    this.heartbeatTimer = setInterval(() => {
      if (!this.io) return;
      const now = Date.now();
      const sockets = this.io.sockets.sockets;
      sockets.forEach((socket: AuthenticatedSocket) => {
        if (socket.lastActivity && now - socket.lastActivity > HEARTBEAT_TIMEOUT * 2) {
          logger.warn({ userId: socket.userId }, "Socket heartbeat timeout — forcing disconnect");
          socket.disconnect(true);
          metricsRegistry.incrementCounter("socket_heartbeat_timeouts");
        }
      });
    }, HEARTBEAT_INTERVAL);

    logger.info({ path: "/api/socketio" }, "Socket.IO initialized");
    return this.io;
  }

  getIO(): Server | null {
    return this.io;
  }

  close() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
    if (this.io) {
      this.io.close();
      this.io = null;
    }
    this.userSockets.clear();
    this.orgUserPresence.clear();
    this.presenceCache.clear();
  }

  emitToUser<T = any>(userId: string, event: string, data: T) {
    this.io?.to(`user:${userId}`).emit(event, data);
  }

  emitToOrg<T = any>(orgId: string, event: string, data: T) {
    this.io?.to(`org:${orgId}`).emit(event, data);
  }

  emitToSession<T = any>(sessionId: string, event: string, data: T) {
    this.io?.to(`session:${sessionId}`).emit(event, data);
  }

  isUserOnline(userId: string): boolean {
    return this.userSockets.has(userId) && (this.userSockets.get(userId)?.size ?? 0) > 0;
  }

  getOnlineUsers(orgId: string): string[] {
    return Array.from(this.orgUserPresence.get(orgId) || []);
  }

  getUserPresence(userId: string): { status: string; timestamp: number } | null {
    return this.presenceCache.get(userId) || null;
  }

  getUserSocketCount(userId: string): number {
    return this.userSockets.get(userId)?.size ?? 0;
  }
}

export const socketIOManager = new SocketIOManager();