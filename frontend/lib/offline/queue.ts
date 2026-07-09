import { openDB, type IDBPDatabase } from "idb";

const DB_NAME = "offline-queue-db";
const DB_VERSION = 2;
const STORE_NAME = "queue";

export interface QueuedRequest {
  id?: number;
  endpoint: string;
  method: "POST" | "PUT" | "PATCH" | "DELETE";
  headers: Record<string, string>;
  body: string;
  createdAt: number;
  retryCount: number;
  maxRetries: number;
  idempotencyKey?: string;
  conflictStrategy?: "last-write-wins" | "fail-on-conflict" | "merge";
  version?: number;
  lastSyncedAt?: number;
  collection?: string;
  documentId?: string;
}

let dbPromise: Promise<IDBPDatabase> | null = null;

function getDb(): Promise<IDBPDatabase> {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion) {
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, {
            keyPath: "id",
            autoIncrement: true,
          });
        }
        if (oldVersion < 2) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: "id", autoIncrement: true });
          store.createIndex("createdAt", "createdAt", { unique: false });
          store.createIndex("idempotencyKey", "idempotencyKey", { unique: false });
          store.createIndex("resourceSynced", ["documentId", "endpoint"], { unique: false });
        }
      },
    });
  }
  return dbPromise;
}

export async function enqueue(item: Omit<QueuedRequest, "id">): Promise<number> {
  const db = await getDb();
  const tx = db.transaction(STORE_NAME, "readwrite");
  const store = tx.objectStore(STORE_NAME);
  const id = await store.add({
    ...item,
    createdAt: Date.now(),
    retryCount: 0,
    maxRetries: 5,
  });
  await tx.done;
  return id as number;
}

export async function dequeue(id: number): Promise<void> {
  const db = await getDb();
  const tx = db.transaction(STORE_NAME, "readwrite");
  await tx.objectStore(STORE_NAME).delete(id);
  await tx.done;
}

export async function peek(): Promise<QueuedRequest | null> {
  const db = await getDb();
  const items = await db.getAll(STORE_NAME, null, 1);
  return items.length > 0 ? items[0] : null;
}

export async function getQueueLength(): Promise<number> {
  const db = await getDb();
  return db.count(STORE_NAME);
}

export async function getAll(): Promise<QueuedRequest[]> {
  const db = await getDb();
  return db.getAll(STORE_NAME);
}

export async function getPendingSync(syncType?: string): Promise<QueuedRequest[]> {
  const db = await getDb();
  const all = await db.getAll(STORE_NAME);
  if (syncType) {
    return all.filter((r) => r.endpoint.includes(syncType));
  }
  return all;
}

export async function clearQueue(): Promise<void> {
  const db = await getDb();
  await db.clear(STORE_NAME);
}

export async function updateItem(item: QueuedRequest): Promise<void> {
  const db = await getDb();
  await db.put(STORE_NAME, { ...item, resourceSyncedAt: Date.now() });
}

export async function markSynced(id: number): Promise<void> {
  const db = await getDb();
  const item = await db.get(STORE_NAME, id);
  if (item) {
    item.resourceSyncedAt = Date.now();
    await db.put(STORE_NAME, item);
  }
}

export async function findByIdempotencyKey(key: string): Promise<QueuedRequest | null> {
  const db = await getDb();
  const tx = db.transaction(STORE_NAME, "readonly");
  const idx = tx.store.index("idempotencyKey");
  const result = await idx.get(key);
  return (result as QueuedRequest) || null;
}

export async function findByResource(documentId: string, endpoint: string): Promise<QueuedRequest | null> {
  const db = await getDb();
  const all = await db.getAll(STORE_NAME);
  return all.find((r) => r.documentId === documentId && r.endpoint === endpoint) || null;
}

export async function getFailedItems(): Promise<QueuedRequest[]> {
  const db = await getDb();
  const all = await db.getAll(STORE_NAME);
  return all.filter((r) => r.retryCount >= r.maxRetries);
}

export async function retryFailedItems(): Promise<number> {
  const failed = await getFailedItems();
  const db = await getDb();
  const tx = db.transaction(STORE_NAME, "readwrite");
  const store = tx.objectStore(STORE_NAME);
  for (const item of failed) {
    item.retryCount = 0;
    await store.put(item);
  }
  await tx.done;
  return failed.length;
}