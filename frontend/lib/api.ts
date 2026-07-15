/**
 * Backend API base URL.
 *
 * In dev: leave empty so requests are relative (proxied by Next.js rewrites
 * in next.config.js to localhost:4000). This keeps auth cookies on the same
 * origin so the backend can verify the NextAuth session.
 *
 * In prod: set NEXT_PUBLIC_API_URL to the backend origin. When the backend is
 * on a separate domain you'll need CORS configured on the backend to accept
 * credentials from the frontend origin.
 */
const API_URL = process.env.NEXT_PUBLIC_API_URL || "";

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
