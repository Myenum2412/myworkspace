import { withRetry } from "./retry";
import { deduplicateRequest } from "./request-dedup";

export interface ApiClientOptions {
  baseUrl?: string;
  timeout?: number;
  retries?: number;
  dedupKey?: string;
  signal?: AbortSignal;
  headers?: Record<string, string>;
  skipCsrf?: boolean;
  skipAuth?: boolean;
}

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public body?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/**
 * Get CSRF token from cookie.
 */
function getCsrfToken(): string | null {
  if (typeof document === "undefined") return null;

  const cookies = document.cookie.split(";");
  for (const cookie of cookies) {
    const [name, value] = cookie.trim().split("=");
    if (name === "csrf-token") {
      return value;
    }
  }
  return null;
}

/**
 * Ensure the backend's CSRF cookie exists before an unsafe request.
 *
 * The backend sets `csrf-token` on every response that passes through the
 * rewrite, but if this is the first backend call of the session (or a
 * service-worker cache served the page/GET), the cookie may not exist yet —
 * in which case a POST would fail with "CSRF token missing" (=> "Failed to
 * create task"). /api/config/public is unauthenticated, has no frontend route
 * shadowing it, and forces the backend to set the cookie with no side effects.
 * (Note: /api/health is shadowed by a frontend route and won't reach the
 * backend, so it cannot be used here.)
 */
export async function ensureCsrfToken(): Promise<string | null> {
  if (typeof document === "undefined") return null;
  const existing = getCsrfToken();
  if (existing) return existing;
  try {
    await fetch("/api/config/public", { credentials: "include" });
  } catch {
    /* backend unreachable — the request itself will surface the error */
  }
  return getCsrfToken();
}

/**
 * Check if the error is a 401 (unauthorized).
 */
function isUnauthorizedError(error: unknown): boolean {
  return error instanceof ApiError && error.status === 401;
}

/**
 * Attempt to refresh the session by calling NextAuth's session endpoint.
 * Returns true if refresh was successful.
 */
async function attemptSessionRefresh(): Promise<boolean> {
  try {
    // Call NextAuth's session endpoint to trigger token refresh
    const response = await fetch("/api/auth/session", {
      method: "GET",
      credentials: "include",
    });

    if (response.ok) {
      const session = await response.json();
      return !!session?.user;
    }
    return false;
  } catch {
    return false;
  }
}

/**
 * Clear any cached/local auth state so a revoked or deactivated session
 * cannot keep reading stale user data.
 */
function clearAuthState(): void {
  if (typeof window === "undefined") return;
  try {
    for (const key of Object.keys(localStorage)) {
      if (/auth|session|user|cache/i.test(key)) {
        localStorage.removeItem(key);
      }
    }
    try {
      sessionStorage.clear();
    } catch {
      /* ignore */
    }
  } catch {
    /* ignore */
  }
}

/**
 * 401 (session revoked / account gone) and 403 (account deactivated /
 * tenant mismatch) both mean the user's session is no longer valid:
 * clear local state and send the user back to the login page.
 */
function handleSessionExpiry(status: number): void {
  if (status !== 401 && status !== 403) return;
  if (typeof window === "undefined") return;

  clearAuthState();

  if (window.location.pathname !== "/login") {
    window.location.href = `/login?session_expired=${status}`;
  }
}

async function request<T>(
  url: string,
  options: RequestInit & ApiClientOptions = {},
): Promise<T> {
  const {
    timeout = 15000,
    retries = 1,
    dedupKey,
    signal,
    headers: extraHeaders,
    skipCsrf = false,
    skipAuth = false,
    ...fetchOptions
  } = options;

  const isUnsafeMethod = ["POST", "PUT", "PATCH", "DELETE"].includes(
    (fetchOptions.method || "GET").toUpperCase(),
  );

  // Build headers with CSRF token for unsafe methods
  const baseHeaders: Record<string, string> = {
    Accept: "application/json",
  };

  if (fetchOptions.body && typeof fetchOptions.body === "string") {
    baseHeaders["Content-Type"] = "application/json";
  }

  if (extraHeaders) {
    Object.assign(baseHeaders, extraHeaders);
  }

  // Pre-ensure the CSRF cookie exists so the first attempt already carries the
  // header (missing cookie => backend 403 "CSRF token missing").
  if (isUnsafeMethod && !skipCsrf) {
    await ensureCsrfToken();
  }

  const fetchFn = (abortSignal: AbortSignal) => {
    // Recomputed per attempt: a 403 "CSRF token missing" response sets the
    // cookie, so the retry picks up the header without further preflights.
    const headers = { ...baseHeaders };
    if (isUnsafeMethod && !skipCsrf) {
      const csrfToken = getCsrfToken();
      if (csrfToken) {
        headers["x-csrf-token"] = csrfToken;
      }
    }
    return fetch(url, {
      ...fetchOptions,
      signal: abortSignal,
      credentials: "include",
      headers,
    }).then(async (res) => {
      if (!res.ok) {
        let body: unknown;
        try {
          body = await res.json();
        } catch {
          body = await res.text().catch(() => null);
        }
        throw new ApiError(
          `API error: ${res.status} ${res.statusText}`,
          res.status,
          body,
        );
      }
      return res.json() as Promise<{ success?: boolean; data?: T }>;
    }).then((json) => {
      if (json && typeof json === "object" && "data" in json) {
        return json.data as T;
      }
      return json as unknown as T;
    });
  };

  const executeWithRetry = () =>
    withRetry(fetchFn, { maxRetries: retries, baseDelay: 300 });

  try {
    if (dedupKey) {
      return await deduplicateRequest(dedupKey, executeWithRetry);
    }
    return await executeWithRetry();
  } catch (error) {
    // CSRF cookie was missing on the first attempt. The 403 response set the
    // cookie, so retry once with the header. Not a session-expiry signal.
    if (
      error instanceof ApiError &&
      error.status === 403 &&
      isUnsafeMethod &&
      !skipCsrf &&
      (error.body as { error?: string } | null)?.error === "CSRF token missing"
    ) {
      if (dedupKey) {
        return await deduplicateRequest(dedupKey, executeWithRetry);
      }
      return await executeWithRetry();
    }

    // If unauthorized and not already refreshing, attempt session refresh
    if (isUnauthorizedError(error) && !skipAuth) {
      const refreshSuccessful = await attemptSessionRefresh();
      if (refreshSuccessful) {
        // Retry the original request after successful refresh
        try {
          if (dedupKey) {
            return await deduplicateRequest(dedupKey, executeWithRetry);
          }
          return await executeWithRetry();
        } catch {
          // If retry also fails, throw the original error
          throw error;
        }
      }
    }

    if (!skipAuth) {
      handleSessionExpiry(
        error instanceof ApiError ? error.status : 0,
      );
    }
    throw error;
  }
}

export const api = {
  get: <T>(url: string, options?: ApiClientOptions) =>
    request<T>(url, { method: "GET", ...options }),

  post: <T>(url: string, body?: unknown, options?: ApiClientOptions) =>
    request<T>(url, {
      method: "POST",
      body: body ? JSON.stringify(body) : undefined,
      ...options,
    }),

  put: <T>(url: string, body?: unknown, options?: ApiClientOptions) =>
    request<T>(url, {
      method: "PUT",
      body: body ? JSON.stringify(body) : undefined,
      ...options,
    }),

  patch: <T>(url: string, body?: unknown, options?: ApiClientOptions) =>
    request<T>(url, {
      method: "PATCH",
      body: body ? JSON.stringify(body) : undefined,
      ...options,
    }),

  delete: <T>(url: string, options?: ApiClientOptions) =>
    request<T>(url, { method: "DELETE", ...options }),
};
