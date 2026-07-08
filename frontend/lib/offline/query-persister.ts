import type { PersistedClient, Persister } from "@tanstack/react-query-persist-client";
import { openDB, type IDBPDatabase } from "idb";

const DB_NAME = "myworkspace-react-query";
const DB_VERSION = 1;
const STORE_NAME = "queries";
const KEY = "react-query-cache";

let dbPromise: Promise<IDBPDatabase> | null = null;

function getDb(): Promise<IDBPDatabase> {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: "id" });
        }
      },
    });
  }
  return dbPromise;
}

export function createIndexedDbPersister(): Persister {
  return {
    persistClient: async (client: PersistedClient) => {
      const db = await getDb();
      await db.put(STORE_NAME, { id: KEY, client });
    },
    restoreClient: async () => {
      const db = await getDb();
      const entry = await db.get(STORE_NAME, KEY);
      return entry?.client as PersistedClient | undefined;
    },
    removeClient: async () => {
      const db = await getDb();
      await db.delete(STORE_NAME, KEY);
    },
  };
}
