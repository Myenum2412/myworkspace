import { v4 as uuid } from "uuid";
import { FileAttachment } from "../db/models/FileAttachment.js";
import { FileVersion } from "../db/models/FileVersion.js";
import { StorageQuota } from "../db/models/StorageQuota.js";
import { ActivityLog } from "../db/models/ActivityLog.js";
import { getStorageProvider, computeChecksum } from "../storage/providers.js";
import { env } from "../../config/env.js";
import { AppError } from "../../middleware/error.js";
import { eventProducer } from "../queue/producer.js";
import { socketIOManager } from "../socketio/index.js";
import { domainEvents } from "../events/index.js";
import { uploadLogger, storageLogger } from "../logger/index.js";
import { metricsRegistry, trackStorageLatency } from "../monitoring/index.js";

export type OrchestratorResult =
  | { kind: "created"; fileId: string; isDuplicate: boolean; storagePath: string; category: string }
  | { kind: "duplicate"; fileId: string; storagePath?: string };

export interface FinalizeInput {
  orgId: string;
  workspaceId?: string | null;
  projectId?: string | null;
  clientId?: string | null;
  staffId?: string | null;
  departmentId?: string | null;
  folderId?: string | null;
  uploaderId: string;
  name: string;
  originalName: string;
  mimeType: string;
  size: number;
  buffer: Buffer;
  checksum?: string;
  skipDuplicates?: boolean;
  uploadId?: string;
  tags?: string[];
  description?: string;
}

async function checkOrgQuota(orgId: string, additionalBytes: number): Promise<void> {
  const quota = await StorageQuota.findOne({ orgId }).lean();
  if (quota && quota.usedStorageBytes + additionalBytes > quota.maxStorageBytes) {
    throw new AppError(413, "Organization storage quota exceeded");
  }
}

async function updateUsedStorage(orgId: string, deltaBytes: number): Promise<void> {
  await StorageQuota.updateOne(
    { orgId },
    { $inc: { usedStorageBytes: deltaBytes } },
    { upsert: true },
  );
}

export function categorizeMime(mimeType: string): "image" | "video" | "audio" | "document" | "archive" | "general" {
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType.startsWith("video/")) return "video";
  if (mimeType.startsWith("audio/")) return "audio";
  if (mimeType.includes("pdf") || mimeType.includes("document") || mimeType.includes("msword") || mimeType.includes("sheet") || mimeType.includes("presentation") || mimeType.includes("opendocument")) return "document";
  if (mimeType.includes("zip") || mimeType.includes("rar") || mimeType.includes("tar") || mimeType.includes("gzip") || mimeType.includes("7z")) return "archive";
  return "general";
}

export async function finalizeUpload(input: FinalizeInput): Promise<OrchestratorResult> {
  const {
    orgId, workspaceId, projectId, clientId, staffId, departmentId,
    folderId, uploaderId, name, originalName, mimeType, size, buffer,
    checksum, skipDuplicates = true, uploadId, tags, description,
  } = input;

  if (!orgId) throw new AppError(400, "orgId is required");
  if (!uploaderId) throw new AppError(400, "uploaderId is required");

  const sha = checksum ?? await computeChecksum(buffer);

  const existingDuplicate = await FileAttachment.findOne({
    orgId, checksum: sha, deletedAt: null,
    $or: [
      { folderId: folderId || null },
      { folderId: { $exists: false } },
    ],
  }).lean();

  if (existingDuplicate && skipDuplicates) {
    uploadLogger.info({ checksum: sha, existingFileId: existingDuplicate.id }, "Duplicate upload detected");
    return { kind: "duplicate", fileId: existingDuplicate.id, storagePath: existingDuplicate.storagePath };
  }

  await checkOrgQuota(orgId, size);

  const provider = getStorageProvider();
  const storagePath = `${orgId}/${Date.now()}-${uuid()}-${name}`;

  const saveStart = Date.now();
  await provider.save(buffer, storagePath);
  trackStorageLatency("save", Date.now() - saveStart);

  storageLogger.info({ storagePath, size }, "File saved to storage");

  const fileId = uuid();
  const category = categorizeMime(mimeType);

  const fileDoc = await FileAttachment.create({
    id: fileId,
    orgId,
    workspaceId: workspaceId || null,
    projectId: projectId || null,
    clientId: clientId || null,
    staffId: staffId || null,
    departmentId: departmentId || null,
    folderId: folderId || null,
    uploaderId,
    createdBy: uploaderId,
    name,
    originalName,
    mimeType,
    size,
    storagePath,
    storageProvider: env.R2_ENDPOINT ? "r2" : "local",
    category,
    checksum: sha,
    currentVersion: 1,
    tags: tags || [],
    description: description || "",
  });

  await FileVersion.create({
    fileId,
    orgId,
    versionNumber: 1,
    storagePath,
    size,
    checksum: sha,
    uploadedBy: uploaderId,
    mimeType,
    originalName,
  });

  await updateUsedStorage(orgId, size);

  await eventProducer.auditLogRecord({
    orgId,
    userId: uploaderId,
    action: "file.uploaded",
    entityType: "file",
    entityId: fileId,
    description: `File "${originalName}" uploaded (${(size / 1024 / 1024).toFixed(2)} MB)`,
  });

  domainEvents.emit("file:metadata-saved", {
    fileId,
    orgId,
    uploadId: uploadId || "",
  });

  socketIOManager.emitToOrg(orgId, "file:metadata-saved", {
    fileId,
    orgId,
    folderId,
    projectId,
    name,
    originalName,
    mimeType,
    size,
    category,
    checksum: sha,
    uploadedBy: uploaderId,
  });

  if (category === "image" && size < 50 * 1024 * 1024) {
    await eventProducer.thumbnailGenerated({
      fileId,
      orgId,
      thumbnailPath: `thumbnails/${fileId}`,
    });
  }

  return {
    kind: "created",
    fileId,
    isDuplicate: false,
    storagePath,
    category,
  };
}

export async function deleteFile(fileId: string, userId: string, permanent = false): Promise<void> {
  const file = await FileAttachment.findOne({ id: fileId });
  if (!file) throw new AppError(404, "File not found");

  if (permanent) {
    const provider = getStorageProvider();
    await provider.delete(file.storagePath);
    await FileAttachment.deleteOne({ id: fileId });
    await FileVersion.deleteMany({ fileId });
    await updateUsedStorage(file.orgId, -file.size);

    await eventProducer.auditLogRecord({
      orgId: file.orgId,
      userId,
      action: "file.permanently-deleted",
      entityType: "file",
      entityId: fileId,
      description: `File "${file.originalName}" permanently deleted`,
    });

    eventProducer.fileDeleted({
      fileId,
      orgId: file.orgId,
      userId,
      storagePath: file.storagePath,
    });

    socketIOManager.emitToOrg(file.orgId, "file:permanently-deleted", { fileId, orgId: file.orgId });
  } else {
    await FileAttachment.updateOne(
      { id: fileId },
      { deletedAt: new Date(), deletedBy: userId },
    );

    await eventProducer.auditLogRecord({
      orgId: file.orgId,
      userId,
      action: "file.deleted",
      entityType: "file",
      entityId: fileId,
      description: `File "${file.originalName}" moved to trash`,
    });

    domainEvents.emit("file:deleted", { fileId, orgId: file.orgId, userId });
    socketIOManager.emitToOrg(file.orgId, "file:deleted", { fileId, orgId: file.orgId, userId });
  }
}

export async function restoreFile(fileId: string, userId: string): Promise<void> {
  const file = await FileAttachment.findOne({ id: fileId, deletedAt: { $ne: null } });
  if (!file) throw new AppError(404, "File not found in trash");

  await FileAttachment.updateOne(
    { id: fileId },
    { deletedAt: null, deletedBy: null, updatedBy: userId },
  );

  await eventProducer.auditLogRecord({
    orgId: file.orgId,
    userId,
    action: "file.restored",
    entityType: "file",
    entityId: fileId,
    description: `File "${file.originalName}" restored from trash`,
  });

  domainEvents.emit("file:restored", { fileId, orgId: file.orgId, userId });
  socketIOManager.emitToOrg(file.orgId, "file:restored", { fileId, orgId: file.orgId, userId });
}

export async function createFileVersion(
  fileId: string,
  buffer: Buffer,
  userId: string,
  originalName?: string,
): Promise<number> {
  const file = await FileAttachment.findOne({ id: fileId });
  if (!file) throw new AppError(404, "File not found");

  const sha = await computeChecksum(buffer);
  const provider = getStorageProvider();
  const newVersion = (file.currentVersion || 1) + 1;
  const storagePath = `${file.orgId}/${Date.now()}-${uuid()}-${originalName || file.name}`;

  await provider.save(buffer, storagePath);

  await FileVersion.create({
    fileId,
    orgId: file.orgId,
    versionNumber: newVersion,
    storagePath,
    size: buffer.length,
    checksum: sha,
    uploadedBy: userId,
    mimeType: file.mimeType,
    originalName: originalName || file.originalName,
  });

  await FileAttachment.updateOne(
    { id: fileId },
    {
      currentVersion: newVersion,
      storagePath,
      size: buffer.length,
      checksum: sha,
      updatedBy: userId,
    },
  );

  await updateUsedStorage(file.orgId, buffer.length);

  socketIOManager.emitToOrg(file.orgId, "file:version-created", {
    fileId,
    versionNumber: newVersion,
    size: buffer.length,
    uploadedBy: userId,
  });

  return newVersion;
}
