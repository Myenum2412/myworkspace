import { createServer, type Server } from "node:http";
import app from "./app.js";
import { getEnforcer } from "./config/casbin.js";
import { env } from "./config/env.js";
import { createIndexes } from "./indexes.js";
import { connectDb } from "./lib/db/index.js";
import { logger } from "./lib/logger/index.js";
import { metricsRegistry } from "./lib/monitoring/index.js";
import { getChannel, isRabbitMQConfigured } from "./lib/queue/connection.js";
import { startWorkers } from "./lib/queue/worker.js";
import { initializeScheduler, shutdownScheduler } from "./lib/scheduler/index.js";
import { registerAllHandlers } from "./lib/scheduler/register-handlers.js";
import { initSentry } from "./lib/sentry.js";
import { socketIOManager } from "./lib/socketio/index.js";
import { promoteRateLimitersToValkey } from "./middleware/rate-limit.js";
import { markMissedCalls } from "./services/call.service.js";

let server: Server;

process.on("unhandledRejection", (reason: unknown) => {
  logger.error(
    {
      err:
        reason instanceof Error ? { message: reason.message, stack: reason.stack } : String(reason),
    },
    "Unhandled rejection",
  );
});

process.on("uncaughtException", (err: Error) => {
  logger.fatal(
    { err: err.message, stack: err.stack },
    "Uncaught exception — initiating graceful shutdown",
  );
  if (server) {
    server.close(() => process.exit(1));
    setTimeout(() => process.exit(1), 10000).unref();
  } else {
    process.exit(1);
  }
});

async function start() {
  const startTime = Date.now();

  initSentry();

  // Parallelize independent startup operations
  const [,] = await Promise.all([
    connectDb()
      .then(async () => {
        try {
          const { FileAttachment } = await import("./lib/db/models/FileAttachment.js");
          const updateResult = await FileAttachment.updateMany(
            { virusScanStatus: "pending" },
            {
              virusScanStatus: "clean",
              virusScanResult: "Auto-cleaned pending file during system startup",
            },
          );
          logger.info(
            { matched: updateResult.matchedCount, modified: updateResult.modifiedCount },
            "Auto-cleaned old pending virus scan files",
          );
        } catch (err: unknown) {
          logger.error(
            { err: err instanceof Error ? err.message : String(err) },
            "Failed to auto-clean pending virus scan files",
          );
        }
      })
      .catch((err) => {
        logger.error({ err }, "MongoDB connection failed — server will start without DB");
      }),
    getEnforcer().catch((err) => {
      logger.warn({ err }, "Casbin initialization failed (policies will use file fallback)");
    }),
  ]);

  // Create indexes after DB connection is established
  createIndexes().catch((err) => {
    logger.warn({ err }, "Index creation failed (non-fatal)");
  });

  // RabbitMQ + workers (sequential dependency)
  if (isRabbitMQConfigured()) {
    try {
      await getChannel();
      await startWorkers();
    } catch (err) {
      logger.warn({ err }, "RabbitMQ/queue workers not available");
    }
  }

  // Register all job type handlers
  registerAllHandlers();

  // Start the mediasoup SFU worker (disabled via env.MEDIASOUP_ENABLED=false).
  import("./lib/mediasoup/index.js").then(({ mediaServer }) =>
    mediaServer.ensureWorker().catch((err: unknown) => {
      logger.warn({ err }, "mediasoup SFU worker failed to start — calls will fall back");
    }),
  );

  // Initialize JobScheduler.NET (Bree) scheduler system
  initializeScheduler().catch((err) => {
    logger.error({ err }, "JobScheduler.NET initialization failed");
  });

  promoteRateLimitersToValkey();

  server = createServer(app);
  server.keepAliveTimeout = 65000;
  server.headersTimeout = 66000;
  server.requestTimeout = 30000;
  server.timeout = 60000;
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

  // Sweep scheduled calls: mark ones whose start time passed as "missed".
  markMissedCalls()
    .then((count) => {
      if (count > 0) logger.info({ count }, "Marked overdue scheduled calls as missed");
    })
    .catch((err) => logger.warn({ err }, "Failed to sweep missed calls"));
  setInterval(() => {
    markMissedCalls().catch((err) => logger.warn({ err }, "Failed to sweep missed calls"));
  }, 60_000);

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

    tasks.push(
      new Promise((resolve) => {
        server.close(() => {
          logger.info("HTTP server closed");
          resolve();
        });
      }),
    );

    tasks.push(
      new Promise((resolve) => {
        try {
          socketIOManager.close();
          logger.info("Socket.IO closed");
        } catch (err) {
          logger.warn({ err }, "Socket.IO close error");
        }
        resolve();
      }),
    );

    tasks.push(
      (async () => {
        try {
          await shutdownScheduler();
        } catch (err) {
          logger.warn({ err }, "Scheduler shutdown error");
        }
      })(),
    );

    tasks.push(
      (async () => {
        try {
          const { closeConnection } = await import("./lib/queue/connection.js");
          await closeConnection();
          logger.info("RabbitMQ connection closed");
        } catch (err) {
          logger.warn({ err }, "RabbitMQ close error");
        }
      })(),
    );

    tasks.push(
      (async () => {
        try {
          const { mediaServer } = await import("./lib/mediasoup/index.js");
          await mediaServer.close();
          logger.info("mediasoup SFU closed");
        } catch (err) {
          logger.warn({ err }, "mediasoup SFU close error");
        }
      })(),
    );

    tasks.push(
      (async () => {
        try {
          const { default: mongoose } = await import("mongoose");
          await mongoose.disconnect();
          logger.info("MongoDB disconnected");
        } catch (err) {
          logger.warn({ err }, "MongoDB disconnect error");
        }
      })(),
    );

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
