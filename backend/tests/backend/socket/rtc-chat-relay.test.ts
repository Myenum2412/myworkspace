import http from "node:http";
import jwt from "jsonwebtoken";
import type { Server as IOServer } from "socket.io";
import type { Socket as ClientSocket } from "socket.io-client";
import { io as ioClient } from "socket.io-client";
import { env } from "../../../src/config/env.js";
import { presenceRegistry } from "../../../src/lib/presence/index.js";
import { socketIOManager } from "../../../src/lib/socketio/index.js";

function issueToken(userId: string, orgId: string): string {
  return jwt.sign(
    { userId, email: "t@e.com", role: "members", permissions: [], orgId, purpose: "socket" },
    env.JWT_SECRET,
    { expiresIn: "10m" },
  );
}

let httpServer: http.Server;
let _io: IOServer;
let port = 0;
const sockets: ClientSocket[] = [];

async function connect(userId: string, orgId: string): Promise<ClientSocket> {
  const c = ioClient(`http://127.0.0.1:${port}`, {
    path: "/api/socketio",
    auth: { token: issueToken(userId, orgId) },
    transports: ["websocket"],
    forceNew: true,
  });
  await new Promise<void>((resolve, reject) => {
    c.on("connect", () => resolve());
    c.on("connect_error", reject);
    setTimeout(() => reject(new Error("connect timeout")), 5000);
  });
  sockets.push(c);
  return c;
}

function nextEvent<T = Record<string, unknown>>(
  client: ClientSocket,
  event: string,
  timeout = 3000,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`timeout waiting for ${event}`)), timeout);
    client.once(event, (data: unknown) => {
      clearTimeout(t);
      resolve(data as T);
    });
  });
}

beforeAll(async () => {
  presenceRegistry.stopSweeper();
  httpServer = http.createServer();
  _io = socketIOManager.initialize(httpServer) as IOServer;
  await new Promise<void>((r) => httpServer.listen(0, r));
  const addr = httpServer.address() as { port: number };
  port = addr.port;
});

afterAll(async () => {
  for (const s of sockets) s.close();
  socketIOManager.close();
  await new Promise<void>((r) => httpServer.close(() => r()));
});

describe("SocketIOManager production wiring", () => {
  it("sends a presence snapshot containing the whole org to a freshly connected client", async () => {
    const a = await connect("alice", "orgX");
    await new Promise<void>((r) => setTimeout(r, 100));

    const b = ioClient(`http://127.0.0.1:${port}`, {
      path: "/api/socketio",
      auth: { token: issueToken("bob", "orgX") },
      transports: ["websocket"],
      forceNew: true,
    });
    sockets.push(b);
    const snapshotP = new Promise<{ presence: Array<{ userId: string }> }>((resolve, reject) => {
      const t = setTimeout(() => reject(new Error("timeout waiting for presence:snapshot")), 3000);
      b.once("presence:snapshot", (data: unknown) => {
        clearTimeout(t);
        resolve(data as { presence: Array<{ userId: string }> });
      });
    });
    await new Promise<void>((resolve, reject) => {
      b.on("connect", () => resolve());
      b.on("connect_error", reject);
    });

    const snapshot = await snapshotP;
    expect(Array.isArray(snapshot.presence)).toBe(true);
    const users = snapshot.presence.map((p) => p.userId);
    expect(users).toContain("alice");
    expect(users).toContain("bob");
    void a;
  });

  it("broadcasts presence:update to other members in the org", async () => {
    const a = await connect("carol", "orgY");
    await new Promise<void>((r) => setTimeout(r, 100));
    const updateP = nextEvent<{ userId: string; status: string }>(a, "presence:update");
    const b = await connect("dave", "orgY");
    const update = await updateP;
    expect(update.userId).toBe("dave");
    expect(update.status).toBe("online");
    void b;
  });

  it("relays chat events to the org room and filters out the sender", async () => {
    const a = await connect("erin", "orgZ");
    const b = await connect("frank", "orgZ");
    const got = nextEvent<{ channelId: string; message: { text: string; id: string } }>(
      b,
      "chat:message",
    );
    const senderGot = new Promise((resolve, reject) => {
      const t = setTimeout(() => resolve("no-self"), 600);
      a.once("chat:message", () => {
        clearTimeout(t);
        reject(new Error("sender should not receive its own relay"));
      });
    });
    a.emit("chat:message", { channelId: "ch1", message: { text: "hi", id: "m1" } });
    const payload = await got;
    expect(payload.channelId).toBe("ch1");
    expect(payload.message.text).toBe("hi");
    expect(await senderGot).toBe("no-self");
  });

  it("relays rtc offers to a targeted peer in the call room", async () => {
    const a = await connect("grace", "orgW");
    const b = await connect("henry", "orgW");
    a.emit("rtc:join", { callId: "call1", name: "grace" });
    b.emit("rtc:join", { callId: "call1", name: "henry" });
    const offerP = nextEvent<{ to: string; from: string; sdp: { type: string } }>(b, "rtc:offer");
    a.emit("rtc:offer", { callId: "call1", to: "henry", sdp: { type: "offer" } });
    const offer = await offerP;
    expect(offer.to).toBe("henry");
    expect(offer.from).toBe("grace");
    expect(offer.sdp.type).toBe("offer");
  });

  it("broadcasts peer-joined and peer-left to the call room", async () => {
    const a = await connect("irene", "orgV");
    const b = await connect("james", "orgV");
    a.emit("rtc:join", { callId: "call2", name: "irene" });
    const joinedP = nextEvent<{ userId: string }>(a, "rtc:peer-joined");
    b.emit("rtc:join", { callId: "call2", name: "james" });
    const joined = await joinedP;
    expect(joined.userId).toBe("james");

    const leftP = nextEvent<{ userId: string }>(a, "rtc:peer-left");
    b.emit("rtc:leave", { callId: "call2" });
    const left = await leftP;
    expect(left.userId).toBe("james");
  });
});
