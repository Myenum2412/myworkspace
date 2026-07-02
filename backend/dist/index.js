import { createServer } from "http";
import app from "./app.js";
import { env } from "./config/env.js";
import { connectDb } from "./lib/db/index.js";
import { socketIOManager } from "./lib/socketio/index.js";
import { initializeAgenda } from "./lib/agenda/index.js";
import { logger } from "./lib/logger/index.js";
import { getEnforcer } from "./config/casbin.js";
import { startWorkers } from "./lib/queue/worker.js";
import { getChannel } from "./lib/queue/connection.js";
import { promoteRateLimitersToRedis } from "./middleware/rate-limit.js";
async function start() {
    const server = createServer(app);
    socketIOManager.initialize(server);
    server.listen(env.PORT, () => {
        logger.info(`MyWorkSpace API server running on http://localhost:${env.PORT}`);
        logger.info(`WebSocket: ws://localhost:${env.PORT}/api/ws`);
        logger.info(`Socket.IO: http://localhost:${env.PORT}/api/socketio`);
        logger.info(`Environment: ${env.NODE_ENV}`);
    });
    await connectDb().catch((err) => {
        logger.error({ err }, "MongoDB connection failed");
    });
    try {
        await getEnforcer();
        logger.info("Casbin enforcer initialized");
    }
    catch (err) {
        logger.warn({ err }, "Casbin initialization failed (policies will use file fallback)");
    }
    try {
        await getChannel();
    }
    catch (err) {
        logger.warn({ err }, "RabbitMQ not available (queues will be disabled)");
    }
    try {
        await startWorkers();
    }
    catch (err) {
        logger.warn({ err }, "Queue workers not started (RabbitMQ may be unavailable)");
    }
    initializeAgenda().catch((err) => {
        logger.error({ err }, "Agenda.js initialization failed");
    });
    promoteRateLimitersToRedis();
    logger.info("MyWorkSpace startup complete");
    // ---- Graceful Shutdown ----
    const shutdown = async (signal) => {
        logger.info({ signal }, "Received shutdown signal — beginning graceful shutdown");
        // Stop accepting new connections
        server.close(() => {
            logger.info("HTTP server closed");
        });
        // Close Socket.IO
        try {
            socketIOManager.close();
            logger.info("Socket.IO closed");
        }
        catch (err) {
            logger.warn({ err }, "Socket.IO close error during shutdown");
        }
        // Close RabbitMQ channel
        try {
            const { closeConnection } = await import("./lib/queue/connection.js");
            await closeConnection();
            logger.info("RabbitMQ connection closed");
        }
        catch (err) {
            logger.warn({ err }, "RabbitMQ close error during shutdown");
        }
        // Disconnect MongoDB
        try {
            const { default: mongoose } = await import("mongoose");
            await mongoose.disconnect();
            logger.info("MongoDB disconnected");
        }
        catch (err) {
            logger.warn({ err }, "MongoDB disconnect error during shutdown");
        }
        logger.info("Graceful shutdown complete");
        process.exit(0);
    };
    process.on("SIGTERM", () => shutdown("SIGTERM"));
    process.on("SIGINT", () => shutdown("SIGINT"));
}
start();
