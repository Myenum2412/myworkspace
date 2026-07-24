import { v4 as uuid } from "uuid";
import { FileAttachment } from "../lib/db/models/FileAttachment.js";
import { FileVersion } from "../lib/db/models/FileVersion.js";
import { FileShare } from "../lib/db/models/FileShare.js";
import { ShareLink } from "../lib/db/models/ShareLink.js";
import { StorageQuota } from "../lib/db/models/StorageQuota.js";
import { getStorageProvider, computeChecksum } from "../lib/storage/providers.js";
import { checkUserQuota } from "../lib/uploads/upload-orchestrator.js";
import { env } from "../config/env.js";
import { AppError } from "../middleware/error.js";
import { recordAuditLog } from "./audit.service.js";
import { cacheManager, CacheKeys } from "../lib/cache.js";
import { validateFileMagicBytes, validateFileExtension } from "./validation.service.js";
import { logger } from "../lib/logger/index.js";
import fs from "fs/promises";
import { generateThumbnail as generateThumbnailService, deleteThumbnails, getThumbnail } from "./thumbnail.service.js";
import { extractFileMetadata } from "./metadata.service.js";

export interface FileUploadInput {
  orgId: string;
  folderId?: string | null;
  taskId?: string | null;
  clientId?: string | null;
  projectId?: string | null;
  uploaderId: string;
  name: string;
  originalName: string;
  mimeType: string;
  size: number;
  buffer: Buffer;
  checksum?: string;
  description?: string;
  tags?: string[];
  skipDuplicates?: boolean;
  category?: string;
  moduleName?: string;
  entityId?: string;
}

export interface FileUploadStreamInput extends Omit<FileUploadInput, "buffer"> {
  filePath: string;
}

export async function cleanupTemp(filePath: string): Promise<void> {
  try { await fs.unlink(filePath); } catch { /* ignore */ }
}

export interface FileUploadResult {
  kind: "created" | "duplicate";
  fileId: string;
  isDuplicate: boolean;
}

function invalidateFileCaches(orgId: string): void {
  cacheManager.invalidatePattern(`files:${orgId}`);
  cacheManager.invalidatePattern(`recycle:${orgId}`);
  cacheManager.invalidatePattern(CacheKeys.dashboardMetrics(orgId));
}

export async function uploadFile(input: FileUploadInput): Promise<FileUploadResult> {
  const {
    orgId, clientId, folderId, taskId, projectId, uploaderId,
    name, originalName, mimeType, size, buffer, checksum,
    description, tags, skipDuplicates = true, category,
    moduleName, entityId,
  } = input;

  const actualMimeType = validateFileMagicBytes(buffer, mimeType);

  if (!validateFileExtension(originalName, actualMimeType)) {
    throw new AppError(400, `File extension does not match the detected file type (${actualMimeType})`);
  }

  const sha = checksum ?? await computeChecksum(buffer);

  if (skipDuplicates) {
    const existingDuplicate = await FileAttachment.findOne({
      orgId, checksum: sha, deletedAt: null,
      $or: [
        { folderId: folderId || null },
        { folderId: { $exists: false }, projectId: { $exists: false }, clientId: { $exists: false } },
        ...(projectId ? [{ projectId }] : []),
        ...(clientId ? [{ clientId }] : []),
      ],
    }).lean();

    if (existingDuplicate) {
      return { kind: "duplicate", fileId: existingDuplicate.id, isDuplicate: true };
    }
  }

  const quota = await StorageQuota.findOne({ orgId }).lean();
  if (quota && quota.usedStorageBytes + size > quota.maxStorageBytes) {
    throw new AppError(413, "Organization storage quota exceeded");
  }

  await checkUserQuota(orgId, uploaderId, size);

  const provider = getStorageProvider();
  const storagePath = `${orgId}/${Date.now()}-${uuid()}-${originalName}`;
  await provider.save(buffer, storagePath);

  const fileId = uuid();
  const fileCategory = category || categorizeMime(actualMimeType);

  await FileAttachment.create({
    id: fileId, orgId, folderId: folderId || null, taskId: taskId || null, clientId: clientId || null, projectId: projectId || null,
    uploaderId, createdBy: uploaderId, name, originalName,
    mimeType: actualMimeType, size, storagePath,
    storageProvider: "local",
    category: fileCategory as any,
    checksum: sha, currentVersion: 1,
    description: description || "", tags: tags || [],
    moduleName: moduleName || null,
    entityId: entityId || null,
  });

  if (clientId && moduleName) {
    try {
      const { autoRouteFileInClientFolder } = await import("./client-folder.service.js");
      await autoRouteFileInClientFolder(fileId, {
        orgId, clientId, moduleName, entityId: entityId || undefined,
        createdBy: uploaderId,
      });
    } catch (err: any) {
      logger.warn({ err: err.message, fileId, clientId, moduleName }, "Auto-routing failed for file");
    }
  }

  await StorageQuota.updateOne(
    { orgId },
    { $inc: { usedStorageBytes: size } },
    { upsert: true },
  );

  await recordAuditLog({
    orgId, userId: uploaderId, createdBy: uploaderId,
    action: "file.uploaded", entityType: "file", entityId: fileId,
    description: `File "${originalName}" uploaded (${(size / 1024).toFixed(1)} KB)`,
  });

  generateThumbnailService(fileId, orgId, buffer, actualMimeType).then((thumbResults) => {
    if (thumbResults.size > 0) {
      extractFileMetadata(fileId, orgId, buffer, actualMimeType).catch(() => {});
    }
  }).catch((err) => {
    logger.warn({ err, fileId }, "Background thumbnail generation failed");
  });

  invalidateFileCaches(orgId);

  return { kind: "created", fileId, isDuplicate: false };
}

export async function uploadFileStream(input: FileUploadStreamInput): Promise<FileUploadResult> {
  const {
    orgId, clientId, folderId, taskId, projectId, uploaderId,
    name, originalName, mimeType, size, filePath, checksum,
    description, tags, skipDuplicates = true, category,
    moduleName, entityId,
  } = input;

  const { createHash } = await import("crypto");
  const { createReadStream } = await import("fs");

  let sha: string;
  if (checksum) {
    sha = checksum;
  } else {
    const hash = createHash("sha256");
    const stream = createReadStream(filePath);
    for await (const chunk of stream) {
      hash.update(chunk);
    }
    sha = hash.digest("hex");
  }

  if (skipDuplicates) {
    const existingDuplicate = await FileAttachment.findOne({
      orgId, checksum: sha, deletedAt: null,
      $or: [
        { folderId: folderId || null },
        { folderId: { $exists: false }, projectId: { $exists: false }, clientId: { $exists: false } },
        ...(projectId ? [{ projectId }] : []),
        ...(clientId ? [{ clientId }] : []),
      ],
    }).lean();

    if (existingDuplicate) {
      return { kind: "duplicate", fileId: existingDuplicate.id, isDuplicate: true };
    }
  }

  const quota = await StorageQuota.findOne({ orgId }).lean();
  if (quota && quota.usedStorageBytes + size > quota.maxStorageBytes) {
    throw new AppError(413, "Organization storage quota exceeded");
  }

  await checkUserQuota(orgId, uploaderId, size);

  const provider = getStorageProvider();
  const storagePath = `${orgId}/${Date.now()}-${uuid()}-${originalName}`;

  const readStream = createReadStream(filePath);
  if (typeof (provider as any).saveStream === "function") {
    await (provider as any).saveStream(readStream, storagePath);
  } else {
    const chunks: Buffer[] = [];
    for await (const chunk of readStream) {
      chunks.push(chunk);
    }
    await provider.save(Buffer.concat(chunks), storagePath);
  }

  const fileId = uuid();
  const fileCategory = category || categorizeMime(mimeType);

  await FileAttachment.create({
    id: fileId, orgId, folderId: folderId || null, taskId: taskId || null, clientId: clientId || null, projectId: projectId || null,
    uploaderId, createdBy: uploaderId, name, originalName,
    mimeType, size, storagePath,
    storageProvider: "local",
    category: fileCategory as any,
    checksum: sha, currentVersion: 1,
    description: description || "", tags: tags || [],
    moduleName: moduleName || null,
    entityId: entityId || null,
  });

  if (clientId && moduleName) {
    try {
      const { autoRouteFileInClientFolder } = await import("./client-folder.service.js");
      await autoRouteFileInClientFolder(fileId, {
        orgId, clientId, moduleName, entityId: entityId || undefined,
        createdBy: uploaderId,
      });
    } catch (err: any) {
      logger.warn({ err: err.message, fileId, clientId, moduleName }, "Auto-routing failed for file");
    }
  }

  await StorageQuota.updateOne(
    { orgId },
    { $inc: { usedStorageBytes: size } },
    { upsert: true },
  );

  await recordAuditLog({
    orgId, userId: uploaderId, createdBy: uploaderId,
    action: "file.uploaded", entityType: "file", entityId: fileId,
    description: `File "${originalName}" uploaded (${(size / 1024).toFixed(1)} KB)`,
  });

  const bgBuffer = Buffer.alloc(0);
  generateThumbnailService(fileId, orgId, bgBuffer, mimeType).catch((err) => {
    logger.warn({ err, fileId }, "Background thumbnail generation skipped (no buffer for streamed file)");
  });

  invalidateFileCaches(orgId);

  return { kind: "created", fileId, isDuplicate: false };
}

export async function generateThumbnail(
  fileId: string,
  orgId: string,
  buffer?: Buffer,
  mimeType?: string,
): Promise<string | null> {
  const results = await generateThumbnailService(fileId, orgId, buffer, mimeType);
  return results.get("medium") || results.get("small") || null;
}

export async function getThumbnailStream(fileId: string): Promise<{ buffer: Buffer; mimeType: string } | null> {
  return getThumbnail(fileId, "medium");
}

function categorizeMime(mimeType: string): string {
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType.startsWith("video/")) return "video";
  if (mimeType.startsWith("audio/")) return "audio";
  if (mimeType.includes("pdf") || mimeType.includes("document") || mimeType.includes("sheet") || mimeType.includes("presentation") || mimeType.includes("excel") || mimeType.includes("powerpoint") || mimeType.includes("word") || mimeType.includes("opendocument")) return "document";
  if (mimeType.includes("zip") || mimeType.includes("rar") || mimeType.includes("tar")) return "archive";
  return "general";
}

export async function softDeleteFile(fileId: string, userId: string): Promise<void> {
  const file = await FileAttachment.findOne({ id: fileId, deletedAt: null }).lean();
  if (!file) throw new AppError(404, "File not found");

  if (file.isLocked && file.lockedBy !== userId) {
    throw new AppError(423, "File is locked by another user");
  }

  await FileAttachment.updateOne(
    { id: fileId },
    { deletedAt: new Date(), deletedBy: userId },
  );

  await recordAuditLog({
    orgId: file.orgId, userId, createdBy: userId,
    action: "file.deleted", entityType: "file", entityId: fileId,
    description: `File "${file.originalName}" moved to trash`,
  });

  invalidateFileCaches(file.orgId);
}

export async function restoreFile(fileId: string, userId: string): Promise<void> {
  const file = await FileAttachment.findOne({ id: fileId }).lean();
  if (!file) throw new AppError(404, "File not found");
  if (!file.deletedAt) throw new AppError(400, "File is not in trash");

  await FileAttachment.updateOne(
    { id: fileId },
    { deletedAt: null, deletedBy: null },
  );

  await recordAuditLog({
    orgId: file.orgId, userId, createdBy: userId,
    action: "file.restored", entityType: "file", entityId: fileId,
    description: `File "${file.originalName}" restored from trash`,
  });

  invalidateFileCaches(file.orgId);
}

export async function permanentDeleteFile(fileId: string, userId: string): Promise<void> {
  const file = await FileAttachment.findOne({ id: fileId }).lean();
  if (!file) throw new AppError(404, "File not found");

  const provider = getStorageProvider();

  try { await provider.delete(file.storagePath); } catch (e: any) {
    logger.warn({ err: e.message, path: file.storagePath }, "Failed to delete from storage");
  }

  const versions = await FileVersion.find({ fileId }).lean();
  for (const v of versions) {
    try { await provider.delete(v.storagePath); } catch { /* skip */ }
  }
  await FileVersion.deleteMany({ fileId });
  await FileShare.deleteMany({ fileId });
  await ShareLink.deleteMany({ fileId });
  await FileAttachment.deleteOne({ id: fileId });

  await StorageQuota.updateOne(
    { orgId: file.orgId },
    { $inc: { usedStorageBytes: -file.size } },
  );

  await deleteThumbnails(fileId);

  await recordAuditLog({
    orgId: file.orgId, userId, createdBy: userId,
    action: "file.permanent_deleted", entityType: "file", entityId: fileId,
    description: `File "${file.originalName}" permanently deleted`,
  });

  invalidateFileCaches(file.orgId);
}

export async function createFileVersion(fileId: string, userId: string, buffer: Buffer, originalName: string, comment?: string): Promise<{ versionId: string; versionNumber: number }> {
  const file = await FileAttachment.findOne({ id: fileId, deletedAt: null }).lean();
  if (!file) throw new AppError(404, "File not found");

  if (file.isLocked && file.lockedBy !== userId) {
    throw new AppError(423, "File is locked by another user");
  }

  const provider = getStorageProvider();
  const versionNumber = (file.currentVersion || 0) + 1;
  const versionStoragePath = `${file.orgId}/versions/${file.id}/v${versionNumber}-${originalName}`;
  await provider.save(buffer, versionStoragePath);

  const versionId = uuid();
  await FileVersion.create({
    id: versionId, orgId: file.orgId, fileId: file.id, versionNumber,
    storagePath: versionStoragePath, size: buffer.length,
    uploadedBy: userId, createdBy: userId, comment: comment || "",
  });

  const checksum = await computeChecksum(buffer);
  await FileAttachment.updateOne(
    { id: file.id },
    { currentVersion: versionNumber, size: buffer.length, checksum },
  );

  await recordAuditLog({
    orgId: file.orgId, userId, createdBy: userId,
    action: "file.version.created", entityType: "file", entityId: file.id,
    description: `Version ${versionNumber} uploaded for "${file.originalName}"`,
  });

  invalidateFileCaches(file.orgId);

  return { versionId, versionNumber };
}

export async function toggleFileLock(fileId: string, userId: string, lock: boolean): Promise<boolean> {
  const file = await FileAttachment.findOne({ id: fileId, deletedAt: null }).lean();
  if (!file) throw new AppError(404, "File not found");

  if (lock && file.isLocked && file.lockedBy !== userId) {
    throw new AppError(423, "File is locked by another user");
  }

  if (!lock && file.lockedBy && file.lockedBy !== userId) {
    throw new AppError(423, "File is locked by another user");
  }

  await FileAttachment.updateOne(
    { id: fileId },
    { isLocked: lock, lockedBy: lock ? userId : null },
  );

  invalidateFileCaches(file.orgId);
  return lock;
}

export async function getFileStream(fileId: string): Promise<{ buffer: Buffer; mimeType: string; originalName: string; size: number } | null> {
  const file = await FileAttachment.findOne({ id: fileId, deletedAt: null }).lean();
  if (!file) return null;

  if (file.approvalStatus === "rejected") return null;
  if (file.approvalStatus === "pending") return null;
  if (file.virusScanStatus === "infected") return null;

  if (file.virusScanStatus === "pending") {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    if (file.createdAt < oneHourAgo) return null;
  }

  await FileAttachment.updateOne({ id: fileId }, { lastAccessedAt: new Date() });
  const provider = getStorageProvider();
  const buffer = await provider.get(file.storagePath);
  if (!buffer) return null;

  return { buffer, mimeType: file.mimeType, originalName: file.originalName, size: file.size };
}

export async function duplicateFile(fileId: string, userId: string): Promise<string> {
  const file = await FileAttachment.findOne({ id: fileId, deletedAt: null }).lean();
  if (!file) throw new AppError(404, "File not found");

  const provider = getStorageProvider();
  const buf = await provider.get(file.storagePath);
  if (!buf) throw new AppError(404, "Source file not found in storage");

  const newId = uuid();
  const storagePath = `${file.orgId}/${Date.now()}-${newId}-${file.originalName}`;
  await provider.save(buf, storagePath);

  await FileAttachment.create({
    id: newId, orgId: file.orgId, folderId: file.folderId,
    uploaderId: userId, createdBy: userId,
    name: `Copy of ${file.name}`, originalName: `Copy of ${file.originalName}`,
    mimeType: file.mimeType, size: file.size, storagePath,
    storageProvider: file.storageProvider, category: file.category,
    description: file.description, tags: file.tags,
    checksum: file.checksum, currentVersion: 1,
  });

  invalidateFileCaches(file.orgId);
  return newId;
}
