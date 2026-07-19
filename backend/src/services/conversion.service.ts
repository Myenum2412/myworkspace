import { execSync, exec } from "child_process";
import path from "path";
import fs from "fs/promises";
import { FileAttachment } from "../lib/db/models/FileAttachment.js";
import { getStorageProvider } from "../lib/storage/providers.js";
import { logger } from "../lib/logger/index.js";
import { metricsRegistry } from "../lib/monitoring/index.js";
import { v4 as uuid } from "uuid";

const CONVERSION_DIR = path.resolve(process.cwd(), "data", "conversions");

async function ensureDir(dir: string) {
  try { await fs.mkdir(dir, { recursive: true }); }
  catch (err: any) { if (err.code !== "EEXIST") throw err; }
}

function hasLibreOffice(): boolean {
  try { execSync("which libreoffice", { stdio: "ignore" }); return true; }
  catch { return false; }
}

function isOfficeMime(mimeType: string): boolean {
  return (
    mimeType.includes("officedocument") ||
    mimeType === "application/msword" ||
    mimeType === "application/vnd.ms-excel" ||
    mimeType === "application/vnd.ms-powerpoint" ||
    mimeType === "application/rtf"
  );
}

export type ConversionFormat = "pdf" | "html";

export async function convertTo(
  fileId: string,
  format: ConversionFormat = "pdf",
): Promise<string | null> {
  if (!hasLibreOffice()) return null;

  const startTime = Date.now();

  try {
    const file = await FileAttachment.findOne({ id: fileId }).lean();
    if (!file) return null;
    if (!isOfficeMime(file.mimeType)) return null;

    await ensureDir(CONVERSION_DIR);

    const provider = getStorageProvider();
    const buffer = await provider.get(file.storagePath);
    if (!buffer) return null;

    const ext = path.extname(file.originalName) || ".docx";
    const inputPath = path.join(CONVERSION_DIR, `${fileId}-input${ext}`);
    const outputDir = path.join(CONVERSION_DIR, `${fileId}-output`);

    await fs.writeFile(inputPath, buffer);
    await fs.mkdir(outputDir, { recursive: true });

    try {
      await new Promise<void>((resolve, reject) => {
        const proc = exec(
          `libreoffice --headless --convert-to ${format} --outdir "${outputDir}" "${inputPath}"`,
          { timeout: 60000 },
          (err) => err ? reject(err) : resolve(),
        );
        proc.on("error", reject);
      });

      const outFiles = await fs.readdir(outputDir);
      const outFile = outFiles.find((f) => f.endsWith(`.${format}`));
      if (!outFile) return null;

      const outPath = path.join(outputDir, outFile);
      const outBuffer = await fs.readFile(outPath);
      const storageKey = `${file.orgId}/conversions/${fileId}/${uuid()}.${format}`;

      const storageProvider = getStorageProvider();
      await storageProvider.save(outBuffer, storageKey);

      await fs.unlink(inputPath).catch(() => {});
      await fs.rm(outputDir, { recursive: true, force: true }).catch(() => {});

      metricsRegistry.observeHistogram("conversion_duration_ms", { format, from: file.mimeType }, Date.now() - startTime);
      metricsRegistry.incrementCounter("conversions_total", { format, from: file.mimeType });

      return storageKey;
    } catch (err) {
      await fs.unlink(inputPath).catch(() => {});
      await fs.rm(outputDir, { recursive: true, force: true }).catch(() => {});
      metricsRegistry.incrementCounter("conversion_failures", { format, from: file.mimeType });
      logger.warn({ err, fileId, format }, "Office conversion failed");
      return null;
    }
  } catch (err) {
    logger.warn({ err, fileId, format }, "Office conversion error");
    return null;
  }
}

export async function getConvertedFile(storageKey: string): Promise<{ buffer: Buffer; mimeType: string } | null> {
  try {
    const provider = getStorageProvider();
    const buffer = await provider.get(storageKey);
    if (!buffer) return null;
    const ext = path.extname(storageKey);
    const mimeType = ext === ".pdf" ? "application/pdf" : "text/html";
    return { buffer, mimeType };
  } catch {
    return null;
  }
}

export function isConvertibleOffice(mimeType: string): boolean {
  return isOfficeMime(mimeType);
}
