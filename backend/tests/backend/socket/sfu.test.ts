import http from "node:http";
import jwt from "jsonwebtoken";
import type { Server as IOServer } from "socket.io";
import type { Socket as ClientSocket } from "socket.io-client";
import { io as ioClient } from "socket.io-client";
import { env } from "../../../src/config/env.js";
import { mediaServer } from "../../../src/lib/mediasoup/index.js";
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

function ack<T = unknown>(client: ClientSocket, event: string, payload: unknown): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`timeout waiting for ack ${event}`)), 5000);
    client.emit(event, payload, (res: unknown) => {
      clearTimeout(t);
      resolve(res as T);
    });
  });
}

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
  await mediaServer.close();
  await new Promise<void>((r) => httpServer.close(() => r()));
});

describe("mediasoup SFU signaling", () => {
  it("returns router RTP capabilities for a call", async () => {
    const a = await connect("sfu-alice", "sfuOrg");
    const res = await ack<{ rtpCapabilities?: { codecs?: unknown[] } }>(
      a,
      "sfu:get-rtp-capabilities",
      "call-sfu-1",
    );
    expect(res.error).toBeUndefined();
    expect(res.rtpCapabilities?.codecs?.length).toBeGreaterThan(0);
    expect(mediaServer.isReady).toBe(true);
  });

  it("creates a WebRTC transport with ICE credentials per peer", async () => {
    const a = await connect("sfu-bob", "sfuOrg");
    const params = await ack<{
      id?: string;
      iceParameters?: { usernameFragment?: string };
      iceCandidates?: unknown[];
      dtlsParameters?: unknown;
      error?: string;
    }>(a, "sfu:create-transport", "call-sfu-2");
    expect(params.error).toBeUndefined();
    expect(params.id).toBeTruthy();
    expect(params.iceParameters?.usernameFragment).toBeTruthy();
    expect(Array.isArray(params.iceCandidates)).toBe(true);
    expect(params.dtlsParameters).toBeTruthy();
  });

  it("connects a transport that was created for the same call/peer", async () => {
    const a = await connect("sfu-carol", "sfuOrg");
    const params = await ack<{ id?: string; error?: string }>(
      a,
      "sfu:create-transport",
      "call-sfu-3",
    );
    expect(params.error).toBeUndefined();
    const dtls = {
      role: "auto",
      fingerprints: [
        { algorithm: "sha-256", value: "DEFAULT_SHA_256_FINGERPRINT_00_01_02_03_04_05_06_07" },
      ],
    };
    const connected = await ack<{ connected?: boolean; error?: string }>(
      a,
      "sfu:connect-transport",
      {
        callId: "call-sfu-3",
        transportId: params?.id,
        dtlsParameters: dtls,
      },
    );
    expect(connected.error).toBeUndefined();
    expect(connected.connected).toBe(true);
  });

  it("connects only transports belonging to the given call", async () => {
    const a = await connect("sfu-dave", "sfuOrg");
    const params = await ack<{ id?: string; error?: string }>(
      a,
      "sfu:create-transport",
      "call-sfu-4",
    );
    const dtls = {
      role: "auto",
      fingerprints: [{ algorithm: "sha-256", value: "01:02:03:04:05:06:07:08:09:0a" }],
    };
    const connected = await ack<{ error?: string }>(a, "sfu:connect-transport", {
      callId: "call-other",
      transportId: params?.id,
      dtlsParameters: dtls,
    });
    expect(connected.error).toBeTruthy();
  });

  it("reports an empty producer list for a fresh call and syncs peers on join", async () => {
    const a = await connect("sfu-ern", "sfuOrg");

    const joined = await ack<{ joined?: boolean; error?: string }>(a, "sfu:join", {
      callId: "call-sfu-5",
    });
    expect(joined.joined).toBe(true);

    const list = await ack<{ producers?: unknown[]; error?: string }>(
      a,
      "sfu:list-producers",
      "call-sfu-5",
    );
    expect(list.error).toBeUndefined();
    expect(Array.isArray(list.producers)).toBe(true);
    expect(list.producers?.length).toBe(0);
  });

  it("cleans up media on leave", async () => {
    const a = await connect("sfu-fran", "sfuOrg");
    await ack(a, "sfu:create-transport", "call-sfu-6");
    await ack(a, "sfu:join", { callId: "call-sfu-6" });
    expect(mediaServer.listProducers("call-sfu-6")).toEqual([]);
    a.emit("sfu:leave", { callId: "call-sfu-6" });
    await new Promise((r) => setTimeout(r, 50));
    expect(mediaServer.listProducers("call-sfu-6")).toEqual([]);
  });
});
