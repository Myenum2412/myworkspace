import { Channel, ConsumeMessage } from "amqplib";
import { getChannel, isRabbitMQConfigured, QUEUES, isDuplicateMessage } from "./connection.js";
import { logger, queueLogger } from "../logger/index.js";
import { metricsRegistry } from "../monitoring/index.js";

export const MAX_RETRIES = 5;
export const RETRY_DELAY_MS = [1000, 5000, 15000, 30000, 60000];
const POISON_MESSAGE_THRESHOLD = 10;
const MAX_CONCURRENT_HANDLERS = 50;
const HANDLER_TIMEOUT_MS = 120000;

interface HandlerResult {
  success: boolean;
  requeue?: boolean;
  error?: string;
  skipRetry?: boolean;
}

type MessageHandler = (msg: ConsumeMessage, data: Record<string, unknown>) => Promise<HandlerResult>;

const handlers = new Map<string, MessageHandler>();
const poisonMessageTracker = new Map<string, number>();
const activeHandlers = new Set<string>();

export function registerHandler(queue: string, handler: MessageHandler) {
  handlers.set(queue, handler);
}

function getRetryCount(msg: ConsumeMessage): number {
  const deaths = msg.properties.headers?.["x-death"];
  if (Array.isArray(deaths)) {
    const death = deaths.find((d: any) => d.queue === msg.fields.routingKey);
    return death?.count || 0;
  }
  const retryHeader = msg.properties.headers?.["x-retry-count"];
  return typeof retryHeader === "number" ? retryHeader : 0;
}

function getMessageId(msg: ConsumeMessage): string {
  return msg.properties.messageId || `${msg.fields.routingKey}:${msg.fields.deliveryTag}`;
}

function getRetryDelay(retryCount: number): number {
  if (retryCount >= RETRY_DELAY_MS.length) return RETRY_DELAY_MS[RETRY_DELAY_MS.length - 1];
  return RETRY_DELAY_MS[retryCount];
}

function trackPoisonMessage(queue: string, msgId: string) {
  const key = `${queue}:${msgId}`;
  const count = (poisonMessageTracker.get(key) || 0) + 1;
  poisonMessageTracker.set(key, count);
  if (count >= POISON_MESSAGE_THRESHOLD) {
    queueLogger.error({ queue, msgId, count }, "Poison message detected");
    metricsRegistry.incrementCounter("poison_messages_detected", { queue });
  }
  if (poisonMessageTracker.size > 10000) {
    const iter = poisonMessageTracker.keys();
    for (let i = 0; i < 1000; i++) poisonMessageTracker.delete(iter.next().value as string);
  }
}

async function handleMessage(ch: Channel, msg: ConsumeMessage) {
  const msgId = getMessageId(msg);
  const queue = msg.fields.routingKey || "unknown";
  const handler = handlers.get(queue) || handlers.get("*");

  if (!handler) {
    ch.nack(msg, false, false);
    return;
  }

  if (isDuplicateMessage(msgId)) {
    queueLogger.warn({ msgId, queue }, "Duplicate message detected, acknowledging");
    ch.ack(msg);
    metricsRegistry.incrementCounter("duplicate_messages_skipped", { queue });
    return;
  }

  if (activeHandlers.size >= MAX_CONCURRENT_HANDLERS) {
    queueLogger.warn({ queue, activeHandlers: activeHandlers.size }, "Backpressure: too many active handlers, requeuing");
    ch.nack(msg, false, true);
    return;
  }

  let data: Record<string, unknown> = {};
  try {
    data = JSON.parse(msg.content.toString());
  } catch {
    ch.nack(msg, false, false);
    return;
  }

  const handlerId = `${msgId}:${Date.now()}`;
  activeHandlers.add(handlerId);

  const startTime = Date.now();
  let timeoutHandle: ReturnType<typeof setTimeout> | null = null;
  let timedOut = false;

  const timeoutPromise = new Promise<HandlerResult>((_, reject) => {
    timeoutHandle = setTimeout(() => {
      timedOut = true;
      reject(new Error("Handler timeout exceeded"));
    }, HANDLER_TIMEOUT_MS);
  });

  try {
    const result = await Promise.race([
      handler(msg, data),
      timeoutPromise,
    ]);

    if (timeoutHandle) clearTimeout(timeoutHandle);

    if (result.success) {
      ch.ack(msg);
      metricsRegistry.incrementCounter("messages_processed", { queue, status: "success" });
      metricsRegistry.observeHistogram("message_processing_duration_ms", { queue }, Date.now() - startTime);
    } else if (result.requeue) {
      ch.nack(msg, false, true);
      metricsRegistry.incrementCounter("messages_requeued", { queue });
    } else if (result.skipRetry) {
      queueLogger.warn({ queue, msgId, error: result.error }, "Skipping retry, sending to DLQ");
      ch.nack(msg, false, false);
      metricsRegistry.incrementCounter("messages_dead_lettered", { queue });
    } else {
      const retryCount = getRetryCount(msg);
      if (retryCount < MAX_RETRIES) {
        queueLogger.warn({ queue, msgId, retryCount, delayMs: getRetryDelay(retryCount), error: result.error }, "Scheduling retry with backoff");
        ch.nack(msg, false, true);
        metricsRegistry.incrementCounter("messages_retried", { queue, retry: String(retryCount) });
      } else {
        queueLogger.error({ queue, msgId, retryCount, error: result.error }, "Max retries exceeded, sending to DLQ");
        ch.nack(msg, false, false);
        metricsRegistry.incrementCounter("messages_dead_lettered", { queue });
        trackPoisonMessage(queue, msgId);
      }
    }
  } catch (err: any) {
    if (timeoutHandle) clearTimeout(timeoutHandle);
    if (!timedOut) {
      const retryCount = getRetryCount(msg);
      queueLogger.error({ err, queue, msgId, retryCount, error: err.message }, "Handler error");
      if (retryCount < MAX_RETRIES) {
        ch.nack(msg, false, true);
        metricsRegistry.incrementCounter("messages_retried", { queue, retry: String(retryCount) });
      } else {
        ch.nack(msg, false, false);
        metricsRegistry.incrementCounter("messages_dead_lettered", { queue });
        trackPoisonMessage(queue, msgId);
      }
    }
  } finally {
    activeHandlers.delete(handlerId);
  }
}

export async function startConsumers() {
  if (!isRabbitMQConfigured()) return;
  const ch = await getChannel();
  const queuesToConsume = [
    QUEUES.UPLOAD_PROCESSING,
    QUEUES.METADATA_SAVE,
    QUEUES.THUMBNAIL_GENERATION,
    QUEUES.FILE_PROCESSING,
    QUEUES.NOTIFICATIONS,
    QUEUES.AUDIT_LOG,
    QUEUES.CLEANUP,
  ];

  for (const queue of queuesToConsume) {
    if (handlers.has(queue) || handlers.has("*")) {
      await ch.consume(queue, (msg) => {
        if (msg) handleMessage(ch, msg);
      }, { noAck: false });
      queueLogger.info(`Consumer started for queue: ${queue}`);
    }
  }

  const consumerCount = await ch.checkQueue(queuesToConsume[0]).then(r => r.consumerCount).catch(() => 0);
  queueLogger.info({ consumerCount, monitoredQueues: queuesToConsume.length }, "All queue consumers started");
}

export async function stopConsumers() {
  if (!isRabbitMQConfigured()) return;
  try {
    const ch = await getChannel();
    await ch.close();
  } catch {
    // Channel already closed
  }
  logger.info("All queue consumers stopped");
}
