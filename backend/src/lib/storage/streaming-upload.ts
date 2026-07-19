import { Request } from "express";
import multer, { FileFilterCallback } from "multer";
import path from "path";
import fs from "fs/promises";
import { createWriteStream, existsSync, mkdirSync } from "fs";
import { env } from "../../config/env.js";
import { logger } from "../logger/index.js";

const TMP_DIR = path.resolve(process.cwd(), "data", "tmp-uploads");
if (!existsSync(TMP_DIR)) {
  mkdirSync(TMP_DIR, { recursive: true });
}

const fileSizeLimit = env.MAX_FILE_SIZE;

function generateTempPath(originalName: string): string {
  const safe = originalName.replace(/[^a-zA-Z0-9._-]/g, "_");
  return path.join(TMP_DIR, `${Date.now()}-${Math.random().toString(36).slice(2)}-${safe}`);
}

export const streamingUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => {
      cb(null, TMP_DIR);
    },
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname);
      cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);
    },
  }),
  limits: {
    fileSize: fileSizeLimit,
    files: env.MAX_FILES_PER_UPLOAD,
  },
  fileFilter: (_req, _file, cb: FileFilterCallback) => {
    cb(null, true);
  },
});

export function getFileUploadFields() {
  return streamingUpload.fields([
    { name: "files", maxCount: env.MAX_FILES_PER_UPLOAD },
    { name: "file", maxCount: env.MAX_FILES_PER_UPLOAD },
  ]);
}

export async function cleanupTempFile(filePath: string): Promise<void> {
  try {
    await fs.unlink(filePath);
  } catch (err: any) {
    if (err.code !== "ENOENT") {
      logger.warn({ err, filePath }, "Failed to cleanup temp file");
    }
  }
}
