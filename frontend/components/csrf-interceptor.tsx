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
      }

      return originalFetch(input, init);
    };

    return () => {
      window.fetch = originalFetch;
    };
  }, []);

  return null;
}
