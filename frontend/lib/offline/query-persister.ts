import type { PersistedClient, Persister } from "@tanstack/react-query-persist-client";
import { openDB, type IDBPDatabase } from "idb";

const DB_NAME = "myworkspace-react-query";
const DB_VERSION = 2;
const STORE_NAME = "queries";
const KEY = "react-query-cache";

let dbPromise: Promise<IDBPDatabase> | null = null;

function getDb(): Promise<IDBPDatabase> {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion) {
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: "id" });
        }
        if (oldVersion < 2) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: "id" });
          if (!store.indexNames.contains("updatedAt")) {
            store.createIndex("updatedAt", "updatedAt", { unique: false });
          }
        }
      },
    });
  }
  return dbPromise;
}

export function createIndexedDbPersister(): Persister {
  let lastWrite = 0;
  const WRITE_THROTTLE = 1000;

  return {
    persistClient: async (client: PersistedClient) => {
      const now = Date.now();
      if (now - lastWrite < WRITE_THROTTLE) return;
      lastWrite = now;

      try {
        const db = await getDb();
        await db.put(STORE_NAME, {
          id: KEY,
          client,
          updatedAt: now,
          version: "v2",
        });
      } catch {
        console.warn("[QueryPersister] Failed to persist query cache");
      }
    },
    restoreClient: async () => {
      try {
        const db = await getDb();
        const entry = await db.get(STORE_NAME, KEY);
        if (!entry) return undefined;

        const client = entry.client as PersistedClient | undefined;
        if (!client) return undefined;

        const maxAge = 7 * 24 * 60 * 60 * 1000;
        const age = Date.now() - (entry.updatedAt || 0);
        if (age > maxAge) {
          await db.delete(STORE_NAME, KEY);
          return undefined;
        }

        return client;
      } catch {
        return undefined;
      }
    },
    removeClient: async () => {
      try {
        const db = await getDb();
        await db.delete(STORE_NAME, KEY);
      } catch {
        // silently ignore
      }
    },
  };
}

export async function getPersistedClientSize(): Promise<number> {
  try {
    const db = await getDb();
    const entry = await db.get(STORE_NAME, KEY);
    if (!entry) return 0;
    return new TextEncoder().encode(JSON.stringify(entry)).length;
  } catch {
    return 0;
  }
}