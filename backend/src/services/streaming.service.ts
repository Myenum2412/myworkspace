import type { Response } from "express";
import { createReadStream, statSync } from "fs";
import fs from "fs/promises";
import path from "path";
import { PassThrough, Readable } from "stream";
import { FileAttachment } from "../lib/db/models/FileAttachment.js";
import { logger } from "../lib/logger/index.js";
import { metricsRegistry } from "../lib/monitoring/index.js";
import {
  getStorageProviderFor,
  IStorageProvider,
  readFromStorage,
} from "../lib/storage/providers.js";

const CHUNK_SIZE = 1024 * 1024;

async function getFileRecord(fileId: string) {
  return FileAttachment.findOne({ id: fileId, deletedAt: null })
    .select("mimeType orgId storagePath size originalName storageProvider checksum")
    .lean();
}

function fileProviderType(record: { storageProvider?: string | null }): string | null {
  const p = (record.storageProvider as string | null) || null;
  return p === "local" || p === "r2" ? p : null;
}

async function getLocalPath(
  storagePath: string,
  providerType?: string | null,
): Promise<string | null> {
  // Only proven-local files stream straight from disk. When the record is
  // "local", verify the file actually exists on disk; if it does not (e.g. it
  // was actually stored in R2), return null so the resilient read is used.
  if (providerType === "local") {
    const fp = path.resolve(process.cwd(), "data", "uploads", storagePath);
    try {
      await fs.access(fp);
      return fp;
    } catch {
      return null;
    }
  }
  return null;
}

function rangeStart(range: string, fileSize: number): number {
  const start = parseInt(range.replace(/bytes=/, "").split("-")[0], 10) || 0;
  return Math.min(start, fileSize - 1);
}

function rangeEnd(range: string, fileSize: number): number {
  const raw = parseInt(range.replace(/bytes=/, "").split("-")[1], 10);
  return Number.isFinite(raw) ? Math.min(raw, fileSize - 1) : fileSize - 1;
}

export async function streamFile(
  fileId: string,
  req: { headers: { range?: string; "if-none-match"?: string; "if-modified-since"?: string } },
  res: Response,
): Promise<void> {
  const startTime = Date.now();
  try {
    const file = await getFileRecord(fileId);
    if (!file) {
      res.status(404).json({ error: "File not found" });
      return;
    }

    const etag = `"${file.checksum || fileId}"`;
    const lastModified = new Date().toUTCString();

    if (req.headers["if-none-match"] === etag) {
      res.status(304).end();
      return;
    }

    const fileSize = file.size;
    const range = req.headers.range;
    const mimeType = file.mimeType || "application/octet-stream";
    const fileName = file.originalName || "download";

    // Prefer a direct local-disk stream when the file is definitely local;
    // otherwise read resiliently (recorded provider -> other provider -> global).
    const localPath = await getLocalPath(file.storagePath, fileProviderType(file));

    if (localPath) {
      const readStream = createReadStream(
        localPath,
        range ? { start: rangeStart(range, fileSize), end: rangeEnd(range, fileSize) } : undefined,
      );
      const status = range ? 206 : 200;
      res.status(status);
      res.set({
        ...(range
          ? {
              "Content-Range": `bytes ${rangeStart(range, fileSize)}-${rangeEnd(range, fileSize)}/${fileSize}`,
            }
          : {}),
        "Content-Length": String(
          range ? rangeEnd(range, fileSize) - rangeStart(range, fileSize) + 1 : fileSize,
        ),
        "Content-Type": mimeType,
        "Content-Disposition": `inline; filename="${fileName}"`,
        "Accept-Ranges": "bytes",
        ETag: etag,
        "Last-Modified": lastModified,
        "Cache-Control": "public, max-age=3600",
      });
      readStream.pipe(res);
    } else {
      const provider = getStorageProviderFor(fileProviderType(file));
      const rangeResult = range
        ? await provider.getStreamRange(
            file.storagePath,
            rangeStart(range, fileSize),
            rangeEnd(range, fileSize),
          )
        : null;
      if (rangeResult && range) {
        res.status(206);
        res.set({
          "Content-Range": `bytes ${rangeStart(range, fileSize)}-${rangeEnd(range, fileSize)}/${fileSize}`,
          "Accept-Ranges": "bytes",
          "Content-Length": String(rangeResult.contentLength),
          "Content-Type": mimeType,
          "Content-Disposition": `inline; filename="${fileName}"`,
          ETag: etag,
          "Last-Modified": lastModified,
          "Cache-Control": "public, max-age=3600",
        });
        rangeResult.stream.pipe(res);
        return;
      }

      // No range (or provider range failed) -> resilient buffered read.
      const buffer = await readFromStorage(file.storagePath, fileProviderType(file));
      if (!buffer) {
        res.status(404).json({ error: "File not found in storage" });
        return;
      }
      res.set({
        "Content-Length": String(buffer.length),
        "Content-Type": mimeType,
        "Content-Disposition": `inline; filename="${fileName}"`,
        "Accept-Ranges": "bytes",
        ETag: etag,
        "Last-Modified": lastModified,
        "Cache-Control": "public, max-age=3600",
      });
      res.send(buffer);
    }
    metricsRegistry.observeHistogram("stream_duration_ms", { fileId }, Date.now() - startTime);
  } catch (err) {
    logger.warn({ err, fileId }, "Streaming failed");
    if (!res.headersSent) {
      res.status(500).json({ error: "Streaming failed" });
    }
  }
}

export function handleConditionalRequest(
  req: { headers: { "if-none-match"?: string; "if-modified-since"?: string } },
  res: Response,
  etag: string,
  lastModified: Date,
): boolean {
  if (req.headers["if-none-match"] === etag) {
    res.status(304).end();
    return true;
  }
  if (req.headers["if-modified-since"]) {
    const modSince = new Date(req.headers["if-modified-since"]);
    if (lastModified <= modSince) {
      res.status(304).end();
      return true;
    }
  }
  return false;
}

export async function getFileInfo(fileId: string): Promise<{
  size: number;
  mimeType: string;
  originalName: string;
  etag: string;
  lastModified: Date;
} | null> {
  const file = await getFileRecord(fileId);
  if (!file) return null;
  return {
    size: file.size,
    mimeType: file.mimeType,
    originalName: file.originalName,
    etag: `"${file.checksum || fileId}"`,
    lastModified: new Date(),
  };
}
