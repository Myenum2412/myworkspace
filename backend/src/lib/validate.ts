import { AppError } from "../middleware/error.js";

/**
 * Field validation helpers. Fail fast with 400 + field list so the existing
 * error handler surfaces consistent `{ success:false, fields }` payloads.
 *
 * These validate SHAPE / PRESENCE only — never business rules (those stay in the
 * route).
 */

export type FieldError = { path: string; message: string };

export function fail(fields: FieldError[]): never {
  const obj: Record<string, string> = {};
  for (const f of fields) obj[f.path] = f.message;
  throw new AppError(400, "Validation failed", obj);
}

export function requireString(value: unknown, path: string, { min = 1, max = 10_000 }: { min?: number; max?: number } = {}): string {
  if (typeof value !== "string") fail([{ path, message: `${path} must be a string` }]);
  const v = value.trim();
  if (v.length < min) fail([{ path, message: `${path} must be at least ${min} char(s)` }]);
  if (v.length > max) fail([{ path, message: `${path} must be at most ${max} chars` }]);
  return v;
}

export function optionalString(value: unknown, path: string, { max = 10_000 }: { max?: number } = {}): string | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== "string") fail([{ path, message: `${path} must be a string` }]);
  const v = value.trim();
  if (v.length > max) fail([{ path, message: `${path} must be at most ${max} chars` }]);
  return v;
}

export function requireEmail(value: unknown, path = "email"): string {
  const v = requireString(value, path, { min: 5, max: 254 });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) fail([{ path, message: `${path} must be a valid email` }]);
  return v.toLowerCase();
}

export function requireEnum<T extends string>(value: unknown, allowed: readonly T[], path: string): T {
  if (typeof value !== "string" || !allowed.includes(value as T)) {
    fail([{ path, message: `${path} must be one of: ${allowed.join(", ")}` }]);
  }
  return value as T;
}

export function optionalArray(value: unknown, path: string, { max = 1000 }: { max?: number } = {}): unknown[] | undefined {
  if (value === undefined || value === null) return undefined;
  if (!Array.isArray(value)) fail([{ path, message: `${path} must be an array` }]);
  if (value.length > max) fail([{ path, message: `${path} must have at most ${max} items` }]);
  return value;
}

// Common enums for the hot routes.
export const TASK_STATUSES = ["todo", "in_progress", "review", "done", "cancelled", "assigned", "open"] as const;
export const TASK_PRIORITIES = ["low", "medium", "high", "urgent"] as const;
export const PROJECT_STATUSES = ["Active", "Inactive"] as const;
export const PROJECT_ACCESS = ["Public", "Private"] as const;
