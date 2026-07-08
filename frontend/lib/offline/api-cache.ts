import { openDB, type IDBPDatabase } from "idb";

const DB_NAME = "myworkspace-api-cache";
const DB_VERSION = 1;
const STORE_NAME = "responses";

export interface CachedResponse {
  key: string;
  data: unknown;
  timestamp: number;
  ttl: number;
}

let dbPromise: Promise<IDBPDatabase> | null = null;

function getDb(): Promise<IDBPDatabase> {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: "key" });
          store.createIndex("timestamp", "timestamp", { unique: false });
        }
      },
    });
  }
  return dbPromise;
}

export async function cacheApiResponse<T>(key: string, data: T, ttlMs = 7 * 24 * 60 * 60 * 1000): Promise<void> {
  const db = await getDb();
  const entry: CachedResponse = {
    key,
    data,
    timestamp: Date.now(),
    ttl: ttlMs,
  };
  await db.put(STORE_NAME, entry);
}

export async function getCachedApiResponse<T>(key: string): Promise<{ data: T; fresh: boolean } | null> {
  const db = await getDb();
  const entry = await db.get(STORE_NAME, key);
  if (!entry) return null;
  const fresh = Date.now() - entry.timestamp < entry.ttl;
  return { data: entry.data as T, fresh };
}

export async function removeCachedApiResponse(key: string): Promise<void> {
  const db = await getDb();
  await db.delete(STORE_NAME, key);
}

export async function clearExpiredCache(): Promise<void> {
  const db = await getDb();
  const tx = db.transaction(STORE_NAME, "readwrite");
  const store = tx.objectStore(STORE_NAME);
  const index = store.index("timestamp");
  const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
  let cursor = await index.openCursor();
  while (cursor) {
    if (cursor.value.timestamp < cutoff) {
      await cursor.delete();
    }
    cursor = await cursor.continue();
  }
  await tx.done;
}

export async function clearAllCache(): Promise<void> {
  const db = await getDb();
  await db.clear(STORE_NAME);
}

export async function getCacheSize(): Promise<number> {
  const db = await getDb();
  const all = await db.getAllKeys(STORE_NAME);
  return all.length;
}
