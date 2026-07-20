import { Response } from "express";
import { createReadStream, statSync } from "fs";
import path from "path";
import fs from "fs/promises";
import { Readable, PassThrough } from "stream";
import { FileAttachment } from "../lib/db/models/FileAttachment.js";
import { getStorageProvider, isLocalProvider, IStorageProvider } from "../lib/storage/providers.js";
import { logger } from "../lib/logger/index.js";
import { metricsRegistry } from "../lib/monitoring/index.js";

const CHUNK_SIZE = 1024 * 1024;

async function getFileRecord(fileId: string) {
  return FileAttachment.findOne({ id: fileId, deletedAt: null })
    .select("mimeType orgId storagePath size originalName storageProvider checksum")
    .lean();
}

async function getLocalPath(storagePath: string): Promise<string | null> {
  const provider = getStorageProvider();
  if (isLocalProvider()) {
    const local = provider as any;
    if (typeof local.fullPath === "function") {
      return local.fullPath(storagePath);
    }
    return path.resolve(process.cwd(), "data", "uploads", storagePath);
  }
  return null;
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

    const localPath = await getLocalPath(file.storagePath);
    const provider = getStorageProvider();
    const fileSize = file.size;
    const range = req.headers.range;
    const mimeType = file.mimeType || "application/octet-stream";
    const fileName = file.originalName || "download";

    if (range) {
      const parts = range.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

      if (start >= fileSize || end >= fileSize) {
        res.status(416).set({
          "Content-Range": `bytes */${fileSize}`,
        }).end();
        return;
      }

      if (localPath) {
        const readStream = createReadStream(localPath, { start, end });
        const chunkSize = end - start + 1;
        res.status(206);
        res.set({
          "Content-Range": `bytes ${start}-${end}/${fileSize}`,
          "Accept-Ranges": "bytes",
          "Content-Length": String(chunkSize),
          "Content-Type": mimeType,
          "Content-Disposition": `inline; filename="${fileName}"`,
          ETag: etag,
          "Last-Modified": lastModified,
          "Cache-Control": "public, max-age=3600",
        });
        readStream.pipe(res);
      } else {
        const rangeResult = await provider.getStreamRange(file.storagePath, start, end);
        if (!rangeResult) {
          res.status(404).json({ error: "File not found in storage" });
          return;
        }
        const { stream, contentLength } = rangeResult;
        res.status(206);
        res.set({
          "Content-Range": `bytes ${start}-${end}/${fileSize}`,
          "Accept-Ranges": "bytes",
          "Content-Length": String(contentLength),
          "Content-Type": mimeType,
          "Content-Disposition": `inline; filename="${fileName}"`,
          ETag: etag,
          "Last-Modified": lastModified,
          "Cache-Control": "public, max-age=3600",
        });
        stream.pipe(res);
      }
    } else {
      if (localPath) {
        const readStream = createReadStream(localPath);
        res.set({
          "Content-Length": String(fileSize),
          "Content-Type": mimeType,
          "Content-Disposition": `inline; filename="${fileName}"`,
          "Accept-Ranges": "bytes",
          ETag: etag,
          "Last-Modified": lastModified,
          "Cache-Control": "public, max-age=3600",
        });
        readStream.pipe(res);
      } else {
        const stream = await provider.getStream(file.storagePath);
        if (!stream) {
          res.status(404).json({ error: "File not found in storage" });
          return;
        }
        res.set({
          "Content-Length": String(fileSize),
          "Content-Type": mimeType,
          "Content-Disposition": `inline; filename="${fileName}"`,
          "Accept-Ranges": "bytes",
          ETag: etag,
          "Last-Modified": lastModified,
          "Cache-Control": "public, max-age=3600",
        });
        stream.pipe(res);
      }
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
