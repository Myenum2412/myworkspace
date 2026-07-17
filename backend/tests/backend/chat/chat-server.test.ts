import http from "http";
import { Server as IOServer } from "socket.io";
import { io as ioClient, Socket as ClientSocket } from "socket.io-client";
import request from "supertest";
import { v4 as uuid } from "uuid";
import { connectTestDb, resetDb } from "../../__helpers__/db.js";
import { seedOrgWithAdmin } from "../../__helpers__/fixtures.js";

let chatApp: Express.Application;
let httpServer: http.Server;
let io: IOServer;
let port: number;

async function startTestChatServer() {
  const express = await import("express");
  const app = express.default();
  app.use(express.default.json());

  const { createServer } = await import("http");
  const srv = createServer(app);
  const { Server } = await import("socket.io");

  const ios = new Server(srv, { cors: { origin: "*" } });
  ios.use((socket: any, next) => {
    const userId = socket.handshake.auth?.userId;
    if (!userId) return next(new Error("userId required"));
    socket.userId = userId;
    socket.userName = socket.handshake.auth?.userName || "User";
    socket.userAvatar = socket.handshake.auth?.userAvatar || "";
    next();
  });

  const messages = new Map<string, any[]>();
  const conversations = new Map<string, any>();
  const presences = new Map<string, string>();

  ios.on("connection", (socket: any) => {
    const userId = socket.userId;
    const userName = socket.userName;
    presences.set(userId, "online");
    ios.emit("presence-update", { userId, status: "online" });

    socket.on("send-message", (data: any) => {
      if (!data.conversationId || !data.text?.trim()) return;
      const msg = { id: uuid(), conversationId: data.conversationId, senderId: userId, senderName: userName, text: data.text.trim(), replyTo: data.replyTo || null, reactions: [], readBy: [], edited: false, deleted: false, attachments: [], createdAt: new Date().toISOString() };
      const list = messages.get(data.conversationId) || [];
      list.push(msg);
      messages.set(data.conversationId, list);
      ios.to(`conv:${data.conversationId}`).emit("new-message", msg);
    });

    socket.on("typing", (data: any) => {
      socket.to(`conv:${data.conversationId}`).emit("typing", { conversationId: data.conversationId, userName, isTyping: data.isTyping });
    });

    socket.on("join-conversation", (convId: string) => {
      socket.join(`conv:${convId}`);
    });

    socket.on("disconnect", () => {
      presences.set(userId, "offline");
      ios.emit("presence-update", { userId, status: "offline" });
    });
  });

  app.get("/api/contacts", (req, res) => {
    const userId = req.query.userId as string;
    if (!userId) return res.status(400).json({ error: "userId required" });
    res.json({ data: [{ id: "contact-1", name: "Alice", type: "employee", presence: { status: "online" } }] });
  });

  app.get("/api/conversations", (req, res) => {
    const userId = req.query.userId as string;
    const userConvs = Array.from(conversations.values()).filter((c) => c.participants.includes(userId));
    res.json({ data: userConvs });
  });

  app.post("/api/conversations", (req, res) => {
    const conv = { id: uuid(), type: "direct", name: req.body.name || "Chat", participants: [req.body.participantId], lastMessage: null, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    conversations.set(conv.id, conv);
    res.status(201).json({ data: conv });
  });

  app.get("/api/conversations/:id/messages", (req, res) => {
    res.json({ data: messages.get(req.params.id) || [] });
  });

  await new Promise<void>((resolve) => srv.listen(0, () => resolve()));
  const addr = srv.address() as any;
  return { app, httpServer: srv, io: ios, port: addr.port };
}

let ctx: Awaited<ReturnType<typeof seedOrgWithAdmin>>;

describe("Chat Server REST API", () => {
  beforeAll(async () => {
    await connectTestDb();
    ctx = await seedOrgWithAdmin({ email: `chat-srv-${Date.now()}@example.com` });
    const srv = await startTestChatServer();
    chatApp = srv.app;
    httpServer = srv.httpServer;
    io = srv.io;
    port = srv.port;
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => httpServer.close(() => { io.close(); resolve(); }));
  });

  it("GET /api/contacts returns contacts list", async () => {
    const res = await request(chatApp).get(`/api/contacts?userId=${ctx.userId}`);
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThan(0);
  });

  it("GET /api/contacts requires userId", async () => {
    const res = await request(chatApp).get("/api/contacts");
    expect(res.status).toBe(400);
  });

  it("GET /api/conversations returns conversations", async () => {
    const res = await request(chatApp).get(`/api/conversations?userId=${ctx.userId}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it("POST /api/conversations creates a conversation", async () => {
    const res = await request(chatApp).post("/api/conversations").send({ participantId: "user-2", name: "Test Chat" });
    expect(res.status).toBe(201);
    expect(res.body.data.id).toBeDefined();
  });

  it("GET /api/conversations/:id/messages returns messages", async () => {
    const res = await request(chatApp).get(`/api/conversations/${uuid()}/messages`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });
});

describe("Chat Server Socket.IO", () => {
  let clientSocket: ClientSocket;
  let testSrv: { app: any; httpServer: http.Server; io: IOServer; port: number };

  beforeAll(async () => {
    testSrv = await startTestChatServer();
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => testSrv.httpServer.close(() => { testSrv.io.close(); resolve(); }));
  });

  afterEach(() => {
    if (clientSocket?.connected) clientSocket.close();
  });

  it("connects successfully", async () => {
    const userId = uuid();
    clientSocket = ioClient(`http://127.0.0.1:${testSrv.port}`, { auth: { userId, userName: "TestUser" }, transports: ["websocket"], forceNew: true });
    await new Promise<void>((resolve, reject) => {
      clientSocket.on("connect", resolve);
      clientSocket.on("connect_error", reject);
      setTimeout(() => reject(new Error("connect timeout")), 5000);
    });

    expect(clientSocket.connected).toBe(true);
  });

  it("rejects connection without userId", async () => {
    const client = ioClient(`http://127.0.0.1:${testSrv.port}`, { transports: ["websocket"], forceNew: true });
    await expect(new Promise<void>((resolve, reject) => {
      client.on("connect", resolve);
      client.on("connect_error", (err) => reject(err));
      setTimeout(() => reject(new Error("timeout")), 5000);
    })).rejects.toThrow();
    client.close();
  });

  it("sends and receives messages via socket", async () => {
    const userId = uuid();
    const convId = uuid();
    clientSocket = ioClient(`http://127.0.0.1:${testSrv.port}`, { auth: { userId, userName: "TestUser" }, transports: ["websocket"], forceNew: true });
    await new Promise<void>((resolve, reject) => {
      clientSocket.on("connect", resolve);
      clientSocket.on("connect_error", reject);
      setTimeout(() => reject(new Error("connect timeout")), 5000);
    });

    clientSocket.emit("join-conversation", convId);

    const msgPromise = new Promise<any>((resolve, reject) => {
      const t = setTimeout(() => reject(new Error("timeout waiting for message")), 5000);
      clientSocket.once("new-message", (d: any) => { clearTimeout(t); resolve(d); });
    });

    clientSocket.emit("send-message", { conversationId: convId, text: "Hello via socket!" });
    const msg = await msgPromise;
    expect(msg.text).toBe("Hello via socket!");
    expect(msg.senderId).toBe(userId);
  });

  it("delivers typing indicator", async () => {
    const userId = uuid();
    const convId = uuid();
    clientSocket = ioClient(`http://127.0.0.1:${testSrv.port}`, { auth: { userId, userName: "TestUser" }, transports: ["websocket"], forceNew: true });
    await new Promise<void>((resolve, reject) => {
      clientSocket.on("connect", resolve);
      clientSocket.on("connect_error", reject);
      setTimeout(() => reject(new Error("connect timeout")), 5000);
    });

    const userId2 = uuid();
    const client2 = ioClient(`http://127.0.0.1:${testSrv.port}`, { auth: { userId: userId2, userName: "User2" }, transports: ["websocket"], forceNew: true });
    await new Promise<void>((resolve, reject) => {
      client2.on("connect", resolve);
      client2.on("connect_error", reject);
      setTimeout(() => reject(new Error("connect timeout")), 5000);
    });

    clientSocket.emit("join-conversation", convId);
    client2.emit("join-conversation", convId);

    const typingPromise = new Promise<any>((resolve, reject) => {
      const t = setTimeout(() => reject(new Error("timeout")), 5000);
      clientSocket.once("typing", (d: any) => { clearTimeout(t); resolve(d); });
    });

    client2.emit("typing", { conversationId: convId, isTyping: true });
    const data = await typingPromise;
    expect(data.isTyping).toBe(true);
    client2.close();
  });
});
