import { AppError } from "../middleware/error.js";
import { fileTypeFromBuffer } from "file-type";
import { logger } from "../lib/logger/index.js";
import path from "node:path";

const EXTENSION_TO_MIME: Record<string, string[]> = {
  '.pdf': ['application/pdf'],
  '.doc': ['application/msword'],
  '.docx': ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  '.xls': ['application/vnd.ms-excel'],
  '.xlsx': ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
  '.png': ['image/png'],
  '.jpg': ['image/jpeg'],
  '.jpeg': ['image/jpeg'],
  '.gif': ['image/gif'],
  '.svg': ['image/svg+xml'],
  '.webp': ['image/webp'],
  '.mp4': ['video/mp4'],
  '.mp3': ['audio/mpeg'],
  '.zip': ['application/zip'],
  '.gz': ['application/gzip'],
  '.txt': ['text/plain'],
  '.csv': ['text/csv'],
  '.json': ['application/json'],
  '.ts': ['application/typescript', 'text/typescript'],
  '.tsx': ['application/typescript', 'text/typescript'],
  '.js': ['application/javascript', 'text/javascript'],
};

export function validateFileExtension(filename: string, detectedMimeType: string): boolean {
  const ext = path.extname(filename).toLowerCase();
  if (!ext) return true;
  const allowedMimes = EXTENSION_TO_MIME[ext];
  if (!allowedMimes) return true;
  return allowedMimes.includes(detectedMimeType);
}

const COMMON_PASSWORDS = new Set([
  "password", "password123", "password1234", "12345678", "123456789",
  "qwerty123", "abc123456", "letmein", "welcome", "admin123",
  "monkey123", "dragon123", "master123", "hello123", "shadow123",
  "sunshine", "trustno1", "iloveyou", "princess", "football",
]);

const PASSWORD_MIN_LENGTH = 8;
const PASSWORD_MAX_LENGTH = 128;

export interface PasswordPolicy {
  minLength: number;
  maxLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireNumbers: boolean;
  requireSpecialChars: boolean;
  rejectCommonPasswords: boolean;
}

const DEFAULT_PASSWORD_POLICY: PasswordPolicy = {
  minLength: PASSWORD_MIN_LENGTH,
  maxLength: PASSWORD_MAX_LENGTH,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSpecialChars: false,
  rejectCommonPasswords: true,
};

export function validatePasswordStrength(
  password: string,
  policy: PasswordPolicy = DEFAULT_PASSWORD_POLICY,
): void {
  if (password.length < policy.minLength) {
    throw new AppError(400, `Password must be at least ${policy.minLength} characters`);
  }
  if (password.length > policy.maxLength) {
    throw new AppError(400, `Password must be at most ${policy.maxLength} characters`);
  }
  if (policy.requireUppercase && !/[A-Z]/.test(password)) {
    throw new AppError(400, "Password must contain at least one uppercase letter");
  }
  if (policy.requireLowercase && !/[a-z]/.test(password)) {
    throw new AppError(400, "Password must contain at least one lowercase letter");
  }
  if (policy.requireNumbers && !/[0-9]/.test(password)) {
    throw new AppError(400, "Password must contain at least one number");
  }
  if (policy.requireSpecialChars && !/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)) {
    throw new AppError(400, "Password must contain at least one special character");
  }
  if (policy.rejectCommonPasswords && COMMON_PASSWORDS.has(password.toLowerCase())) {
    throw new AppError(400, "This password is too common. Please choose a stronger password");
  }
}

export function validateEmail(email: string): string {
  const normalized = email.toLowerCase().trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
    throw new AppError(400, "Invalid email format");
  }
  if (normalized.length > 254) {
    throw new AppError(400, "Email is too long");
  }
  return normalized;
}

const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg", "image/png", "image/gif", "image/webp", "image/svg+xml",
  "application/pdf",
  "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint", "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "text/plain", "text/csv", "text/html",
  "application/json", "application/xml",
  "application/zip", "application/x-rar-compressed", "application/x-tar", "application/gzip",
  "video/mp4", "video/mpeg", "video/webm",
  "audio/mpeg", "audio/ogg", "audio/wav", "audio/webm",
]);

export function isAllowedMimeType(mimeType: string): boolean {
  return ALLOWED_MIME_TYPES.has(mimeType.toLowerCase());
}

const MAGIC_BYTE_CHECKERS: Array<{ bytes: number[]; offset: number; mime: string }> = [
  { bytes: [0xFF, 0xD8, 0xFF], offset: 0, mime: "image/jpeg" },
  { bytes: [0x89, 0x50, 0x4E, 0x47], offset: 0, mime: "image/png" },
  { bytes: [0x47, 0x49, 0x46], offset: 0, mime: "image/gif" },
  { bytes: [0x25, 0x50, 0x44, 0x46], offset: 0, mime: "application/pdf" },
  { bytes: [0x50, 0x4B, 0x03, 0x04], offset: 0, mime: "application/zip" },
  { bytes: [0x52, 0x61, 0x72, 0x21], offset: 0, mime: "application/x-rar-compressed" },
  { bytes: [0x1F, 0x8B], offset: 0, mime: "application/gzip" },
  { bytes: [0x25, 0x21], offset: 0, mime: "application/postscript" },
  { bytes: [0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70], offset: 0, mime: "video/mp4" },
  { bytes: [0x52, 0x49, 0x46, 0x46], offset: 0, mime: "image/webp" },
  { bytes: [0x42, 0x4D], offset: 0, mime: "image/bmp" },
  { bytes: [0x49, 0x49, 0x2A, 0x00], offset: 0, mime: "image/tiff" },
  { bytes: [0x4D, 0x4D, 0x00, 0x2A], offset: 0, mime: "image/tiff" },
];

export function detectMimeTypeFromBuffer(buffer: Buffer): string | null {
  for (const checker of MAGIC_BYTE_CHECKERS) {
    if (buffer.length < checker.offset + checker.bytes.length) continue;
    let match = true;
    for (let i = 0; i < checker.bytes.length; i++) {
      if (buffer[checker.offset + i] !== checker.bytes[i]) {
        match = false;
        break;
      }
    }
    if (match) return checker.mime;
  }
  return null;
}

/**
 * Validate a file's content against its declared MIME type using
 * magic-byte inspection. Uses `file-type` (a comprehensive, maintained
 * magic-byte database) with the existing hand-rolled checkers as fallback
 * for edge cases file-type doesn't cover.
 *
 * @returns The detected MIME type (never null — falls back to declared on miss).
 */
export async function validateFileMagicBytesAsync(buffer: Buffer, declaredMime: string): Promise<string> {
  // Primary: file-type (handles 500+ formats, including modern ones like avif, heic, cr3)
  try {
    const detected = await fileTypeFromBuffer(buffer);
    if (detected) {
      // Category-level validation
      const declaredCategory = declaredMime.split("/")[0];
      const detectedCategory = detected.mime.split("/")[0];
      if (declaredCategory !== detectedCategory && declaredMime !== "application/octet-stream") {
        return detected.mime;
      }
      return detected.mime;
    }
  } catch (err) {
    logger.warn({ err }, "file-type inspection failed, falling back to hand-rolled checkers");
  }

  // Fallback: hand-rolled magic bytes (for formats file-type might miss or
  // when the buffer is truncated / too short for file-type to handle).
  return validateFileMagicBytes(buffer, declaredMime);
}

/**
 * Synchronous fallback using hand-rolled magic-byte checkers.
 * Kept for backward compatibility and non-async call sites.
 */
export function validateFileMagicBytes(buffer: Buffer, declaredMime: string): string {
  const detected = detectMimeTypeFromBuffer(buffer);

  if (!detected) {
    if (declaredMime === "application/octet-stream") {
      return declaredMime;
    }
    const textChars = buffer.slice(0, 512).filter((b) => b >= 32 && b <= 126).length;
    if (textChars > 400) return "text/plain";
    return declaredMime;
  }

  const declaredCategory = declaredMime.split("/")[0];
  const detectedCategory = detected.split("/")[0];

  if (declaredCategory !== detectedCategory && declaredMime !== "application/octet-stream") {
    return detected;
  }

  return detected;
}
