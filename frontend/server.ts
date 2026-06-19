import { createServer } from "http";
import next from "next";
import { createProxyMiddleware } from "http-proxy-middleware";
import { connectToMongo } from "./lib/db";
import { wsManager } from "./lib/ws/server";

const dev = process.env.NODE_ENV !== "production";
const hostname = "localhost";
const port = parseInt(process.env.PORT || "3000", 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

const apiProxy = createProxyMiddleware({
  target: process.env.API_URL || "http://localhost:4000",
  changeOrigin: true,
});

app.prepare().then(async () => {
  await connectToMongo().catch((err) => {
    console.error("Failed to connect to MongoDB:", err.message);
  });

  const server = createServer((req, res) => {
    const pathname = new URL(req.url || "/", `http://${req.headers.host || hostname}`).pathname;
    if (pathname.startsWith("/api") && !pathname.startsWith("/api/auth")) {
      apiProxy(req, res, () => handle(req, res));
    } else {
      handle(req, res);
    }
  });

  wsManager.initialize(server);

  server.listen(port, () => {
    console.log(`> Ready on http://${hostname}:${port}`);
    console.log(`> WebSocket server ready on ws://${hostname}:${port}/api/ws`);
    console.log(`> API proxy to ${process.env.API_URL || "http://localhost:4000"}`);
  });
});
