import "dotenv/config";
import express from "express";
import { createServer } from "http";
import { Server as SocketIOServer } from "socket.io";
import cors from "cors";
import helmet from "helmet";
import { v4 as uuid } from "uuid";
import mongoose, { Schema, Document, Model } from "mongoose";
import * as mediasoup from "mediasoup";
import type { types as mediasoupTypes } from "mediasoup";

// ═══════════════════════════════════════════════════════════════════════
// CONFIG
// ═══════════════════════════════════════════════════════════════════════
const PORT = parseInt(process.env.PORT || "4001", 10);
const CORS_ORIGIN = process.env.CORS_ORIGIN || "http://localhost:3000";
const RTC_MIN_PORT = parseInt(process.env.RTC_MIN_PORT || "10000", 10);
const RTC_MAX_PORT = parseInt(process.env.RTC_MAX_PORT || "59999", 10);
const ANNOUNCED_IP = process.env.ANNOUNCED_IP || "127.0.0.1";

// ═══════════════════════════════════════════════════════════════════════
// MONGODB MODELS
// ═══════════════════════════════════════════════════════════════════════

// ── Conversation ──────────────────────────────────────────────────────
interface IConversation extends Document {
  id: string;
  type: "direct" | "group";
  name: string;
  description: string;
  avatar: string;
  participants: string[];
  admins: string[];
  createdBy: string;
  lastMessage: { text: string; senderId: string; senderName: string; timestamp: Date } | null;
  pinnedBy: string[];
  archivedBy: string[];
  mutedBy: string[];
  unreadCount: Record<string, number>;
  meetingId: string | null;
  isLocked: boolean;
  password: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const conversationSchema = new Schema<IConversation>({
  id: { type: String, required: true, unique: true },
  type: { type: String, enum: ["direct", "group"], required: true },
  name: { type: String, default: "" },
  description: { type: String, default: "" },
  avatar: { type: String, default: "" },
  participants: [{ type: String }],
  admins: [{ type: String }],
  createdBy: { type: String, required: true },
  lastMessage: { type: Schema.Types.Mixed, default: null },
  pinnedBy: [{ type: String }],
  archivedBy: [{ type: String }],
  mutedBy: [{ type: String }],
  unreadCount: { type: Schema.Types.Mixed, default: {} },
  meetingId: { type: String, default: null },
  isLocked: { type: Boolean, default: false },
  password: { type: String, default: null },
}, { timestamps: true });
conversationSchema.index({ participants: 1 });
conversationSchema.index({ updatedAt: -1 });

const Conversation: Model<IConversation> = mongoose.model("Conversation", conversationSchema);

// ── Message ───────────────────────────────────────────────────────────
interface IMessage extends Document {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  senderAvatar: string;
  text: string;
  type: "text" | "image" | "file" | "audio" | "video" | "system" | "call" | "meeting";
  replyTo: string | null;
  reactions: { emoji: string; userId: string }[];
  readBy: string[];
  edited: boolean;
  deleted: boolean;
  pinned: boolean;
  forwarded: boolean;
  attachments: { name: string; url: string; type: string; size: number }[];
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const messageSchema = new Schema<IMessage>({
  id: { type: String, required: true, unique: true },
  conversationId: { type: String, required: true },
  senderId: { type: String, required: true },
  senderName: { type: String, required: true },
  senderAvatar: { type: String, default: "" },
  text: { type: String, default: "" },
  type: { type: String, enum: ["text", "image", "file", "audio", "video", "system", "call", "meeting"], default: "text" },
  replyTo: { type: String, default: null },
  reactions: [{ emoji: String, userId: String }],
  readBy: [{ type: String }],
  edited: { type: Boolean, default: false },
  deleted: { type: Boolean, default: false },
  pinned: { type: Boolean, default: false },
  forwarded: { type: Boolean, default: false },
  attachments: [{ name: String, url: String, type: String, size: Number }],
  metadata: { type: Schema.Types.Mixed, default: {} },
}, { timestamps: true });
messageSchema.index({ conversationId: 1, createdAt: -1 });
messageSchema.index({ senderId: 1 });

const Message: Model<IMessage> = mongoose.model("Message", messageSchema);

// ── Meeting ───────────────────────────────────────────────────────────
interface IMeeting extends Document {
  id: string;
  roomId: string;
  title: string;
  description: string;
  conversationId: string | null;
  createdBy: string;
  hostId: string;
  coHosts: string[];
  password: string | null;
  scheduledAt: Date | null;
  startedAt: Date | null;
  endedAt: Date | null;
  duration: number;
  participants: string[];
  isActive: boolean;
  isLocked: boolean;
  waitingRoom: boolean;
  recordingUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const meetingSchema = new Schema<IMeeting>({
  id: { type: String, required: true, unique: true },
  roomId: { type: String, required: true, unique: true },
  title: { type: String, required: true },
  description: { type: String, default: "" },
  conversationId: { type: String, default: null },
  createdBy: { type: String, required: true },
  hostId: { type: String, required: true },
  coHosts: [{ type: String }],
  password: { type: String, default: null },
  scheduledAt: { type: Date, default: null },
  startedAt: { type: Date, default: null },
  endedAt: { type: Date, default: null },
  duration: { type: Number, default: 0 },
  participants: [{ type: String }],
  isActive: { type: Boolean, default: true },
  isLocked: { type: Boolean, default: false },
  waitingRoom: { type: Boolean, default: false },
  recordingUrl: { type: String, default: null },
}, { timestamps: true });
meetingSchema.index({ participants: 1 });
meetingSchema.index({ isActive: 1 });

const Meeting: Model<IMeeting> = mongoose.model("Meeting", meetingSchema);

// ── Notification ──────────────────────────────────────────────────────
interface INotification extends Document {
  id: string;
  userId: string;
  type: string;
  title: string;
  body: string;
  data: Record<string, unknown>;
  read: boolean;
  createdAt: Date;
}

const notificationSchema = new Schema<INotification>({
  id: { type: String, required: true, unique: true },
  userId: { type: String, required: true },
  type: { type: String, required: true },
  title: { type: String, required: true },
  body: { type: String, required: true },
  data: { type: Schema.Types.Mixed, default: {} },
  read: { type: Boolean, default: false },
}, { timestamps: true });
notificationSchema.index({ userId: 1, read: 1, createdAt: -1 });

const Notification: Model<INotification> = mongoose.model("Notification", notificationSchema);

// ── User Presence ─────────────────────────────────────────────────────
interface IUserPresence extends Document {
  userId: string;
  status: "online" | "offline" | "busy" | "away";
  lastSeen: Date;
  currentConversation: string | null;
  isTyping: boolean;
  typingIn: string | null;
}

const userPresenceSchema = new Schema<IUserPresence>({
  userId: { type: String, required: true, unique: true },
  status: { type: String, enum: ["online", "offline", "busy", "away"], default: "offline" },
  lastSeen: { type: Date, default: Date.now },
  currentConversation: { type: String, default: null },
  isTyping: { type: Boolean, default: false },
  typingIn: { type: String, default: null },
});

const UserPresence: Model<IUserPresence> = mongoose.model("UserPresence", userPresenceSchema);

// ═══════════════════════════════════════════════════════════════════════
// MEDIASTREAM TYPES
// ═══════════════════════════════════════════════════════════════════════
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
  meetingId: string;
  participants: Map<string, Participant>;
  router: mediasoupTypes.Router;
  createdAt: Date;
}

// ═══════════════════════════════════════════════════════════════════════
// GLOBAL STATE
// ═══════════════════════════════════════════════════════════════════════
const rooms = new Map<string, Room>();
const socketToRoom = new Map<string, string>();
const socketToUser = new Map<string, { userId: string; name: string; avatar: string }>();
let mediasoupWorker: mediasoupTypes.Worker;

// ═══════════════════════════════════════════════════════════════════════
// MEDIASTREAM SETUP
// ═══════════════════════════════════════════════════════════════════════
async function createMediasoupWorker() {
  mediasoupWorker = await mediasoup.createWorker({
    rtcMinPort: RTC_MIN_PORT,
    rtcMaxPort: RTC_MAX_PORT,
    logLevel: "warn" as mediasoupTypes.WorkerLogLevel,
  });
  mediasoupWorker.on("died", () => { console.error("[Mediasoup] Worker died"); process.exit(1); });
  console.log(`[Mediasoup] Worker PID: ${mediasoupWorker.pid}`);
}

async function createRouter(): Promise<mediasoupTypes.Router> {
  return mediasoupWorker.createRouter({
    mediaCodecs: [
      { kind: "audio", mimeType: "audio/opus", clockRate: 48000, channels: 2 },
      { kind: "video", mimeType: "video/VP8", clockRate: 90000, parameters: { "x-google-start-bitrate": 1000 } },
      { kind: "video", mimeType: "video/VP9", clockRate: 90000, parameters: { "profile-id": 2, "x-google-start-bitrate": 1000 } },
      { kind: "video", mimeType: "video/H264", clockRate: 90000, parameters: { "level-asymmetry-allowed": 1, "packetization-mode": 1, "profile-level-id": "42e01f" } },
    ],
  });
}

async function createWebRtcTransport(router: mediasoupTypes.Router): Promise<mediasoupTypes.WebRtcTransport> {
  return router.createWebRtcTransport({
    listenIps: [{ ip: "0.0.0.0", announcedIp: ANNOUNCED_IP }],
    enableUdp: true, enableTcp: true, preferUdp: true,
    initialAvailableOutgoingBitrate: 1000000,
  });
}

// ═══════════════════════════════════════════════════════════════════════
// EXPRESS + SOCKET.IO
// ═══════════════════════════════════════════════════════════════════════
const app = express();
const httpServer = createServer(app);
app.use(cors({ origin: CORS_ORIGIN, credentials: true }));
app.use(helmet({ contentSecurityPolicy: false }));
app.use(express.json());

const io = new SocketIOServer(httpServer, {
  cors: { origin: CORS_ORIGIN, credentials: true },
  transports: ["websocket", "polling"],
});

// ── Health & API ──────────────────────────────────────────────
app.get("/health", (_req, res) => res.json({ status: "ok", rooms: rooms.size, uptime: process.uptime() }));

app.get("/api/conversations", async (req, res) => {
  const userId = req.query.userId as string;
  if (!userId) { res.status(400).json({ error: "userId required" }); return; }
  const convos = await Conversation.find({ participants: userId }).sort({ updatedAt: -1 }).limit(50);
  res.json({ data: convos });
});

app.get("/api/conversations/:id/messages", async (req, res) => {
  const { id } = req.params;
  const page = parseInt(req.query.page as string || "1", 10);
  const limit = parseInt(req.query.limit as string || "50", 10);
  const skip = (page - 1) * limit;
  const messages = await Message.find({ conversationId: id, deleted: false }).sort({ createdAt: -1 }).skip(skip).limit(limit);
  const total = await Message.countDocuments({ conversationId: id, deleted: false });
  res.json({ data: messages.reverse(), total, page, totalPages: Math.ceil(total / limit) });
});

app.get("/api/contacts", async (req, res) => {
  const userId = req.query.userId as string;
  if (!userId) { res.status(400).json({ error: "userId required" }); return; }
  const presences = await UserPresence.find({});
  res.json({ data: presences });
});

app.get("/api/notifications/:userId", async (req, res) => {
  const notifs = await Notification.find({ userId: req.params.userId }).sort({ createdAt: -1 }).limit(50);
  res.json({ data: notifs });
});

app.get("/api/meetings", async (req, res) => {
  const userId = req.query.userId as string;
  const filter = userId ? { participants: userId } : {};
  const meetings = await Meeting.find(filter).sort({ createdAt: -1 }).limit(20);
  res.json({ data: meetings });
});

// ═══════════════════════════════════════════════════════════════════════
// SOCKET.IO EVENTS
// ═══════════════════════════════════════════════════════════════════════
io.on("connection", (socket) => {
  const userId = socket.handshake.auth?.userId as string;
  const userName = socket.handshake.auth?.userName as string;
  const userAvatar = socket.handshake.auth?.userAvatar as string || "";

  if (userId) {
    socketToUser.set(socket.id, { userId, name: userName || "User", avatar: userAvatar });
    UserPresence.findOneAndUpdate({ userId }, { status: "online", lastSeen: new Date() }, { upsert: true }).catch(() => {});
    io.emit("presence-update", { userId, status: "online" });
  }

  console.log(`[Socket] Connected: ${socket.id} (user: ${userId})`);

  // ── CONVERSATIONS ────────────────────────────────────────────
  socket.on("create-conversation", async (data, callback) => {
    try {
      const id = uuid();
      const conv = await Conversation.create({
        id, type: data.type || "group", name: data.name || "",
        description: data.description || "", avatar: data.avatar || "",
        participants: data.participants || [userId], admins: [userId],
        createdBy: userId, pinnedBy: [], archivedBy: [], mutedBy: [],
        unreadCount: {}, isLocked: false, password: data.password || null,
      });
      callback?.({ success: true, conversation: conv });
      io.to(socket.id).emit("conversation-created", conv);
    } catch (err) { callback?.({ success: false, error: "Failed" }); }
  });

  socket.on("join-conversation", (convId) => { socket.join(convId); });

  // ── MESSAGING ────────────────────────────────────────────────
  socket.on("send-message", async (data) => {
    try {
      const msg = await Message.create({
        id: uuid(), conversationId: data.conversationId,
        senderId: userId, senderName: userName || "User", senderAvatar: userAvatar,
        text: data.text || "", type: data.type || "text",
        replyTo: data.replyTo || null, reactions: [], readBy: [userId],
        edited: false, deleted: false, pinned: false, forwarded: false,
        attachments: data.attachments || [], metadata: data.metadata || {},
      });

      await Conversation.findByIdAndUpdate(data.conversationId, {
        lastMessage: { text: msg.text, senderId: userId, senderName: userName, timestamp: new Date() },
        updatedAt: new Date(),
      });

      io.to(data.conversationId).emit("new-message", msg);

      // Notify participants
      const conv = await Conversation.findById(data.conversationId);
      if (conv) {
        for (const pid of conv.participants) {
          if (pid !== userId) {
            io.emit(`notification:${pid}`, {
              id: uuid(), userId: pid, type: "message",
              title: `${userName}`, body: msg.text.substring(0, 100),
              data: { conversationId: data.conversationId, senderId: userId },
              read: false, createdAt: new Date(),
            });
          }
        }
      }
    } catch (err) { console.error("[send-message]", err); }
  });

  socket.on("edit-message", async (data) => {
    await Message.findOneAndUpdate({ id: data.messageId, senderId: userId }, { text: data.text, edited: true });
    io.to(data.conversationId).emit("message-edited", { messageId: data.messageId, text: data.text });
  });

  socket.on("delete-message", async (data) => {
    await Message.findOneAndUpdate({ id: data.messageId, senderId: userId }, { deleted: true });
    io.to(data.conversationId).emit("message-deleted", { messageId: data.messageId });
  });

  socket.on("reaction", async (data) => {
    const msg = await Message.findOne({ id: data.messageId });
    if (!msg) return;
    const existing = msg.reactions.findIndex((r) => r.emoji === data.emoji && r.userId === userId);
    if (existing >= 0) msg.reactions.splice(existing, 1);
    else msg.reactions.push({ emoji: data.emoji, userId });
    await msg.save();
    io.to(data.conversationId).emit("message-reaction", { messageId: data.messageId, reactions: msg.reactions });
  });

  socket.on("typing", (data) => {
    socket.to(data.conversationId).emit("typing", { conversationId: data.conversationId, userId, userName, isTyping: data.isTyping });
  });

  socket.on("mark-read", async (data) => {
    await Message.updateMany({ conversationId: data.conversationId, readBy: { $ne: userId } }, { $addToSet: { readBy: userId } });
    socket.to(data.conversationId).emit("messages-read", { conversationId: data.conversationId, userId });
  });

  // ── PRESENCE ─────────────────────────────────────────────────
  socket.on("update-status", async (data) => {
    await UserPresence.findOneAndUpdate({ userId }, { status: data.status, lastSeen: new Date() });
    io.emit("presence-update", { userId, status: data.status });
  });

  // ── MEETINGS ─────────────────────────────────────────────────
  socket.on("start-meeting", async (data, callback) => {
    try {
      const roomId = uuid();
      const router = await createRouter();
      const meeting = await Meeting.create({
        id: uuid(), roomId, title: data.title || "Meeting",
        description: data.description || "", conversationId: data.conversationId || null,
        createdBy: userId, hostId: userId, coHosts: [], password: data.password || null,
        startedAt: new Date(), participants: [userId], isActive: true,
        isLocked: false, waitingRoom: data.waitingRoom || false,
      });

      const room: Room = { id: roomId, meetingId: meeting.id, participants: new Map(), router, createdAt: new Date() };
      rooms.set(roomId, room);

      socket.join(roomId);
      socketToRoom.set(socket.id, roomId);

      const participant: Participant = {
        id: uuid(), userId, name: userName || "User", avatar: userAvatar,
        socketId: socket.id, consumers: new Map(),
        isMuted: false, isCameraOff: false, isScreenSharing: false, isHandRaised: false,
      };
      room.participants.set(socket.id, participant);

      callback?.({ success: true, roomId, meetingId: meeting.id, routerRtpCapabilities: router.rtpCapabilities });
    } catch (err) { callback?.({ success: false, error: "Failed" }); }
  });

  socket.on("join-meeting", async (data, callback) => {
    try {
      const meeting = await Meeting.findOne({ roomId: data.roomId });
      if (!meeting) { callback?.({ success: false, error: "Meeting not found" }); return; }
      if (meeting.password && meeting.password !== data.password) { callback?.({ success: false, error: "Wrong password" }); return; }

      let room = rooms.get(data.roomId);
      if (!room) {
        const router = await createRouter();
        room = { id: data.roomId, meetingId: meeting.id, participants: new Map(), router, createdAt: new Date() };
        rooms.set(data.roomId, room);
      }

      socket.join(data.roomId);
      socketToRoom.set(socket.id, data.roomId);

      const participant: Participant = {
        id: uuid(), userId, name: userName || "User", avatar: userAvatar,
        socketId: socket.id, consumers: new Map(),
        isMuted: false, isCameraOff: false, isScreenSharing: false, isHandRaised: false,
      };
      room.participants.set(socket.id, participant);

      await Meeting.findOneAndUpdate({ roomId: data.roomId }, { $addToSet: { participants: userId } });

      const existing = Array.from(room.participants.values()).filter((p) => p.socketId !== socket.id)
        .map((p) => ({ socketId: p.socketId, userId: p.userId, name: p.name, avatar: p.avatar, isMuted: p.isMuted, isCameraOff: p.isCameraOff, isScreenSharing: p.isScreenSharing, isHandRaised: p.isHandRaised }));

      socket.to(data.roomId).emit("participant-joined", { socketId: socket.id, userId, name: userName, avatar: userAvatar });

      callback?.({ success: true, participants: existing, routerRtpCapabilities: room.router.rtpCapabilities, hostId: meeting.hostId });
    } catch (err) { callback?.({ success: false, error: "Failed" }); }
  });

  // ── MEDIA TRANSPORT ──────────────────────────────────────────
  socket.on("create-transport", async (data, callback) => {
    const roomId = socketToRoom.get(socket.id);
    if (!roomId) { callback?.({ error: "Not in room" }); return; }
    const room = rooms.get(roomId);
    if (!room) { callback?.({ error: "Room not found" }); return; }
    const transport = await createWebRtcTransport(room.router);
    const p = room.participants.get(socket.id);
    if (p) p.transport = transport;
    callback?.({ id: transport.id, iceParameters: transport.iceParameters, iceCandidates: transport.iceCandidates, dtlsParameters: transport.dtlsParameters });
  });

  socket.on("connect-transport", async (data, callback) => {
    const roomId = socketToRoom.get(socket.id);
    const room = rooms.get(roomId || "");
    const p = room?.participants.get(socket.id);
    if (!p?.transport) { callback?.({ error: "No transport" }); return; }
    await p.transport.connect({ dtlsParameters: data.dtlsParameters });
    callback?.({ success: true });
  });

  socket.on("produce", async (data, callback) => {
    const roomId = socketToRoom.get(socket.id);
    const room = rooms.get(roomId || "");
    const p = room?.participants.get(socket.id);
    if (!p?.transport) { callback?.({ error: "No transport" }); return; }
    const producer = await p.transport.produce({ kind: data.kind, rtpParameters: data.rtpParameters, appData: { ...data.appData, producerSocketId: socket.id } });
    if (data.kind === "audio") p.producerAudio = producer;
    else if (data.kind === "video" && !data.appData?.screen) p.producerVideo = producer;
    else p.producerScreen = producer;
    producer.on("transportclose", () => producer.close());
    callback?.({ id: producer.id });
    socket.to(roomId!).emit("new-producer", { producerId: producer.id, producerSocketId: socket.id, kind: data.kind, appData: data.appData });
  });

  socket.on("consume", async (data, callback) => {
    const roomId = socketToRoom.get(socket.id);
    const room = rooms.get(roomId || "");
    const p = room?.participants.get(socket.id);
    if (!p?.transport || !room) { callback?.({ error: "No transport" }); return; }
    if (!room.router.canConsume({ producerId: data.producerId, rtpCapabilities: data.rtpCapabilities })) { callback?.({ error: "Cannot consume" }); return; }
    const consumer = await p.transport.consume({ producerId: data.producerId, rtpCapabilities: data.rtpCapabilities, paused: true });
    p.consumers.set(consumer.id, consumer);
    consumer.on("transportclose", () => consumer.close());
    consumer.on("producerclose", () => consumer.close());
    callback?.({ id: consumer.id, producerId: data.producerId, kind: consumer.kind, rtpParameters: consumer.rtpParameters });
  });

  socket.on("resume-consumer", async (data, callback) => {
    const roomId = socketToRoom.get(socket.id);
    const room = rooms.get(roomId || "");
    const p = room?.participants.get(socket.id);
    const consumer = p?.consumers.get(data.consumerId);
    if (consumer) await consumer.resume();
    callback?.({ success: true });
  });

  // ── MEDIA CONTROLS ───────────────────────────────────────────
  socket.on("toggle-mute", (data) => {
    const roomId = socketToRoom.get(socket.id);
    const room = rooms.get(roomId || "");
    const p = room?.participants.get(socket.id);
    if (p) { p.isMuted = data.muted; if (p.producerAudio) { data.muted ? p.producerAudio.pause() : p.producerAudio.resume(); } }
    io.to(roomId!).emit("participant-updated", { socketId: socket.id, isMuted: data.muted });
  });

  socket.on("toggle-camera", (data) => {
    const roomId = socketToRoom.get(socket.id);
    const room = rooms.get(roomId || "");
    const p = room?.participants.get(socket.id);
    if (p) { p.isCameraOff = data.off; if (p.producerVideo) { data.off ? p.producerVideo.pause() : p.producerVideo.resume(); } }
    io.to(roomId!).emit("participant-updated", { socketId: socket.id, isCameraOff: data.off });
  });

  socket.on("toggle-screen-share", (data) => {
    const roomId = socketToRoom.get(socket.id);
    const room = rooms.get(roomId || "");
    const p = room?.participants.get(socket.id);
    if (p) p.isScreenSharing = data.sharing;
    io.to(roomId!).emit("participant-updated", { socketId: socket.id, isScreenSharing: data.sharing });
  });

  socket.on("toggle-hand-raise", (data) => {
    const roomId = socketToRoom.get(socket.id);
    const room = rooms.get(roomId || "");
    const p = room?.participants.get(socket.id);
    if (p) p.isHandRaised = data.raised;
    io.to(roomId!).emit("participant-updated", { socketId: socket.id, isHandRaised: data.raised });
  });

  socket.on("end-meeting", async () => {
    const roomId = socketToRoom.get(socket.id);
    if (!roomId) return;
    const room = rooms.get(roomId);
    if (!room) return;
    await Meeting.findOneAndUpdate({ roomId }, { isActive: false, endedAt: new Date() });
    io.to(roomId).emit("meeting-ended", { roomId });
    room.participants.forEach((p) => { p.transport?.close(); p.producerAudio?.close(); p.producerVideo?.close(); p.producerScreen?.close(); p.consumers.forEach((c) => c.close()); });
    rooms.delete(roomId);
  });

  socket.on("leave-meeting", () => { handleLeaveMeeting(socket.id); });

  // ── CHAT IN MEETING ──────────────────────────────────────────
  socket.on("meeting-chat", (data) => {
    const roomId = socketToRoom.get(socket.id);
    if (!roomId) return;
    io.to(roomId).emit("meeting-chat", { userId, userName, text: data.text, timestamp: new Date() });
  });

  // ── DISCONNECT ───────────────────────────────────────────────
  socket.on("disconnect", async () => {
    console.log(`[Socket] Disconnected: ${socket.id}`);
    handleLeaveMeeting(socket.id);
    if (userId) {
      await UserPresence.findOneAndUpdate({ userId }, { status: "offline", lastSeen: new Date() });
      io.emit("presence-update", { userId, status: "offline" });
    }
    socketToUser.delete(socket.id);
  });
});

function handleLeaveMeeting(socketId: string) {
  const roomId = socketToRoom.get(socketId);
  if (!roomId) return;
  const room = rooms.get(roomId);
  if (!room) return;
  const p = room.participants.get(socketId);
  if (p) {
    p.transport?.close(); p.producerAudio?.close(); p.producerVideo?.close(); p.producerScreen?.close();
    p.consumers.forEach((c) => c.close());
    room.participants.delete(socketId);
    socket.to(roomId).emit("participant-left", { socketId });
  }
  socketToRoom.delete(socketId);
  if (room.participants.size === 0) {
    Meeting.findOneAndUpdate({ roomId }, { isActive: false, endedAt: new Date() }).catch(() => {});
    room.router.close();
    rooms.delete(roomId);
  }
}

// ═══════════════════════════════════════════════════════════════════════
// START
// ═══════════════════════════════════════════════════════════════════════
async function start() {
  try {
    const uri = process.env.MONGODB_URI || "";
    const dbName = process.env.MONGODB_DB || "myworkspace";
    await mongoose.connect(uri, { dbName });
    console.log(`[MongoDB] Connected to: ${dbName}`);
  } catch (err) { console.error("[MongoDB] Failed:", err); }

  await createMediasoupWorker();

  httpServer.listen(PORT, () => {
    console.log(`[Chat Server] http://localhost:${PORT}`);
    console.log(`[Mediasoup] Worker PID: ${mediasoupWorker.pid}`);
  });
}

start().catch((err) => { console.error("[Start]", err); process.exit(1); });
