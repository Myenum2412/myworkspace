import "dotenv/config";
import express from "express";
import { createServer } from "http";
import { Server as SocketIOServer } from "socket.io";
import cors from "cors";
import helmet from "helmet";
import { v4 as uuid } from "uuid";
import mongoose from "mongoose";
import * as mediasoup from "mediasoup";
import type { types as mediasoupTypes } from "mediasoup";

// ── Config ───────────────────────────────────────────────────────────
const PORT = parseInt(process.env.PORT || "4001", 10);
const CORS_ORIGIN = process.env.CORS_ORIGIN || "http://localhost:3000";
const RTC_MIN_PORT = parseInt(process.env.RTC_MIN_PORT || "10000", 10);
const RTC_MAX_PORT = parseInt(process.env.RTC_MAX_PORT || "59999", 10);
const ANNOUNCED_IP = process.env.ANNOUNCED_IP || "127.0.0.1";

// ── Types ────────────────────────────────────────────────────────────
interface Participant {
  id: string;
  userId: string;
  name: string;
  avatar: string;
  socketId: string;
  transport?: mediasoupTypes.WebRtcTransport;
  producerAudio?: mediasoupTypes.Producer;
  producerVideo?: mediasoupTypes.Producer;
  producerScreen?: mediasoupTypes.Producer;
  consumers: Map<string, mediasoupTypes.Consumer>;
  isMuted: boolean;
  isCameraOff: boolean;
  isScreenSharing: boolean;
  isHandRaised: boolean;
}

interface Room {
  id: string;
  name: string;
  createdBy: string;
  password: string | null;
  participants: Map<string, Participant>;
  router: mediasoupTypes.Router;
  createdAt: Date;
  isActive: boolean;
}

interface ChatMessage {
  id: string;
  roomId: string;
  userId: string;
  userName: string;
  userAvatar: string;
  text: string;
  timestamp: Date;
  type: "text" | "system";
}

// ── Global State ─────────────────────────────────────────────────────
const rooms = new Map<string, Room>();
const socketToRoom = new Map<string, string>();
const chatHistory = new Map<string, ChatMessage[]>();
let mediasoupWorker: mediasoupTypes.Worker;

// ── Mediasoup Setup ──────────────────────────────────────────────────
async function createMediasoupWorker() {
  mediasoupWorker = await mediasoup.createWorker({
    rtcMinPort: RTC_MIN_PORT,
    rtcMaxPort: RTC_MAX_PORT,
    logLevel: "warn" as mediasoupTypes.WorkerLogLevel,
  });

  mediasoupWorker.on("died", () => {
    console.error("[Mediasoup] Worker died, exiting...");
    process.exit(1);
  });

  console.log(`[Mediasoup] Worker created (PID: ${mediasoupWorker.pid})`);
  return mediasoupWorker;
}

async function createRouter(): Promise<mediasoupTypes.Router> {
  const codecs: mediasoupTypes.RtpCodecCapability[] = [
    {
      kind: "audio",
      mimeType: "audio/opus",
      clockRate: 48000,
      channels: 2,
    },
    {
      kind: "video",
      mimeType: "video/VP8",
      clockRate: 90000,
      parameters: {
        "x-google-start-bitrate": 1000,
      },
    },
    {
      kind: "video",
      mimeType: "video/VP9",
      clockRate: 90000,
      parameters: {
        "profile-id": 2,
        "x-google-start-bitrate": 1000,
      },
    },
    {
      kind: "video",
      mimeType: "video/H264",
      clockRate: 90000,
      parameters: {
        "level-asymmetry-allowed": 1,
        "packetization-mode": 1,
        "profile-level-id": "42e01f",
      },
    },
  ];

  return mediasoupWorker.createRouter({ mediaCodecs: codecs });
}

async function createWebRtcTransport(
  router: mediasoupTypes.Router
): Promise<mediasoupTypes.WebRtcTransport> {
  const transport = await router.createWebRtcTransport({
    listenIps: [
      {
        ip: "0.0.0.0",
        announcedIp: ANNOUNCED_IP,
      },
    ],
    enableUdp: true,
    enableTcp: true,
    preferUdp: true,
    initialAvailableOutgoingBitrate: 1000000,
  });

  return transport;
}

// ── MongoDB Schemas ──────────────────────────────────────────────────
const meetingSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  roomId: { type: String, required: true },
  name: { type: String, required: true },
  createdBy: { type: String, required: true },
  password: { type: String, default: null },
  participants: [{ type: String }],
  startedAt: { type: Date },
  endedAt: { type: Date },
  duration: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
});

const chatMessageSchema = new mongoose.Schema({
  id: { type: String, required: true },
  roomId: { type: String, required: true },
  userId: { type: String, required: true },
  userName: { type: String, required: true },
  userAvatar: { type: String, default: "" },
  text: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
  type: { type: String, enum: ["text", "system"], default: "text" },
});

const Meeting = mongoose.model("Meeting", meetingSchema);
const ChatMessageModel = mongoose.model("ChatMessage", chatMessageSchema);

// ── Express + Socket.IO Setup ────────────────────────────────────────
const app = express();
const httpServer = createServer(app);

app.use(cors({ origin: CORS_ORIGIN, credentials: true }));
app.use(helmet({ contentSecurityPolicy: false }));
app.use(express.json());

const io = new SocketIOServer(httpServer, {
  cors: {
    origin: CORS_ORIGIN,
    credentials: true,
  },
  transports: ["websocket", "polling"],
});

// ── Health Check ─────────────────────────────────────────────────────
app.get("/health", (_req, res) => {
  res.json({ status: "ok", rooms: rooms.size, uptime: process.uptime() });
});

app.get("/api/rooms", (_req, res) => {
  const roomList = Array.from(rooms.values()).map((r) => ({
    id: r.id,
    name: r.name,
    participantCount: r.participants.size,
    isActive: r.isActive,
    createdAt: r.createdAt,
  }));
  res.json({ data: roomList });
});

// ── Socket.IO Connection ─────────────────────────────────────────────
io.on("connection", (socket) => {
  console.log(`[Socket] Connected: ${socket.id}`);

  // ── Create Room ──────────────────────────────────────────────
  socket.on("create-room", async (data: { name: string; password?: string; userId: string; userName: string; userAvatar?: string }, callback) => {
    try {
      const roomId = uuid();
      const router = await createRouter();

      const room: Room = {
        id: roomId,
        name: data.name,
        createdBy: data.userId,
        password: data.password || null,
        participants: new Map(),
        router,
        createdAt: new Date(),
        isActive: true,
      };

      rooms.set(roomId, room);
      chatHistory.set(roomId, []);

      // Save to DB
      await Meeting.create({
        id: uuid(),
        roomId,
        name: data.name,
        createdBy: data.userId,
        password: data.password || null,
        startedAt: new Date(),
        isActive: true,
      });

      // Auto-join the creator
      socket.join(roomId);
      socketToRoom.set(socket.id, roomId);

      const participant: Participant = {
        id: uuid(),
        userId: data.userId,
        name: data.userName,
        avatar: data.userAvatar || "",
        socketId: socket.id,
        consumers: new Map(),
        isMuted: false,
        isCameraOff: false,
        isScreenSharing: false,
        isHandRaised: false,
      };

      room.participants.set(socket.id, participant);

      // System message
      const sysMsg: ChatMessage = {
        id: uuid(),
        roomId,
        userId: "system",
        userName: "System",
        text: `${data.userName} created the meeting`,
        timestamp: new Date(),
        type: "system",
      };
      chatHistory.get(roomId)?.push(sysMsg);
      io.to(roomId).emit("chat-message", sysMsg);

      callback?.({ success: true, roomId });
    } catch (err) {
      console.error("[Socket] create-room error:", err);
      callback?.({ success: false, error: "Failed to create room" });
    }
  });

  // ── Join Room ────────────────────────────────────────────────
  socket.on("join-room", async (data: { roomId: string; password?: string; userId: string; userName: string; userAvatar?: string }, callback) => {
    try {
      const room = rooms.get(data.roomId);
      if (!room) {
        callback?.({ success: false, error: "Room not found" });
        return;
      }

      if (room.password && room.password !== data.password) {
        callback?.({ success: false, error: "Invalid password" });
        return;
      }

      socket.join(data.roomId);
      socketToRoom.set(socket.id, data.roomId);

      const participant: Participant = {
        id: uuid(),
        userId: data.userId,
        name: data.userName,
        avatar: data.userAvatar || "",
        socketId: socket.id,
        consumers: new Map(),
        isMuted: false,
        isCameraOff: false,
        isScreenSharing: false,
        isHandRaised: false,
      };

      room.participants.set(socket.id, participant);

      // Get existing participants
      const existingParticipants = Array.from(room.participants.values())
        .filter((p) => p.socketId !== socket.id)
        .map((p) => ({
          socketId: p.socketId,
          userId: p.userId,
          name: p.name,
          avatar: p.avatar,
          isMuted: p.isMuted,
          isCameraOff: p.isCameraOff,
          isScreenSharing: p.isScreenSharing,
          isHandRaised: p.isHandRaised,
        }));

      // System message
      const sysMsg: ChatMessage = {
        id: uuid(),
        roomId: data.roomId,
        userId: "system",
        userName: "System",
        text: `${data.userName} joined the meeting`,
        timestamp: new Date(),
        type: "system",
      };
      chatHistory.get(data.roomId)?.push(sysMsg);
      io.to(data.roomId).emit("chat-message", sysMsg);

      // Notify others
      socket.to(data.roomId).emit("participant-joined", {
        socketId: socket.id,
        userId: data.userId,
        name: data.userName,
        avatar: data.userAvatar,
      });

      callback?.({
        success: true,
        participants: existingParticipants,
        routerRtpCapabilities: room.router.rtpCapabilities,
      });
    } catch (err) {
      console.error("[Socket] join-room error:", err);
      callback?.({ success: false, error: "Failed to join room" });
    }
  });

  // ── Create Transport ─────────────────────────────────────────
  socket.on("create-transport", async (data: { direction: "send" | "receive" }, callback) => {
    try {
      const roomId = socketToRoom.get(socket.id);
      if (!roomId) { callback?.({ error: "Not in a room" }); return; }
      const room = rooms.get(roomId);
      if (!room) { callback?.({ error: "Room not found" }); return; }

      const transport = await createWebRtcTransport(room.router);
      const participant = room.participants.get(socket.id);
      if (participant) {
        participant.transport = transport;
      }

      callback?.({
        id: transport.id,
        iceParameters: transport.iceParameters,
        iceCandidates: transport.iceCandidates,
        dtlsParameters: transport.dtlsParameters,
      });
    } catch (err) {
      console.error("[Socket] create-transport error:", err);
      callback?.({ error: "Failed to create transport" });
    }
  });

  // ── Connect Transport ────────────────────────────────────────
  socket.on("connect-transport", async (data: { transportId: string; dtlsParameters: mediasoupTypes.DtlsParameters }, callback) => {
    try {
      const roomId = socketToRoom.get(socket.id);
      if (!roomId) { callback?.({ error: "Not in a room" }); return; }
      const room = rooms.get(roomId);
      if (!room) { callback?.({ error: "Room not found" }); return; }

      const participant = room.participants.get(socket.id);
      if (!participant?.transport) { callback?.({ error: "Transport not found" }); return; }

      await participant.transport.connect({ dtlsParameters: data.dtlsParameters });
      callback?.({ success: true });
    } catch (err) {
      console.error("[Socket] connect-transport error:", err);
      callback?.({ error: "Failed to connect transport" });
    }
  });

  // ── Produce (Send Media) ────────────────────────────────────
  socket.on("produce", async (data: { kind: string; rtpParameters: mediasoupTypes.RtpParameters; appData?: Record<string, unknown> }, callback) => {
    try {
      const roomId = socketToRoom.get(socket.id);
      if (!roomId) { callback?.({ error: "Not in a room" }); return; }
      const room = rooms.get(roomId);
      if (!room) { callback?.({ error: "Room not found" }); return; }

      const participant = room.participants.get(socket.id);
      if (!participant?.transport) { callback?.({ error: "Transport not found" }); return; }

      const producer = await participant.transport.produce({
        kind: data.kind as "audio" | "video",
        rtpParameters: data.rtpParameters,
        appData: { ...data.appData, producerSocketId: socket.id },
      });

      if (data.kind === "audio") participant.producerAudio = producer;
      else if (data.kind === "video" && !data.appData?.screen) participant.producerVideo = producer;
      else if (data.kind === "video" && data.appData?.screen) participant.producerScreen = producer;

      producer.on("transportclose", () => producer.close());

      callback?.({ id: producer.id });

      // Notify others
      socket.to(roomId).emit("new-producer", {
        producerId: producer.id,
        producerSocketId: socket.id,
        kind: data.kind,
        appData: data.appData,
      });
    } catch (err) {
      console.error("[Socket] produce error:", err);
      callback?.({ error: "Failed to produce" });
    }
  });

  // ── Consume (Receive Media) ──────────────────────────────────
  socket.on("consume", async (data: { producerId: string; rtpCapabilities: mediasoupTypes.RtpCapabilities }, callback) => {
    try {
      const roomId = socketToRoom.get(socket.id);
      if (!roomId) { callback?.({ error: "Not in a room" }); return; }
      const room = rooms.get(roomId);
      if (!room) { callback?.({ error: "Room not found" }); return; }

      const participant = room.participants.get(socket.id);
      if (!participant?.transport) { callback?.({ error: "Transport not found" }); return; }

      if (!room.router.canConsume({ producerId: data.producerId, rtpCapabilities: data.rtpCapabilities })) {
        callback?.({ error: "Cannot consume" });
        return;
      }

      const consumer = await participant.transport.consume({
        producerId: data.producerId,
        rtpCapabilities: data.rtpCapabilities,
        paused: true,
      });

      participant.consumers.set(consumer.id, consumer);

      consumer.on("transportclose", () => consumer.close());
      consumer.on("producerclose", () => consumer.close());

      callback?.({
        id: consumer.id,
        producerId: data.producerId,
        kind: consumer.kind,
        rtpParameters: consumer.rtpParameters,
      });
    } catch (err) {
      console.error("[Socket] consume error:", err);
      callback?.({ error: "Failed to consume" });
    }
  });

  // ── Resume Consumer ──────────────────────────────────────────
  socket.on("resume-consumer", async (data: { consumerId: string }, callback) => {
    try {
      const roomId = socketToRoom.get(socket.id);
      if (!roomId) { callback?.({ error: "Not in a room" }); return; }
      const room = rooms.get(roomId);
      if (!room) { callback?.({ error: "Room not found" }); return; }

      const participant = room.participants.get(socket.id);
      const consumer = participant?.consumers.get(data.consumerId);
      if (consumer) {
        await consumer.resume();
      }
      callback?.({ success: true });
    } catch (err) {
      callback?.({ error: "Failed to resume" });
    }
  });

  // ── Toggle Mute ──────────────────────────────────────────────
  socket.on("toggle-mute", (data: { muted: boolean }) => {
    const roomId = socketToRoom.get(socket.id);
    if (!roomId) return;
    const room = rooms.get(roomId);
    if (!room) return;

    const participant = room.participants.get(socket.id);
    if (participant) {
      participant.isMuted = data.muted;
      if (participant.producerAudio) {
        if (data.muted) participant.producerAudio.pause();
        else participant.producerAudio.resume();
      }
    }

    io.to(roomId).emit("participant-updated", {
      socketId: socket.id,
      isMuted: data.muted,
    });
  });

  // ── Toggle Camera ────────────────────────────────────────────
  socket.on("toggle-camera", (data: { off: boolean }) => {
    const roomId = socketToRoom.get(socket.id);
    if (!roomId) return;
    const room = rooms.get(roomId);
    if (!room) return;

    const participant = room.participants.get(socket.id);
    if (participant) {
      participant.isCameraOff = data.off;
      if (participant.producerVideo) {
        if (data.off) participant.producerVideo.pause();
        else participant.producerVideo.resume();
      }
    }

    io.to(roomId).emit("participant-updated", {
      socketId: socket.id,
      isCameraOff: data.off,
    });
  });

  // ── Toggle Screen Share ──────────────────────────────────────
  socket.on("toggle-screen-share", (data: { sharing: boolean }) => {
    const roomId = socketToRoom.get(socket.id);
    if (!roomId) return;
    const room = rooms.get(roomId);
    if (!room) return;

    const participant = room.participants.get(socket.id);
    if (participant) {
      participant.isScreenSharing = data.sharing;
    }

    io.to(roomId).emit("participant-updated", {
      socketId: socket.id,
      isScreenSharing: data.sharing,
    });
  });

  // ── Toggle Hand Raise ────────────────────────────────────────
  socket.on("toggle-hand-raise", (data: { raised: boolean }) => {
    const roomId = socketToRoom.get(socket.id);
    if (!roomId) return;
    const room = rooms.get(roomId);
    if (!room) return;

    const participant = room.participants.get(socket.id);
    if (participant) {
      participant.isHandRaised = data.raised;
    }

    io.to(roomId).emit("participant-updated", {
      socketId: socket.id,
      isHandRaised: data.raised,
    });
  });

  // ── Chat Message ─────────────────────────────────────────────
  socket.on("chat-message", async (data: { text: string }) => {
    const roomId = socketToRoom.get(socket.id);
    if (!roomId) return;
    const room = rooms.get(roomId);
    if (!room) return;

    const participant = room.participants.get(socket.id);
    if (!participant) return;

    const msg: ChatMessage = {
      id: uuid(),
      roomId,
      userId: participant.userId,
      userName: participant.name,
      userAvatar: participant.avatar,
      text: data.text,
      timestamp: new Date(),
      type: "text",
    };

    chatHistory.get(roomId)?.push(msg);

    // Save to DB
    try {
      await ChatMessageModel.create({
        id: msg.id,
        roomId,
        userId: msg.userId,
        userName: msg.userName,
        userAvatar: msg.userAvatar,
        text: msg.text,
        timestamp: msg.timestamp,
        type: msg.type,
      });
    } catch {}

    io.to(roomId).emit("chat-message", msg);
  });

  // ── Get Chat History ─────────────────────────────────────────
  socket.on("get-chat-history", (data: { roomId: string }, callback) => {
    const history = chatHistory.get(data.roomId) || [];
    callback?.({ messages: history.slice(-100) });
  });

  // ── Emoji Reaction ───────────────────────────────────────────
  socket.on("emoji-reaction", (data: { emoji: string }) => {
    const roomId = socketToRoom.get(socket.id);
    if (!roomId) return;
    const room = rooms.get(roomId);
    if (!room) return;

    const participant = room.participants.get(socket.id);
    if (!participant) return;

    io.to(roomId).emit("emoji-reaction", {
      socketId: socket.id,
      userName: participant.name,
      emoji: data.emoji,
    });
  });

  // ── Leave Room ───────────────────────────────────────────────
  socket.on("leave-room", () => {
    handleLeaveRoom(socket.id);
  });

  // ── Disconnect ───────────────────────────────────────────────
  socket.on("disconnect", () => {
    console.log(`[Socket] Disconnected: ${socket.id}`);
    handleLeaveRoom(socket.id);
  });
});

function handleLeaveRoom(socketId: string) {
  const roomId = socketToRoom.get(socketId);
  if (!roomId) return;

  const room = rooms.get(roomId);
  if (!room) return;

  const participant = room.participants.get(socketId);
  if (participant) {
    // System message
    const sysMsg: ChatMessage = {
      id: uuid(),
      roomId,
      userId: "system",
      userName: "System",
      text: `${participant.name} left the meeting`,
      timestamp: new Date(),
      type: "system",
    };
    chatHistory.get(roomId)?.push(sysMsg);
    io.to(roomId).emit("chat-message", sysMsg);

    // Close transports and producers
    if (participant.transport) participant.transport.close();
    if (participant.producerAudio) participant.producerAudio.close();
    if (participant.producerVideo) participant.producerVideo.close();
    if (participant.producerScreen) participant.producerScreen.close();
    participant.consumers.forEach((c) => c.close());

    room.participants.delete(socketId);
  }

  socket.to(roomId).emit("participant-left", { socketId });
  socketToRoom.delete(socketId);

  // Close room if empty
  if (room.participants.size === 0) {
    room.isActive = false;
    room.router.close();
    rooms.delete(roomId);

    Meeting.updateOne({ roomId }, { $set: { isActive: false, endedAt: new Date() } }).catch(() => {});
  }
}

// ── Start Server ─────────────────────────────────────────────────────
async function start() {
  // Connect to MongoDB
  try {
    const mongoUri = process.env.MONGODB_URI || "";
    const mongoDb = process.env.MONGODB_DB || "myworkspace";
    await mongoose.connect(mongoUri, { dbName: mongoDb });
    console.log(`[MongoDB] Connected to database: ${mongoDb}`);
  } catch (err) {
    console.error("[MongoDB] Connection failed:", err);
  }

  // Create Mediasoup worker
  await createMediasoupWorker();

  httpServer.listen(PORT, () => {
    console.log(`[Chat Server] Running on http://localhost:${PORT}`);
    console.log(`[Socket.IO] Ready`);
    console.log(`[Mediasoup] Worker PID: ${mediasoupWorker.pid}`);
    console.log(`[RTC] Port range: ${RTC_MIN_PORT}-${RTC_MAX_PORT}`);
  });
}

start().catch((err) => {
  console.error("[Chat Server] Failed to start:", err);
  process.exit(1);
});
