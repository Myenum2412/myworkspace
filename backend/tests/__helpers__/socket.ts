import http from "http";
import { Server as IOServer } from "socket.io";
import { io as ioClient, Socket as ClientSocket } from "socket.io-client";
import jwt from "jsonwebtoken";
import { env } from "../../src/config/env.js";

export interface TestServer {
  httpServer: http.Server;
  io: IOServer;
  port: number;
  url: string;
}

export async function startSocketServer(): Promise<TestServer> {
  const httpServer = http.createServer();
  const io = new IOServer(httpServer, {
    path: "/api/socketio",
    cors: { origin: "*" },
  });
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error("Authentication required"));
    try {
      const decoded = jwt.verify(token, env.JWT_SECRET) as { userId: string; orgId: string };
      (socket as any).userId = decoded.userId;
      (socket as any).orgId = decoded.orgId;
      next();
    } catch {
      next(new Error("Invalid token"));
    }
  });
  // Clients in tests are tagged with their socket.io acl for room joins
  io.on("connection", (socket) => {
    const userId = (socket as any).userId as string;
    const orgId = (socket as any).orgId as string;
    socket.join(`user:${userId}`);
    if (orgId) socket.join(`org:${orgId}`);
  });
  await new Promise<void>((resolve) => httpServer.listen(0, () => resolve()));
  const addr = httpServer.address();
  if (!addr || typeof addr === "string") throw new Error("no port");
  return { httpServer, io, port: addr.port, url: `http://127.0.0.1:${addr.port}` };
}

export async function connectClient(url: string, token: string): Promise<ClientSocket> {
  const client = ioClient(url, { path: "/api/socketio", auth: { token }, transports: ["websocket"], forceNew: true });
  await new Promise<void>((resolve, reject) => {
    client.on("connect", () => resolve());
    client.on("connect_error", (err) => reject(err));
    setTimeout(() => reject(new Error("socket connect timed out")), 5000);
  });
  return client;
}

export function nextEvent(client: ClientSocket, event: string, timeout = 3000): Promise<any> {
  return new Promise<any>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`timed out waiting for '${event}'`)), timeout);
    client.once(event, (data: any) => {
      clearTimeout(t);
      resolve(data);
    });
  });
}

export async function closeAll(sockets: ClientSocket[], server: TestServer) {
  sockets.forEach((s) => s.close());
  await new Promise<void>((resolve) => {
    server.httpServer.close(() => {
      server.io.close();
      resolve();
    });
  });
}

export function issueToken(userId: string, orgId: string): string {
  return jwt.sign({ userId, email: "t@e.com", role: "admin", permissions: [], orgId, purpose: "socket" }, env.JWT_SECRET, { expiresIn: "10m" });
}
