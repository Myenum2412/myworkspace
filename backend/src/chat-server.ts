import express from "express";
import { createServer } from "http";
import { Server as IOServer, Socket } from "socket.io";
import { Message } from "./lib/db/models/Message.js";
import { User } from "./lib/db/models/User.js";
import { Client } from "./lib/db/models/Client.js";
import { OrgMember } from "./lib/db/models/OrgMember.js";
import { Notification } from "./lib/db/models/Notification.js";
import { logger } from "./lib/logger/index.js";
import { v4 as uuid } from "uuid";

const CHAT_PORT = parseInt(process.env.CHAT_SERVER_PORT || "4001", 10);

interface AuthSocket extends Socket {
  userId?: string;
  userName?: string;
  userAvatar?: string;
}

interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  senderAvatar: string;
  text: string;
  type: string;
  replyTo: string | null;
  reactions: { emoji: string; userId: string }[];
  readBy: string[];
  edited: boolean;
  deleted: boolean;
  attachments: { name: string; url: string; type: string; size: number }[];
  createdAt: string;
}

interface ChatConversation {
  id: string;
  type: "direct" | "group";
  name: string;
  avatar: string;
  participants: string[];
  lastMessage: { text: string; senderId: string; senderName: string; timestamp: string } | null;
  pinnedBy: string[];
  archivedBy: string[];
  unreadCount: Record<string, number>;
  createdAt: string;
  updatedAt: string;
}

const conversations = new Map<string, ChatConversation>();
const messages = new Map<string, ChatMessage[]>();
const meetings = new Map<string, { id: string; roomId: string; title: string; isActive: boolean; participants: string[]; createdAt: string }>();
const presences = new Map<string, string>();
const meetingParticipants = new Map<string, any[]>();

function formatMessage(msg: any, senderName: string, senderAvatar: string): ChatMessage {
  return {
    id: msg._id?.toString() || uuid(),
    conversationId: msg.conversationId || "",
    senderId: msg.senderId || "",
    senderName,
    senderAvatar,
    text: msg.content || "",
    type: msg.messageType || "text",
    replyTo: msg.replyTo || null,
    reactions: [],
    readBy: (msg.readBy || []).map((r: any) => r.userId),
    edited: false,
    deleted: false,
    attachments: [],
    createdAt: msg.createdAt?.toISOString?.() || new Date().toISOString(),
  };
}

export async function startChatServer() {
  const app = express();
  app.use(express.json());

  const httpServer = createServer(app);
  const io = new IOServer(httpServer, {
    cors: { origin: "*", credentials: true },
  });

  io.use((socket: AuthSocket, next) => {
    const userId = socket.handshake.auth?.userId;
    const userName = socket.handshake.auth?.userName;
    const userAvatar = socket.handshake.auth?.userAvatar;
    if (!userId) return next(new Error("userId required"));
    socket.userId = userId;
    socket.userName = userName || "User";
    socket.userAvatar = userAvatar || "";
    next();
  });

  io.on("connection", (socket: AuthSocket) => {
    const userId = socket.userId!;
    const userName = socket.userName!;
    const userAvatar = socket.userAvatar!;

    presences.set(userId, "online");
    io.emit("presence-update", { userId, status: "online" });

    socket.join(`user:${userId}`);

    socket.on("join-conversation", (convId: string) => {
      socket.join(`conv:${convId}`);
      socket.emit("joined-conversation", { conversationId: convId });
    });

    socket.on("send-message", (data: { conversationId: string; text: string; replyTo?: string | null; attachments?: any[]; type?: string }) => {
      if (!data.conversationId || !data.text?.trim()) return;

      try {
        const conv = conversations.get(data.conversationId);
        if (!conv) {
          socket.emit("error-message", { error: "Conversation not found" });
          return;
        }

        const msg: ChatMessage = {
          id: uuid(),
          conversationId: data.conversationId,
          senderId: userId,
          senderName: userName,
          senderAvatar: userAvatar,
          text: data.text.trim(),
          type: data.type || "text",
          replyTo: data.replyTo || null,
          reactions: [],
          readBy: [userId],
          edited: false,
          deleted: false,
          attachments: data.attachments || [],
          createdAt: new Date().toISOString(),
        };

        const msgList = messages.get(data.conversationId) || [];
        msgList.push(msg);
        messages.set(data.conversationId, msgList);

        conv.lastMessage = { text: msg.text, senderId: userId, senderName: userName, timestamp: msg.createdAt };
        conv.updatedAt = msg.createdAt;
        conversations.set(data.conversationId, conv);

        io.to(`conv:${data.conversationId}`).emit("new-message", msg);
        io.emit("conversation-updated", conv);
      } catch (err) {
        logger.error({ err }, "send-message error");
        socket.emit("error-message", { error: "Failed to send message" });
      }
    });

    socket.on("edit-message", (data: { messageId: string; text: string }) => {
      if (!data.messageId || !data.text?.trim()) return;
      for (const [, msgList] of messages) {
        const idx = msgList.findIndex((m) => m.id === data.messageId);
        if (idx !== -1) {
          msgList[idx].text = data.text.trim();
          msgList[idx].edited = true;
          io.emit("message-edited", { messageId: data.messageId, text: msgList[idx].text });
          return;
        }
      }
    });

    socket.on("delete-message", (data: { messageId: string }) => {
      if (!data.messageId) return;
      for (const [, msgList] of messages) {
        const idx = msgList.findIndex((m) => m.id === data.messageId);
        if (idx !== -1) {
          msgList[idx].deleted = true;
          io.emit("message-deleted", { messageId: data.messageId });
          return;
        }
      }
    });

    socket.on("add-reaction", (data: { messageId: string; emoji: string }) => {
      if (!data.messageId || !data.emoji) return;
      for (const [, msgList] of messages) {
        const idx = msgList.findIndex((m) => m.id === data.messageId);
        if (idx !== -1) {
          const existing = msgList[idx].reactions.findIndex((r) => r.emoji === data.emoji && r.userId === userId);
          if (existing === -1) {
            msgList[idx].reactions.push({ emoji: data.emoji, userId });
          } else {
            msgList[idx].reactions.splice(existing, 1);
          }
          io.emit("message-reaction", { messageId: data.messageId, reactions: msgList[idx].reactions });
          return;
        }
      }
    });

    socket.on("typing", (data: { conversationId: string; isTyping: boolean }) => {
      if (!data.conversationId) return;
      socket.to(`conv:${data.conversationId}`).emit("typing", { conversationId: data.conversationId, userName, isTyping: data.isTyping });
    });

    socket.on("mark-read", (data: { conversationId: string }) => {
      if (!data.conversationId) return;
      const msgList = messages.get(data.conversationId) || [];
      for (const msg of msgList) {
        if (!msg.readBy.includes(userId)) {
          msg.readBy.push(userId);
        }
      }
    });

    socket.on("create-conversation", (data: { participantId: string; name?: string }, callback?: Function) => {
      try {
        if (!data.participantId) {
          if (callback) callback({ success: false, error: "participantId required" });
          return;
        }

        const existing = Array.from(conversations.values()).find(
          (c) => c.type === "direct" && c.participants.includes(userId) && c.participants.includes(data.participantId),
        );
        if (existing) {
          if (callback) callback({ success: true, data: existing });
          return;
        }

        const conv: ChatConversation = {
          id: uuid(),
          type: "direct",
          name: data.name || "Chat",
          avatar: "",
          participants: [userId, data.participantId],
          lastMessage: null,
          pinnedBy: [],
          archivedBy: [],
          unreadCount: {},
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        conversations.set(conv.id, conv);

        io.emit("conversation-created", conv);
        if (callback) callback({ success: true, data: conv });
      } catch (err) {
        if (callback) callback({ success: false, error: "Failed to create conversation" });
      }
    });

    socket.on("start-meeting", (data: { title?: string }, callback?: Function) => {
      try {
        const meeting = {
          id: uuid(),
          roomId: uuid(),
          title: data.title || "Meeting",
          isActive: true,
          participants: [userId],
          createdAt: new Date().toISOString(),
        };
        meetings.set(meeting.id, meeting);
        meetingParticipants.set(meeting.roomId, [{
          socketId: socket.id,
          userId,
          name: userName,
          avatar: userAvatar,
          isMuted: false,
          isCameraOff: false,
          isScreenSharing: false,
          isHandRaised: false,
        }]);
        socket.join(`meeting:${meeting.roomId}`);
        if (callback) callback({ success: true, roomId: meeting.roomId, meetingId: meeting.id });
      } catch (err) {
        if (callback) callback({ success: false, error: "Failed to start meeting" });
      }
    });

    socket.on("join-meeting", (data: { roomId: string }, callback?: Function) => {
      try {
        if (!data.roomId) { if (callback) callback({ success: false, error: "roomId required" }); return; }

        const meeting = Array.from(meetings.values()).find((m) => m.roomId === data.roomId);
        if (!meeting || !meeting.isActive) { if (callback) callback({ success: false, error: "Meeting not found" }); return; }

        if (!meeting.participants.includes(userId)) meeting.participants.push(userId);
        socket.join(`meeting:${data.roomId}`);

        const participant = {
          socketId: socket.id,
          userId,
          name: userName,
          avatar: userAvatar,
          isMuted: false,
          isCameraOff: false,
          isScreenSharing: false,
          isHandRaised: false,
        };

        const participants = meetingParticipants.get(data.roomId) || [];
        participants.push(participant);
        meetingParticipants.set(data.roomId, participants);

        socket.to(`meeting:${data.roomId}`).emit("participant-joined", participant);
        if (callback) callback({ success: true, participants });
      } catch (err) {
        if (callback) callback({ success: false, error: "Failed to join meeting" });
      }
    });

    socket.on("leave-meeting", () => {
      for (const [roomId, participants] of meetingParticipants) {
        const idx = participants.findIndex((p: any) => p.socketId === socket.id);
        if (idx !== -1) {
          participants.splice(idx, 1);
          socket.to(`meeting:${roomId}`).emit("participant-left", { socketId: socket.id, userId });
          if (participants.length === 0) {
            meetingParticipants.delete(roomId);
            const meeting = Array.from(meetings.values()).find((m) => m.roomId === roomId);
            if (meeting) { meeting.isActive = false; io.emit("meeting-ended", { roomId }); }
          }
          break;
        }
      }
    });

    socket.on("meeting-signal", (data: { roomId: string; signal: any }) => {
      if (!data.roomId || !data.signal) return;
      socket.to(`meeting:${data.roomId}`).emit("meeting-signal", { socketId: socket.id, signal: data.signal });
    });

    socket.on("toggle-mute", (data: { muted: boolean }) => {
      for (const [, participants] of meetingParticipants) {
        const p = participants.find((p: any) => p.socketId === socket.id);
        if (p) { p.isMuted = data.muted; break; }
      }
    });

    socket.on("toggle-camera", (data: { off: boolean }) => {
      for (const [, participants] of meetingParticipants) {
        const p = participants.find((p: any) => p.socketId === socket.id);
        if (p) { p.isCameraOff = data.off; break; }
      }
    });

    socket.on("toggle-screen-share", (data: { sharing: boolean }) => {
      for (const [, participants] of meetingParticipants) {
        const p = participants.find((p: any) => p.socketId === socket.id);
        if (p) { p.isScreenSharing = data.sharing; break; }
      }
    });

    socket.on("toggle-hand-raise", (data: { raised: boolean }) => {
      for (const [, participants] of meetingParticipants) {
        const p = participants.find((p: any) => p.socketId === socket.id);
        if (p) { p.isHandRaised = data.raised; break; }
      }
    });

    socket.on("meeting-chat", (data: { text: string }) => {
      for (const [roomId] of meetingParticipants) {
        const participants = meetingParticipants.get(roomId);
        if (participants?.some((p: any) => p.socketId === socket.id)) {
          io.to(`meeting:${roomId}`).emit("meeting-chat", { socketId: socket.id, userId, userName, text: data.text, timestamp: new Date().toISOString() });
          return;
        }
      }
    });

    socket.on("disconnect", () => {
      presences.set(userId, "offline");
      io.emit("presence-update", { userId, status: "offline", lastSeen: new Date().toISOString() });

      for (const [roomId, participants] of meetingParticipants) {
        const idx = participants.findIndex((p: any) => p.socketId === socket.id);
        if (idx !== -1) {
          participants.splice(idx, 1);
          socket.to(`meeting:${roomId}`).emit("participant-left", { socketId: socket.id, userId });
          if (participants.length === 0) {
            meetingParticipants.delete(roomId);
            const meeting = Array.from(meetings.values()).find((m) => m.roomId === roomId);
            if (meeting) { meeting.isActive = false; io.emit("meeting-ended", { roomId }); }
          }
          break;
        }
      }
    });
  });

  // ── REST API ─────────────────────────────────────────────

  app.get("/api/contacts", async (req, res) => {
    try {
      const userId = req.query.userId as string;
      if (!userId) return res.status(400).json({ error: "userId required" });

      const memberships = await OrgMember.find({ userId }).lean();
      const orgIds = [...new Set(memberships.map((m) => m.orgId))];

      const orgMembers = await OrgMember.find({ orgId: { $in: orgIds } }).lean();
      const memberIds = orgMembers.map((m) => m.userId);

      const users = await User.find({ id: { $in: memberIds } }).lean();
      const contacts = users
        .filter((u) => u.id !== userId)
        .map((u) => ({
          id: u.id,
          name: u.name || "Unknown",
          email: u.email || "",
          avatar: "",
          role: u.role || "member",
          department: "",
          company: "",
          phone: "",
          status: "offline",
          presence: { status: presences.get(u.id) || "offline", lastSeen: null },
          type: "employee" as const,
        }));

      const clients = await Client.find({ orgId: { $in: orgIds } }).lean();
      const clientContacts = clients.map((c) => ({
        id: c.id,
        name: c.name || "Unknown",
        email: c.email || "",
        avatar: "",
        role: "client",
        department: "",
        company: c.company || "",
        phone: c.mobileNumber || "",
        status: "offline",
        presence: { status: presences.get(c.clientUserId) || "offline", lastSeen: null },
        type: "client" as const,
      }));

      res.json({ data: [...contacts, ...clientContacts] });
    } catch (err) {
      logger.error({ err }, "contacts error");
      res.status(500).json({ error: "Failed to fetch contacts" });
    }
  });

  app.get("/api/conversations", (req, res) => {
    const userId = req.query.userId as string;
    if (!userId) return res.status(400).json({ error: "userId required" });

    const userConvs = Array.from(conversations.values())
      .filter((c) => c.participants.includes(userId))
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

    res.json({ data: userConvs });
  });

  app.post("/api/conversations", (req, res) => {
    const { participantId, name } = req.body;
    if (!participantId) return res.status(400).json({ error: "participantId required" });

    const conv: ChatConversation = {
      id: uuid(),
      type: "direct",
      name: name || "Chat",
      avatar: "",
      participants: [participantId],
      lastMessage: null,
      pinnedBy: [],
      archivedBy: [],
      unreadCount: {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    conversations.set(conv.id, conv);
    io.emit("conversation-created", conv);
    res.status(201).json({ data: conv });
  });

  app.get("/api/conversations/:id/messages", (req, res) => {
    const msgList = messages.get(req.params.id) || [];
    res.json({ data: msgList.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()) });
  });

  app.post("/api/conversations/:id/messages", (req, res) => {
    const conv = conversations.get(req.params.id);
    if (!conv) return res.status(404).json({ error: "Conversation not found" });

    const senderId = req.body.senderId || "system";
    const msg: ChatMessage = {
      id: uuid(),
      conversationId: req.params.id,
      senderId,
      senderName: req.body.senderName || "User",
      senderAvatar: "",
      text: req.body.text || "",
      type: req.body.type || "text",
      replyTo: req.body.replyTo || null,
      reactions: [],
      readBy: [senderId],
      edited: false,
      deleted: false,
      attachments: req.body.attachments || [],
      createdAt: new Date().toISOString(),
    };
    const msgList = messages.get(req.params.id) || [];
    msgList.push(msg);
    messages.set(req.params.id, msgList);

    conv.lastMessage = { text: msg.text, senderId, senderName: msg.senderName, timestamp: msg.createdAt };
    conv.updatedAt = msg.createdAt;
    conversations.set(req.params.id, conv);

    io.to(`conv:${req.params.id}`).emit("new-message", msg);
    io.emit("conversation-updated", conv);

    res.status(201).json({ data: msg });
  });

  app.get("/api/meetings", (req, res) => {
    const userId = req.query.userId as string;
    if (!userId) return res.status(400).json({ error: "userId required" });
    const userMeetings = Array.from(meetings.values()).filter((m) => m.participants.includes(userId));
    res.json({ data: userMeetings });
  });

  app.post("/api/meetings", (req, res) => {
    const meeting = {
      id: uuid(),
      roomId: uuid(),
      title: req.body.title || "Meeting",
      isActive: true,
      participants: req.body.userId ? [req.body.userId] : [],
      createdAt: new Date().toISOString(),
    };
    meetings.set(meeting.id, meeting);
    res.status(201).json({ data: meeting });
  });

  app.get("/api/notifications/:userId", async (req, res) => {
    try {
      const notifs = await Notification.find({ userId: req.params.userId })
        .sort({ createdAt: -1 })
        .limit(50)
        .lean();

      const mapped = notifs.map((n) => ({
        _id: n._id?.toString(),
        id: n._id?.toString(),
        type: n.type || "system",
        title: n.title || "",
        body: n.message || "",
        read: n.read || false,
        createdAt: n.createdAt?.toISOString?.() || new Date().toISOString(),
      }));

      res.json({ data: mapped });
    } catch (err) {
      logger.error({ err }, "notifications error");
      res.status(500).json({ error: "Failed to fetch notifications" });
    }
  });

  httpServer.listen(CHAT_PORT, () => {
    logger.info(`Chat server running on http://localhost:${CHAT_PORT}`);
  });

  return { httpServer, io, app };
}
