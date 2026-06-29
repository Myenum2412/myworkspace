import { Server as HttpServer } from "http";
import { Server, Socket } from "socket.io";
import jwt from "jsonwebtoken";
import { env } from "../../config/env.js";
import { JwtPayload } from "../../types/index.js";
import { ActivityLog } from "../db/models/ActivityLog.js";

interface AuthenticatedSocket extends Socket {
  userId?: string;
  orgId?: string;
}

export class SocketIOManager {
  private io: Server | null = null;

  initialize(server: HttpServer) {
    this.io = new Server(server, {
      path: "/api/socketio",
      cors: {
        origin: env.CORS_ORIGIN,
        credentials: true,
      },
    });

    // Per-IP handshake rate limiter — sliding window 20 attempts / minute.
    // Stored in-process; fine for a single instance. Swap for redis if you
    // add a second instance.
    const handshakeAttempts = new Map<string, number[]>();
    const HANDSHAKE_LIMIT = 20;
    const HANDSHAKE_WINDOW_MS = 60_000;

    this.io.use((socket: AuthenticatedSocket, next) => {
      const now = Date.now();
      const ip =
        (socket.handshake.headers["x-forwarded-for"] as string) ||
        socket.handshake.address ||
        "unknown";
      const attempts = (handshakeAttempts.get(ip) || []).filter((t) => now - t < HANDSHAKE_WINDOW_MS);
      attempts.push(now);
      handshakeAttempts.set(ip, attempts);
      if (attempts.length > HANDSHAKE_LIMIT) {
        return next(new Error("rate_limited"));
      }

      const token = socket.handshake.auth?.token || socket.handshake.query?.token;
      if (token) {
        try {
          const decoded = jwt.verify(token as string, env.JWT_SECRET) as JwtPayload;
          // Accept both long-lived session JWTs and short-lived socket tokens
          // (purpose: "socket"). Both are signed with the same secret.
          socket.userId = decoded.userId;
          socket.orgId = decoded.orgId;
        } catch {
          return next(new Error("Invalid token"));
        }
      } else {
        return next(new Error("Authentication required"));
      }
      next();
    });

    this.io.on("connection", (socket: AuthenticatedSocket) => {
      if (socket.userId) {
        socket.join(`user:${socket.userId}`);
        if (socket.orgId) {
          socket.join(`org:${socket.orgId}`);
        }
      }

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

      socket.on("disconnect", () => {
        // handled by session routes
      });
    });

    console.log("✦ Socket.IO initialized on /api/socketio");
    return this.io;
  }

  getIO(): Server | null {
    return this.io;
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
}

export const socketIOManager = new SocketIOManager();
