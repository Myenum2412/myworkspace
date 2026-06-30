import { createServer } from "http";
import app from "./app.js";
import { env } from "./config/env.js";
import { connectDb } from "./lib/db/index.js";
import { wsManager } from "./lib/ws/server.js";
import { socketIOManager } from "./lib/socketio/index.js";
import { initializeAgenda } from "./lib/agenda/index.js";
import { logger } from "./lib/logger/index.js";
import { getEnforcer } from "./config/casbin.js";
import { cleanupStaleSessions } from "./lib/tus/enhanced-server.js";
import { startWorkers } from "./lib/queue/worker.js";
import { getChannel } from "./lib/queue/connection.js";
async function start() {
    const server = createServer(app);
    wsManager.initialize(server);
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
    setInterval(() => {
        cleanupStaleSessions();
    }, 60 * 60 * 1000);
    logger.info("MyWorkSpace startup complete");
}
start();
