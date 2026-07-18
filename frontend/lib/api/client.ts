import { withRetry } from "./retry";
import { deduplicateRequest } from "./request-dedup";

export interface ApiClientOptions {
  baseUrl?: string;
  timeout?: number;
  retries?: number;
  dedupKey?: string;
  signal?: AbortSignal;
  headers?: Record<string, string>;
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

async function request<T>(
  url: string,
  options: RequestInit & ApiClientOptions = {},
): Promise<T> {
  const { timeout = 15000, retries = 1, dedupKey, signal, headers: extraHeaders, ...fetchOptions } = options;

  const fetchFn = (abortSignal: AbortSignal) =>
    fetch(url, {
      ...fetchOptions,
      signal: abortSignal,
      credentials: "include",
      headers: {
        Accept: "application/json",
        ...(fetchOptions.body && typeof fetchOptions.body === "string"
          ? { "Content-Type": "application/json" }
          : {}),
        ...extraHeaders,
      },
    }).then(async (res) => {
      if (!res.ok) {
        let body: unknown;
        try { body = await res.json(); } catch { body = await res.text().catch(() => null); }
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

  if (dedupKey) {
    return deduplicateRequest(dedupKey, () =>
      withRetry(fetchFn, { maxRetries: retries, baseDelay: 300 }),
    );
  }

  return withRetry(fetchFn, { maxRetries: retries, baseDelay: 300 });
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
