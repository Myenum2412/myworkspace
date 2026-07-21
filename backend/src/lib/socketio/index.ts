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
  private connectionCount = 0;
  private maxConnections = 10_000;

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
      pingInterval: 25_000,
      pingTimeout: 20_000,
      maxHttpBufferSize: 1e6,
      perMessageDeflate: {
        threshold: 1024,
      },
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

    // Connection handler
    this.io.on("connection", (socket: AuthenticatedSocket) => {
      if (!socket.userId) return;

      this.connectionCount++;
      if (this.connectionCount > this.maxConnections) {
        logger.warn({ connectionCount: this.connectionCount }, "Socket connection limit exceeded");
        socket.disconnect(true);
        return;
      }

      socket.join(`user:${socket.userId}`);

      if (socket.orgId) {
        socket.join(`org:${socket.orgId}`);
      }

      socket.on("disconnect", () => {
        this.connectionCount = Math.max(0, this.connectionCount - 1);
      });
    });

    logger.info({ path: "/api/socketio" }, "Socket.IO initialized");
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

  emitToOrg<T = any>(orgId: string, event: string, data: T) {
    this.io?.to(`org:${orgId}`).emit(event, data);
  }

  emitUnreadCount(userId: string, count: number) {
    this.io?.to(`user:${userId}`).emit("unread_count", { count });
  }

  emitToAppointmentStakeholders<T = any>(data: T) {
    const record = data as Record<string, unknown>;
    if (record.orgId && typeof record.orgId === "string") {
      this.io?.to(`org:${record.orgId}`).emit("appointment:created", data);
    }
  }
}

export const socketIOManager = new SocketIOManager();
