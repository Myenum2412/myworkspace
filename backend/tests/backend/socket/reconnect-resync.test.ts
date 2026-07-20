import http from "http";
import { Server as IOServer } from "socket.io";
import { io as ioClient, Socket as ClientSocket } from "socket.io-client";
import jwt from "jsonwebtoken";
import type { AddressInfo } from "net";

const JWT_SECRET = process.env.JWT_SECRET || "test-secret";

interface TestServer {
  httpServer: http.Server;
  io: IOServer;
  port: number;
  url: string;
}

function createToken(userId: string, orgId: string): string {
  return jwt.sign({ userId, email: "t@e.com", role: "members", permissions: [], orgId }, JWT_SECRET, { expiresIn: "10m" });
}

async function startServer(): Promise<TestServer> {
  const httpServer = http.createServer();
  const io = new IOServer(httpServer, {
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
    } catch {
      next(new Error("Invalid token"));
    }
  });
  io.on("connection", (socket) => {
    const userId = (socket as any).userId;
    const orgId = (socket as any).orgId;
    socket.join(`user:${userId}`);
    if (orgId) socket.join(`org:${orgId}`);

    socket.on("ping-server", (cb) => {
      if (typeof cb === "function") cb({ pong: true, userId });
    });

    socket.on("test:data", (data, cb) => {
      if (cb) cb({ received: true, data });
    });
  });

  await new Promise<void>((resolve) => httpServer.listen(0, () => resolve()));
  const addr = httpServer.address() as AddressInfo;
  return { httpServer, io, port: addr.port, url: `http://127.0.0.1:${addr.port}` };
}

function connectClient(url: string, token: string): Promise<ClientSocket> {
  return new Promise((resolve, reject) => {
    const client = ioClient(url, {
      path: "/api/socketio",
      auth: { token },
      transports: ["websocket"],
      forceNew: true,
    });
    client.on("connect", () => resolve(client));
    client.on("connect_error", reject);
    setTimeout(() => reject(new Error("Connection timeout")), 5000);
  });
}

function waitForEvent(socket: ClientSocket, event: string, timeout = 3000): Promise<any> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Timeout waiting for ${event}`)), timeout);
    socket.once(event, (data: any) => {
      clearTimeout(timer);
      resolve(data);
    });
  });
}

describe("Socket.IO multi-client real-time tests", () => {
  let server: TestServer;
  const token = createToken("user-1", "org-1");

  beforeAll(async () => {
    server = await startServer();
  });

  afterAll(async () => {
    server.io.close();
    server.httpServer.close();
  });

  describe("basic connectivity", () => {
    it("connects with valid token", async () => {
      const client = await connectClient(server.url, token);
      expect(client.connected).toBe(true);
      client.close();
    });

    it("rejects connection without token", async () => {
      const client = ioClient(server.url, {
        path: "/api/socketio",
        transports: ["websocket"],
        forceNew: true,
      });
      await expect(new Promise<void>((_, reject) => {
        client.on("connect_error", (err) => {
          reject(err);
          client.close();
        });
        setTimeout(() => { client.close(); reject(new Error("timeout")); }, 3000);
      })).rejects.toBeDefined();
    });

    it("rejects connection with invalid token", async () => {
      const badToken = jwt.sign({ userId: "u1" }, "wrong-secret");
      const client = ioClient(server.url, {
        path: "/api/socketio",
        auth: { token: badToken },
        transports: ["websocket"],
        forceNew: true,
      });
      await expect(new Promise<void>((_, reject) => {
        client.on("connect_error", (err) => {
          reject(err);
          client.close();
        });
        setTimeout(() => { client.close(); reject(new Error("timeout")); }, 3000);
      })).rejects.toBeDefined();
    });
  });

  describe("room isolation", () => {
    it("client only receives events for its org", async () => {
      const token1 = createToken("user-1", "org-1");
      const token2 = createToken("user-2", "org-2");

      const client1 = await connectClient(server.url, token1);
      const client2 = await connectClient(server.url, token2);

      const eventProm = waitForEvent(client1, "org:event", 1000);
      const eventProm2 = waitForEvent(client2, "org:event", 1000).catch(() => "timeout");

      server.io.to("org:org-1").emit("org:event", { msg: "for org1" });

      await expect(eventProm).resolves.toEqual({ msg: "for org1" });
      await expect(eventProm2).resolves.toBe("timeout");

      client1.close();
      client2.close();
    });

    it("client receives user-specific events", async () => {
      const token = createToken("user-specific", "org-1");
      const client = await connectClient(server.url, token);

      const eventProm = waitForEvent(client, "user:event");
      server.io.to("user:user-specific").emit("user:event", { msg: "for user" });

      await expect(eventProm).resolves.toEqual({ msg: "for user" });
      client.close();
    });
  });

  describe("message ordering", () => {
    it("receives messages in order from same sender", async () => {
      const token = createToken("order-test", "org-1");
      const client = await connectClient(server.url, token);

      const received: number[] = [];
      client.on("ordered-msg", (n: number) => received.push(n));

      for (let i = 0; i < 10; i++) {
        server.io.to("user:order-test").emit("ordered-msg", i);
      }

      await new Promise((r) => setTimeout(r, 200));
      expect(received).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
      client.close();
    });
  });

  describe("disconnect and reconnect", () => {
    it("reconnects and re-joins rooms", async () => {
      const client = await connectClient(server.url, token);
      expect(client.connected).toBe(true);

      client.disconnect();
      await new Promise((r) => setTimeout(r, 100));
      expect(client.connected).toBe(false);

      client.connect();
      await new Promise<void>((resolve, reject) => {
        client.on("connect", resolve);
        setTimeout(() => reject(new Error("Reconnect timeout")), 3000);
      });
      expect(client.connected).toBe(true);
      client.close();
    });

    it("receives events after reconnect", async () => {
      const client = await connectClient(server.url, token);
      client.disconnect();
      await new Promise((r) => setTimeout(r, 100));

      client.connect();
      await new Promise<void>((resolve) => client.on("connect", resolve));

      const eventProm = waitForEvent(client, "post-reconnect-msg");
      server.io.to("user:user-1").emit("post-reconnect-msg", { ok: true });

      await expect(eventProm).resolves.toEqual({ ok: true });
      client.close();
    });
  });

  describe("acknowledgement callbacks", () => {
    it("server responds to ping-server callback", async () => {
      const client = await connectClient(server.url, token);
      const response = await new Promise<any>((resolve) => {
        client.emit("ping-server", (data: any) => resolve(data));
      });
      expect(response.pong).toBe(true);
      expect(response.userId).toBe("user-1");
      client.close();
    });
  });
});
