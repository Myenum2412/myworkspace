import { createServer } from "http";
import app from "./app.js";
import { env } from "./config/env.js";
import { connectDb } from "./lib/db/index.js";
import { socketIOManager } from "./lib/socketio/index.js";
import { initializeAgenda } from "./lib/agenda/index.js";
import { logger } from "./lib/logger/index.js";
import { getEnforcer } from "./config/casbin.js";
import { startWorkers } from "./lib/queue/worker.js";
import { getChannel, isRabbitMQConfigured } from "./lib/queue/connection.js";
import { promoteRateLimitersToRedis } from "./middleware/rate-limit.js";
import { initSentry } from "./lib/sentry.js";
import { metricsRegistry } from "./lib/monitoring/index.js";

// ── Global error handlers (prevent crash on unhandled promise rejections) ──
process.on("unhandledRejection", (reason: unknown) => {
  logger.warn({ err: reason instanceof Error ? reason.message : String(reason) }, "Unhandled rejection — suppressed to prevent crash");
});

process.on("uncaughtException", (err: Error) => {
  logger.error({ err: err.message, stack: err.stack }, "Uncaught exception — suppressing to keep server alive");
});

async function start() {
  const startTime = Date.now();

  initSentry();

  // Parallelize independent startup operations
  const [,] = await Promise.all([
    connectDb().catch((err) => {
      logger.error({ err }, "MongoDB connection failed — server will start without DB");
    }),
    getEnforcer().catch((err) => {
      logger.warn({ err }, "Casbin initialization failed (policies will use file fallback)");
    }),
  ]);

  // RabbitMQ + workers (sequential dependency)
  if (isRabbitMQConfigured()) {
    try {
      await getChannel();
      await startWorkers();
    } catch (err) {
      logger.warn({ err }, "RabbitMQ/queue workers not available");
    }
  }

  // Fire-and-forget: non-critical initialization
  initializeAgenda().catch((err) => {
    logger.error({ err }, "Agenda.js initialization failed");
  });

  promoteRateLimitersToRedis();

  const server = createServer(app);
  socketIOManager.initialize(server);

  server.listen(env.PORT, () => {
    const elapsed = Date.now() - startTime;
    logger.info(`MyWorkSpace API server running on http://localhost:${env.PORT}`);
    logger.info(`WebSocket: ws://localhost:${env.PORT}/api/ws`);
    logger.info(`Socket.IO: http://localhost:${env.PORT}/api/socketio`);
    logger.info(`Environment: ${env.NODE_ENV}`);
    logger.info(`Startup time: ${elapsed}ms`);
    metricsRegistry.setGauge("server_startup_time_ms", {}, elapsed);
  });

  // Track server metrics
  metricsRegistry.setGauge("server_uptime_seconds", {}, 0);
  setInterval(() => {
    const memUsage = process.memoryUsage();
    metricsRegistry.setGauge("process_memory_heap_used_bytes", {}, memUsage.heapUsed);
    metricsRegistry.setGauge("process_memory_heap_total_bytes", {}, memUsage.heapTotal);
    metricsRegistry.setGauge("process_memory_rss_bytes", {}, memUsage.rss);
    metricsRegistry.setGauge("process_cpu_usage_percent", {}, process.cpuUsage().user / 1000000);
  }, 15_000);

  logger.info("MyWorkSpace startup complete");

  // ── Graceful Shutdown ──
  const shutdown = async (signal: string) => {
    const shutdownStart = Date.now();
    logger.info({ signal }, "Received shutdown signal — beginning graceful shutdown");

    const timeout = setTimeout(() => {
      logger.error("Forced shutdown after timeout");
      process.exit(1);
    }, 30_000);

    const tasks: Promise<void>[] = [];

    tasks.push(new Promise((resolve) => {
      server.close(() => {
        logger.info("HTTP server closed");
        resolve();
      });
    }));

    tasks.push(new Promise((resolve) => {
      try {
        socketIOManager.close();
        logger.info("Socket.IO closed");
      } catch (err) {
        logger.warn({ err }, "Socket.IO close error");
      }
      resolve();
    }));

    tasks.push((async () => {
      try {
        const { closeConnection } = await import("./lib/queue/connection.js");
        await closeConnection();
        logger.info("RabbitMQ connection closed");
      } catch (err) {
        logger.warn({ err }, "RabbitMQ close error");
      }
    })());

    tasks.push((async () => {
      try {
        const { default: mongoose } = await import("mongoose");
        await mongoose.disconnect();
        logger.info("MongoDB disconnected");
      } catch (err) {
        logger.warn({ err }, "MongoDB disconnect error");
      }
    })());

    await Promise.all(tasks);
    clearTimeout(timeout);

    const shutdownElapsed = Date.now() - shutdownStart;
    logger.info({ shutdownElapsed }, "Graceful shutdown complete");
    process.exit(0);
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}

start();