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
}

type Listener = (e: SyncEvent) => void;

const listeners = new Set<Listener>();
let isSyncing = false;
let backoffMs = 1000;
const MAX_BACKOFF_MS = 30_000;

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

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function processItem(item: QueuedRequest): Promise<"success" | "permanent" | "transient"> {
  try {
    const res = await fetch(item.endpoint, {
      method: item.method,
      headers: item.headers,
      body: item.body,
    });
    if (res.ok) return "success";
    if (isServerError(res.status)) return "transient";
    return "permanent";
  } catch (err) {
    if (isNetworkError(err)) return "transient";
    return "transient";
  }
}

export async function processQueue(): Promise<void> {
  if (isSyncing) return;
  isSyncing = true;
  emit({ status: "syncing", remaining: 0 });

  try {
    let items = await getAll();
    while (items.length > 0) {
      const item = items[0];
      const result = await processItem(item);

      if (result === "success") {
        await dequeue(item.id!);
        backoffMs = 1000;
      } else if (result === "permanent") {
        console.error(
          `[offline-queue] Permanent failure — dropping item ${item.id}`,
          {
            endpoint: item.endpoint,
            method: item.method,
            createdAt: new Date(item.createdAt).toISOString(),
            body: item.body,
          }
        );
        await dequeue(item.id!);
        backoffMs = 1000;
      } else {
        item.retryCount += 1;
        if (item.retryCount >= item.maxRetries) {
          console.error(
            `[offline-queue] Max retries exhausted — dropping item ${item.id}`,
            {
              endpoint: item.endpoint,
              method: item.method,
              retryCount: item.retryCount,
              body: item.body,
            }
          );
          await dequeue(item.id!);
          backoffMs = 1000;
        } else {
          await updateItem(item);
          backoffMs = Math.min(backoffMs * 2, MAX_BACKOFF_MS);
        }
      }

      const remaining = await getAll();
      emit({ status: "syncing", remaining: remaining.length });
      items = remaining;
    }

    emit({ status: "success", remaining: 0 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const remaining = await getAll();
    emit({ status: "failed", remaining: remaining.length, lastError: msg });
  } finally {
    isSyncing = false;
  }
}

export function triggerSync(): void {
  void processQueue();
}
