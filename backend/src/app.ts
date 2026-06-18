import express from "express";
import cors from "cors";
import path from "path";
import { env } from "./config/env.js";
import { errorHandler } from "./middleware/error.js";
import authRoutes from "./routes/auth.js";
import tasksRoutes from "./routes/tasks.js";
import notificationsRoutes from "./routes/notifications.js";
import activityRoutes from "./routes/activity.js";
import dashboardRoutes from "./routes/dashboard.js";
import usersRoutes from "./routes/users.js";
import organizationsRoutes from "./routes/organizations.js";
import filesRoutes from "./routes/files.js";
import userRoutes from "./routes/user.js";
import clientsRoutes from "./routes/clients.js";

const app = express();

app.use(cors({ origin: env.CORS_ORIGIN, credentials: true }));
app.use(express.json());

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
app.use("/api/notifications", notificationsRoutes);
app.use("/api/activity", activityRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/users", usersRoutes);
app.use("/api/organizations", organizationsRoutes);
app.use("/api/files", filesRoutes);
app.use("/api/user", userRoutes);
app.use("/api/clients", clientsRoutes);

// Error handler
app.use(errorHandler);

export default app;
