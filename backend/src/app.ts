import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import cookieParser from "cookie-parser";
import crypto from "crypto";
import path from "path";
import { env } from "./config/env.js";
import { errorHandler } from "./middleware/error.js";
import { requestIdMiddleware } from "./lib/request-id.js";
import { authLimiter, socketTokenLimiter, apiLimiter, uploadLimiter, shareDownloadLimiter, searchLimiter } from "./middleware/rate-limit.js";
import { inputSanitizer } from "./middleware/sanitize.js";
import { csrfProtection } from "./lib/csrf.js";
import { requestTimeout } from "./middleware/timeout.js";
import { perfLogger } from "./middleware/perf-logger.js";
import { resolveOrgContext } from "./middleware/org-context.js";
import mongoose from "mongoose";
import { isRedisConnected } from "./lib/redis.js";
import { metricsRegistry } from "./lib/monitoring/index.js";
import { logger } from "./lib/logger/index.js";
import authRoutes from "./routes/auth.js";
import tasksRoutes from "./routes/tasks.js";
import sessionsRoutes from "./routes/sessions.js";
import notificationsRoutes from "./routes/notifications.js";
import activityRoutes from "./routes/activity.js";
import dashboardRoutes from "./routes/dashboard.js";
import usersRoutes from "./routes/users.js";
import organizationsRoutes from "./routes/organizations.js";
import filesEnhancedRoutes from "./routes/files-enhanced.js";
import filesTusRoutes from "./routes/files-tus.js";
import foldersRoutes from "./routes/folders.js";
import sharesRoutes from "./routes/shares.js";
import searchRoutes from "./routes/search.js";
import userRoutes from "./routes/user.js";
import clientsRoutes from "./routes/clients.js";
import clientAuthRoutes from "./routes/client-auth.js";
import projectsRoutes from "./routes/projects.js";
import teamsRoutes from "./routes/teams.js";
import timeEntriesRoutes from "./routes/time-entries.js";
import adminRoutes from "./routes/admin.js";
import settingsRoutes from "./routes/settings.js";
import fileApprovalRoutes from "./routes/file-approval.js";
import receiptRoutes from "./routes/receipts.js";
import chatRoutes from "./routes/chat.js";
import installerRoutes from "./routes/installer.js";
import appointmentRoutes from "./routes/appointments.js";
import whatsappRoutes from "./routes/whatsapp.js";
import stocksRoutes from "./routes/stocks.js";
import billingRoutes from "./routes/billing.js";
import clientFoldersRoutes from "./routes/client-folders.js";
import consentRoutes from "./routes/consent.js";
import analyticsRoutes from "./routes/analytics.js";
import adminConsentRoutes from "./routes/admin-consent.js";
import bootstrapRoutes from "./routes/bootstrap.js";
import contractorsRoutes from "./routes/contractors.js";
import fileFavoritesRoutes from "./routes/file-favorites.js";
import blogRoutes from "./routes/blog.js";
import plansRoutes from "./routes/plans.js";
import dailyTaskEmailSchedulerRoutes from "./routes/daily-task-email-scheduler.js";
import schedulerRoutes from "./routes/scheduler.js";

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
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'strict-dynamic'", ...(isProd ? [] : ["'unsafe-inline'", "'unsafe-eval'"])],
      styleSrc: ["'self'", "https://fonts.googleapis.com", ...(isProd ? [] : ["'unsafe-inline'"])],
      fontSrc: ["'self'", "https://fonts.gstatic.com", "data:"],
       imgSrc: ["'self'", "data:", "blob:", env.APP_URL, env.R2_PUBLIC_URL].filter(Boolean),
       connectSrc: ["'self'", env.APP_URL, env.BASE_URL_WS, env.R2_ENDPOINT].filter(Boolean),
      objectSrc: ["'none'"],
       mediaSrc: ["'self'", "blob:", "data:", env.R2_PUBLIC_URL].filter(Boolean),
      frameAncestors: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'", env.APP_URL].filter(Boolean),
      manifestSrc: ["'self'"],
      workerSrc: ["'self'", "blob:"],
      ...(isProd ? { upgradeInsecureRequests: [] } : {}),
    },
    reportOnly: false,
  },
  crossOriginEmbedderPolicy: true,
  crossOriginOpenerPolicy: { policy: "same-origin" },
  crossOriginResourcePolicy: { policy: "same-origin" },
  referrerPolicy: { policy: "strict-origin-when-cross-origin" },
  hsts: isProd ? { maxAge: 63072000, includeSubDomains: true, preload: true } : false,
  dnsPrefetchControl: { allow: false },
  noSniff: true,
  xssFilter: true,
  frameguard: { action: "deny" },
  ieNoOpen: true,
}));

// ── CORS ──
app.use(cors({ origin: env.CORS_ORIGIN, credentials: true }));

// ── Compression (Brotli preferred, falls back to gzip) ──
app.use(compression({
  level: 6,
  threshold: 1024,
  filter: (req, res) => {
    if (req.headers["x-no-compression"]) return false;
    return compression.filter(req, res);
  },
}));

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
const oneYear = 365 * 24 * 60 * 60 * 1000;
const oneDay = 24 * 60 * 60 * 1000;

// Path traversal protection middleware for static files
function staticPathGuard(baseDir: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    // Decode URL-encoded characters and normalize path
    const decodedPath = decodeURIComponent(req.path);
    // Block path traversal attempts
    if (decodedPath.includes("..") || decodedPath.includes("%2e%2e") || decodedPath.includes("%252e%252e")) {
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

app.use("/uploads", staticPathGuard("data/uploads"), express.static(path.resolve("data", "uploads"), {
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
}));

app.use("/banners", staticPathGuard("public/banners"), express.static(path.resolve("public", "banners"), {
  maxAge: oneDay,
  immutable: false,
  etag: true,
  lastModified: true,
  dotfiles: "deny",
}));

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
  const publicPaths = ["/api/health", "/api/config/public", "/api/metrics"];
  const skipPaths = ["/api/auth", "/api/client-auth"];
  const path = req.path;

  if (publicPaths.some(p => path.startsWith(p)) || skipPaths.some(p => path.startsWith(p))) {
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
    metricsRegistry.observeHistogram("api_request_duration_ms", {
      method: req.method,
      path,
    }, duration);

    if (res.statusCode >= 500) {
      logger.error({ requestId, method: req.method, path, status: res.statusCode, duration }, "Request failed");
    } else if (res.statusCode >= 400) {
      logger.warn({ requestId, method: req.method, path, status: res.statusCode, duration }, "Request error");
    } else {
      logger.info({ requestId, method: req.method, path, status: res.statusCode, duration }, "Request completed");
    }
  });

  next();
});

// ── Prometheus metrics endpoint ──
app.get("/metrics", (_req, res) => {
  const mem = process.memoryUsage();
  metricsRegistry.setGauge("process_memory_heap_used_bytes", {}, mem.heapUsed);
  metricsRegistry.setGauge("process_memory_heap_total_bytes", {}, mem.heapTotal);
  metricsRegistry.setGauge("process_memory_rss_bytes", {}, mem.rss);
  metricsRegistry.setGauge("process_uptime_seconds", {}, process.uptime());
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
  } catch { checks.mongodb = "error"; healthy = false; }

  try {
    checks.redis = isRedisConnected() ? "connected" : "disconnected";
  } catch { checks.redis = "error"; }

  try {
    const { isRabbitMQConfigured, getChannel } = await import("./lib/queue/connection.js");
    if (isRabbitMQConfigured()) {
      const ch = await getChannel();
      checks.rabbitmq = ch ? "connected" : "disconnected";
    } else {
      checks.rabbitmq = "not_configured";
    }
  } catch { checks.rabbitmq = "error"; }

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

// ── Performance logging ──
app.use(perfLogger);

// ── Routes ──
app.use("/api/auth", authRoutes);
app.use("/api/tasks", tasksRoutes);
app.use("/api/sessions", sessionsRoutes);
app.use("/api/notifications", notificationsRoutes);
app.use("/api/activity", activityRoutes);
app.use("/api/dashboard", dashboardRoutes);
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
app.use("/api/whatsapp", whatsappRoutes);
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
app.use("/api/plans", plansRoutes);
app.use("/api/daily-task-email-scheduler", dailyTaskEmailSchedulerRoutes);
app.use("/api/scheduler", schedulerRoutes);

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