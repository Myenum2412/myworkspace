import { v4 as uuid } from "uuid";
import { FileAttachment } from "../db/models/FileAttachment.js";
import { StorageQuota } from "../db/models/StorageQuota.js";
import { ActivityLog } from "../db/models/ActivityLog.js";
import { getStorageProvider, computeChecksum } from "../storage/providers.js";
import { env } from "../../config/env.js";
import { AppError } from "../../middleware/error.js";

export type OrchestratorResult =
  | { kind: "created"; fileId: string; isDuplicate: boolean }
  | { kind: "duplicate"; fileId: string };

export interface FinalizeInput {
  orgId: string;
  clientId?: string | null;
  folderId?: string | null;
  uploaderId: string;
  name: string;
  originalName: string;
  mimeType: string;
  size: number;
  buffer: Buffer;
  checksum?: string;
  skipDuplicates?: boolean;
}

export async function checkOrgQuota(orgId: string, additionalBytes: number): Promise<void> {
  const quota = await StorageQuota.findOne({ orgId }).lean();
  if (quota && quota.usedStorageBytes + additionalBytes > quota.maxStorageBytes) {
    throw new AppError(413, "Organization storage quota exceeded");
  }
}

export async function updateUsedStorage(orgId: string, deltaBytes: number): Promise<void> {
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
  if (mimeType.includes("zip") || mimeType.includes("rar") || mimeType.includes("tar")) return "archive";
  return "general";
}

// Idempotent finalize: dedup via checksum, write to storage, persist FileAttachment,
// update quota, write activity log. Returns created-or-duplicate marker.
export async function finalizeUpload(input: FinalizeInput): Promise<OrchestratorResult> {
  const {
    orgId, clientId, folderId, uploaderId,
    name, originalName, mimeType, size, buffer, checksum, skipDuplicates = true,
  } = input;

  if (!orgId) throw new AppError(400, "orgId is required");
  if (!uploaderId) throw new AppError(400, "uploaderId is required");

  const sha = checksum ?? await computeChecksum(buffer);

  // Duplicate detection — same checksum in same org/folder plane.
  const existingDuplicate = await FileAttachment.findOne({
    orgId, checksum: sha, deletedAt: null,
    $or: [{ folderId: folderId || null }, { folderId: { $exists: false } }],
  }).lean();

  if (existingDuplicate && skipDuplicates) {
    return { kind: "duplicate", fileId: existingDuplicate.id };
  }

  await checkOrgQuota(orgId, size);

  const provider = getStorageProvider();
  const storagePath = `${orgId}/${Date.now()}-${uuid()}-${name}`;
  await provider.save(buffer, storagePath);

  const fileId = uuid();
  await FileAttachment.create({
    id: fileId, orgId, folderId: folderId || null, clientId: clientId || null,
    uploaderId, createdBy: uploaderId, name, originalName,
    mimeType, size, storagePath,
    storageProvider: env.R2_ENDPOINT ? "r2" : "local",
    category: categorizeMime(mimeType), checksum: sha, currentVersion: 1,
  });

  await updateUsedStorage(orgId, size);

  await ActivityLog.create({
    orgId, userId: uploaderId, createdBy: uploaderId, action: "file.uploaded",
    entityType: "file", entityId: fileId,
    description: `File "${originalName}" uploaded (${(size / 1024).toFixed(1)} KB)`,
  });

  return { kind: "created", fileId, isDuplicate: false };
}
