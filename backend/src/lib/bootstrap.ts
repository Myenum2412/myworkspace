import { logger } from "./logger/index.js";
import { env } from "../config/env.js";
import { initializeFeatures, getAllFeatures } from "./features.js";
import { operationalAnalytics } from "./operations/analytics.js";
import { initializeTelemetry } from "./tracing.js";
import { keyRotation } from "./security/key-rotation.js";
import { configureReplicaSets } from "./db/replicas.js";
import { outbox } from "./outbox.js";

let bootstrapped = false;

export async function bootstrapPlatform(): Promise<void> {
  if (bootstrapped) return;
  bootstrapped = true;

  logger.info("Bootstrapping enterprise platform...");

  initializeFeatures();

  initializeTelemetry();

  configureReplicaSets();

  if (env.NODE_ENV !== "test") {
    keyRotation.scheduleAutoRotation().catch(() => {});

    startOutboxRelay().catch(() => {});
    startOperationalCleanup().catch(() => {});
  }

  await operationalAnalytics.recordEvent(
    "platform.boot",
    "infrastructure",
    { nodeEnv: env.NODE_ENV, version: "1.0.0" },
    "info",
    "bootstrap",
  );

  logger.info({
    features: getAllFeatureKeys(),
    nodeEnv: env.NODE_ENV,
  }, "Enterprise platform bootstrapped successfully");
}

function getAllFeatureKeys(): string[] {
  return getAllFeatures().map((f) => f.key);
}

async function startOutboxRelay(): Promise<void> {
  const relay = async () => {
    try {
      const messages = await outbox.getPendingMessages(50, 5);
      for (const msg of messages) {
        try {
          const { eventProducer } = await import("../lib/queue/producer.js");
          const exchange = msg.aggregateType === "file" ? "file.events"
            : msg.aggregateType === "notification" ? "notification.events"
            : "upload.events";
          const published = await eventProducer.publishEvent(exchange, msg.eventType as any, msg as any);
          if (published) {
            await outbox.markPublished(msg.messageId);
          }
        } catch (err) {
          await outbox.markFailed(msg.messageId, (err as Error).message);
        }
      }
    } catch {
      // Silent catch for polling errors
    }
  };

  const pollInterval = setInterval(relay, 10000);
  if (pollInterval.unref) pollInterval.unref();
  relay();
}

async function startOperationalCleanup(): Promise<void> {
  const cleanup = async () => {
    try {
      await operationalAnalytics.cleanupOldEvents(168);
      await outbox.cleanupPublishedMessages(24);
    } catch {
      // Silent catch
    }
  };

  const cleanupInterval = setInterval(cleanup, 60 * 60 * 1000);
  if (cleanupInterval.unref) cleanupInterval.unref();
  cleanup();
}

export async function healthCheck(): Promise<{
  status: "healthy" | "degraded";
  components: Record<string, string>;
}> {
  const components: Record<string, string> = {
    platform: "healthy",
  };

  return {
    status: Object.values(components).every(s => s === "healthy") ? "healthy" : "degraded",
    components,
  };
}
