"use client";

import { useEffect } from "react";

function getCsrfToken(): string | null {
  if (typeof document === "undefined") return null;
  const cookies = document.cookie.split(";");
  for (const cookie of cookies) {
    const [name, value] = cookie.trim().split("=");
    if (name === "csrf-token") return value;
  }
  return null;
}

/**
 * The backend sets the csrf-token cookie on every response routed through the
 * rewrite. If this is the first backend call of the session (or a
 * service-worker cache served the page), the cookie may not exist yet — a POST
 * would then fail with "CSRF token missing". /api/config/public is
 * unauthenticated, has no frontend route shadowing it, and forces the backend
 * to set the cookie with no side effects (unlike /api/health, which is
 * shadowed by a frontend route and never reaches the backend). This uses
 * originalFetch directly to avoid re-entering the patched wrapper.
 */
function ensureCsrfToken(originalFetch: typeof fetch): Promise<string | null> {
  if (getCsrfToken()) return Promise.resolve(getCsrfToken());
  return originalFetch("/api/config/public", { credentials: "include" })
    .then(() => getCsrfToken())
    .catch(() => getCsrfToken());
}

function isSameOrigin(url: string): boolean {
  try {
    const parsed = new URL(url, window.location.origin);
    return parsed.origin === window.location.origin;
  } catch {
    return true;
  }
}

const UNSAFE_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

export function CsrfInterceptor() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    const originalFetch = window.fetch;

    window.fetch = function csrfAwareFetch(
      input: RequestInfo | URL,
      init?: RequestInit,
    ): Promise<Response> {
      const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
      const method = (init?.method || "GET").toUpperCase();

      if (UNSAFE_METHODS.has(method) && isSameOrigin(url)) {
        const csrfToken = getCsrfToken();
        if (csrfToken) {
          const headers = new Headers(init?.headers);
          if (!headers.has("x-csrf-token")) {
            headers.set("x-csrf-token", csrfToken);
          }
          return originalFetch(input, { ...init, headers });
        }

        // No CSRF cookie yet — establish it first, then attach the header.
        return ensureCsrfToken(originalFetch).then((token) => {
          if (!token) return originalFetch(input, init);
          const headers = new Headers(init?.headers);
          if (!headers.has("x-csrf-token")) {
            headers.set("x-csrf-token", token);
          }
          return originalFetch(input, { ...init, headers });
        });
      }

      return originalFetch(input, init);
    };

    return () => {
      window.fetch = originalFetch;
    };
  }, []);

  return null;
}
