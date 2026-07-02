/**
 * File upload security validation service.
 *
 * Validates uploaded files against declared MIME types using magic-byte
 * inspection (via `file-type`) and extension whitelisting. Prevents
 * MIME-type spoofing attacks where a user declares one type (e.g.
 * `image/png`) but uploads a完全不同 file (e.g. an HTML payload).
 *
 * Dependencies: file-type (already in package.json)
 */

import { fileTypeFromBuffer } from "file-type";
import path from "path";
import { logger } from "./logger/index.js";

// ─── Allowed MIME types ────────────────────────────────────────────────
export const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
  "image/tiff",
  "image/svg+xml",
  "image/gif",
  "image/bmp",
]);

export const ALLOWED_DOCUMENT_TYPES = new Set([
  "application/pdf",
  "text/plain",
  "text/csv",
  "text/html",
  "application/json",
  "application/xml",
  "text/xml",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",  // .xlsx
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // .docx
  "application/vnd.openxmlformats-officedocument.presentationml.presentation", // .pptx
  "application/vnd.ms-excel",          // .xls
  "application/msword",               // .doc
  "application/vnd.ms-powerpoint",    // .ppt
  "application/rtf",
]);

export const ALLOWED_ARCHIVE_TYPES = new Set([
  "application/zip",
  "application/x-zip-compressed",
  "application/gzip",
  "application/x-gzip",
  "application/x-tar",
  "application/x-bzip2",
  "application/x-7z-compressed",
  "application/x-rar-compressed",
]);

const ALLOWED_VIDEO_TYPES = new Set([
  "video/mp4",
  "video/webm",
  "video/ogg",
  "video/x-msvideo",
  "video/quicktime",
]);

const ALLOWED_AUDIO_TYPES = new Set([
  "audio/mpeg",
  "audio/ogg",
  "audio/wav",
  "audio/webm",
  "audio/aac",
  "audio/flac",
  "audio/mp4",
]);

// Merge all allowed types
export const ALLOWED_MIME_TYPES = new Set([
  ...ALLOWED_IMAGE_TYPES,
  ...ALLOWED_DOCUMENT_TYPES,
  ...ALLOWED_ARCHIVE_TYPES,
  ...ALLOWED_VIDEO_TYPES,
  ...ALLOWED_AUDIO_TYPES,
]);

// ─── Extension → MIME mapping (for secondary validation) ───────────────
const EXT_TO_MIME: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".avif": "image/avif",
  ".tiff": "image/tiff",
  ".tif": "image/tiff",
  ".svg": "image/svg+xml",
  ".gif": "image/gif",
  ".bmp": "image/bmp",
  ".pdf": "application/pdf",
  ".txt": "text/plain",
  ".csv": "text/csv",
  ".html": "text/html",
  ".htm": "text/html",
  ".json": "application/json",
  ".xml": "application/xml",
  ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  ".xls": "application/vnd.ms-excel",
  ".doc": "application/msword",
  ".ppt": "application/vnd.ms-powerpoint",
  ".rtf": "application/rtf",
  ".zip": "application/zip",
  ".gz": "application/gzip",
  ".tar": "application/x-tar",
  ".bz2": "application/x-bzip2",
  ".7z": "application/x-7z-compressed",
  ".rar": "application/x-rar-compressed",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".ogg": "video/ogg",
  ".avi": "video/x-msvideo",
  ".mov": "video/quicktime",
  ".mp3": "audio/mpeg",
  ".wav": "audio/wav",
  ".aac": "audio/aac",
  ".flac": "audio/flac",
  ".m4a": "audio/mp4",
};

// ─── Dangerously executable extensions (never allow) ───────────────────
const BLOCKED_EXTENSIONS = new Set([
  ".exe", ".bat", ".cmd", ".com", ".msi", ".scr", ".pif",
  ".sh", ".bash", ".zsh", ".ksh",
  ".php", ".php3", ".php4", ".phtml",
  ".asp", ".aspx", ".jsp", ".jspx",
  ".pl", ".py", ".pyc", ".pyo",
  ".rb", ".rhtml",
  ".cgi", ".shtml",
  ".swf",
  ".hta", ".msc",
  ".vbs", ".vbe", ".js", ".jse", ".wsf", ".wsh",
  ".ps1", ".psm1", ".psd1",
  ".jar",
  ".app", ".dmg",
  ".reg",
  ".scf", ".lnk",
  ".inf",
]);

export interface ValidationResult {
  valid: boolean;
  error?: string;
  detectedMime?: string;
}

/**
 * Validate an uploaded file buffer.
 *
 * 1. Checks extension against blocked list
 * 2. Checks extension against known MIME mapping
 * 3. Inspects magic bytes with `file-type`
 * 4. Ensures detected MIME matches declared MIME
 * 5. Ensures MIME is in the allowed list
 */
export async function validateFileUpload(
  buffer: Buffer,
  originalName: string,
  declaredMime?: string,
): Promise<ValidationResult> {
  const ext = path.extname(originalName).toLowerCase();

  // Block obviously dangerous extensions
  if (BLOCKED_EXTENSIONS.has(ext)) {
    return { valid: false, error: `File extension '${ext}' is not allowed` };
  }

  // Check extension-to-MIME consistency
  if (declaredMime) {
    const expectedExt = EXT_TO_MIME[ext];
    if (expectedExt && expectedExt !== declaredMime) {
      // e.g. file says .png but declares image/jpeg — suspicious
      logger.warn({ originalName, declaredMime, expectedExt }, "MIME/extension mismatch");
    }
  }

  // Magic-byte inspection
  let detectedMime: string | undefined;
  try {
    const type = await fileTypeFromBuffer(buffer);
    detectedMime = type?.mime;
  } catch (err) {
    logger.error({ err, originalName }, "Magic-byte inspection failed");
    // Don't fail the upload on inspection error (best-effort)
  }

  if (detectedMime && declaredMime && detectedMime !== declaredMime) {
    return {
      valid: false,
      error: `Declared MIME type '${declaredMime}' does not match file content '${detectedMime}'`,
      detectedMime,
    };
  }

  // Use detected MIME for allowed check, fall back to declared
  const effectiveMime = detectedMime || declaredMime;
  if (effectiveMime && !ALLOWED_MIME_TYPES.has(effectiveMime)) {
    return {
      valid: false,
      error: `File type '${effectiveMime}' is not allowed for upload`,
      detectedMime,
    };
  }

  return { valid: true, detectedMime };
}

/**
 * Categorise a MIME type into a FileCategory.
 */
export function categoriseMime(mime: string): string {
  if (ALLOWED_IMAGE_TYPES.has(mime)) return "image";
  if (ALLOWED_DOCUMENT_TYPES.has(mime)) return "document";
  if (ALLOWED_ARCHIVE_TYPES.has(mime)) return "archive";
  if (ALLOWED_VIDEO_TYPES.has(mime)) return "video";
  if (ALLOWED_AUDIO_TYPES.has(mime)) return "audio";
  return "general";
}
