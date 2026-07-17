import http from "http";
import { Server as IOServer } from "socket.io";
import { io as ioClient, Socket as ClientSocket } from "socket.io-client";
import jwt from "jsonwebtoken";
import { v4 as uuid } from "uuid";
import { connectTestDb } from "../../__helpers__/db.js";

const JWT_SECRET = process.env.JWT_SECRET || "test-secret";

function makeToken(userId: string, orgId: string): string {
  return jwt.sign({ userId, email: "t@e.com", role: "admin", permissions: [], orgId }, JWT_SECRET, { expiresIn: "10m" });
}

describe("Chat Socket.IO events", () => {
  let io: IOServer;
  let httpServer: http.Server;
  let port: number;

  beforeAll(async () => {
    await connectTestDb();
    httpServer = http.createServer();
    io = new IOServer(httpServer, {
      path: "/api/socketio",
      cors: { origin: "*" },
    });
    io.use((socket, next) => {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error("Authentication required"));
      try {
        const decoded = jwt.verify(token, JWT_SECRET) as any;
        (socket as any).userId = decoded.userId;
        (socket as any).orgId = decoded.orgId;
        next();
      } catch { next(new Error("Invalid token")); }
    });
    io.on("connection", (socket) => {
      const userId = (socket as any).userId;
      const orgId = (socket as any).orgId;
      socket.join(`user:${userId}`);
      if (orgId) socket.join(`org:${orgId}`);
    });
    await new Promise<void>((resolve) => httpServer.listen(0, () => resolve()));
    const addr = httpServer.address() as any;
    port = addr.port;
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => httpServer.close(() => { io.close(); resolve(); }));
  });

  it("broadcasts chat:message to org room", async () => {
    const userId = uuid();
    const orgId = uuid();
    const token = makeToken(userId, orgId);
    const client = ioClient(`http://127.0.0.1:${port}`, { path: "/api/socketio", auth: { token }, transports: ["websocket"], forceNew: true });
    await new Promise<void>((resolve, reject) => {
      client.on("connect", resolve);
      client.on("connect_error", reject);
      setTimeout(() => reject(new Error("connect timeout")), 5000);
    });

    const msgPromise = new Promise<any>((resolve, reject) => {
      const t = setTimeout(() => reject(new Error("timeout waiting for chat:message")), 5000);
      client.once("chat:message", (d: any) => { clearTimeout(t); resolve(d); });
    });

    io.to(`org:${orgId}`).emit("chat:message", {
      conversationId: "conv-1",
      content: "Hello via socket",
      senderId: userId,
    });

    const msg = await msgPromise;
    expect(msg.content).toBe("Hello via socket");
    client.close();
  });

  it("delivers typing indicator to org room", async () => {
    const userId = uuid();
    const orgId = uuid();
    const token = makeToken(userId, orgId);
    const client = ioClient(`http://127.0.0.1:${port}`, { path: "/api/socketio", auth: { token }, transports: ["websocket"], forceNew: true });
    await new Promise<void>((resolve, reject) => {
      client.on("connect", resolve);
      client.on("connect_error", (err) => reject(err));
      setTimeout(() => reject(new Error("connect timeout")), 5000);
    });

    const typingPromise = new Promise<any>((resolve, reject) => {
      const t = setTimeout(() => reject(new Error("timeout waiting for chat:typing")), 5000);
      client.once("chat:typing", (d: any) => { clearTimeout(t); resolve(d); });
    });

    io.to(`org:${orgId}`).emit("chat:typing", {
      conversationId: "conv-1",
      userId,
      isTyping: true,
    });

    const data = await typingPromise;
    expect(data.isTyping).toBe(true);
    expect(data.userId).toBe(userId);
    client.close();
  });

  it("delivers chat:read event to org room", async () => {
    const userId = uuid();
    const orgId = uuid();
    const token = makeToken(userId, orgId);
    const client = ioClient(`http://127.0.0.1:${port}`, { path: "/api/socketio", auth: { token }, transports: ["websocket"], forceNew: true });
    await new Promise<void>((resolve, reject) => {
      client.on("connect", resolve);
      client.on("connect_error", (err) => reject(err));
      setTimeout(() => reject(new Error("connect timeout")), 5000);
    });

    const readPromise = new Promise<any>((resolve, reject) => {
      const t = setTimeout(() => reject(new Error("timeout waiting for chat:read")), 5000);
      client.once("chat:read", (d: any) => { clearTimeout(t); resolve(d); });
    });

    io.to(`org:${orgId}`).emit("chat:read", {
      conversationId: "conv-1",
      userId,
      readAt: new Date().toISOString(),
    });

    const data = await readPromise;
    expect(data.conversationId).toBe("conv-1");
    expect(data.userId).toBe(userId);
    client.close();
  });
});
