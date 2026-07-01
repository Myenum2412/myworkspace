import { Server as HttpServer } from "http";
import { Server, Socket } from "socket.io";
import { createAdapter } from "@socket.io/redis-adapter";
import jwt from "jsonwebtoken";
import { Redis } from "ioredis";
import { env } from "../../config/env.js";
import { JwtPayload } from "../../types/index.js";
import { isRedisConnected } from "../redis.js";
import { logger } from "../logger/index.js";

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
    this.io.use((socket: AuthenticatedSocket, next) => {
      const token = socket.handshake.auth?.token || socket.handshake.query?.token;
      if (token) {
        try {
          const decoded = jwt.verify(token as string, env.JWT_SECRET) as JwtPayload;
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

    logger.info({ path: "/api/socketio" }, "Socket.IO initialized");
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
