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

function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

const CSRF_COOKIE = "csrf-token";
const CSRF_HEADER = "x-csrf-token";

export async function apiFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const headers = new Headers(init?.headers);
  if (!headers.has(CSRF_HEADER)) {
    const token = getCookie(CSRF_COOKIE);
    if (token) headers.set(CSRF_HEADER, token);
  }
  return fetch(input, { ...init, headers, credentials: "include" });
}
