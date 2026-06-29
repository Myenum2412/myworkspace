import http from "http";
import { Server as IOServer } from "socket.io";
import { io as ioClient, Socket as ClientSocket } from "socket.io-client";
import jwt from "jsonwebtoken";
import { env } from "../../../src/config/env.js";

let httpServer: http.Server;
let io: IOServer;
const sockets: ClientSocket[] = [];
let port = 0;

function issueToken(userId: string, orgId: string): string {
  return jwt.sign({ userId, email: "t@e.com", role: "admin", permissions: [], orgId, purpose: "socket" }, env.JWT_SECRET, { expiresIn: "10m" });
}

beforeAll(async () => {
  await new Promise<void>((r) => setImmediate(r));
});

beforeEach(async () => {
  httpServer = http.createServer();
  io = new IOServer(httpServer, { path: "/api/socketio", cors: { origin: "*" } });
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error("Authentication required"));
    try {
      const decoded = jwt.verify(token, env.JWT_SECRET) as any;
      (socket as any).userId = decoded.userId;
      (socket as any).orgId = decoded.orgId;
      next();
    } catch { next(new Error("Invalid token")); }
  });
  io.on("connection", (s) => { s.join(`org:${(s as any).orgId}`); s.join(`user:${(s as any).userId}`); });
  await new Promise<void>((r) => httpServer.listen(0, r));
  const addr = httpServer.address() as { port: number };
  port = addr.port;
});

afterEach(async () => {
  sockets.forEach((s) => s.close());
  await new Promise<void>((r) => httpServer.close(() => r()));
  io.close();
});

afterAll(async () => { await Promise.resolve(); });

function connect(token: string): Promise<ClientSocket> {
  return new Promise((resolve, reject) => {
    const c = ioClient(`http://127.0.0.1:${port}`, { path: "/api/socketio", auth: { token }, transports: ["websocket"], forceNew: true });
    c.on("connect", () => resolve(c));
    c.on("connect_error", reject);
    setTimeout(() => reject(new Error("connect timeout")), 5000);
  });
}

describe("Socket delta contract (org-scoped broadcast)", () => {
  it("broadcasts an event only to clients in the same org room", async () => {
    const a1 = await connect(issueToken("a", "orgA"));
    const a2 = await connect(issueToken("a2", "orgA"));
    const b1 = await connect(issueToken("b", "orgB"));
    sockets.push(a1, a2, b1);

    const a1Got = new Promise<any>((r) => a1.once("task:created", r));
    const b1Got = new Promise((resolve, reject) => {
      const t = setTimeout(() => resolve(undefined as any), 800);
      b1.once("task:created", (d) => { clearTimeout(t); reject(new Error(`B should NOT have received it, got: ${JSON.stringify(d)}`)); });
    });

    // Server-side emit mimicking what route handlers do via socketIOManager.emitToOrg
    io.to("org:orgA").emit("task:created", { id: "t1", orgId: "orgA", title: "Hello", status: "todo", priority: "medium" });

    const received = await a1Got;
    expect(received.id).toBe("t1");
    expect(received.title).toBe("Hello");

    // a2 should also be in orgA
    const a2Got = await new Promise((r) => { a2.once("task:created", r); setTimeout(() => r(null), 500); });
    expect(a2Got).toBeTruthy();

    await b1Got;
    expect(true).toBe(true); // B did not receive — pass
  });
});
