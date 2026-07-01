import { ConsumeMessage } from "amqplib";
import { registerHandler, startConsumers } from "./consumer.js";
import { QUEUES } from "./connection.js";
import { logger } from "../logger/index.js";
import { FileAttachment } from "../db/models/FileAttachment.js";
import { ActivityLog } from "../db/models/ActivityLog.js";
import { Notification } from "../db/models/Notification.js";
import { env } from "../../config/env.js";
import { generatePreview } from "../../services/preview.service.js";
import { scanFile } from "../../services/virus-scan.service.js";
import path from "path";
import fs from "fs";

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
    const file = await FileAttachment.findOne({ id: fileId, orgId }).lean();
    if (!file) return { success: false, error: "File not found" };
    const preview = await generatePreview(file.storagePath, file.mimeType, fileId);
    if (preview.thumbnailPath) {
      await FileAttachment.updateOne({ id: fileId }, { thumbnailPath: preview.thumbnailPath });
    }
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
        const file = await FileAttachment.findOne({ id: fileId, orgId }).lean();
        if (!file) return { success: false, error: "File not found" };
        const { getStorageProvider } = await import("../storage/providers.js");
        const provider = getStorageProvider();
        const filePath = path.join("/tmp", `virus-scan-${fileId}`);
        try {
          const buffer = await provider.get(file.storagePath);
          if (!buffer) return { success: false, error: "File data not found" };
          await fs.promises.writeFile(filePath, buffer);
          const result = await scanFile(filePath);
          await FileAttachment.updateOne(
            { id: fileId },
            { virusScanStatus: result.status, virusScanResult: result.details },
          );
        } finally {
          fs.promises.unlink(filePath).catch(() => {});
        }
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
