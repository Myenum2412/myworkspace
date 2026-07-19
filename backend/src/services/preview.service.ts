import sharp from "sharp";
import path from "path";
import fs from "fs/promises";
import { getStorageProvider } from "../lib/storage/providers.js";
import { logger } from "../lib/logger/index.js";
import { generateThumbnail } from "./thumbnail.service.js";
import { convertTo, getConvertedFile } from "./conversion.service.js";

const PREVIEW_DIR = path.resolve(process.cwd(), "data", "previews");

async function ensureDir(dir: string) {
  try { await fs.mkdir(dir, { recursive: true }); }
  catch (err: any) { if (err.code !== "EEXIST") throw err; }
}

export interface PreviewResult {
  url: string | null;
  mimeType: string;
  type: "image" | "pdf" | "html" | "raw";
}

const IMAGE_PREVIEWABLE = new Set([
  "image/jpeg", "image/png", "image/webp", "image/avif", "image/tiff",
  "image/gif", "image/bmp", "image/svg+xml", "image/heic", "image/heif",
]);

const PREVIEWABLE_DOCUMENT_TYPES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.ms-excel",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/rtf",
]);

const RAW_PREVIEWABLE = new Set([
  "text/plain", "text/csv", "text/markdown", "text/html", "text/css",
  "text/javascript", "text/xml", "application/json", "application/xml",
  "text/x-scss", "text/x-typescript", "text/x-java", "text/x-python",
  "text/x-go", "text/x-rust", "text/x-c", "text/x-cpp", "text/x-csharp",
  "text/x-php", "text/x-yaml", "application/x-yaml",
]);

export async function generatePreview(fileId: string): Promise<PreviewResult> {
  const result: PreviewResult = { url: null, mimeType: "", type: "raw" };

  try {
    const { FileAttachment } = await import("../lib/db/models/FileAttachment.js");
    const file = await FileAttachment.findOne({ id: fileId, deletedAt: null })
      .select("mimeType storagePath orgId originalName size")
      .lean();

    if (!file) return { ...result, type: "raw" };

    const { mimeType, storagePath, orgId } = file;
    result.mimeType = mimeType;

    if (IMAGE_PREVIEWABLE.has(mimeType)) {
      await ensureDir(PREVIEW_DIR);
      const previewPath = path.join(PREVIEW_DIR, `${fileId}-preview.webp`);

      try {
        const existing = await fs.stat(previewPath);
        if (existing.isFile()) {
          const relativePath = `previews/${fileId}-preview.webp`;
          return { url: `/api/files/${fileId}/download?preview=true`, mimeType, type: "image" };
        }
      } catch {}

      const provider = getStorageProvider();
      const buf = await provider.get(storagePath);
      if (buf) {
        await sharp(buf)
          .resize(1920, 1080, { fit: "inside", withoutEnlargement: true })
          .webp({ quality: 80 })
          .toFile(previewPath);
      }
      return { url: `/api/files/${fileId}/download?preview=true`, mimeType, type: "image" };
    }

    if (mimeType === "application/pdf") {
      return { url: `/api/files/${fileId}/download?preview=true`, mimeType, type: "pdf" };
    }

    if (PREVIEWABLE_DOCUMENT_TYPES.has(mimeType)) {
      const convertedKey = await convertTo(fileId, "pdf");
      if (convertedKey) {
        return { url: `/api/conversion/${orgId}/${encodeURIComponent(convertedKey)}`, mimeType: "application/pdf", type: "pdf" };
      }
      return { url: `/api/files/${fileId}/download?preview=true`, mimeType, type: "raw" };
    }

    if (RAW_PREVIEWABLE.has(mimeType) || mimeType.startsWith("text/")) {
      return { url: `/api/files/${fileId}/download?preview=true`, mimeType, type: "raw" };
    }

    return { ...result, url: `/api/files/${fileId}/download?preview=true`, type: "raw" };
  } catch (err) {
    logger.warn({ err, fileId }, "Preview generation failed");
    return { ...result, type: "raw" };
  }
}
