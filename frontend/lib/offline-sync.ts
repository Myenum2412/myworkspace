import { openDB } from "idb";

const DB_NAME = "myworkspace-offline";
const STORE_NAME = "requests";

export async function initDB() {
  return openDB(DB_NAME, 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id", autoIncrement: true });
      }
    },
  });
}

export async function queueOfflineRequest(url: string, method: string, payload: any) {
  const db = await initDB();
  await db.add(STORE_NAME, {
    url,
    method,
    payload,
    timestamp: Date.now(),
  });
}

export async function getOfflineRequests() {
  const db = await initDB();
  return db.getAll(STORE_NAME);
}

export async function removeOfflineRequest(id: number) {
  const db = await initDB();
  await db.delete(STORE_NAME, id);
}

export async function syncOfflineRequests() {
  if (typeof window === "undefined" || !navigator.onLine) return;
  
  const requests = await getOfflineRequests();
  if (requests.length === 0) return;

  console.log(`Syncing ${requests.length} offline requests...`);

  for (const req of requests) {
    try {
      const res = await fetch(req.url, {
        method: req.method,
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(req.payload),
      });

      if (res.ok) {
        await removeOfflineRequest(req.id);
      } else {
        console.error("Failed to sync request:", req);
      }
    } catch (err) {
      console.error("Error syncing request:", err);
    }
  }
}
