import { v4 as uuid } from "uuid";
import { getChannel, EXCHANGES, ROUTING_KEYS, QUEUES, publishWithConfirm } from "./connection.js";
import { logger } from "../logger/index.js";
import { metricsRegistry } from "../monitoring/index.js";

export interface DomainEvent {
  id: string;
  type: string;
  source: string;
  subject: string;
  data: Record<string, unknown>;
  timestamp: string;
  correlationId?: string;
  causationId?: string;
  tenantId?: string;
  priority?: number;
  retryCount?: number;
  maxRetries?: number;
}

function createEvent(
  type: string,
  subject: string,
  data: Record<string, unknown>,
  correlationId?: string,
  causationId?: string,
  tenantId?: string,
  priority?: number,
): DomainEvent {
  return {
    id: uuid(),
    type,
    source: "myworkspace.upload",
    subject,
    data,
    timestamp: new Date().toISOString(),
    correlationId,
    causationId,
    tenantId,
    priority,
  };
}

async function publish(
  exchange: string,
  routingKey: string,
  event: DomainEvent,
  priority?: number,
) {
  try {
    const ch = await getChannel();
    const content = Buffer.from(JSON.stringify(event));
    const options: Record<string, unknown> = {
      persistent: true,
      messageId: event.id,
      timestamp: Math.floor(Date.now() / 1000),
      contentType: "application/json",
      headers: {
        "x-origin": event.source,
        "x-correlation-id": event.correlationId || "",
        "x-causation-id": event.causationId || "",
        "x-tenant-id": event.tenantId || "",
        "x-retry-count": event.retryCount || 0,
        "x-max-retries": event.maxRetries || 5,
      },
    };
    if (priority !== undefined) options.priority = priority;

    const published = ch.publish(exchange, routingKey, content, options);
    if (!published) {
      logger.warn({ eventId: event.id, routingKey }, "Message not published (channel buffer full)");
      return false;
    }
    metricsRegistry.incrementCounter("queue_published_total", { exchange, routingKey });
    return true;
  } catch (err) {
    logger.error({ err, eventType: event.type }, "Failed to publish event");
    metricsRegistry.incrementCounter("queue_failures_total", { exchange, routingKey });
    return false;
  }
}

export const eventProducer = {
  async uploadStarted(
    params: {
      uploadId: string; orgId: string; userId: string; fileName: string;
      fileSize: number; mimeType: string; checksum?: string;
      folderId?: string; projectId?: string; clientId?: string;
    },
    correlationId?: string,
  ) {
    return publish(
      EXCHANGES.UPLOAD_EVENTS,
      ROUTING_KEYS.UPLOAD_STARTED,
      createEvent("UploadStarted", params.uploadId, params as unknown as Record<string, unknown>, correlationId, undefined, params.orgId),
    );
  },

  async uploadChunkReceived(params: {
    uploadId: string; orgId: string; chunkIndex: number; chunkSize: number;
    bytesReceived: number; totalBytes: number;
  }) {
    return publish(
      EXCHANGES.UPLOAD_EVENTS,
      ROUTING_KEYS.UPLOAD_CHUNK_RECEIVED,
      createEvent("UploadChunkReceived", params.uploadId, params as unknown as Record<string, unknown>),
    );
  },

  async uploadCompleted(params: {
    uploadId: string; fileId: string; orgId: string; userId: string;
    fileName: string; fileSize: number; mimeType: string; checksum: string;
    storagePath: string; durationMs: number; isDuplicate?: boolean;
  }) {
    return publish(
      EXCHANGES.UPLOAD_EVENTS,
      ROUTING_KEYS.UPLOAD_COMPLETED,
      createEvent("UploadCompleted", params.uploadId, params as unknown as Record<string, unknown>),
    );
  },

  async uploadFailed(params: {
    uploadId: string; orgId: string; userId: string; fileName: string;
    errorType: string; errorMessage: string; retryCount: number;
  }) {
    return publish(
      EXCHANGES.UPLOAD_EVENTS,
      ROUTING_KEYS.UPLOAD_FAILED,
      createEvent("UploadFailed", params.uploadId, params as unknown as Record<string, unknown>),
    );
  },

  async metadataSaved(params: { fileId: string; orgId: string; uploadId: string }) {
    return publish(
      EXCHANGES.UPLOAD_EVENTS,
      ROUTING_KEYS.METADATA_SAVED,
      createEvent("MetadataSaved", params.fileId, params as unknown as Record<string, unknown>),
    );
  },

  async thumbnailGenerated(params: { fileId: string; orgId: string; thumbnailPath: string }) {
    return publish(
      EXCHANGES.FILE_EVENTS,
      ROUTING_KEYS.THUMBNAIL_GENERATED,
      createEvent("ThumbnailGenerated", params.fileId, params as unknown as Record<string, unknown>),
    );
  },

  async fileProcessingRequired(params: {
    fileId: string; orgId: string; processingType: string;
  }) {
    return publish(
      EXCHANGES.FILE_EVENTS,
      ROUTING_KEYS.FILE_PROCESSING_REQUIRED,
      createEvent("FileProcessingRequired", params.fileId, params as unknown as Record<string, unknown>),
    );
  },

  async notificationSend(params: {
    userId: string; orgId: string; type: string; title: string; message: string; link?: string;
  }) {
    return publish(
      EXCHANGES.NOTIFICATION_EVENTS,
      ROUTING_KEYS.NOTIFICATION_SEND,
      createEvent("NotificationSend", params.userId, params as unknown as Record<string, unknown>),
    );
  },

  async auditLogRecord(params: {
    orgId: string; userId: string; action: string; entityType: string;
    entityId: string; description: string; metadata?: string;
  }) {
    return publish(
      EXCHANGES.NOTIFICATION_EVENTS,
      ROUTING_KEYS.AUDIT_LOG_RECORD,
      createEvent("AuditLogRecord", params.entityId, params as unknown as Record<string, unknown>),
    );
  },

  async fileDeleted(params: { fileId: string; orgId: string; userId: string; storagePath: string }) {
    return publish(
      EXCHANGES.FILE_EVENTS,
      ROUTING_KEYS.FILE_DELETED,
      createEvent("FileDeleted", params.fileId, params as unknown as Record<string, unknown>),
    );
  },

  async fileRestored(params: { fileId: string; orgId: string; userId: string }) {
    return publish(
      EXCHANGES.FILE_EVENTS,
      ROUTING_KEYS.FILE_RESTORED,
      createEvent("FileRestored", params.fileId, params as unknown as Record<string, unknown>),
    );
  },

  async cleanupRequired(params: { orgId: string; olderThan: string }) {
    return publish(
      EXCHANGES.FILE_EVENTS,
      ROUTING_KEYS.CLEANUP_REQUIRED,
      createEvent("CleanupRequired", params.orgId, params as unknown as Record<string, unknown>),
    );
  },

  async uploadPaused(params: {
    uploadId: string; orgId: string; userId: string; bytesReceived: number;
  }) {
    return publish(
      EXCHANGES.UPLOAD_EVENTS,
      ROUTING_KEYS.UPLOAD_PAUSED,
      createEvent("UploadPaused", params.uploadId, params as unknown as Record<string, unknown>),
    );
  },

  async uploadResumed(params: {
    uploadId: string; orgId: string; userId: string; bytesReceived: number;
  }) {
    return publish(
      EXCHANGES.UPLOAD_EVENTS,
      ROUTING_KEYS.UPLOAD_RESUMED,
      createEvent("UploadResumed", params.uploadId, params as unknown as Record<string, unknown>),
    );
  },

  async retryRequired(params: {
    uploadId: string; orgId: string; userId: string; retryCount: number; maxRetries: number;
  }) {
    return publish(
      EXCHANGES.UPLOAD_EVENTS,
      ROUTING_KEYS.RETRY_REQUIRED,
      createEvent("RetryRequired", params.uploadId, params as unknown as Record<string, unknown>),
    );
  },

  async publishPriority(params: {
    fileId: string; orgId: string; processingType: string;
  }) {
    return publish(
      EXCHANGES.PRIORITY,
      ROUTING_KEYS.PRIORITY_PROCESSING,
      createEvent("PriorityProcessing", params.fileId, params as unknown as Record<string, unknown>),
      10,
    );
  },

  async publishEvent(
    exchange: string,
    routingKey: string,
    event: DomainEvent,
  ) {
    return publish(exchange, routingKey, event);
  },
};
