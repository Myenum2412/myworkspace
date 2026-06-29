import { startSocketServer, connectClient, closeAll, issueToken } from "../../__helpers__/socket.js";
import type { ClientSocket } from "socket.io-client";
import type { TestServer } from "../../__helpers__/socket.js";

let server: TestServer;
const sockets: ClientSocket[] = [];

beforeAll(async () => { server = await startSocketServer(); });
afterAll(async () => {
  await closeAll(sockets.splice(0), server);
});

describe("Socket auth & handshake", () => {
  it("rejects a client with no token", async () => {
    await expect(
      rawConnect(server.url, "")
    ).rejects.toThrow();
  });

  it("rejects a client with an invalid token", async () => {
    await expect(
      rawConnect(server.url, "not-a-real.jwt.token")
    ).rejects.toThrow();
  });

  it("accepts a client with a valid short-lived socket token", async () => {
    const token = issueToken("u1", "org1");
    const c = await connectClient(server.url, token);
    sockets.push(c);
    expect(c.connected).toBe(true);
  });
});

function rawConnect(url: string, token: string): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    import("socket.io-client").then(({ io }) => {
      const c = io(url, { path: "/api/socketio", auth: { token }, transports: ["websocket"], forceNew: true, timeout: 3000 });
      c.on("connect", () => { c.close(); resolve(); });
      c.on("connect_error", (err: Error) => { c.close(); reject(err); });
    }).catch(reject);
  });
}
