import crypto from "node:crypto";
import path from "node:path";
import compression from "compression";
import cookieParser from "cookie-parser";
import cors from "cors";
import express, { type NextFunction, type Request, type Response } from "express";
import helmet from "helmet";
import mongoose from "mongoose";
import { env } from "./config/env.js";
import { csrfProtection } from "./lib/csrf.js";
import { logger } from "./lib/logger/index.js";
import { metricsRegistry } from "./lib/monitoring/index.js";
import { requestIdMiddleware } from "./lib/request-id.js";
import { isValkeyConnected } from "./lib/valkey.js";
import { cacheHealth } from "./middleware/cache-health.js";
import { errorHandler } from "./middleware/error.js";
import { resolveOrgContext } from "./middleware/org-context.js";
import { perfLogger } from "./middleware/perf-logger.js";
import {
  apiLimiter,
  authLimiter,
  searchLimiter,
  shareDownloadLimiter,
  socketTokenLimiter,
  uploadLimiter,
} from "./middleware/rate-limit.js";
import { inputSanitizer } from "./middleware/sanitize.js";
import { requestTimeout } from "./middleware/timeout.js";
import accountsRoutes from "./routes/accounts.js";
import activityRoutes from "./routes/activity.js";
import adminRoutes from "./routes/admin.js";
import adminConsentRoutes from "./routes/admin-consent.js";
import analyticsRoutes from "./routes/analytics.js";
import appointmentRoutes from "./routes/appointments.js";
import authRoutes from "./routes/auth.js";
import billingRoutes from "./routes/billing.js";
import blogRoutes from "./routes/blog.js";
import bootstrapRoutes from "./routes/bootstrap.js";
import callsRoutes from "./routes/calls.js";
import chatRoutes from "./routes/chat.js";
import clientAuthRoutes from "./routes/client-auth.js";
import clientFoldersRoutes from "./routes/client-folders.js";
import clientsRoutes from "./routes/clients.js";
import consentRoutes from "./routes/consent.js";
import contractorsRoutes from "./routes/contractors.js";
import cronRunnerRoutes from "./routes/cron-runner.js";
import dailyTaskEmailSchedulerRoutes from "./routes/daily-task-email-scheduler.js";
import dashboardRoutes from "./routes/dashboard.js";
import drawingsRoutes from "./routes/drawings.js";
import fileApprovalRoutes from "./routes/file-approval.js";
import fileFavoritesRoutes from "./routes/file-favorites.js";
import filesEnhancedRoutes from "./routes/files-enhanced.js";
import filesTusRoutes from "./routes/files-tus.js";
import foldersRoutes from "./routes/folders.js";
import installerRoutes from "./routes/installer.js";
import notificationsRoutes from "./routes/notifications.js";
import organizationsRoutes from "./routes/organizations.js";
import presenceRoutes from "./routes/presence.js";
import projectsRoutes from "./routes/projects.js";
import receiptRoutes from "./routes/receipts.js";
import schedulerRoutes from "./routes/scheduler.js";
import searchRoutes from "./routes/search.js";
import sessionsRoutes from "./routes/sessions.js";
import settingsRoutes from "./routes/settings.js";
import sharesRoutes from "./routes/shares.js";
import stocksRoutes from "./routes/stocks.js";
import tasksRoutes from "./routes/tasks.js";
import teamsRoutes from "./routes/teams.js";
import timeEntriesRoutes from "./routes/time-entries.js";
import timesheetRoutes from "./routes/timesheet.js";
import userRoutes from "./routes/user.js";
import usersRoutes from "./routes/users.js";

const app = express();

app.set("trust proxy", 1);
app.disable("x-powered-by");

// Normalize double slashes in URLs (e.g., //api/tasks -> /api/tasks)
app.use((req, _res, next) => {
  if (req.url.includes("//")) {
    req.url = req.url.replace(/\/+/g, "/");
    req.originalUrl = req.originalUrl.replace(/\/+/g, "/");
  }
  next();
});

const isProd = env.NODE_ENV === "production";

// ── Security headers ──
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: [
          "'self'",
          "'strict-dynamic'",
          ...(isProd ? [] : ["'unsafe-inline'", "'unsafe-eval'"]),
        ],
        styleSrc: [
          "'self'",
          "https://fonts.googleapis.com",
          ...(isProd ? [] : ["'unsafe-inline'"]),
        ],
        fontSrc: ["'self'", "https://fonts.gstatic.com", "data:"],
        imgSrc: ["'self'", "data:", "blob:", env.APP_URL, env.R2_PUBLIC_URL].filter(Boolean),
        connectSrc: ["'self'", env.APP_URL, env.BASE_URL_WS, env.R2_ENDPOINT].filter(Boolean),
        objectSrc: ["'none'"],
        mediaSrc: ["'self'", "blob:", "data:", env.R2_PUBLIC_URL].filter(Boolean),
        frameAncestors: ["'self'", env.R2_PUBLIC_URL].filter(Boolean),
        frameSrc: ["'self'", env.R2_PUBLIC_URL].filter(Boolean),
        baseUri: ["'self'"],
        formAction: ["'self'", env.APP_URL].filter(Boolean),
        manifestSrc: ["'self'"],
        workerSrc: ["'self'", "blob:"],
        ...(isProd ? { upgradeInsecureRequests: [] } : {}),
      },
      reportOnly: false,
    },
    crossOriginEmbedderPolicy: false,
    crossOriginOpenerPolicy: false,
    crossOriginResourcePolicy: false,
    referrerPolicy: { policy: "strict-origin-when-cross-origin" },
    hsts: isProd ? { maxAge: 63072000, includeSubDomains: true, preload: true } : false,
    dnsPrefetchControl: { allow: false },
    noSniff: true,
    xssFilter: true,
    frameguard: { action: "sameorigin" },
    ieNoOpen: true,
  }),
);

// ── CORS ──
app.use(cors({ origin: env.CORS_ORIGIN, credentials: true }));

// ── Compression (Brotli preferred, falls back to gzip) ──
app.use(
  compression({
    level: 6,
    threshold: 1024,
    filter: (req, res) => {
      if (req.headers["x-no-compression"]) return false;
      return compression.filter(req, res);
    },
  }),
);

// ── ETag support ──
app.set("etag", "strong");

// ── Body parsing ──
app.use(express.json({ limit: env.EXPRESS_JSON_LIMIT }));
app.use(cookieParser());
app.use(requestIdMiddleware);
app.use(requestTimeout());
app.use(inputSanitizer);
if (process.env.NODE_ENV !== "test") {
  app.use(csrfProtection());
}

// ── Rate limiting ──
app.use("/api/auth", authLimiter, (req, _res, next) => {
  if (req.path === "/socket-token") socketTokenLimiter(req, _res, next);
  else next();
});
app.use("/api/client-auth", authLimiter);
app.use("/api/files", uploadLimiter);
app.use("/api/files-tus", uploadLimiter);
app.use("/api/shares", shareDownloadLimiter);
app.use("/api/search", searchLimiter);
app.use("/api", (req, res, next) => {
  apiLimiter(req, res, next);
});

// ── Static files with caching headers and path traversal protection ──
const _oneYear = 365 * 24 * 60 * 60 * 1000;
const oneDay = 24 * 60 * 60 * 1000;

// Path traversal protection middleware for static files
function staticPathGuard(_baseDir: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    // Decode URL-encoded characters and normalize path
    const decodedPath = decodeURIComponent(req.path);
    // Block path traversal attempts
    if (
      decodedPath.includes("..") ||
      decodedPath.includes("%2e%2e") ||
      decodedPath.includes("%252e%252e")
    ) {
      res.status(403).json({ success: false, error: "Forbidden" });
      return;
    }
    // Block null bytes
    if (decodedPath.includes("\0") || decodedPath.includes("%00")) {
      res.status(403).json({ success: false, error: "Forbidden" });
      return;
    }
    next();
  };
}

app.use(
  "/uploads",
  staticPathGuard("data/uploads"),
  express.static(path.resolve("data", "uploads"), {
    maxAge: oneDay,
    immutable: false,
    etag: true,
    lastModified: true,
    dotfiles: "deny",
    setHeaders: (res, filePath) => {
      if (/\.(jpg|jpeg|png|gif|webp|avif|svg|ico)$/i.test(filePath)) {
        res.setHeader("Cache-Control", "public, max-age=86400, stale-while-revalidate=604800");
      }
    },
  }),
);

app.use(
  "/banners",
  staticPathGuard("public/banners"),
  express.static(path.resolve("public", "banners"), {
    maxAge: oneDay,
    immutable: false,
    etag: true,
    lastModified: true,
    dotfiles: "deny",
  }),
);

// ── Cache-Control for all API responses ──
app.use("/api", (req, res, next) => {
  if (req.method === "GET") {
    res.setHeader("Cache-Control", "private, no-cache, no-store, must-revalidate");
  }
  next();
});

// ── Resolve org context for all authenticated API routes ──
// Applied globally; routes that don't need org context (health, config, auth, client-auth)
// will simply skip resolution since req.user won't be set yet
app.use("/api", (req, res, next) => {
  // Skip org context for public/unauthenticated routes
  const publicPaths = ["/api/health", "/api/config/public", "/api/metrics", "/api/cron"];
  const skipPaths = ["/api/auth", "/api/client-auth"];
  const path = req.path;

  if (publicPaths.some((p) => path.startsWith(p)) || skipPaths.some((p) => path.startsWith(p))) {
    next();
    return;
  }

  // Apply org context resolution (will skip if no req.user)
  resolveOrgContext(req as any, res, next);
});

// ── Request logging and metrics middleware ──
app.use((req, res, next) => {
  const start = Date.now();
  const requestId = crypto.randomUUID();
  req.headers["x-request-id"] = requestId;
  res.setHeader("X-Request-Id", requestId);

  res.on("finish", () => {
    const duration = Date.now() - start;
    const path = req.route?.path || req.path;
    metricsRegistry.incrementCounter("api_requests_total", {
      method: req.method,
      path,
      status: String(res.statusCode),
    });
    metricsRegistry.observeHistogram(
      "api_request_duration_ms",
      {
        method: req.method,
        path,
      },
      duration,
    );

    if (res.statusCode >= 500) {
      logger.error(
        { requestId, method: req.method, path, status: res.statusCode, duration },
        "Request failed",
      );
    } else if (res.statusCode >= 400) {
      logger.warn(
        { requestId, method: req.method, path, status: res.statusCode, duration },
        "Request error",
      );
    } else {
      logger.info(
        { requestId, method: req.method, path, status: res.statusCode, duration },
        "Request completed",
      );
    }
  });

  next();
});

// ── Prometheus metrics endpoint ──
app.get("/metrics", async (_req, res) => {
  const mem = process.memoryUsage();
  metricsRegistry.setGauge("process_memory_heap_used_bytes", {}, mem.heapUsed);
  metricsRegistry.setGauge("process_memory_heap_total_bytes", {}, mem.heapTotal);
  metricsRegistry.setGauge("process_memory_rss_bytes", {}, mem.rss);
  metricsRegistry.setGauge("process_uptime_seconds", {}, process.uptime());

  // ── Valkey metrics (cache layer) ──
  try {
    const { getValkey, isValkeyConnected } = await import("./lib/valkey.js");
    const client = getValkey();
    if (client && isValkeyConnected()) {
      const parseInfo = async (section: string) => {
        const raw = await client.info(section);
        const out: Record<string, string> = {};
        for (const line of String(raw).split("\r\n")) {
          if (line && !line.startsWith("#") && line.includes(":")) {
            const [k, v] = line.split(":");
            out[k] = v;
          }
        }
        return out;
      };

      const [_server, stats, memInfo, clients, keyspace, replication] = await Promise.all([
        parseInfo("server"),
        parseInfo("stats"),
        parseInfo("memory"),
        parseInfo("clients"),
        parseInfo("keyspace"),
        parseInfo("replication"),
      ]);

      metricsRegistry.setGauge("valkey_up", {}, 1);
      metricsRegistry.setGauge(
        "valkey_connected_clients",
        {},
        parseInt(clients.connected_clients || "0", 10),
      );
      metricsRegistry.setGauge(
        "valkey_used_memory_bytes",
        {},
        parseInt(memInfo.used_memory || "0", 10),
      );
      metricsRegistry.setGauge(
        "valkey_used_memory_peak_bytes",
        {},
        parseInt(memInfo.used_memory_peak || "0", 10),
      );
      metricsRegistry.setGauge(
        "valkey_keyspace_hits_total",
        {},
        parseInt(stats.keyspace_hits || "0", 10),
      );
      metricsRegistry.setGauge(
        "valkey_keyspace_misses_total",
        {},
        parseInt(stats.keyspace_misses || "0", 10),
      );
      metricsRegistry.setGauge(
        "valkey_expired_keys_total",
        {},
        parseInt(stats.expired_keys || "0", 10),
      );
      metricsRegistry.setGauge(
        "valkey_evicted_keys_total",
        {},
        parseInt(stats.evicted_keys || "0", 10),
      );
      metricsRegistry.setGauge(
        "valkey_total_commands_processed",
        {},
        parseInt(stats.total_commands_processed || "0", 10),
      );
      metricsRegistry.setGauge(
        "valkey_instantaneous_ops_per_sec",
        {},
        parseInt(stats.instantaneous_ops_per_sec || "0", 10),
      );
      metricsRegistry.setGauge(
        "valkey_total_connections_received",
        {},
        parseInt(stats.total_connections_received || "0", 10),
      );
      metricsRegistry.setGauge(
        "valkey_pubsub_channels",
        {},
        parseInt(stats.pubsub_channels || "0", 10),
      );
      metricsRegistry.setGauge(
        "valkey_pubsub_patterns",
        {},
        parseInt(stats.pubsub_patterns || "0", 10),
      );
      metricsRegistry.setGauge(
        "valkey_connected_slaves",
        {},
        parseInt(replication.connected_slaves || "0", 10),
      );
      metricsRegistry.setGauge(
        "valkey_master_link_status",
        { master_link_status: replication.master_link_status || "down" },
        1,
      );

      if (keyspace) {
        for (const [db, stat] of Object.entries(keyspace)) {
          const m = stat.match(/keys=(\d+)/);
          if (m) metricsRegistry.setGauge("valkey_db_keys", { db }, parseInt(m[1], 10));
        }
      }

      const hits = parseInt(stats.keyspace_hits || "0", 10);
      const misses = parseInt(stats.keyspace_misses || "0", 10);
      const total = hits + misses;
      metricsRegistry.setGauge("valkey_cache_hit_ratio", {}, total > 0 ? hits / total : 0);
      metricsRegistry.setGauge("valkey_cache_miss_ratio", {}, total > 0 ? misses / total : 0);
    } else {
      metricsRegistry.setGauge("valkey_up", {}, 0);
    }
  } catch {
    metricsRegistry.setGauge("valkey_up", {}, 0);
  }

  res.setHeader("Content-Type", "text/plain; version=0.0.4");
  res.send(metricsRegistry.getPrometheusFormat());
});

// ── Health check ──
app.get("/api/health", async (_req, res) => {
  const checks: Record<string, string> = {};
  let healthy = true;

  try {
    checks.mongodb = mongoose.connection.readyState === 1 ? "connected" : "disconnected";
    if (mongoose.connection.readyState !== 1) healthy = false;
  } catch {
    checks.mongodb = "error";
    healthy = false;
  }

  try {
    checks.valkey = isValkeyConnected() ? "connected" : "disconnected";
    checks.redis = checks.valkey;
  } catch {
    checks.valkey = "error";
    checks.redis = "error";
  }

  try {
    const { isRabbitMQConfigured, getChannel } = await import("./lib/queue/connection.js");
    if (isRabbitMQConfigured()) {
      const ch = await getChannel();
      checks.rabbitmq = ch ? "connected" : "disconnected";
    } else {
      checks.rabbitmq = "not_configured";
    }
  } catch {
    checks.rabbitmq = "error";
  }

  const memUsage = process.memoryUsage();
  const uptime = process.uptime();
  const cpuUsage = process.cpuUsage();

  res.status(200).json({
    success: true,
    status: healthy ? "ok" : "degraded",
    version: process.env.npm_package_version || "1.0.0",
    checks,
    metrics: {
      memory: {
        heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
        heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
        rss: Math.round(memUsage.rss / 1024 / 1024),
      },
      cpu: {
        user: Math.round(cpuUsage.user / 1000),
        system: Math.round(cpuUsage.system / 1000),
      },
      uptime: Math.round(uptime),
    },
    timestamp: new Date().toISOString(),
  });
});

// ── Cache/Valkey health & metrics ──
app.get("/api/cache/health", cacheHealth());

// ── Performance logging ──
app.use(perfLogger);

// ── Routes ──
app.use("/api/auth", authRoutes);
app.use("/api/tasks", tasksRoutes);
app.use("/api/sessions", sessionsRoutes);
app.use("/api/notifications", notificationsRoutes);
app.use("/api/activity", activityRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/drawings", drawingsRoutes);
app.use("/api/users", usersRoutes);
app.use("/api/organizations", organizationsRoutes);
app.use("/api/files", filesEnhancedRoutes);
app.use("/api/files-tus", filesTusRoutes);
app.use("/api/folders", foldersRoutes);
app.use("/api/shares", sharesRoutes);
app.use("/api/search", searchRoutes);
app.use("/api/user", userRoutes);
app.use("/api/clients", clientsRoutes);
app.use("/api/client-auth", clientAuthRoutes);
app.use("/api/projects", projectsRoutes);
app.use("/api/teams", teamsRoutes);
app.use("/api/time-entries", timeEntriesRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/settings", settingsRoutes);
app.use("/api/file-approval", fileApprovalRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/installer", installerRoutes);
app.use("/api/appointments", appointmentRoutes);
app.use("/api/stocks", stocksRoutes);
app.use("/api/billing", billingRoutes);
app.use("/api/receipts", receiptRoutes);
app.use("/api/file-favorites", fileFavoritesRoutes);
app.use("/api/client-folders", clientFoldersRoutes);
app.use("/api/consent", consentRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/admin", adminConsentRoutes);
app.use("/api/bootstrap", bootstrapRoutes);
app.use("/api/contractors", contractorsRoutes);
app.use("/api/blog", blogRoutes);
app.use("/api/daily-task-email-scheduler", dailyTaskEmailSchedulerRoutes);
app.use("/api/scheduler", schedulerRoutes);
app.use("/api/timesheet", timesheetRoutes);
app.use("/api/cron", cronRunnerRoutes);
app.use("/api/accounts", accountsRoutes);
app.use("/api/calls", callsRoutes);
app.use("/api/presence", presenceRoutes);

// ── Public config endpoint (unauthenticated, exposes safe values) ──
app.get("/api/config/public", (_req, res) => {
  res.json({
    maxFileSize: env.MAX_FILE_SIZE,
    maxFilesPerUpload: env.MAX_FILES_PER_UPLOAD,
    tusMaxSize: env.TUS_MAX_SIZE,
    chunkSize: 5 * 1024 * 1024,
    maxConcurrency: 4,
    directUploadThreshold: 50 * 1024 * 1024,
  });
});

// ── 404 catch-all ──
app.use((req, res) => {
  const method = req.method;
  const url = req.originalUrl || req.url;
  res.status(404).json({
    success: false,
    error: `Route not found: ${method} ${url}`,
  });
});

// ── Error handler ──
app.use(errorHandler);

export default app;
