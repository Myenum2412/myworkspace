import path from "path";
import fs from "fs/promises";
import { existsSync, readdirSync, unlinkSync } from "fs";
import { FileAttachment } from "../lib/db/models/FileAttachment.js";
import { FileMetadata } from "../lib/db/models/FileMetadata.js";
import { UploadSession } from "../lib/db/models/UploadSession.js";
import { logger } from "../lib/logger/index.js";
import { metricsRegistry } from "../lib/monitoring/index.js";

const THUMB_DIR = path.resolve(process.cwd(), "data", "thumbnails");
const PREVIEW_DIR = path.resolve(process.cwd(), "data", "previews");
const CONVERSION_DIR = path.resolve(process.cwd(), "data", "conversions");
const TMP_DIR = path.resolve(process.cwd(), "data", "tmp-uploads");

export interface CleanupResult {
  orphanedThumbnails: number;
  orphanedPreviews: number;
  tempConversions: number;
  staleMetadata: number;
  expiredCaches: number;
  staleTempUploads: number;
  staleSessions: number;
}

async function listDir(dir: string): Promise<string[]> {
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    return entries.filter((e) => e.isFile()).map((e) => path.join(dir, e.name));
  } catch {
    return [];
  }
}

export async function cleanupOrphanedThumbnails(): Promise<number> {
  let removed = 0;
  const thumbFiles = await listDir(THUMB_DIR);
  const validIds = new Set<string>();

  for (const thumbPath of thumbFiles) {
    const basename = path.basename(thumbPath);
    const fileId = basename.split("-")[0];
    if (!validIds.has(fileId)) {
      const exists = await FileAttachment.findOne({ id: fileId }).select("_id").lean();
      if (exists) validIds.add(fileId);
    }
    if (!validIds.has(fileId)) {
      try {
        await fs.unlink(thumbPath);
        removed++;
      } catch { /* skip */ }
    }
  }
  logger.info({ removed }, "Orphaned thumbnail cleanup complete");
  metricsRegistry.incrementCounter("cleanup_files_removed", { type: "thumbnail" }, removed);
  return removed;
}

export async function cleanupOrphanedPreviews(): Promise<number> {
  let removed = 0;
  const previewFiles = await listDir(PREVIEW_DIR);
  const validIds = new Set<string>();

  for (const filePath of previewFiles) {
    const basename = path.basename(filePath);
    const fileId = basename.split("-")[0];
    if (!validIds.has(fileId)) {
      const exists = await FileAttachment.findOne({ id: fileId }).select("_id").lean();
      if (exists) validIds.add(fileId);
    }
    if (!validIds.has(fileId)) {
      try { await fs.unlink(filePath); removed++; } catch {}
    }
  }
  return removed;
}

export async function cleanupTempConversions(): Promise<number> {
  let removed = 0;
  const files = await listDir(CONVERSION_DIR);
  for (const f of files) {
    try { await fs.unlink(f); removed++; } catch {}
  }
  try { await fs.rmdir(CONVERSION_DIR).catch(() => {}); } catch {}
  return removed;
}

export async function cleanupStaleMetadata(olderThanDays = 90): Promise<number> {
  const cutoff = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000);
  const result = await FileMetadata.deleteMany({
    extractedAt: { $lt: cutoff },
  });
  return result.deletedCount;
}

export async function cleanupExpiredCache(): Promise<number> {
  const tmpDir = "/tmp";
  let removed = 0;
  try {
    const entries = await fs.readdir(tmpDir);
    const now = Date.now();
    for (const entry of entries) {
      if (entry.startsWith("video-meta-") || entry.startsWith("audio-meta-") || entry.startsWith("virus-scan-")) {
        const fullPath = path.join(tmpDir, entry);
        try {
          const stat = await fs.stat(fullPath);
          if (now - stat.mtimeMs > 3600000) {
            await fs.unlink(fullPath);
            removed++;
          }
        } catch {}
      }
    }
  } catch {}
  return removed;
}

export async function cleanupStaleTempUploads(): Promise<number> {
  let removed = 0;
  try {
    const entries = await fs.readdir(TMP_DIR, { withFileTypes: true });
    const now = Date.now();
    for (const entry of entries) {
      if (entry.isFile()) {
        const fullPath = path.join(TMP_DIR, entry.name);
        try {
          const stat = await fs.stat(fullPath);
          if (now - stat.mtimeMs > 3600000) {
            await fs.unlink(fullPath);
            removed++;
          }
        } catch { /* skip */ }
      }
    }
  } catch { /* dir may not exist */ }
  if (removed > 0) {
    logger.info({ removed }, "Cleaned stale temp uploads");
    metricsRegistry.incrementCounter("cleanup_files_removed", { type: "temp_upload" }, removed);
  }
  return removed;
}

export async function cleanupStaleUploadSessions(): Promise<number> {
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const result = await UploadSession.deleteMany({
    status: { $in: ["pending", "uploading"] },
    createdAt: { $lt: cutoff },
  });
  if (result.deletedCount > 0) {
    logger.info({ removed: result.deletedCount }, "Cleaned stale upload sessions");
  }
  return result.deletedCount || 0;
}

export async function runFullCleanup(): Promise<CleanupResult> {
  const startTime = Date.now();
  logger.info("Starting full cleanup cycle");

  const [orphanedThumbnails, orphanedPreviews, tempConversions, staleMetadata, expiredCaches, staleTempUploads, staleSessions] = await Promise.all([
    cleanupOrphanedThumbnails(),
    cleanupOrphanedPreviews(),
    cleanupTempConversions(),
    cleanupStaleMetadata(),
    cleanupExpiredCache(),
    cleanupStaleTempUploads(),
    cleanupStaleUploadSessions(),
  ]);

  const duration = Date.now() - startTime;
  logger.info({ orphanedThumbnails, orphanedPreviews, tempConversions, staleMetadata, expiredCaches, staleTempUploads, staleSessions, durationMs: duration }, "Cleanup cycle complete");

  metricsRegistry.observeHistogram("cleanup_duration_ms", {}, duration);

  return { orphanedThumbnails, orphanedPreviews, tempConversions, staleMetadata, expiredCaches, staleTempUploads, staleSessions };
}
