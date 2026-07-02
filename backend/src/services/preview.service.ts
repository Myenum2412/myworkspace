import sharp from "sharp";
import path from "path";
import fs from "fs/promises";
import { getStorageProvider } from "../lib/storage/providers.js";
import { logger } from "../lib/logger/index.js";

const PREVIEW_DIR = path.resolve(process.cwd(), "data", "previews");

async function ensureDir(dir: string) {
  try {
    await fs.mkdir(dir, { recursive: true });
  } catch (err: any) {
    if (err.code !== "EEXIST") throw err;
  }
}

export interface PreviewResult {
  thumbnailPath: string | null;
  previewPath: string | null;
  mimeType: string;
}

const PREVIEWABLE_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/avif", "image/tiff"];
const PREVIEWABLE_DOCUMENT_TYPES = ["application/pdf"];

export async function generatePreview(
  storagePath: string,
  mimeType: string,
  fileId: string,
  buffer?: Buffer,
  ): Promise<PreviewResult> {
  const result: PreviewResult = { thumbnailPath: null, previewPath: null, mimeType };

  try {
    if (PREVIEWABLE_IMAGE_TYPES.includes(mimeType)) {
      await ensureDir(PREVIEW_DIR);

      const thumbPath = path.join(PREVIEW_DIR, `${fileId}-thumb.webp`);
      const previewPath = path.join(PREVIEW_DIR, `${fileId}-preview.webp`);

      if (!buffer) {
        const provider = getStorageProvider();
        const buf = await provider.get(storagePath);
        if (!buf) return result;
        buffer = buf;
      }

      await sharp(buffer)
        .resize(256, 256, { fit: "cover", position: "centre" })
        .webp({ quality: 70 })
        .toFile(thumbPath);
      result.thumbnailPath = thumbPath;

      await sharp(buffer)
        .resize(1920, 1080, { fit: "inside", withoutEnlargement: true })
        .webp({ quality: 80 })
        .toFile(previewPath);
      result.previewPath = previewPath;
    } else if (mimeType === "application/pdf") {
      // PDF preview - store original path as preview (frontend can use PDF.js)
      result.previewPath = storagePath;
    }

    return result;
  } catch (err) {
    logger.error({ err, fileId, mimeType }, "Preview generation failed");
    return result;
  }
}
