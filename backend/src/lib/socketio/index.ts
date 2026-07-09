import { Server as HttpServer } from "http";
import { Server, Socket } from "socket.io";
import jwt from "jsonwebtoken";
import { env } from "../../config/env.js";
import { JwtPayload } from "../../types/index.js";
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
      transports: ["websocket", "polling"],
      allowEIO3: true,
      connectTimeout: 20_000,
    });

    // Authentication middleware
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

    // Connection handler — only handles notification room joining
    this.io.on("connection", (socket: AuthenticatedSocket) => {
      if (!socket.userId) return;

      // Join user-specific notification room
      socket.join(`user:${socket.userId}`);
      logger.debug({ userId: socket.userId }, "Socket joined notification room");

      socket.on("disconnect", () => {
        logger.debug({ userId: socket.userId }, "Socket disconnected");
      });
    });

    logger.info({ path: "/api/socketio" }, "Socket.IO initialized (notifications only)");
    return this.io;
  }

  getIO(): Server | null {
    return this.io;
  }

  close() {
    if (this.io) {
      this.io.close();
      this.io = null;
    }
  }

  emitToUser<T = any>(userId: string, event: string, data: T) {
    this.io?.to(`user:${userId}`).emit(event, data);
  }
}

export const socketIOManager = new SocketIOManager();
