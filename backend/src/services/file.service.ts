import { v4 as uuid } from "uuid";
import { FileAttachment } from "../lib/db/models/FileAttachment.js";
import { FileVersion } from "../lib/db/models/FileVersion.js";
import { FileShare } from "../lib/db/models/FileShare.js";
import { ShareLink } from "../lib/db/models/ShareLink.js";
import { StorageQuota } from "../lib/db/models/StorageQuota.js";
import { getStorageProvider, computeChecksum } from "../lib/storage/providers.js";
import { env } from "../config/env.js";
import { AppError } from "../middleware/error.js";
import { socketIOManager } from "../lib/socketio/index.js";
import { recordAuditLog } from "./audit.service.js";
import { cacheManager, CacheKeys } from "../lib/cache.js";
import { validateFileMagicBytes, validateFileExtension } from "./validation.service.js";
import { logger } from "../lib/logger/index.js";

export interface FileUploadInput {
  orgId: string;
  folderId?: string | null;
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
    orgId, clientId, folderId, projectId, uploaderId,
    name, originalName, mimeType, size, buffer, checksum,
    description, tags, skipDuplicates = true, category,
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

  const provider = getStorageProvider();
  const storagePath = `${orgId}/${Date.now()}-${uuid()}-${originalName}`;
  await provider.save(buffer, storagePath);

  const fileId = uuid();
  const fileCategory = category || categorizeMime(actualMimeType);

  await FileAttachment.create({
    id: fileId, orgId, folderId: folderId || null, clientId: clientId || null, projectId: projectId || null,
    uploaderId, createdBy: uploaderId, name, originalName,
    mimeType: actualMimeType, size, storagePath,
    storageProvider: env.S3_ENDPOINT ? "s3" : "local",
    category: fileCategory as any,
    checksum: sha, currentVersion: 1,
    description: description || "", tags: tags || [],
  });

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

  socketIOManager.emitToOrg(orgId, "file:uploaded", {
    fileId, orgId, folderId: folderId || null, clientId: clientId || null,
  });

  invalidateFileCaches(orgId);

  return { kind: "created", fileId, isDuplicate: false };
}

function categorizeMime(mimeType: string): string {
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType.startsWith("video/")) return "video";
  if (mimeType.startsWith("audio/")) return "audio";
  if (mimeType.includes("pdf") || mimeType.includes("document") || mimeType.includes("sheet") || mimeType.includes("presentation")) return "document";
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

  socketIOManager.emitToOrg(file.orgId, "file:deleted", { fileId, action: "soft_delete" });
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

  socketIOManager.emitToOrg(file.orgId, "file:updated", { fileId, action: "restored" });
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

  await recordAuditLog({
    orgId: file.orgId, userId, createdBy: userId,
    action: "file.permanent_deleted", entityType: "file", entityId: fileId,
    description: `File "${file.originalName}" permanently deleted`,
  });

  socketIOManager.emitToOrg(file.orgId, "file:deleted", { fileId, action: "permanent_delete" });
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

  socketIOManager.emitToOrg(file.orgId, "file:updated", {
    fileId: file.id, action: "version_uploaded", versionNumber,
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

  socketIOManager.emitToOrg(file.orgId, "file:updated", {
    fileId, action: lock ? "locked" : "unlocked", lockedBy: lock ? userId : undefined,
  });

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

  socketIOManager.emitToOrg(file.orgId, "file:uploaded", {
    fileId: newId, orgId: file.orgId, folderId: file.folderId,
  });

  invalidateFileCaches(file.orgId);
  return newId;
}
