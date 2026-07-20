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
 * Check if the error is a 401 (unauthorized).
 */
function isUnauthorizedError(error: unknown): boolean {
  return error instanceof ApiError && error.status === 401;
}

/**
 * Attempt to refresh the session by calling NextAuth's signIn endpoint.
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

  const headers = baseHeaders;

  // Add CSRF token for unsafe methods
  if (isUnsafeMethod && !skipCsrf) {
    const csrfToken = getCsrfToken();
    if (csrfToken) {
      headers["x-csrf-token"] = csrfToken;
    }
  }

  const fetchFn = (abortSignal: AbortSignal) =>
    fetch(url, {
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

  const executeWithRetry = () =>
    withRetry(fetchFn, { maxRetries: retries, baseDelay: 300 });

  try {
    if (dedupKey) {
      return await deduplicateRequest(dedupKey, executeWithRetry);
    }
    return await executeWithRetry();
  } catch (error) {
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
