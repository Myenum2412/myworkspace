/**
 * Input sanitization middleware.
 *
 * Strips dangerous HTML/JS patterns from user-supplied request bodies
 * to prevent stored XSS, DOM-based XSS, and injection attacks.
 * Applied to all POST/PUT/PATCH requests that contain user text.
 *
 * This is a defence-in-depth layer — model-level validation and
 * output encoding in templates are the primary XSS defences.
 */

import { Request, Response, NextFunction } from "express";
import { logger } from "../lib/logger/index.js";

// ─── Dangerous patterns ────────────────────────────────────────────────
// These patterns are stripped from all string values in request bodies.
// We use a blocklist approach (remove known-bad) rather than allowlist
// (only known-safe) so the API doesn't reject legitimate business text
// that contains angle brackets (e.g. code snippets, math expressions).

const DANGEROUS_PATTERNS: RegExp[] = [
  // Script injection
  /<script[\s>]/gi,
  /<\/script>/gi,
  /javascript\s*:/gi,
  /<svg[\s>]/gi,
  /<iframe[\s>]/gi,
  /<\/iframe>/gi,
  /<object[\s>]/gi,
  /<\/object>/gi,
  /<embed[\s>]/gi,
  /<link[\s>]/gi,
  /<meta[\s>]/gi,
  /<style[\s>]/gi,
  /onerror\s*=/gi,
  /onload\s*=/gi,
  /onclick\s*=/gi,
  /onmouseover\s*=/gi,
  /onfocus\s*=/gi,
  /onblur\s*=/gi,
  /onchange\s*=/gi,
  /onsubmit\s*=/gi,
  /onreset\s*=/gi,
  /onselect\s*=/gi,
  /onabort\s*=/gi,
  /expression\s*\(/gi,
  /data:text\/html/gi,
  // NoSQL injection operators
  /\$where\b/gi,
  /\$gt\b/gi,
  /\$ne\b/gi,
  /\$regex\b/gi,
];

/**
 * Deep-sanitise a value by recursively walking objects/arrays and
 * stripping dangerous patterns from all string values.
 */
function sanitiseValue(value: unknown): unknown {
  if (typeof value === "string") {
    let cleaned: string = value;
    for (const pattern of DANGEROUS_PATTERNS) {
      cleaned = cleaned.replace(pattern, "");
    }
    return cleaned;
  }
  if (Array.isArray(value)) {
    return value.map(sanitiseValue);
  }
  if (value !== null && typeof value === "object") {
    const sanitised: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      sanitised[key] = sanitiseValue(val);
    }
    return sanitised;
  }
  return value;
}

/**
 * Express middleware that sanitises req.body in-place.
 * Safe to skip for routes that process binary data (uploads).
 */
export function inputSanitizer(req: Request, _res: Response, next: NextFunction): void {
  if (req.body && typeof req.body === "object" && !Buffer.isBuffer(req.body)) {
    try {
      req.body = sanitiseValue(req.body);
    } catch (err) {
      logger.warn({ err, path: req.path, method: req.method }, "Input sanitisation failed");
      // Fail open — don't block the request if sanitisation errors
    }
  }
  next();
}
