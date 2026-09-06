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

process.on("unhandledRejection", (reason: unknown) => {
  logger.error({ err: reason instanceof Error ? { message: reason.message, stack: reason.stack } : String(reason) }, "Unhandled rejection");
});
process.on("uncaughtException", (err: Error) => {
  logger.fatal({ err: err.message, stack: err.stack }, "Uncaught exception");
  app.close(() => process.exit(1));
  setTimeout(() => process.exit(1), 10000).unref();
});

async function start() {
  const startTime = Date.now();
  initSentry();
  await Promise.all([
    connectDb().then(async () => {
      try {
        const { FileAttachment } = await import("./lib/db/models/FileAttachment.js");
        await FileAttachment.updateMany({ virusScanStatus: "pending" }, { virusScanStatus: "clean", virusScanResult: "Auto-cleaned pending file during system startup" });
      } catch {}
    }).catch((err) => logger.error({ err }, "MongoDB connection failed")),
    getEnforcer().catch((err) => logger.warn({ err }, "Casbin init failed")),
  ]);
  createIndexes().catch((err) => logger.warn({ err }, "Index creation failed"));
  if (isRabbitMQConfigured()) {
    try { await getChannel(); await startWorkers(); } catch (err) { logger.warn({ err }, "RabbitMQ not available"); }
  }
  registerAllHandlers();
  import("./lib/mediasoup/index.js").then(({ mediaServer }) => mediaServer.ensureWorker().catch((err: unknown) => logger.warn({ err }, "mediasoup failed")));
  initializeScheduler().catch((err) => logger.error({ err }, "Scheduler init failed"));
  promoteRateLimitersToValkey();

  socketIOManager.initialize(app.server as any);
  (app.server as any).keepAliveTimeout = 65000;
  (app.server as any).headersTimeout = 66000;

  await app.listen({ port: env.PORT, host: "0.0.0.0" });
  const elapsed = Date.now() - startTime;
  logger.info(`MyWorkSpace API server running on http://localhost:${env.PORT}`);
  logger.info(`Startup time: ${elapsed}ms`);
  metricsRegistry.setGauge("server_startup_time_ms", {}, elapsed);

  setInterval(() => {
    const m = process.memoryUsage();
    metricsRegistry.setGauge("process_memory_heap_used_bytes", {}, m.heapUsed);
    metricsRegistry.setGauge("process_memory_heap_total_bytes", {}, m.heapTotal);
    metricsRegistry.setGauge("process_memory_rss_bytes", {}, m.rss);
  }, 15000);

  markMissedCalls().catch(() => {});
  setInterval(() => markMissedCalls().catch(() => {}), 60000);

  const shutdown = async (signal: string) => {
    logger.info({ signal }, "Shutting down");
    const t = setTimeout(() => process.exit(1), 30000);
    try { socketIOManager.close(); } catch {}
    try { await shutdownScheduler(); } catch {}
    try { const { closeConnection } = await import("./lib/queue/connection.js"); await closeConnection(); } catch {}
    try { const { mediaServer } = await import("./lib/mediasoup/index.js"); await mediaServer.close(); } catch {}
    try { const { default: mongoose } = await import("mongoose"); await mongoose.disconnect(); } catch {}
    await app.close();
    clearTimeout(t);
    process.exit(0);
  };
  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}
start();
