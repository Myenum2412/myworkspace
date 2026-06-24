"use client";

import * as React from "react";
import { enqueue, findByIdempotencyKey } from "./queue";
import { triggerSync } from "./sync-processor";

export interface OfflineFormOptions {
  endpoint: string;
  method?: "POST" | "PUT" | "PATCH" | "DELETE";
  headers?: Record<string, string>;
  idempotencyKey?: string;
  maxRetries?: number;
  onSuccess?: (data: any) => void;
  onError?: (error: Error) => void;
}

export interface OfflineFormResult {
  submit: (body: unknown) => Promise<void>;
  isPending: boolean;
  isOfflineQueued: boolean;
  lastSyncStatus: "idle" | "success" | "failed";
  queueLength: number;
}

function buildHeaders(
  base: Record<string, string> | undefined
): Record<string, string> {
  return { "Content-Type": "application/json", ...(base || {}) };
}

function isNetworkError(err: unknown): boolean {
  if (err instanceof TypeError) return true;
  if (err instanceof DOMException && err.name === "AbortError") return true;
  return false;
}

export function useOfflineForm(options: OfflineFormOptions): OfflineFormResult {
  const {
    endpoint,
    method = "POST",
    headers,
    idempotencyKey,
    maxRetries = 5,
  } = options;

  const onSuccessRef = React.useRef(options.onSuccess);
  const onErrorRef = React.useRef(options.onError);
  onSuccessRef.current = options.onSuccess;
  onErrorRef.current = options.onError;

  const [isPending, setIsPending] = React.useState(false);
  const [isOfflineQueued, setIsOfflineQueued] = React.useState(false);
  const [lastSyncStatus, setLastSyncStatus] = React.useState<
    "idle" | "success" | "failed"
  >("idle");
  const [queueLength, setQueueLength] = React.useState(0);

  const refreshQueueLength = React.useCallback(async () => {
    const { getQueueLength } = await import("./queue");
    const len = await getQueueLength();
    setQueueLength(len);
    return len;
  }, []);

  React.useEffect(() => {
    void refreshQueueLength();
  }, [refreshQueueLength, isOfflineQueued, lastSyncStatus]);

  const submit = React.useCallback(
    async (body: unknown) => {
      setIsPending(true);
      try {
        const res = await fetch(endpoint, {
          method,
          headers: buildHeaders(headers),
          body: JSON.stringify(body),
        });

        if (!res.ok && res.status < 500) {
          let errorMessage = `HTTP ${res.status}`;
          try {
            const errBody = await res.json();
            errorMessage = errBody.error || errBody.message || errorMessage;
          } catch {
            // keep default
          }
          const err = new Error(errorMessage);
          setIsPending(false);
          onErrorRef.current?.(err);
          return;
        }

        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }

        const data = await res.json();
        setIsOfflineQueued(false);
        setLastSyncStatus("success");
        onSuccessRef.current?.(data);
      } catch (err) {
        if (!isNetworkError(err)) {
          setIsPending(false);
          onErrorRef.current?.(err as Error);
          return;
        }

        const key =
          idempotencyKey ||
          `${endpoint}:${method}:${JSON.stringify(body ?? "")}`;

        const existing = await findByIdempotencyKey(key);
        if (!existing) {
          await enqueue({
            endpoint,
            method,
            headers: buildHeaders(headers),
            body: JSON.stringify(body ?? {}),
            createdAt: Date.now(),
            retryCount: 0,
            maxRetries,
            idempotencyKey: key,
          });
        }

        setIsOfflineQueued(true);
        setLastSyncStatus("failed");
        triggerSync();
      } finally {
        setIsPending(false);
      }
    },
    [endpoint, method, headers, idempotencyKey, maxRetries]
  );

  return { submit, isPending, isOfflineQueued, lastSyncStatus, queueLength };
}
