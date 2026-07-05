import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import cookieParser from "cookie-parser";
import path from "path";
import { env } from "./config/env.js";
import { errorHandler } from "./middleware/error.js";
import { requestIdMiddleware } from "./lib/request-id.js";
import { authLimiter, socketTokenLimiter, apiLimiter, uploadLimiter, shareDownloadLimiter, searchLimiter } from "./middleware/rate-limit.js";
import { inputSanitizer } from "./middleware/sanitize.js";
import { csrfProtection } from "./lib/csrf.js";
import mongoose from "mongoose";
import { isRedisConnected } from "./lib/redis.js";
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
import billingRoutes from "./routes/billing.js";
import twoFactorRoutes from "./routes/two-factor.js";


const app = express();

app.set("trust proxy", 1);

const isProd = env.NODE_ENV === "production";
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'strict-dynamic'", ...(isProd ? [] : ["'unsafe-inline'", "'unsafe-eval'"])],
      styleSrc: ["'self'", "https://fonts.googleapis.com", ...(isProd ? [] : ["'unsafe-inline'"])],
      fontSrc: ["'self'", "https://fonts.gstatic.com", "data:"],
      imgSrc: ["'self'", "data:", "blob:", env.APP_URL, env.S3_ENDPOINT].filter(Boolean),
      connectSrc: ["'self'", env.APP_URL, env.BASE_URL_WS].filter(Boolean),
      objectSrc: ["'none'"],
      mediaSrc: ["'self'", "blob:", "data:"],
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
app.use(cors({ origin: env.CORS_ORIGIN, credentials: true }));
app.use(compression({ level: 6 }));

// Stripe webhook needs raw body (before JSON parser)
app.use("/api/billing/webhook", express.raw({ type: "application/json" }));
app.use(express.json({ limit: "50mb" }));
app.use(cookieParser());
app.use(requestIdMiddleware);
app.use(inputSanitizer);
app.use(csrfProtection());
app.use("/api/auth", authLimiter, (req, _res, next) => {
  if (req.path === "/socket-token") socketTokenLimiter(req, _res, next);
  else next();
});
app.use("/api/client-auth", authLimiter);
app.use("/api/files", uploadLimiter);
app.use("/api/files-tus", uploadLimiter);
app.use("/api/shares", shareDownloadLimiter);
app.use("/api/search", searchLimiter);
app.use("/api", apiLimiter);

// Serve uploads and banners statically
app.use("/uploads", express.static(path.resolve("data", "uploads")));
app.use("/banners", express.static(path.resolve("public", "banners")));

// Health check
app.get("/api/health", (_req, res) => {
  const checks: Record<string, string> = {};
  let healthy = true;

  try {
    if (mongoose.connection.readyState === 1) {
      checks.mongodb = "connected";
    } else {
      checks.mongodb = "disconnected";
      healthy = false;
    }
  } catch {
    checks.mongodb = "error";
    healthy = false;
  }

  try {
    checks.redis = isRedisConnected() ? "connected" : "disconnected";
  } catch {
    checks.redis = "error";
  }

  res.status(200).json({
    success: true,
    status: healthy ? "ok" : "degraded",
    checks,
    timestamp: new Date().toISOString(),
  });
});

// Routes
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
app.use("/api/two-factor", twoFactorRoutes);
app.use("/api/billing", billingRoutes);


// 404 catch-all — log unmatched routes with clear diagnostics
app.use((req, res) => {
  const method = req.method;
  const url = req.originalUrl || req.url;
  if (env.AUTH_DEBUG === "1") {
      console.warn(`[BACKEND 404] ${method} ${url} — No backend route matches this path.`);
      console.warn(`  Headers:`, JSON.stringify({
        contentType: req.headers["content-type"],
        accept: req.headers["accept"],
        authorization: req.headers["authorization"] ? "[present]" : "[absent]",
        origin: req.headers["origin"] || "[not set]",
      }));
    }
  res.status(404).json({
    success: false,
    error: `Route not found: ${method} ${url}`,
  });
});

// Error handler
app.use(errorHandler);

export default app;
