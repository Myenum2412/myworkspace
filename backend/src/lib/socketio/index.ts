import type { Server as HttpServer } from "node:http";
import jwt from "jsonwebtoken";
import { Server, type Socket } from "socket.io";
import { env } from "../../config/env.js";
import type { JwtPayload } from "../../types/index.js";
import { logger } from "../logger/index.js";
import { mediaServer } from "../mediasoup/index.js";
import { type PresenceStatus, presenceRegistry } from "../presence/index.js";

interface AuthenticatedSocket extends Socket {
  userId?: string;
  orgId?: string;
}

/** Relayed verbatim to other participants in the same call room. */
interface RtcSignal {
  callId: string;
  to?: string;
  sdp?: unknown;
  candidate?: unknown;
  screen?: boolean;
  name?: string;
}

export class SocketIOManager {
  private io: Server | null = null;
  private connectionCount = 0;
  private maxConnections = 10_000;
  private socketIdCounter = 0;
  private socketRefByConn = new WeakMap<Socket, number>();

  private nextSocketId(): number {
    return ++this.socketIdCounter;
  }

  private consumeSocketId(socket: Socket): number | undefined {
    const id = this.socketRefByConn.get(socket);
    return id;
  }

  private tagSocket(socket: Socket, id: number) {
    this.socketRefByConn.set(socket, id);
  }

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

      // Presence: mark online and register this socket.
      const sockId = this.nextSocketId();
      this.tagSocket(socket, sockId);
      presenceRegistry.online(socket.userId, socket.orgId, sockId);

      // Send this freshly-connected client a full presence snapshot so it can
      // render correct online/offline state immediately (not just for users who
      // transition after we connect).
      if (socket.orgId) {
        const snapshot = presenceRegistry.getOrg(socket.orgId).map((entry) => ({
          userId: entry.userId,
          status: entry.status,
          lastActiveAt: entry.lastActiveAt,
        }));
        socket.emit("presence:snapshot", { presence: snapshot });
      }

      socket.on("presence:heartbeat", () => {
        presenceRegistry.heartbeat(socket.userId!);
      });

      socket.on("presence:status", (status: PresenceStatus) => {
        if (["online", "idle", "busy", "in-call"].includes(status)) {
          presenceRegistry.status(socket.userId!, status);
        }
      });

      this.registerChatHandlers(socket);
      this.registerRtcHandlers(socket);
      // SFU handlers must also clean up on disconnect, so we register a flag.
      this.registerSfuHandlers(socket);

      socket.on("disconnect", () => {
        this.connectionCount = Math.max(0, this.connectionCount - 1);
        presenceRegistry.offline(socket.userId!, this.consumeSocketId(socket));
        const callId = this.callRooms.get(socket.id);
        if (callId) {
          this.callRooms.delete(socket.id);
          socket
            .to(`call:${callId}`)
            .emit("rtc:peer-left", { userId: socket.userId, name: this.callNames.get(socket.id) });
          this.callNames.delete(socket.id);
        }
        const sfuCall = this.sfuCalls.get(socket.id);
        if (sfuCall) {
          this.sfuCalls.delete(socket.id);
          mediaServer.closePeer(sfuCall, socket.userId!);
          socket.to(`call:${sfuCall}`).emit("sfu:peer-left", { peerId: socket.userId });
        }
      });
    });

    presenceRegistry.startSweeper();

    logger.info({ path: "/api/socketio" }, "Socket.IO initialized");
    return this.io;
  }

  private callRooms = new Map<string, string>();
  private callNames = new Map<string, string>();
  private sfuCalls = new Map<string, string>();

  /**
   * Chat relay events. The chat itself is persisted by the Next.js API layer;
   * these events exist so every connected client gets instant, low-latency
   * updates for typing, read receipts, delivery acks and new messages without
   * waiting for polling. Events are fanned out to the whole org room and
   * filtered client-side by membership.
   */
  private registerChatHandlers(socket: AuthenticatedSocket) {
    if (!socket.orgId) return;
    const orgRoom = `org:${socket.orgId}`;

    socket.on("chat:typing", (data: { channelId?: string; name?: string }) => {
      socket.to(orgRoom).emit("chat:typing", {
        channelId: data?.channelId,
        userId: socket.userId,
        name: data?.name || "",
      });
    });

    socket.on("chat:stop-typing", (data: { channelId?: string }) => {
      socket.to(orgRoom).emit("chat:stop-typing", {
        channelId: data?.channelId,
        userId: socket.userId,
      });
    });

    socket.on(
      "chat:read",
      (data: {
        channelId?: string;
        readerId?: string;
        readBy: Array<{ userId: string; readAt: string }>;
      }) => {
        socket.to(orgRoom).emit("chat:read", {
          channelId: data?.channelId,
          readerId: data?.readerId || socket.userId,
          readBy: data?.readBy || [],
        });
      },
    );

    socket.on("chat:message", (data: { channelId?: string; message?: unknown }) => {
      socket.to(orgRoom).emit("chat:message", {
        channelId: data?.channelId,
        message: data?.message,
      });
    });

    socket.on("chat:message-updated", (data: { channelId?: string; message?: unknown }) => {
      socket.to(orgRoom).emit("chat:message-updated", {
        channelId: data?.channelId,
        message: data?.message,
      });
    });

    socket.on("chat:message-deleted", (data: { channelId?: string; messageId?: string }) => {
      socket.to(orgRoom).emit("chat:message-deleted", {
        channelId: data?.channelId,
        messageId: data?.messageId,
      });
    });

    socket.on("chat:delivered", (data: { channelId?: string; messageId?: string }) => {
      socket.to(orgRoom).emit("chat:delivered", {
        channelId: data?.channelId,
        messageId: data?.messageId,
        userId: socket.userId,
      });
    });
  }

  /**
   * WebRTC signaling relay for mesh calls. Every participant joins a per-call
   * room (`call:<id>`) when they connect media; offers/answers/ICE candidates
   * are routed to a specific peer, while screen/state changes and join/leave
   * are broadcast to the whole call room.
   */
  private registerRtcHandlers(socket: AuthenticatedSocket) {
    if (!socket.orgId) return;

    socket.on("rtc:join", (data: { callId?: string; name?: string }) => {
      const callId = data?.callId;
      if (!callId || !socket.userId) return;
      const room = `call:${callId}`;
      const alreadyInRoom = this.callRooms.get(socket.id) === callId;
      socket.join(room);
      this.callRooms.set(socket.id, callId);
      this.callNames.set(socket.id, data?.name || "");
      if (!alreadyInRoom) {
        socket.to(room).emit("rtc:peer-joined", { userId: socket.userId, name: data?.name || "" });
      }
    });

    socket.on("rtc:leave", (data: { callId?: string }) => {
      const callId = data?.callId;
      if (callId) socket.leave(`call:${callId}`);
      if (this.callRooms.get(socket.id) === callId) this.callRooms.delete(socket.id);
      this.callNames.delete(socket.id);
      socket.to(`call:${callId}`).emit("rtc:peer-left", { userId: socket.userId, name: "" });
    });

    const relay = (signal: RtcSignal, event: string) => {
      const callId = signal?.callId;
      if (!callId || !socket.userId) return;
      const room = `call:${callId}`;
      const payload = { ...signal, from: socket.userId };
      const target = signal?.to;
      if (target && target !== socket.userId) {
        socket.to(room).to(`user:${target}`).emit(event, payload);
      } else {
        socket.to(room).emit(event, payload);
      }
    };

    socket.on("rtc:offer", (signal: RtcSignal) => relay(signal, "rtc:offer"));
    socket.on("rtc:answer", (signal: RtcSignal) => relay(signal, "rtc:answer"));
    socket.on("rtc:ice", (signal: RtcSignal) => relay(signal, "rtc:ice"));
    socket.on("rtc:renegotiate", (signal: RtcSignal) => relay(signal, "rtc:renegotiate"));
    socket.on("rtc:screen", (signal: RtcSignal) => {
      const callId = signal?.callId;
      if (!callId || !socket.userId) return;
      socket
        .to(`call:${callId}`)
        .emit("rtc:screen", { callId, userId: socket.userId, screen: Boolean(signal?.screen) });
    });
    socket.on("rtc:audio-toggle", (signal: { callId?: string; audio?: boolean }) => {
      const callId = signal?.callId;
      if (!callId || !socket.userId) return;
      socket
        .to(`call:${callId}`)
        .emit("rtc:audio-toggle", { callId, userId: socket.userId, audio: Boolean(signal?.audio) });
    });
  }

  /**
   * SFU signaling for mediasoup-backed calls. Each participant opens one shared
   * WebRTC transport (send + recv). Handlers answer with Socket.IO acks so the
   * client can sequence the WebRTC setup deterministically.
   */
  private registerSfuHandlers(socket: AuthenticatedSocket) {
    if (!socket.orgId || !socket.userId) return;

    const ackErr = (ack?: (res: unknown) => void) => (err: unknown) => {
      ack?.({ error: err instanceof Error ? err.message : String(err) });
    };

    socket.on("sfu:get-rtp-capabilities", (callId: string, ack?: (res: unknown) => void) => {
      if (!callId || typeof callId !== "string") return ack?.({ error: "callId required" });
      mediaServer
        .getRouterRtpCapabilities(callId)
        .then((rtpCapabilities) => ack?.({ rtpCapabilities }))
        .catch(ackErr(ack));
    });

    socket.on("sfu:create-transport", (callId: string, ack?: (res: unknown) => void) => {
      if (!callId || typeof callId !== "string") return ack?.({ error: "callId required" });
      mediaServer
        .createTransport(callId, socket.userId!)
        .then((params) => ack?.({ ...params }))
        .catch(ackErr(ack));
    });

    socket.on(
      "sfu:connect-transport",
      (
        data: { callId?: string; transportId?: string; dtlsParameters?: unknown },
        ack?: (res: unknown) => void,
      ) => {
        const { callId, transportId, dtlsParameters } = data ?? {};
        if (!callId || !transportId || !dtlsParameters)
          return ack?.({ error: "Missing transport fields" });
        mediaServer
          .connectTransport(callId, transportId, dtlsParameters as any)
          .then(() => ack?.({ connected: true }))
          .catch(ackErr(ack));
      },
    );

    socket.on(
      "sfu:produce",
      (
        data: {
          callId?: string;
          transportId?: string;
          kind?: "audio" | "video";
          app?: string;
          name?: string;
          rtpParameters?: unknown;
        },
        ack?: (res: unknown) => void,
      ) => {
        const { callId, transportId, kind, app, name, rtpParameters } = data ?? {};
        if (!callId || !transportId || !kind || !rtpParameters) {
          return ack?.({ error: "produce payload incomplete" });
        }
        mediaServer
          .produce(
            callId,
            transportId,
            socket.userId!,
            name || "",
            app || "media",
            kind,
            rtpParameters as any,
          )
          .then(({ producerId, existing }) => {
            // Existing participants consume this new producer.
            socket.to(`call:${callId}`).emit("sfu:new-producer", {
              callId,
              producer: {
                producerId,
                peerId: socket.userId,
                name: name || "",
                kind,
                app: app || "media",
              },
            });
            ack?.({ producerId, existing });
          })
          .catch(ackErr(ack));
      },
    );

    socket.on("sfu:list-producers", (callId: string, ack?: (res: unknown) => void) => {
      if (!callId || typeof callId !== "string") return ack?.({ error: "callId required" });
      try {
        ack?.({ producers: mediaServer.listProducers(callId) });
      } catch (err) {
        ackErr(ack)(err);
      }
    });

    socket.on(
      "sfu:consume",
      (
        data: {
          callId?: string;
          transportId?: string;
          producerId?: string;
          rtpCapabilities?: unknown;
        },
        ack?: (res: unknown) => void,
      ) => {
        const { callId, transportId, producerId, rtpCapabilities } = data ?? {};
        if (!callId || !transportId || !producerId || !rtpCapabilities) {
          return ack?.({ error: "consume payload incomplete" });
        }
        mediaServer
          .consume(callId, transportId, producerId, rtpCapabilities as any)
          .then((consumer) => ack?.({ ...consumer }))
          .catch(ackErr(ack));
      },
    );

    socket.on(
      "sfu:resume-consumer",
      (data: { callId?: string; consumerId?: string }, ack?: (res: unknown) => void) => {
        const { callId, consumerId } = data ?? {};
        if (!callId || !consumerId) return ack?.({ error: "consumerId required" });
        mediaServer
          .resumeConsumer(callId, consumerId)
          .then(() => ack?.({ resumed: true }))
          .catch(ackErr(ack));
      },
    );

    socket.on("sfu:close-consumer", (data: { callId?: string; consumerId?: string }) => {
      if (data?.callId && data?.consumerId) mediaServer.closeConsumer(data.callId, data.consumerId);
    });

    socket.on("sfu:close-producer", (data: { callId?: string; producerId?: string }) => {
      if (data?.callId && data?.producerId) mediaServer.closeProducer(data.callId, data.producerId);
    });

    socket.on("sfu:close-transport", (data: { callId?: string; transportId?: string }) => {
      if (data?.callId && data?.transportId)
        mediaServer.closeTransport(data.callId, data.transportId);
    });

    socket.on("sfu:join", (data: { callId?: string }, ack?: (res: unknown) => void) => {
      const callId = data?.callId;
      if (!callId || typeof callId !== "string") return ack?.({ error: "callId required" });
      const alreadyJoined = this.sfuCalls.get(socket.id) === callId;
      socket.join(`call:${callId}`);
      this.sfuCalls.set(socket.id, callId);
      if (!alreadyJoined) {
        socket.to(`call:${callId}`).emit("sfu:peer-joined", { callId, peerId: socket.userId });
      }
      ack?.({ joined: true });
    });

    socket.on("sfu:leave", (data: { callId?: string }) => {
      const callId = data?.callId;
      if (!callId) return;
      if (this.sfuCalls.get(socket.id) === callId) this.sfuCalls.delete(socket.id);
      socket.leave(`call:${callId}`);
      mediaServer.closePeer(callId, socket.userId!);
      socket.to(`call:${callId}`).emit("sfu:peer-left", { callId, peerId: socket.userId });
    });
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

  emitToUser<T = unknown>(userId: string, event: string, data: T) {
    this.io?.to(`user:${userId}`).emit(event, data);
  }

  /**
   * Forcefully disconnect every live WebSocket / Socket.IO connection for a
   * user. Used when an account is terminated / deactivated / suspended so that
   * no live connection can retain access.
   */
  disconnectUser(userId: string, reason = "account_terminated") {
    if (!this.io) return;
    const room = `user:${userId}`;
    try {
      const sockets = this.io.sockets.adapter.rooms.get(room);
      if (sockets) {
        for (const socketId of sockets) {
          const socket = this.io?.sockets.sockets.get(socketId);
          if (socket) {
            socket.emit("auth:revoked", { reason });
            socket.disconnect(true);
          }
        }
      }
      // Disconnect any socket whose handshake auth tied it to this user.
      const allSockets = this.io.sockets.sockets;
      for (const socket of allSockets.values()) {
        const s = socket as unknown as AuthenticatedSocket;
        if (s.userId === userId) {
          s.emit("auth:revoked", { reason });
          s.disconnect(true);
        }
      }
    } catch (err) {
      logger.warn({ err, userId }, "Failed to disconnect sockets for user");
    }
  }

  emitToOrg<T = unknown>(orgId: string, event: string, data: T) {
    this.io?.to(`org:${orgId}`).emit(event, data);
  }

  emitUnreadCount(userId: string, count: number) {
    this.io?.to(`user:${userId}`).emit("unread_count", { count });
  }

  emitToAppointmentStakeholders<T = unknown>(data: T) {
    const record = data as Record<string, unknown>;
    if (record.orgId && typeof record.orgId === "string") {
      this.io?.to(`org:${record.orgId}`).emit("appointment:created", data);
    }
  }
}

export const socketIOManager = new SocketIOManager();
