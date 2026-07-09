"use client";

import { openDB, type IDBPDatabase } from "idb";

const DB_NAME = "myworkspace-sync-engine";
const DB_VERSION = 2;

interface SyncRecord {
  id?: number;
  collection: string;
  documentId: string;
  data: unknown;
  version: number;
  checksum: string;
  lastSyncedAt: number | null;
  updatedAt: number;
  deleted: boolean;
  synced: boolean;
  conflict: boolean;
}

interface SyncBatch {
  id?: number;
  records: Array<{ collection: string; documentId: string; version: number; checksum: string }>;
  startedAt: number;
  completedAt: number | null;
  status: "pending" | "syncing" | "completed" | "failed";
}

const STORES = {
  records: "records",
  batches: "batches",
  metadata: "metadata",
} as const;

let dbPromise: Promise<IDBPDatabase> | null = null;

function getDb(): Promise<IDBPDatabase> {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion) {
        if (!db.objectStoreNames.contains(STORES.records)) {
          const store = db.createObjectStore(STORES.records, {
            keyPath: "id",
            autoIncrement: true,
          });
          store.createIndex("collection_doc", ["collection", "documentId"], { unique: true });
          store.createIndex("synced", "synced", { unique: false });
          store.createIndex("conflict", "conflict", { unique: false });
          store.createIndex("updatedAt", "updatedAt", { unique: false });
        }
        if (!db.objectStoreNames.contains(STORES.batches)) {
          const batchStore = db.createObjectStore(STORES.batches, {
            keyPath: "id",
            autoIncrement: true,
          });
          batchStore.createIndex("status", "status", { unique: false });
        }
        if (!db.objectStoreNames.contains(STORES.metadata)) {
          db.createObjectStore(STORES.metadata, { keyPath: "key" });
        }
      },
    });
  }
  return dbPromise;
}

// ── Checksum ──
async function calculateChecksum(data: unknown): Promise<string> {
  const str = JSON.stringify(data);
  const encoder = new TextEncoder();
  const buf = encoder.encode(str);
  const hash = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// ── Compression ──
async function compressData(data: string): Promise<ArrayBuffer> {
  const encoder = new TextEncoder();
  const buf = encoder.encode(data);
  const cs = new CompressionStream("gzip");
  const writer = cs.writable.getWriter();
  writer.write(buf);
  writer.close();
  return new Response(cs.readable).arrayBuffer();
}

async function decompressData(buf: ArrayBuffer): Promise<string> {
  const ds = new DecompressionStream("gzip");
  const writer = ds.writable.getWriter();
  writer.write(new Uint8Array(buf));
  writer.close();
  const res = new Response(ds.readable);
  const decoded = await res.text();
  return decoded;
}

// ── Encryption ──
async function getEncryptionKey(): Promise<CryptoKey> {
  const db = await getDb();
  const meta = await db.get(STORES.metadata, "encryptionKey");
  if (meta?.value) {
    return await crypto.subtle.importKey("raw", meta.value, "AES-GCM", false, ["encrypt", "decrypt"]);
  }

  const key = await crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, true, ["encrypt", "decrypt"]);
  const raw = await crypto.subtle.exportKey("raw", key);
  await db.put(STORES.metadata, { key: "encryptionKey", value: Array.from(new Uint8Array(raw)) });
  return key;
}

async function encrypt(data: string): Promise<{ iv: Uint8Array; encrypted: ArrayBuffer }> {
  const key = await getEncryptionKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoder = new TextEncoder();
  const encrypted = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, encoder.encode(data));
  return { iv, encrypted };
}

async function decrypt(iv: Uint8Array, encrypted: ArrayBuffer): Promise<string> {
  const key = await getEncryptionKey();
  const ivCopy = new Uint8Array(iv);
  const decrypted = await crypto.subtle.decrypt({ name: "AES-GCM", iv: ivCopy }, key, encrypted);
  return new TextDecoder().decode(decrypted);
}

// ── Public API ──

export async function saveRecord(
  collection: string,
  documentId: string,
  data: unknown,
  version?: number,
): Promise<void> {
  const db = await getDb();
  const checksum = await calculateChecksum(data);
  const existing = await db.getFromIndex(STORES.records, "collection_doc", [collection, documentId]);

  const record: SyncRecord = {
    ...(existing || {}),
    collection,
    documentId,
    data,
    version: version || (existing?.version || 0) + 1,
    checksum,
    updatedAt: Date.now(),
    synced: false,
    conflict: false,
    lastSyncedAt: existing?.lastSyncedAt || null,
    deleted: false,
  };

  await db.put(STORES.records, record);
}

export async function getRecord<T = unknown>(
  collection: string,
  documentId: string,
): Promise<{ data: T; version: number } | null> {
  const db = await getDb();
  const record = await db.getFromIndex(STORES.records, "collection_doc", [collection, documentId]);
  if (!record || record.deleted) return null;
  return { data: record.data as T, version: record.version };
}

export async function markSynced(
  collection: string,
  documentId: string,
  serverVersion: number,
  serverData: unknown,
): Promise<void> {
  const db = await getDb();
  const record = await db.getFromIndex(STORES.records, "collection_doc", [collection, documentId]);
  if (record) {
    record.synced = true;
    record.conflict = false;
    record.version = serverVersion;
    record.lastSyncedAt = Date.now();
    record.data = serverData;
    record.checksum = await calculateChecksum(serverData);
    await db.put(STORES.records, record);
  }
}

export async function getUnsyncedRecords(): Promise<SyncRecord[]> {
  const db = await getDb();
  const all = await db.getAll(STORES.records);
  return all.filter((r) => !r.synced && !r.deleted);
}

export async function getConflictedRecords(): Promise<SyncRecord[]> {
  const db = await getDb();
  const index = db.transaction(STORES.records, "readonly").store.index("conflict");
  return index.getAll(IDBKeyRange.only(1)) as unknown as SyncRecord[];
}

export async function resolveConflict(
  collection: string,
  documentId: string,
  resolution: "local" | "server" | "merge",
  mergedData?: unknown,
): Promise<void> {
  const db = await getDb();
  const record = await db.getFromIndex(STORES.records, "collection_doc", [collection, documentId]);
  if (!record) return;

  if (resolution === "server") {
    record.synced = true;
    record.conflict = false;
  } else if (resolution === "local" && mergedData) {
    record.data = mergedData;
    record.version++;
    record.synced = false;
    record.conflict = false;
    record.checksum = await calculateChecksum(mergedData);
  } else if (resolution === "merge" && mergedData) {
    record.data = mergedData;
    record.version++;
    record.synced = false;
    record.conflict = false;
    record.checksum = await calculateChecksum(mergedData);
  }

  await db.put(STORES.records, record);
}

export async function markDeleted(collection: string, documentId: string): Promise<void> {
  const db = await getDb();
  const record = await db.getFromIndex(STORES.records, "collection_doc", [collection, documentId]);
  if (record) {
    record.deleted = true;
    record.synced = false;
    await db.put(STORES.records, record);
  }
}

export async function getSyncStats(): Promise<{
  total: number;
  synced: number;
  unsynced: number;
  conflicted: number;
  deleted: number;
}> {
  const db = await getDb();
  const all = await db.getAll(STORES.records);
  return {
    total: all.length,
    synced: all.filter((r) => r.synced && !r.deleted).length,
    unsynced: all.filter((r) => !r.synced && !r.deleted).length,
    conflicted: all.filter((r) => r.conflict).length,
    deleted: all.filter((r) => r.deleted).length,
  };
}

export async function processSyncBatch(
  records: SyncRecord[],
): Promise<{ synced: number; failed: number; conflicts: number }> {
  let synced = 0;
  let failed = 0;
  let conflicts = 0;

  for (const record of records) {
    try {
      const res = await fetch(`/api/sync/${record.collection}/${record.documentId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "If-Match": String(record.version),
          "X-Checksum": record.checksum,
        },
        body: JSON.stringify(record.data),
      });

      if (res.ok) {
        const serverData = await res.json();
        await markSynced(record.collection, record.documentId, serverData.version, serverData.data);
        synced++;
      } else if (res.status === 409) {
        const record_ = await getDb().then((db) =>
          db.getFromIndex(STORES.records, "collection_doc", [record.collection, record.documentId]),
        );
        if (record_) {
          record_.conflict = true;
          await (await getDb()).put(STORES.records, record_);
        }
        conflicts++;
      } else {
        failed++;
      }
    } catch {
      failed++;
    }
  }

  return { synced, failed, conflicts };
}

export async function fullSync(): Promise<{
  synced: number;
  failed: number;
  conflicts: number;
}> {
  const records = await getUnsyncedRecords();
  if (records.length === 0) return { synced: 0, failed: 0, conflicts: 0 };

  const batchSize = 50;
  let totalSynced = 0;
  let totalFailed = 0;
  let totalConflicts = 0;

  for (let i = 0; i < records.length; i += batchSize) {
    const batch = records.slice(i, i + batchSize);
    const result = await processSyncBatch(batch);
    totalSynced += result.synced;
    totalFailed += result.failed;
    totalConflicts += result.conflicts;
  }

  return { synced: totalSynced, failed: totalFailed, conflicts: totalConflicts };
}