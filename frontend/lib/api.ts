/**
 * Single origin for backend API calls. Canonical data lives on the backend
 * Express server (`/api/*`); the Next `app/api` data routes that duplicated it
 * have been removed. Point everything at the backend origin so there is one
 * source of truth and one RBAC enforcement point.
 *
 * In dev the backend runs on localhost:4000 (see next.config rewrites); in prod
 * set NEXT_PUBLIC_API_URL to the backend origin.
 */
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export function apiUrl(path: string): string {
  return `${API_URL}${path}`;
}

/** Build a query string from a record, skipping null/undefined/empty values. */
export function qs(params: Record<string, string | number | boolean | null | undefined>): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === null || v === undefined || v === "") continue;
    sp.set(k, String(v));
  }
  const s = sp.toString();
  return s ? `?${s}` : "";
}
