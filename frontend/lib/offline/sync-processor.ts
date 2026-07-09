"use client";

import {
  type QueuedRequest,
  dequeue,
  getAll,
  updateItem,
} from "./queue";

export type SyncStatus =
  | "idle"
  | "syncing"
  | "success"
  | "failed"
  | "partial";

export interface SyncEvent {
  status: SyncStatus;
  remaining: number;
  lastError?: string;
  syncedCount?: number;
  failedCount?: number;
}

type Listener = (e: SyncEvent) => void;

const listeners = new Set<Listener>();
let isSyncing = false;
let backoffMs = 1000;
const MAX_BACKOFF_MS = 30_000;
const MAX_CONCURRENT_SYNC = 3;

export function subscribeSync(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function emit(e: SyncEvent) {
  listeners.forEach((l) => l(e));
}

export function isCurrentlySyncing(): boolean {
  return isSyncing;
}

function isNetworkError(err: unknown): boolean {
  if (err instanceof TypeError) return true;
  if (err instanceof DOMException && err.name === "AbortError") return true;
  return false;
}

function isServerError(status: number): boolean {
  return status >= 500;
}

function isConflictError(status: number): boolean {
  return status === 409;
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function processItem(item: QueuedRequest): Promise<"success" | "permanent" | "transient" | "conflict"> {
  try {
    const headers: Record<string, string> = {
      ...item.headers,
    };
    if (item.idempotencyKey && !headers["Idempotency-Key"]) {
      headers["Idempotency-Key"] = item.idempotencyKey;
    }
    if (item.version !== undefined) {
      headers["If-Match"] = String(item.version);
    }

    const res = await fetch(item.endpoint, {
      method: item.method,
      headers,
      body: item.body,
    });

    if (res.ok) return "success";
    if (isConflictError(res.status)) return "conflict";
    if (isServerError(res.status)) return "transient";
    return "permanent";
  } catch (err) {
    if (isNetworkError(err)) return "transient";
    return "transient";
  }
}

async function processItemWithConflictResolution(item: QueuedRequest): Promise<"success" | "permanent" | "transient"> {
  const result = await processItem(item);

  if (result === "conflict") {
    const strategy = item.conflictStrategy || "last-write-wins";

    if (strategy === "fail-on-conflict") {
      console.warn(
        `[offline-sync] Conflict on ${item.endpoint} — dropping item ${item.id} due to fail-on-conflict strategy`,
        { documentId: item.documentId, version: item.version },
      );
      return "permanent";
    }

    if (strategy === "merge" && item.documentId) {
      try {
        const serverRes = await fetch(item.endpoint, { method: "GET" });
        if (serverRes.ok) {
          const retryRes = await fetch(item.endpoint, {
            method: item.method,
            headers: {
              ...item.headers,
              "Content-Type": "application/json",
            },
            body: item.body,
          });
          if (retryRes.ok) return "success";
          if (retryRes.status === 409) return "permanent";
          if (isServerError(retryRes.status)) return "transient";
          return "permanent";
        }
      } catch {
        return "transient";
      }
    }

    return "success";
  }

  return result;
}

export async function processQueue(): Promise<void> {
  if (isSyncing) return;
  isSyncing = true;
  let syncedCount = 0;
  let failedCount = 0;
  emit({ status: "syncing", remaining: 0 });

  try {
    let items = await getAll();
    while (items.length > 0) {
      const batch = items.slice(0, MAX_CONCURRENT_SYNC);
      const results = await Promise.allSettled(
        batch.map(async (item) => {
          const result = await processItemWithConflictResolution(item);
          return { item, result };
        }),
      );

      for (const settled of results) {
        if (settled.status === "fulfilled") {
          const { item, result } = settled.value;
          if (result === "success") {
            await dequeue(item.id!);
            syncedCount++;
            backoffMs = 1000;
          } else if (result === "permanent") {
            console.error(
              `[offline-sync] Permanent failure — dropping item ${item.id}`,
              {
                endpoint: item.endpoint,
                method: item.method,
                createdAt: new Date(item.createdAt).toISOString(),
                body: item.body,
              },
            );
            await dequeue(item.id!);
            failedCount++;
            backoffMs = 1000;
          } else {
            item.retryCount += 1;
            if (item.retryCount >= item.maxRetries) {
              console.error(
                `[offline-sync] Max retries exhausted — dropping item ${item.id}`,
                {
                  endpoint: item.endpoint,
                  method: item.method,
                  retryCount: item.retryCount,
                  body: item.body,
                },
              );
              await dequeue(item.id!);
              failedCount++;
              backoffMs = 1000;
            } else {
              await updateItem(item);
              backoffMs = Math.min(backoffMs * 2, MAX_BACKOFF_MS);
              await sleep(backoffMs);
            }
          }
        }
      }

      const remaining = await getAll();
      emit({
        status: remaining.length > 0 ? "syncing" : "success",
        remaining: remaining.length,
        syncedCount,
        failedCount,
      });
      items = remaining;
    }

    emit({ status: "success", remaining: 0, syncedCount, failedCount });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const remaining = await getAll();
    emit({ status: "failed", remaining: remaining.length, lastError: msg, syncedCount, failedCount });
  } finally {
    isSyncing = false;
  }
}

export function triggerSync(): void {
  void processQueue();
}