import sharp from "sharp";
import path from "path";
import fs from "fs/promises";
import { FileAttachment } from "../lib/db/models/FileAttachment.js";
import { FileMetadata } from "../lib/db/models/FileMetadata.js";
import { getStorageProvider } from "../lib/storage/providers.js";
import { cacheManager } from "../lib/cache.js";
import { logger } from "../lib/logger/index.js";
import { metricsRegistry } from "../lib/monitoring/index.js";
import { execSync } from "child_process";
import { env } from "../config/env.js";

const THUMB_DIR = path.resolve(process.cwd(), "data", "thumbnails");
const THUMB_SIZES = {
  small: { width: 150, height: 150, suffix: "small.webp" },
  medium: { width: 300, height: 300, suffix: "medium.webp" },
  large: { width: 600, height: 600, suffix: "large.webp" },
} as const;

export type ThumbnailSize = keyof typeof THUMB_SIZES;

function getThumbPath(fileId: string, size: ThumbnailSize): string {
  return path.join(THUMB_DIR, `${fileId}-${THUMB_SIZES[size].suffix}`);
}

export function getRelativeThumbPath(fileId: string, size: ThumbnailSize): string {
  return `thumbnails/${fileId}-${THUMB_SIZES[size].suffix}`;
}

async function ensureDir(dir: string) {
  try { await fs.mkdir(dir, { recursive: true }); }
  catch (err: any) { if (err.code !== "EEXIST") throw err; }
}

async function getFileBuffer(fileId: string, storagePath: string, providedBuffer?: Buffer): Promise<Buffer | null> {
  if (providedBuffer) return providedBuffer;
  const provider = getStorageProvider();
  return provider.get(storagePath);
}

function hasFfmpeg(): boolean {
  try { execSync("which ffmpeg", { stdio: "ignore" }); return true; }
  catch { return false; }
}

export async function generateThumbnail(
  fileId: string,
  orgId: string,
  providedBuffer?: Buffer,
  mimeType?: string,
): Promise<Map<ThumbnailSize, string>> {
  const startTime = Date.now();
  const generated = new Map<ThumbnailSize, string>();

  try {
    const file = await FileAttachment.findOne({ id: fileId }).lean();
    if (!file) return generated;

    const mt = mimeType || file.mimeType;
    await ensureDir(THUMB_DIR);

    if (mt.startsWith("video/") && hasFfmpeg()) {
      const tmpPath = path.join(THUMB_DIR, `${fileId}-frame.jpg`);
      try {
        const buffer = await getFileBuffer(fileId, file.storagePath, providedBuffer);
        if (!buffer) return generated;
        const tmpInput = path.join(THUMB_DIR, `${fileId}-input`);
        await fs.writeFile(tmpInput, buffer);

        const durationSec = await getVideoDuration(tmpInput);
        const seekSec = Math.min(Math.floor(durationSec * 0.3), 30);

        execSync(
          `ffmpeg -ss ${seekSec} -i "${tmpInput}" -vframes 1 -q:v 3 "${tmpPath}" -y`,
          { stdio: "ignore", timeout: 30000 },
        );

        const frameBuffer = await fs.readFile(tmpPath).catch(() => null);
        if (frameBuffer) {
          for (const [size, cfg] of Object.entries(THUMB_SIZES)) {
            const outPath = getThumbPath(fileId, size as ThumbnailSize);
            await sharp(frameBuffer)
              .resize(cfg.width, cfg.height, { fit: "cover", position: "centre" })
              .webp({ quality: 75 })
              .toFile(outPath);
            generated.set(size as ThumbnailSize, getRelativeThumbPath(fileId, size as ThumbnailSize));
          }
        }
        await fs.unlink(tmpInput).catch(() => {});
      } finally {
        await fs.unlink(tmpPath).catch(() => {});
      }
    } else if (mt.startsWith("image/")) {
      const buffer = await getFileBuffer(fileId, file.storagePath, providedBuffer);
      if (!buffer) return generated;

      const img = sharp(buffer);
      const meta = await img.metadata();

      if (meta.width && meta.height) {
        await FileMetadata.updateOne(
          { fileId },
          {
            $set: {
              fileId, orgId,
              width: meta.width,
              height: meta.height,
              dpi: (meta as any).dpi || null,
              colorProfile: meta.icc ? "ICC" : meta.space || null,
              encoding: meta.format || null,
              extractedAt: new Date(),
            },
          },
          { upsert: true },
        );
      }

      for (const [size, cfg] of Object.entries(THUMB_SIZES)) {
        const outPath = getThumbPath(fileId, size as ThumbnailSize);
        await sharp(buffer)
          .resize(cfg.width, cfg.height, { fit: "cover", position: "centre" })
          .webp({ quality: size === "small" ? 60 : size === "medium" ? 75 : 85 })
          .toFile(outPath);
        generated.set(size as ThumbnailSize, getRelativeThumbPath(fileId, size as ThumbnailSize));
      }
    } else if (mt === "application/pdf") {
      await generatePdfThumbnail(fileId, file.storagePath, generated);
    } else if (mt.startsWith("audio/") && hasFfmpeg()) {
      const buffer = await getFileBuffer(fileId, file.storagePath, providedBuffer);
      if (!buffer) return generated;
      const tmpInput = path.join(THUMB_DIR, `${fileId}-audio-input`);
      await fs.writeFile(tmpInput, buffer);
      const tmpArt = path.join(THUMB_DIR, `${fileId}-album-art.jpg`);
      try {
        execSync(
          `ffmpeg -i "${tmpInput}" -an -vcodec copy "${tmpArt}" -y`,
          { stdio: "ignore", timeout: 15000 },
        );
        const artBuffer = await fs.readFile(tmpArt).catch(() => null);
        if (artBuffer && artBuffer.length > 100) {
          for (const [size, cfg] of Object.entries(THUMB_SIZES)) {
            const outPath = getThumbPath(fileId, size as ThumbnailSize);
            await sharp(artBuffer)
              .resize(cfg.width, cfg.height, { fit: "cover", position: "centre" })
              .webp({ quality: 70 })
              .toFile(outPath);
            generated.set(size as ThumbnailSize, getRelativeThumbPath(fileId, size as ThumbnailSize));
          }
        }
      } finally {
        await fs.unlink(tmpInput).catch(() => {});
        await fs.unlink(tmpArt).catch(() => {});
      }
    }

    if (generated.size > 0) {
      const primaryPath = generated.get("medium") || generated.get("small") || generated.values().next().value;
      if (primaryPath) {
        await FileAttachment.updateOne({ id: fileId }, { thumbnailPath: primaryPath });
      }
    }

    metricsRegistry.observeHistogram("thumbnail_generation_ms", { type: mt.split("/")[0] || "unknown" }, Date.now() - startTime);
    return generated;
  } catch (err) {
    metricsRegistry.incrementCounter("thumbnail_generation_failures", { mimeType: mimeType || "unknown" });
    logger.warn({ err, fileId }, "Thumbnail generation failed");
    return generated;
  }
}

async function generatePdfThumbnail(
  fileId: string,
  storagePath: string,
  generated: Map<ThumbnailSize, string>,
): Promise<void> {
  const hasPdftoppm = (() => { try { execSync("which pdftoppm", { stdio: "ignore" }); return true; } catch { return false; } })();
  const hasGhostscript = (() => { try { execSync("which gs", { stdio: "ignore" }); return true; } catch { return false; } })();

  if (!hasPdftoppm && !hasGhostscript) return;

  try {
    const provider = getStorageProvider();
    const buffer = await provider.get(storagePath);
    if (!buffer) return;

    const tmpPdf = path.join(THUMB_DIR, `${fileId}.pdf`);
    const tmpPng = path.join(THUMB_DIR, `${fileId}-pdf-preview.png`);
    await fs.writeFile(tmpPdf, buffer);

    try {
      if (hasPdftoppm) {
        execSync(`pdftoppm -png -singlefile -r 72 "${tmpPdf}" "${path.join(THUMB_DIR, `${fileId}-pdf-preview`)}"`, { stdio: "ignore", timeout: 30000 });
      } else {
        execSync(`gs -dNOPAUSE -dBATCH -sDEVICE=png16m -r72 -dFirstPage=1 -dLastPage=1 -sOutputFile="${tmpPng}" "${tmpPdf}"`, { stdio: "ignore", timeout: 30000 });
      }

      const pngBuffer = await fs.readFile(tmpPng).catch(() => null);
      if (pngBuffer) {
        for (const [size, cfg] of Object.entries(THUMB_SIZES)) {
          const outPath = getThumbPath(fileId, size as ThumbnailSize);
          await sharp(pngBuffer)
            .resize(cfg.width, cfg.height, { fit: "cover", position: "centre" })
            .webp({ quality: 70 })
            .toFile(outPath);
          generated.set(size as ThumbnailSize, getRelativeThumbPath(fileId, size as ThumbnailSize));
        }
      }
    } finally {
      await fs.unlink(tmpPdf).catch(() => {});
      await fs.unlink(tmpPng).catch(() => {});
    }
  } catch (err) {
    logger.warn({ err, fileId }, "PDF thumbnail generation failed");
  }
}

async function getVideoDuration(filePath: string): Promise<number> {
  try {
    const output = execSync(
      `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${filePath}"`,
      { stdio: "pipe", timeout: 10000 },
    );
    return parseFloat(output.toString().trim()) || 0;
  } catch {
    return 0;
  }
}

export async function getThumbnail(
  fileId: string,
  size: ThumbnailSize = "medium",
): Promise<{ buffer: Buffer; mimeType: string } | null> {
  const file = await FileAttachment.findOne({ id: fileId }).select("thumbnailPath mimeType orgId storagePath").lean();
  if (!file) return null;

  const specificPath = getThumbPath(fileId, size);
  try {
    const buf = await fs.readFile(specificPath);
    return { buffer: buf, mimeType: "image/webp" };
  } catch {}

  if (file.thumbnailPath) {
    const cachedPath = file.thumbnailPath.startsWith("thumbnails/")
      ? path.resolve(process.cwd(), "data", file.thumbnailPath)
      : file.thumbnailPath;
    try {
      const buf = await fs.readFile(cachedPath);
      const sizeCfg = THUMB_SIZES[size];
      const resized = await sharp(buf)
        .resize(sizeCfg.width, sizeCfg.height, { fit: "cover", position: "centre" })
        .webp({ quality: size === "small" ? 60 : size === "medium" ? 75 : 85 })
        .toBuffer();
      await ensureDir(THUMB_DIR);
      await fs.writeFile(specificPath, resized);
      return { buffer: resized, mimeType: "image/webp" };
    } catch {}
  }

  const mt = file.mimeType;
  if (mt.startsWith("image/")) {
    const provider = getStorageProvider();
    const buf = await provider.get(file.storagePath);
    if (!buf) return null;
    const sizeCfg = THUMB_SIZES[size];
    const resized = await sharp(buf)
      .resize(sizeCfg.width, sizeCfg.height, { fit: "cover", position: "centre" })
      .webp({ quality: size === "small" ? 60 : size === "medium" ? 75 : 85 })
      .toBuffer();
    await ensureDir(THUMB_DIR);
    await fs.writeFile(specificPath, resized);
    const relPath = getRelativeThumbPath(fileId, size);
    await FileAttachment.updateOne({ id: fileId }, { thumbnailPath: relPath });
    return { buffer: resized, mimeType: "image/webp" };
  }

  if (mt.startsWith("video/") || mt.startsWith("audio/") || mt === "application/pdf") {
    const generated = await generateThumbnail(fileId, file.orgId);
    const thumbPath = generated.get(size);
    if (thumbPath) {
      const fullPath = thumbPath.startsWith("thumbnails/") ? path.resolve(process.cwd(), "data", thumbPath) : thumbPath;
      const buf = await fs.readFile(fullPath).catch(() => null);
      if (buf) return { buffer: buf, mimeType: "image/webp" };
    }
  }

  return null;
}

export async function deleteThumbnails(fileId: string): Promise<void> {
  for (const size of Object.keys(THUMB_SIZES) as ThumbnailSize[]) {
    try { await fs.unlink(getThumbPath(fileId, size)); } catch {}
  }
}

export async function hasThumbnail(fileId: string, size: ThumbnailSize = "medium"): Promise<boolean> {
  try { await fs.access(getThumbPath(fileId, size)); return true; }
  catch { return false; }
}
