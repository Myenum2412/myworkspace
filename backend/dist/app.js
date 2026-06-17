import express from "express";
import cors from "cors";
import { env } from "./config/env";
import { errorHandler } from "./middleware/error";
import authRoutes from "./routes/auth";
import tasksRoutes from "./routes/tasks";
import notificationsRoutes from "./routes/notifications";
import activityRoutes from "./routes/activity";
import dashboardRoutes from "./routes/dashboard";
import usersRoutes from "./routes/users";
import organizationsRoutes from "./routes/organizations";
const app = express();
app.use(cors({ origin: env.CORS_ORIGIN, credentials: true }));
app.use(express.json());
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
// Error handler
app.use(errorHandler);
export default app;
