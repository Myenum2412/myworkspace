import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import path from "path";
import { env } from "./config/env.js";
import { errorHandler } from "./middleware/error.js";
import { perfMiddleware } from "./lib/perf/middleware.js";
import authRoutes from "./routes/auth.js";
import tasksRoutes from "./routes/tasks.js";
import sessionsRoutes from "./routes/sessions.js";
import notificationsRoutes from "./routes/notifications.js";
import activityRoutes from "./routes/activity.js";
import dashboardRoutes from "./routes/dashboard.js";
import usersRoutes from "./routes/users.js";
import organizationsRoutes from "./routes/organizations.js";
import filesRoutes from "./routes/files.js";
import filesEnhancedRoutes from "./routes/files-enhanced.js";
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

const app = express();

app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
}));
app.use(cors({ origin: env.CORS_ORIGIN, credentials: true }));
app.use(compression());
app.use(express.json());
app.use(perfMiddleware);

// Serve uploads and banners statically
app.use("/uploads", express.static(path.resolve("data", "uploads")));
app.use("/banners", express.static(path.resolve("public", "banners")));

// Health check
app.get("/api/health", (_req, res) => {
  res.json({ success: true, message: "API is running", timestamp: new Date().toISOString() });
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
app.use("/api/files", filesRoutes);
app.use("/api/files", filesEnhancedRoutes);
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
