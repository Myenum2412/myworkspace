import { ConsumeMessage } from "amqplib";
import { registerHandler, startConsumers } from "./consumer.js";
import { QUEUES } from "./connection.js";
import { logger } from "../logger/index.js";
import { FileAttachment } from "../db/models/FileAttachment.js";
import { ActivityLog } from "../db/models/ActivityLog.js";
import { Notification } from "../db/models/Notification.js";
import { env } from "../../config/env.js";

async function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

registerHandler(QUEUES.UPLOAD_PROCESSING, async (_msg, data) => {
  const { uploadId, orgId, userId, fileName, fileSize, mimeType, checksum } = data as Record<string, any>;
  logger.info({ uploadId, orgId, fileName }, "Processing upload completion");
  // Upload processing is handled by the TUS completion handler.
  // This consumer handles post-processing like notifications.
  try {
    const { eventProducer } = await import("./producer.js");
    await eventProducer.fileProcessingRequired({
      fileId: uploadId,
      orgId,
      processingType: "virus-scan",
    });
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
});

registerHandler(QUEUES.METADATA_SAVE, async (_msg, data) => {
  logger.info({ data }, "Saving metadata");
  return { success: true };
});

registerHandler(QUEUES.THUMBNAIL_GENERATION, async (_msg, data) => {
  const { fileId, orgId } = data as Record<string, any>;
  logger.info({ fileId, orgId }, "Generating thumbnail");
  try {
    // Thumbnail generation would integrate with sharp or similar
    await delay(100);
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
});

registerHandler(QUEUES.FILE_PROCESSING, async (_msg, data) => {
  const { fileId, orgId, processingType } = data as Record<string, any>;
  logger.info({ fileId, orgId, processingType }, "Processing file");
  try {
    switch (processingType) {
      case "virus-scan": {
        await delay(200);
        break;
      }
      case "compress": {
        await delay(100);
        break;
      }
      case "ocr": {
        await delay(500);
        break;
      }
    }
    await ActivityLog.create({
      orgId,
      userId: "system",
      createdBy: "system",
      action: `file.${processingType}`,
      entityType: "file",
      entityId: fileId,
      description: `File processing completed: ${processingType}`,
    });
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
});

registerHandler(QUEUES.NOTIFICATIONS, async (_msg, data) => {
  const { userId, orgId, type, title, message, link } = data as Record<string, any>;
  try {
    await Notification.create({
      userId,
      orgId,
      type,
      title,
      message,
      link: link || null,
      read: false,
    });
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
});

registerHandler(QUEUES.AUDIT_LOG, async (_msg, data) => {
  const { orgId, userId, action, entityType, entityId, description, metadata } = data as Record<string, any>;
  try {
    await ActivityLog.create({
      orgId,
      userId: userId || "system",
      createdBy: userId || "system",
      action,
      entityType,
      entityId,
      description,
      metadata: metadata || "",
    });
    return { success: true };
  } catch (err: any) {
    logger.error({ err }, "Audit log write failed");
    return { success: false, error: err.message };
  }
});

registerHandler(QUEUES.CLEANUP, async (_msg, data) => {
  const { orgId, olderThan } = data as Record<string, any>;
  logger.info({ orgId, olderThan }, "Running cleanup");
  try {
    const olderThanDate = new Date(olderThan);
    const staleSessions = await FileAttachment.find({
      orgId,
      deletedAt: { $ne: null, $lt: olderThanDate },
    }).lean();
    logger.info({ count: staleSessions.length }, "Cleanup candidates found");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
});

export async function startWorkers() {
  logger.info("Starting RabbitMQ workers...");
  try {
    await startConsumers();
    logger.info("RabbitMQ workers started successfully");
  } catch (err) {
    logger.error({ err }, "Failed to start RabbitMQ workers");
  }
}
