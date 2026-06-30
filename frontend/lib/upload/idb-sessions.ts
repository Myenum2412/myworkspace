import { openDB, IDBPDatabase } from "idb";
import type { UploadSessionData, UploadStatus } from "./types";

const DB_NAME = "upload-sessions-db";
const DB_VERSION = 2;
const STORE_NAME = "sessions";

let dbPromise: Promise<IDBPDatabase> | null = null;

function getDb(): Promise<IDBPDatabase> {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: "uploadId" });
          store.createIndex("status", "status", { unique: false });
          store.createIndex("createdAt", "createdAt", { unique: false });
          store.createIndex("orgId", "metadata.orgId", { unique: false });
        }
      },
    });
  }
  return dbPromise;
}

export async function saveSession(session: UploadSessionData): Promise<void> {
  const db = await getDb();
  await db.put(STORE_NAME, session);
}

export async function getSession(uploadId: string): Promise<UploadSessionData | undefined> {
  const db = await getDb();
  return db.get(STORE_NAME, uploadId);
}

export async function updateSessionStatus(uploadId: string, status: UploadStatus, offset?: number): Promise<void> {
  const db = await getDb();
  const session = await db.get(STORE_NAME, uploadId);
  if (session) {
    session.status = status;
    session.updatedAt = Date.now();
    if (offset !== undefined) session.offset = offset;
    await db.put(STORE_NAME, session);
  }
}

export async function updateSessionOffset(uploadId: string, offset: number): Promise<void> {
  const db = await getDb();
  const session = await db.get(STORE_NAME, uploadId);
  if (session) {
    session.offset = offset;
    session.updatedAt = Date.now();
    await db.put(STORE_NAME, session);
  }
}

export async function deleteSession(uploadId: string): Promise<void> {
  const db = await getDb();
  await db.delete(STORE_NAME, uploadId);
}

export async function getAllSessions(): Promise<UploadSessionData[]> {
  const db = await getDb();
  return db.getAll(STORE_NAME);
}

export async function getSessionsByStatus(status: UploadStatus): Promise<UploadSessionData[]> {
  const db = await getDb();
  const index = db.transaction(STORE_NAME).store.index("status");
  return index.getAll(status);
}

export async function getPendingSessions(): Promise<UploadSessionData[]> {
  const db = await getDb();
  const index = db.transaction(STORE_NAME).store.index("status");
  const allPending: UploadSessionData[] = [];
  for await (const cursor of index.iterate("pending")) {
    allPending.push(cursor.value);
  }
  for await (const cursor of index.iterate("paused")) {
    allPending.push(cursor.value);
  }
  for await (const cursor of index.iterate("uploading")) {
    allPending.push(cursor.value);
  }
  return allPending;
}

export async function clearCompletedSessions(): Promise<void> {
  const db = await getDb();
  const tx = db.transaction(STORE_NAME, "readwrite");
  const index = tx.store.index("status");
  for await (const cursor of index.iterate("completed")) {
    tx.store.delete(cursor.key);
  }
  for await (const cursor of index.iterate("duplicate")) {
    tx.store.delete(cursor.key);
  }
  for await (const cursor of index.iterate("cancelled")) {
    tx.store.delete(cursor.key);
  }
  await tx.done;
}

export async function getSessionCount(): Promise<number> {
  const db = await getDb();
  const all = await db.getAllKeys(STORE_NAME);
  return all.length;
}
