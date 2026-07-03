import amqplib, { Channel, ChannelModel } from "amqplib";
import { env } from "../../config/env.js";
import { logger } from "../logger/index.js";

const RABBITMQ_URL = process.env.RABBITMQ_URL || "";
const RABBITMQ_PREFETCH = Number(process.env.RABBITMQ_PREFETCH || 10);

let connection: ChannelModel | null = null;
let channel: Channel | null = null;
let connecting = false;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

export function isRabbitMQConfigured(): boolean {
  return Boolean(RABBITMQ_URL && !RABBITMQ_URL.startsWith("amqp://localhost"));
}

export const EXCHANGES = {
  UPLOAD_EVENTS: "upload.events",
  FILE_EVENTS: "file.events",
  NOTIFICATION_EVENTS: "notification.events",
  DEAD_LETTER: "dead.letter",
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
} as const;

export async function getChannel(): Promise<Channel> {
  if (!isRabbitMQConfigured()) {
    throw new Error("RabbitMQ not configured — set RABBITMQ_URL in .env");
  }

  if (channel) return channel;

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
    connection = await amqplib.connect(RABBITMQ_URL);
    channel = await connection.createChannel();
    channel.prefetch(RABBITMQ_PREFETCH);

    connection.on("close", () => {
      logger.warn("RabbitMQ connection closed, scheduling reconnect");
      channel = null;
      connection = null;
      connecting = false;
      scheduleReconnect();
    });

    connection.on("error", (err) => {
      logger.error({ err }, "RabbitMQ connection error");
    });

    await setupInfrastructure(channel);

    logger.info("RabbitMQ connected and infrastructure configured");
    connecting = false;
    return channel;
  } catch (err) {
    logger.warn({ err }, "RabbitMQ not available — queue functionality disabled");
    connecting = false;
    throw err;
  }
}

function scheduleReconnect() {
  if (reconnectTimer) clearTimeout(reconnectTimer);
  reconnectTimer = setTimeout(async () => {
    logger.info("Attempting RabbitMQ reconnect...");
    try {
      await getChannel();
    } catch {
      logger.error("RabbitMQ reconnect failed");
    }
  }, 5000);
}

async function setupInfrastructure(ch: Channel) {
  // Dead letter exchange
  await ch.assertExchange(EXCHANGES.DEAD_LETTER, "fanout", { durable: true });

  // Main exchanges
  await ch.assertExchange(EXCHANGES.UPLOAD_EVENTS, "topic", { durable: true });
  await ch.assertExchange(EXCHANGES.FILE_EVENTS, "topic", { durable: true });
  await ch.assertExchange(EXCHANGES.NOTIFICATION_EVENTS, "topic", { durable: true });

  // Dead letter queue
  await ch.assertQueue(QUEUES.DEAD_LETTER, {
    durable: true,
    messageTtl: 7 * 24 * 60 * 60 * 1000,
  });
  await ch.bindQueue(QUEUES.DEAD_LETTER, EXCHANGES.DEAD_LETTER, "#");

  // Upload processing queue with DLQ
  await ch.assertQueue(QUEUES.UPLOAD_PROCESSING, {
    durable: true,
    deadLetterExchange: EXCHANGES.DEAD_LETTER,
    deadLetterRoutingKey: QUEUES.UPLOAD_PROCESSING,
    messageTtl: 30000,
  });
  await ch.bindQueue(QUEUES.UPLOAD_PROCESSING, EXCHANGES.UPLOAD_EVENTS, "upload.*");

  // Upload retry queue (delayed retry)
  await ch.assertQueue(QUEUES.UPLOAD_RETRY, {
    durable: true,
    deadLetterExchange: EXCHANGES.UPLOAD_EVENTS,
    deadLetterRoutingKey: ROUTING_KEYS.UPLOAD_STARTED,
    messageTtl: 10000,
  });
  await ch.bindQueue(QUEUES.UPLOAD_RETRY, EXCHANGES.UPLOAD_EVENTS, ROUTING_KEYS.RETRY_REQUIRED);

  // Metadata save queue
  await ch.assertQueue(QUEUES.METADATA_SAVE, {
    durable: true,
    deadLetterExchange: EXCHANGES.DEAD_LETTER,
    deadLetterRoutingKey: QUEUES.METADATA_SAVE,
    messageTtl: 30000,
  });
  await ch.bindQueue(QUEUES.METADATA_SAVE, EXCHANGES.UPLOAD_EVENTS, ROUTING_KEYS.METADATA_SAVED);

  // Thumbnail generation queue
  await ch.assertQueue(QUEUES.THUMBNAIL_GENERATION, {
    durable: true,
    deadLetterExchange: EXCHANGES.DEAD_LETTER,
    deadLetterRoutingKey: QUEUES.THUMBNAIL_GENERATION,
    messageTtl: 60000,
  });
  await ch.bindQueue(QUEUES.THUMBNAIL_GENERATION, EXCHANGES.FILE_EVENTS, ROUTING_KEYS.THUMBNAIL_GENERATED);

  // File processing queue
  await ch.assertQueue(QUEUES.FILE_PROCESSING, {
    durable: true,
    deadLetterExchange: EXCHANGES.DEAD_LETTER,
    deadLetterRoutingKey: QUEUES.FILE_PROCESSING,
    messageTtl: 60000,
  });
  await ch.bindQueue(QUEUES.FILE_PROCESSING, EXCHANGES.FILE_EVENTS, ROUTING_KEYS.FILE_PROCESSING_REQUIRED);

  // Notifications queue
  await ch.assertQueue(QUEUES.NOTIFICATIONS, {
    durable: true,
    deadLetterExchange: EXCHANGES.DEAD_LETTER,
    deadLetterRoutingKey: QUEUES.NOTIFICATIONS,
    messageTtl: 30000,
  });
  await ch.bindQueue(QUEUES.NOTIFICATIONS, EXCHANGES.NOTIFICATION_EVENTS, ROUTING_KEYS.NOTIFICATION_SEND);

  // Audit log queue
  await ch.assertQueue(QUEUES.AUDIT_LOG, {
    durable: true,
    deadLetterExchange: EXCHANGES.DEAD_LETTER,
    deadLetterRoutingKey: QUEUES.AUDIT_LOG,
    messageTtl: 30000,
  });
  await ch.bindQueue(QUEUES.AUDIT_LOG, EXCHANGES.NOTIFICATION_EVENTS, ROUTING_KEYS.AUDIT_LOG_RECORD);

  // Cleanup queue
  await ch.assertQueue(QUEUES.CLEANUP, {
    durable: true,
    deadLetterExchange: EXCHANGES.DEAD_LETTER,
    deadLetterRoutingKey: QUEUES.CLEANUP,
    messageTtl: 60000,
  });
  await ch.bindQueue(QUEUES.CLEANUP, EXCHANGES.FILE_EVENTS, ROUTING_KEYS.CLEANUP_REQUIRED);
}

export async function closeConnection() {
  try {
    if (channel) await channel.close();
    if (connection) await connection.close();
  } catch (err) {
    logger.error({ err }, "Error closing RabbitMQ connection");
  } finally {
    channel = null;
    connection = null;
    connecting = false;
  }
}

export async function getQueueDepth(queueName: string): Promise<number> {
  try {
    const ch = await getChannel();
    const info = await ch.checkQueue(queueName);
    return info.messageCount;
  } catch {
    return 0;
  }
}
