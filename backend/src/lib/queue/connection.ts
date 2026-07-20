import amqplib, { Channel, ChannelModel, Options } from "amqplib";
import { env } from "../../config/env.js";
import { logger } from "../logger/index.js";
import { metricsRegistry } from "../monitoring/index.js";

const RECONNECT_BASE_MS = 1000;
const RECONNECT_MAX_MS = 30000;
const RECONNECT_JITTER = 0.2;
const HEARTBEAT_INTERVAL = 30;
const CONNECTION_TIMEOUT = 10000;

let connection: ChannelModel | null = null;
let channel: Channel | null = null;
let connecting = false;
let reconnectAttempt = 0;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let heartbeatTimer: ReturnType<typeof setInterval> | null = null;
let isClosing = false;

export function isRabbitMQConfigured(): boolean {
  const url = env.RABBITMQ_URL;
  return Boolean(url && !url.startsWith("amqp://localhost"));
}

export const EXCHANGES = {
  UPLOAD_EVENTS: "upload.events",
  FILE_EVENTS: "file.events",
  NOTIFICATION_EVENTS: "notification.events",
  DEAD_LETTER: "dead.letter",
  DELAYED_RETRY: "delayed.retry",
  PRIORITY: "priority.events",
} as const;

export const QUEUES = {
  UPLOAD_PROCESSING: "upload-processing",
  UPLOAD_RETRY: "upload-retry",
  METADATA_SAVE: "metadata-save",
  THUMBNAIL_GENERATION: "thumbnail-generation",
  FILE_PROCESSING: "file-processing",
  NOTIFICATIONS: "notifications",
  AUDIT_LOG: "audit-log",
  CLEANUP: "cleanup",
  DEAD_LETTER: "dead-letter",
  PRIORITY_UPLOAD: "priority-upload",
  DUPLICATE_DETECTION: "duplicate-detection",
} as const;

export const ROUTING_KEYS = {
  UPLOAD_STARTED: "upload.started",
  UPLOAD_CHUNK_RECEIVED: "upload.chunk.received",
  UPLOAD_PAUSED: "upload.paused",
  UPLOAD_RESUMED: "upload.resumed",
  UPLOAD_COMPLETED: "upload.completed",
  UPLOAD_FAILED: "upload.failed",
  METADATA_SAVED: "metadata.saved",
  THUMBNAIL_GENERATED: "thumbnail.generated",
  ACCESS_GRANTED: "access.granted",
  ACCESS_REVOKED: "access.revoked",
  FILE_DELETED: "file.deleted",
  FILE_RESTORED: "file.restored",
  FILE_PROCESSING_REQUIRED: "file.processing.required",
  RETRY_REQUIRED: "retry.required",
  CLEANUP_REQUIRED: "cleanup.required",
  NOTIFICATION_SEND: "notification.send",
  AUDIT_LOG_RECORD: "audit.log.record",
  PRIORITY_PROCESSING: "priority.processing",
} as const;

export type QueueName = (typeof QUEUES)[keyof typeof QUEUES];
export type ExchangeName = (typeof EXCHANGES)[keyof typeof EXCHANGES];

export interface QueueMetrics {
  depth: number;
  consumerCount: number;
  unackedCount: number;
  readyCount: number;
}

const processedIds = new Set<string>();
const PROCESSED_ID_CLEANUP_INTERVAL = 60000;
const PROCESSED_ID_MAX_SIZE = 50000;

setInterval(() => {
  if (processedIds.size > PROCESSED_ID_MAX_SIZE) {
    const toDelete = processedIds.size - (PROCESSED_ID_MAX_SIZE / 2);
    const iter = processedIds.values();
    for (let i = 0; i < toDelete; i++) {
      processedIds.delete(iter.next().value as string);
    }
  }
}, PROCESSED_ID_CLEANUP_INTERVAL);

export function isDuplicateMessage(messageId: string): boolean {
  if (processedIds.has(messageId)) return true;
  processedIds.add(messageId);
  return false;
}

function calculateBackoff(): number {
  const delay = Math.min(
    RECONNECT_BASE_MS * Math.pow(2, reconnectAttempt),
    RECONNECT_MAX_MS,
  );
  const jitter = delay * RECONNECT_JITTER * (Math.random() - 0.5);
  return Math.max(100, Math.round(delay + jitter));
}

async function connectWithRetry(): Promise<ChannelModel> {
  const conn = await amqplib.connect(env.RABBITMQ_URL!, {
    heartbeat: HEARTBEAT_INTERVAL,
    timeout: CONNECTION_TIMEOUT,
  } as Options.Connect);
  return conn;
}

export async function getChannel(): Promise<Channel> {
  if (!isRabbitMQConfigured()) {
    throw new Error("RabbitMQ not configured — set RABBITMQ_URL in .env");
  }

  if (channel && channel.connection) return channel;

  if (connecting) {
    return new Promise((resolve) => {
      const check = () => {
        if (channel) resolve(channel);
        else setTimeout(check, 100);
      };
      check();
    });
  }

  connecting = true;
  try {
    const prefetch = Number(env.RABBITMQ_PREFETCH || 10);
    connection = await connectWithRetry();
    channel = await connection.createChannel();
    channel.prefetch(prefetch);
    reconnectAttempt = 0;

    connection.on("close", () => {
      if (isClosing) return;
      logger.warn("RabbitMQ connection closed, scheduling reconnect");
      channel = null;
      connection = null;
      connecting = false;
      scheduleReconnect();
    });

    connection.on("error", (err) => {
      logger.error({ err }, "RabbitMQ connection error");
    });

    channel.on("error", (err) => {
      logger.error({ err }, "RabbitMQ channel error");
    });

    channel.on("return", (msg) => {
      logger.warn({ routingKey: msg.fields.routingKey }, "Message returned (unroutable)");
    });

    metricsRegistry.setGauge("rabbitmq_connected", {}, 1);
    await setupInfrastructure(channel);
    startHeartbeat();
    logger.info("RabbitMQ connected and infrastructure configured");
    connecting = false;
    return channel;
  } catch (err) {
    logger.warn({ err }, "RabbitMQ not available — queue functionality disabled");
    connecting = false;
    metricsRegistry.setGauge("rabbitmq_connected", {}, 0);
    scheduleReconnect();
    throw err;
  }
}

function startHeartbeat() {
  if (heartbeatTimer) clearInterval(heartbeatTimer);
  heartbeatTimer = setInterval(async () => {
    if (!channel || isClosing) return;
    try {
      await channel.checkQueue(QUEUES.DEAD_LETTER);
    } catch {
      logger.warn("RabbitMQ heartbeat failed");
    }
  }, HEARTBEAT_INTERVAL * 1000);
}

function scheduleReconnect() {
  if (reconnectTimer) clearTimeout(reconnectTimer);
  if (isClosing) return;
  reconnectAttempt++;
  const delay = calculateBackoff();
  logger.info({ attempt: reconnectAttempt, delayMs: delay }, "Scheduling RabbitMQ reconnect");
  reconnectTimer = setTimeout(async () => {
    logger.info("Attempting RabbitMQ reconnect...");
    try {
      await getChannel();
    } catch {
      logger.error({ attempt: reconnectAttempt }, "RabbitMQ reconnect failed");
    }
  }, delay);
}

async function setupInfrastructure(ch: Channel) {
  await ch.assertExchange(EXCHANGES.DEAD_LETTER, "fanout", { durable: true });
  await ch.assertExchange(EXCHANGES.UPLOAD_EVENTS, "topic", { durable: true });
  await ch.assertExchange(EXCHANGES.FILE_EVENTS, "topic", { durable: true });
  await ch.assertExchange(EXCHANGES.NOTIFICATION_EVENTS, "topic", { durable: true });
  await ch.assertExchange(EXCHANGES.DELAYED_RETRY, "topic", { durable: true });
  await ch.assertExchange(EXCHANGES.PRIORITY, "topic", { durable: true });

  await ch.assertQueue(QUEUES.DEAD_LETTER, {
    durable: true,
    messageTtl: 7 * 24 * 60 * 60 * 1000,
    maxLength: 100000,
  });
  await ch.bindQueue(QUEUES.DEAD_LETTER, EXCHANGES.DEAD_LETTER, "#");

  const queueConfigs: Array<{
    name: string;
    exchange: string;
    routingKey: string;
    ttl: number;
    priority?: number;
  }> = [
    { name: QUEUES.UPLOAD_PROCESSING, exchange: EXCHANGES.UPLOAD_EVENTS, routingKey: "upload.*", ttl: 30000 },
    { name: QUEUES.UPLOAD_RETRY, exchange: EXCHANGES.UPLOAD_EVENTS, routingKey: ROUTING_KEYS.RETRY_REQUIRED, ttl: 10000 },
    { name: QUEUES.METADATA_SAVE, exchange: EXCHANGES.UPLOAD_EVENTS, routingKey: ROUTING_KEYS.METADATA_SAVED, ttl: 30000 },
    { name: QUEUES.THUMBNAIL_GENERATION, exchange: EXCHANGES.FILE_EVENTS, routingKey: ROUTING_KEYS.THUMBNAIL_GENERATED, ttl: 60000 },
    { name: QUEUES.FILE_PROCESSING, exchange: EXCHANGES.FILE_EVENTS, routingKey: ROUTING_KEYS.FILE_PROCESSING_REQUIRED, ttl: 60000 },
    { name: QUEUES.NOTIFICATIONS, exchange: EXCHANGES.NOTIFICATION_EVENTS, routingKey: ROUTING_KEYS.NOTIFICATION_SEND, ttl: 30000 },
    { name: QUEUES.AUDIT_LOG, exchange: EXCHANGES.NOTIFICATION_EVENTS, routingKey: ROUTING_KEYS.AUDIT_LOG_RECORD, ttl: 30000 },
    { name: QUEUES.CLEANUP, exchange: EXCHANGES.FILE_EVENTS, routingKey: ROUTING_KEYS.CLEANUP_REQUIRED, ttl: 60000 },
    { name: QUEUES.PRIORITY_UPLOAD, exchange: EXCHANGES.PRIORITY, routingKey: ROUTING_KEYS.PRIORITY_PROCESSING, ttl: 15000, priority: 10 },
  ];

  for (const qc of queueConfigs) {
    const opts: Options.AssertQueue = {
      durable: true,
      deadLetterExchange: EXCHANGES.DEAD_LETTER,
      deadLetterRoutingKey: qc.name,
      messageTtl: qc.ttl,
      maxLength: 50000,
    };
    if (qc.priority) opts.maxPriority = qc.priority;
    await ch.assertQueue(qc.name, opts);
    await ch.bindQueue(qc.name, qc.exchange, qc.routingKey);
  }

  const priorityBindings = [
    { queue: QUEUES.UPLOAD_PROCESSING, exchange: EXCHANGES.PRIORITY, key: ROUTING_KEYS.PRIORITY_PROCESSING },
  ];
  for (const pb of priorityBindings) {
    await ch.bindQueue(pb.queue, pb.exchange, pb.key);
  }
}

export async function closeConnection() {
  isClosing = true;
  if (reconnectTimer) clearTimeout(reconnectTimer);
  if (heartbeatTimer) clearInterval(heartbeatTimer);
  try {
    if (channel) await channel.close();
    if (connection) await connection.close();
  } catch (err) {
    logger.error({ err }, "Error closing RabbitMQ connection");
  } finally {
    channel = null;
    connection = null;
    connecting = false;
    isClosing = false;
    metricsRegistry.setGauge("rabbitmq_connected", {}, 0);
  }
}

export async function getQueueMetrics(queueName: string): Promise<QueueMetrics | null> {
  try {
    const ch = await getChannel();
    const info = await ch.checkQueue(queueName);
    return {
      depth: info.messageCount,
      consumerCount: info.consumerCount,
      unackedCount: 0,
      readyCount: info.messageCount,
    };
  } catch {
    return null;
  }
}

export async function getQueueDepth(queueName: string): Promise<number> {
  const metrics = await getQueueMetrics(queueName);
  return metrics?.depth ?? 0;
}

export async function purgeQueue(queueName: string): Promise<void> {
  try {
    const ch = await getChannel();
    await ch.purgeQueue(queueName);
    logger.info({ queue: queueName }, "Queue purged");
  } catch (err) {
    logger.error({ err, queue: queueName }, "Failed to purge queue");
  }
}

export async function publishWithConfirm(
  exchange: string,
  routingKey: string,
  content: Buffer,
  options: Options.Publish,
): Promise<boolean> {
  return new Promise((resolve) => {
    if (!channel) {
      resolve(false);
      return;
    }
    const published = channel.publish(exchange, routingKey, content, {
      persistent: true,
      mandatory: true,
      ...options,
    });
    if (!published) {
      logger.warn({ routingKey }, "Channel buffer full, applying backpressure");
      channel.once("drain", () => resolve(true));
    } else {
      resolve(true);
    }
  });
}
