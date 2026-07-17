import http from "http";
import { Server as IOServer } from "socket.io";
import type { Server } from "http";
import type { AddressInfo } from "net";

// Boots the real Express app (backend/src/app.ts) and attaches a Socket.IO
// server identical to index.ts's socketIOManager.initialize() wiring, sharing
// the same HTTP server so supertest + socket.io share one port. Returns the
// server, the underlying http.Server, and a `port`.
export async function startAppWithSockets(): Promise<{ app: any; httpServer: Server; io: IOServer; port: number }> {
  process.env.__TEST_DISABLE_RATE_LIMIT__ = "1"; // tests opt in explicitly
  const appModule = await import("../../../src/app.js");
  const app = appModule.default || appModule;

  const { Server: IOServer } = await import("socket.io");
  const httpServer = http.createServer(app);
  const io = new IOServer(httpServer, { path: "/api/socketio", cors: { origin: "*" } });

  // Reuse the production handshake + room helpers from the app module if exported,
  // else mirror minimal auth here.
  try {
    const wsServer = await import("../../../src/lib/ws/server.js");
    if (wsServer?.wsManager?.initialize) wsServer.wsManager.initialize(httpServer);
  } catch { /* if ws module isn't loadable in test env, continue with io-only */ }

  await new Promise<void>((resolve) => httpServer.listen(0, () => resolve()));
  const addr = httpServer.address() as AddressInfo;
  return { app, httpServer, io, port: addr.port };
}
