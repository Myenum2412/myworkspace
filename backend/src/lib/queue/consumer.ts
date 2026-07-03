import { Channel, ConsumeMessage } from "amqplib";
import { getChannel, isRabbitMQConfigured, QUEUES, EXCHANGES, ROUTING_KEYS } from "./connection.js";
import { logger, queueLogger } from "../logger/index.js";
import { metricsRegistry } from "../monitoring/index.js";

const MAX_RETRIES = 5;
const RETRY_DELAY_MS = [1000, 5000, 15000, 30000, 60000];

interface HandlerResult {
  success: boolean;
  requeue?: boolean;
  error?: string;
}

type MessageHandler = (msg: ConsumeMessage, data: Record<string, unknown>) => Promise<HandlerResult>;

const handlers = new Map<string, MessageHandler>();

export function registerHandler(queue: string, handler: MessageHandler) {
  handlers.set(queue, handler);
}

function getRetryCount(msg: ConsumeMessage): number {
  const deaths = msg.properties.headers?.["x-death"];
  if (Array.isArray(deaths)) {
    const death = deaths.find((d: any) => d.queue === msg.fields.routingKey);
    return death?.count || 0;
  }
  return 0;
}

function getRetryDelay(retryCount: number): number {
  if (retryCount >= RETRY_DELAY_MS.length) return RETRY_DELAY_MS[RETRY_DELAY_MS.length - 1];
  return RETRY_DELAY_MS[retryCount];
}

async function handleMessage(ch: Channel, msg: ConsumeMessage) {
  const queue = msg.fields.routingKey || "unknown";
  const handler = handlers.get(queue) || handlers.get("*");

  if (!handler) {
    ch.nack(msg, false, false);
    return;
  }

  let data: Record<string, unknown> = {};
  try {
    data = JSON.parse(msg.content.toString());
  } catch {
    ch.nack(msg, false, false);
    return;
  }

  const startTime = Date.now();
  try {
    const result = await handler(msg, data);

    if (result.success) {
      ch.ack(msg);
      metricsRegistry.incrementCounter("messages_processed", { queue, status: "success" });
      const duration = Date.now() - startTime;
      metricsRegistry.observeHistogram("message_processing_duration_ms", { queue }, duration);
    } else if (result.requeue) {
      ch.nack(msg, false, true);
      metricsRegistry.incrementCounter("messages_requeued", { queue });
    } else {
      const retryCount = getRetryCount(msg);
      if (retryCount < MAX_RETRIES) {
        const delay = getRetryDelay(retryCount);
        queueLogger.warn({ queue, retryCount, delay, error: result.error }, "Scheduling retry");
        ch.nack(msg, false, false);
      } else {
        queueLogger.error({ queue, retryCount, error: result.error }, "Max retries exceeded, sending to DLQ");
        ch.nack(msg, false, false);
        metricsRegistry.incrementCounter("messages_dead_lettered", { queue });
      }
    }
  } catch (err: any) {
    const retryCount = getRetryCount(msg);
    queueLogger.error({ err, queue, retryCount }, "Handler error");
    if (retryCount < MAX_RETRIES) {
      ch.nack(msg, false, false);
    } else {
      ch.nack(msg, false, false);
      metricsRegistry.incrementCounter("messages_dead_lettered", { queue });
    }
  }
}

export async function startConsumers() {
  if (!isRabbitMQConfigured()) return;
  const ch = await getChannel();

  for (const [queue] of handlers) {
    if (queue === "*") continue;
    await ch.consume(queue, (msg) => {
      if (msg) handleMessage(ch, msg);
    }, { noAck: false });
    queueLogger.info(`Consumer started for queue: ${queue}`);
  }

  logger.info("All queue consumers started");
}

export async function stopConsumers() {
  if (!isRabbitMQConfigured()) return;
  const ch = await getChannel();
  await ch.close();
  logger.info("All queue consumers stopped");
}
