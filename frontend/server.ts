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
  on: {
    proxyReq: (_proxyReq, req) => {
      console.log(`[PROXY] ${req.method} ${req.url} -> backend`);
    },
    proxyRes: (proxyRes, req) => {
      if (proxyRes.statusCode === 404) {
        console.error(`[PROXY 404] ${req.method} ${req.url} -> Backend returned 404. No matching backend route.`);
      }
    },
    error: (err, req, res: any) => {
      console.error(`[PROXY ERROR] ${req.method} ${req.url} -> ${err.message}`);
      if (res && typeof res.writeHead === "function") {
        console.warn(`[PROXY ERROR FALLBACK] ${req.method} ${req.url} -> Backend unreachable, falling back to Next.js`);
        handle(req, res);
      }
    },
  },
});

const BACKEND_PROXY_PATHS = [
  "/api/tasks",
  "/api/sessions",
  "/api/notifications",
  "/api/activity",
  "/api/dashboard",
  "/api/users",
  "/api/organizations",
  "/api/files",
  "/api/user",
  "/api/clients",
  "/api/projects",
  "/api/teams",
  "/api/time-entries",
  "/api/admin",
  "/api/health",
  "/uploads",
  "/banners",
];

const NEXTJS_ONLY_PATHS = [
  "/api/employees",
  "/api/org/limits",
  "/api/time-entries/summary",
  "/api/user/profile",
  "/api/user/profile-image",
  "/api/user/banner",
];

function shouldProxyToBackend(pathname: string): boolean {
  if (NEXTJS_ONLY_PATHS.some((p) => pathname.startsWith(p))) {
    return false;
  }
  return BACKEND_PROXY_PATHS.some((prefix) => pathname.startsWith(prefix));
}

app.prepare().then(async () => {
  await connectToMongo().catch((err) => {
    console.error("Failed to connect to MongoDB:", err.message);
  });

  const server = createServer((req, res) => {
    const pathname = new URL(req.url || "/", `http://${req.headers.host || hostname}`).pathname;
    if (shouldProxyToBackend(pathname)) {
      apiProxy(req, res, () => {
        console.warn(`[PROXY FALLBACK] ${req.method} ${req.url} -> Proxy middleware did not handle, falling back to Next.js`);
        handle(req, res);
      });
    } else {
      if (pathname.startsWith("/api")) {
        console.warn(`[PROXY SKIP] ${req.method} ${req.url} -> No matching backend route prefix, handled by Next.js`);
      }
      handle(req, res);
    }
  });

  wsManager.initialize(server);

  server.on("error", (err: NodeJS.ErrnoException) => {
    if (err.code === "EADDRINUSE") {
      console.error(`> Port ${port} is already in use. Stop the existing server or start with PORT=<free-port>.`);
    } else {
      console.error("> Server failed to start:", err.message);
    }
    process.exit(1);
  });

  server.listen(port, () => {
    console.log(`> Ready on http://${hostname}:${port}`);
    console.log(`> WebSocket server ready on ws://${hostname}:${port}/api/ws`);
    console.log(`> API proxy to ${process.env.API_URL || "http://localhost:4000"}`);
  });
});
