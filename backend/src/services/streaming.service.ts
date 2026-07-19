import { Response } from "express";
import { createReadStream, statSync } from "fs";
import path from "path";
import fs from "fs/promises";
import { FileAttachment } from "../lib/db/models/FileAttachment.js";
import { getStorageProvider, isLocalProvider } from "../lib/storage/providers.js";
import { logger } from "../lib/logger/index.js";

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
  req: { headers: { range?: string } },
  res: Response,
): Promise<void> {
  try {
    const file = await getFileRecord(fileId);
    if (!file) {
      res.status(404).json({ error: "File not found" });
      return;
    }

    const localPath = await getLocalPath(file.storagePath);

    if (localPath) {
      try {
        await fs.access(localPath);
        return streamLocalFile(localPath, file.mimeType, file.originalName, req, res);
      } catch {
        // fall through to provider-based streaming
      }
    }

    const provider = getStorageProvider();
    const buffer = await provider.get(file.storagePath);
    if (!buffer) {
      res.status(404).json({ error: "File not found in storage" });
      return;
    }

    const fileSize = buffer.length;
    const range = req.headers.range;

    if (range) {
      const parts = range.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunkSize = end - start + 1;

      const etag = `"${file.checksum || fileId}"`;
      res.status(206);
      res.set({
        "Content-Range": `bytes ${start}-${end}/${fileSize}`,
        "Accept-Ranges": "bytes",
        "Content-Length": String(chunkSize),
        "Content-Type": file.mimeType,
        "Content-Disposition": `inline; filename="${file.originalName}"`,
        "ETag": etag,
        "Last-Modified": new Date().toUTCString(),
        "Cache-Control": "public, max-age=3600",
      });
      res.end(buffer.subarray(start, end + 1));
    } else {
      const etag = `"${file.checksum || fileId}"`;
      res.set({
        "Content-Length": String(fileSize),
        "Content-Type": file.mimeType,
        "Content-Disposition": `inline; filename="${file.originalName}"`,
        "Accept-Ranges": "bytes",
        "ETag": etag,
        "Last-Modified": new Date().toUTCString(),
        "Cache-Control": "public, max-age=3600",
      });
      res.end(buffer);
    }
  } catch (err) {
    logger.warn({ err, fileId }, "Streaming failed");
    if (!res.headersSent) {
      res.status(500).json({ error: "Streaming failed" });
    }
  }
}

function streamLocalFile(
  filePath: string,
  mimeType: string,
  originalName: string,
  req: { headers: { range?: string } },
  res: Response,
): void {
  try {
    const stat = statSync(filePath);
    const fileSize = stat.size;
    const range = req.headers.range;

    if (range) {
      const parts = range.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunkSize = end - start + 1;

      const readStream = createReadStream(filePath, { start, end });
      res.status(206);
      res.set({
        "Content-Range": `bytes ${start}-${end}/${fileSize}`,
        "Accept-Ranges": "bytes",
        "Content-Length": String(chunkSize),
        "Content-Type": mimeType,
        "Content-Disposition": `inline; filename="${originalName}"`,
        "Cache-Control": "public, max-age=3600",
      });
      readStream.pipe(res);
    } else {
      const readStream = createReadStream(filePath);
      res.set({
        "Content-Length": String(fileSize),
        "Content-Type": mimeType,
        "Content-Disposition": `inline; filename="${originalName}"`,
        "Accept-Ranges": "bytes",
        "Cache-Control": "public, max-age=3600",
      });
      readStream.pipe(res);
    }
  } catch (err) {
    logger.warn({ err, filePath }, "Local file streaming failed");
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
  const ifNoneMatch = req.headers["if-none-match"];
  const ifModifiedSince = req.headers["if-modified-since"];

  if (ifNoneMatch === etag) {
    res.status(304).end();
    return true;
  }

  if (ifModifiedSince) {
    const modSince = new Date(ifModifiedSince);
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
