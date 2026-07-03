import { createGzip, createGunzip } from "zlib";
import { createReadStream, createWriteStream, existsSync, mkdirSync, readFileSync } from "fs";
import { readFile, writeFile, readdir, unlink } from "fs/promises";
import { resolve, basename, extname } from "path";
import { pipeline } from "stream/promises";
import NodeCache from "node-cache";
import { Redis, Cluster } from "ioredis";
import { cacheService } from "./cache-service.js";
import { getRedis, isRedisConnected } from "../redis.js";
import { logger } from "../logger/index.js";

interface BackupEntry {
  key: string;
  value: string;
  ttl: number;
  storedAt: number;
  expiresAt: number;
  tags?: string[];
  version: number;
}

interface BackupManifest {
  version: number;
  createdAt: string;
  entryCount: number;
  source: "L1" | "L2" | "combined";
  filters: BackupFilters;
  compressed: boolean;
  appVersion: string;
  namespace?: string;
}

interface BackupFilters {
  namespace?: string;
  pattern?: string;
  maxEntries?: number;
}

interface BackupProgress {
  processed: number;
  total: number;
  bytesWritten: number;
  errors: number;
  phase: "export" | "compress" | "write" | "complete" | "import" | "decompress" | "read";
}

type ProgressCallback = (progress: BackupProgress) => void;

const BACKUP_VERSION = 1;
const DEFAULT_BACKUP_DIR = resolve(process.cwd(), "data", "cache-backups");

function getAppVersion(): string {
  try {
    const pkg = JSON.parse(readFileSync(resolve(process.cwd(), "package.json"), "utf-8"));
    return pkg.version || "0.0.0";
  } catch {
    return "0.0.0";
  }
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
}

function generateBackupFilename(namespace?: string): string {
  const date = new Date().toISOString().replace(/[:.]/g, "-");
  const ns = namespace ? `-${namespace}` : "";
  return `cache-backup${ns}-${date}.json.gz`;
}

async function getL2Client(): Promise<Redis | Cluster | null> {
  try {
    const client = getRedis();
    if (client && isRedisConnected()) return client;
  } catch {
    // L2 unavailable
  }
  return null;
}

async function scanL1Keys(filters: BackupFilters): Promise<string[]> {
  let keys = cacheService.keys();

  if (filters.namespace) {
    const ns = filters.namespace;
    keys = keys.filter((k) => k.startsWith(ns));
  }

  if (filters.pattern) {
    const regex = new RegExp(filters.pattern.replace(/\*/g, ".*"));
    keys = keys.filter((k) => regex.test(k));
  }

  if (filters.maxEntries && keys.length > filters.maxEntries) {
    keys = keys.slice(0, filters.maxEntries);
  }

  return keys;
}

async function scanL2Keys(filters: BackupFilters): Promise<string[]> {
  const client = await getL2Client();
  if (!client) return [];

  let pattern = "*";
  if (filters.namespace) pattern = `${filters.namespace}*`;
  if (filters.pattern) pattern = `*${filters.pattern}*`;

  try {
    const keys = await client.keys(pattern);
    if (filters.maxEntries && keys.length > filters.maxEntries) {
      return keys.slice(0, filters.maxEntries);
    }
    return keys;
  } catch (err) {
    logger.error({ err, pattern }, "Failed to scan L2 keys");
    return [];
  }
}

async function exportL1Keys(keys: string[], onProgress?: ProgressCallback): Promise<BackupEntry[]> {
  const entries: BackupEntry[] = [];
  const now = Date.now();
  let errors = 0;

  const cs = cacheService as unknown as { local: { getTtl(key: string): number | undefined }; version: number };

  for (let i = 0; i < keys.length; i++) {
    try {
      const key = keys[i];
      const value = cacheService.get<unknown>(key);
      const ttl = cs.local.getTtl(key);

      if (value !== undefined) {
        const ttlSec = ttl !== undefined ? Math.max(1, Math.round((ttl - now) / 1000)) : 600;
        entries.push({
          key,
          value: JSON.stringify(value),
          ttl: ttlSec,
          storedAt: now,
          expiresAt: ttl || now + ttlSec * 1000,
          version: cs.version,
        });
      }
    } catch (err) {
      errors++;
      logger.warn({ err, key: keys[i] }, "Failed to export L1 key");
    }

    if (onProgress && (i % 100 === 0 || i === keys.length - 1)) {
      onProgress({
        processed: i + 1,
        total: keys.length,
        bytesWritten: 0,
        errors,
        phase: "export",
      });
    }
  }

  return entries;
}

async function exportL2Keys(keys: string[], onProgress?: ProgressCallback): Promise<BackupEntry[]> {
  const client = await getL2Client();
  if (!client) return [];

  const entries: BackupEntry[] = [];
  const now = Date.now();
  let errors = 0;

  for (let i = 0; i < keys.length; i += 100) {
    const batch = keys.slice(i, i + 100);
    try {
      const values = await client.mget(...batch);
      const ttls = await Promise.all(batch.map((k) => client.ttl(k)));

      for (let j = 0; j < batch.length; j++) {
        const key = batch[j];
        const value = values[j];
        const ttl = Math.max(1, ttls[j]);

        if (value !== null) {
          entries.push({
            key,
            value,
            ttl,
            storedAt: now,
            expiresAt: now + ttl * 1000,
            version: BACKUP_VERSION,
          });
        }
      }
    } catch (err) {
      errors++;
      logger.warn({ err, batch: batch.length }, "Failed to export L2 batch");
    }

    if (onProgress) {
      onProgress({
        processed: Math.min(i + 100, keys.length),
        total: keys.length,
        bytesWritten: 0,
        errors,
        phase: "export",
      });
    }
  }

  return entries;
}

export async function exportBackup(
  options: {
    source?: "L1" | "L2" | "combined";
    filters?: BackupFilters;
    outputDir?: string;
    filename?: string;
    compress?: boolean;
    onProgress?: ProgressCallback;
  } = {},
): Promise<{ path: string; entryCount: number; size: number }> {
  const source = options.source || "combined";
  const filters = options.filters || {};
  const outputDir = options.outputDir || DEFAULT_BACKUP_DIR;
  const compress = options.compress !== false;
  const onProgress = options.onProgress;

  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true });
  }

  const filename = options.filename || generateBackupFilename(filters.namespace);
  const outputPath = resolve(outputDir, filename);

  const manifest: BackupManifest = {
    version: BACKUP_VERSION,
    createdAt: new Date().toISOString(),
    entryCount: 0,
    source,
    filters,
    compressed: compress,
    appVersion: getAppVersion(),
    namespace: filters.namespace,
  };

  let entries: BackupEntry[] = [];

  if (source === "L1" || source === "combined") {
    const keys = await scanL1Keys(filters);
    logger.info({ count: keys.length, source: "L1" }, "Exporting L1 keys");
    const l1Entries = await exportL1Keys(keys, onProgress);
    entries.push(...l1Entries);
  }

  if (source === "L2" || source === "combined") {
    const keys = await scanL2Keys(filters);
    logger.info({ count: keys.length, source: "L2" }, "Exporting L2 keys");
    const l2Entries = await exportL2Keys(keys, onProgress);
    entries.push(...l2Entries);
  }

  manifest.entryCount = entries.length;

  if (onProgress) {
    onProgress({ processed: entries.length, total: entries.length, bytesWritten: 0, errors: 0, phase: "compress" });
  }

  const backupData = JSON.stringify({ manifest, entries });
  let finalSize: number;

  if (compress) {
    const gzip = createGzip({ level: 6 });
    const dest = createWriteStream(outputPath);
    await pipeline(
      Buffer.from(backupData),
      gzip,
      dest,
    );
    finalSize = (await readFile(outputPath)).length;
  } else {
    const uncompressedPath = outputPath.replace(/\.gz$/, "");
    await writeFile(uncompressedPath, backupData, "utf-8");
    finalSize = (await readFile(uncompressedPath)).length;
  }

  if (onProgress) {
    onProgress({ processed: entries.length, total: entries.length, bytesWritten: finalSize, errors: 0, phase: "complete" });
  }

  logger.info({ entryCount: entries.length, size: formatBytes(finalSize), path: outputPath }, "Backup export complete");

  return { path: outputPath, entryCount: entries.length, size: finalSize };
}

export async function importBackup(
  filePath: string,
  options: {
    target?: "L1" | "L2" | "both";
    overwrite?: boolean;
    onProgress?: ProgressCallback;
  } = {},
): Promise<{ imported: number; skipped: number; errors: number }> {
  const target = options.target || "both";
  const overwrite = options.overwrite !== false;
  const onProgress = options.onProgress;

  if (!existsSync(filePath)) {
    throw new Error(`Backup file not found: ${filePath}`);
  }

  if (onProgress) {
    onProgress({ processed: 0, total: 0, bytesWritten: 0, errors: 0, phase: "read" });
  }

  let raw: string;
  const ext = extname(filePath);

  if (ext === ".gz" || filePath.endsWith(".json.gz")) {
    const chunks: Buffer[] = [];
    const gunzip = createGunzip();
    const src = createReadStream(filePath);

    await pipeline(
      src,
      gunzip,
      async function* (source: AsyncIterable<Buffer>) {
        for await (const chunk of source) {
          chunks.push(chunk);
        }
      } as unknown as NodeJS.ReadWriteStream,
    ).catch(() => {
      // fallback: read entire file
    });

    raw = Buffer.concat(chunks).toString("utf-8");
  } else {
    raw = await readFile(filePath, "utf-8");
  }

  const { manifest, entries } = JSON.parse(raw) as { manifest: BackupManifest; entries: BackupEntry[] };

  if (!manifest || !Array.isArray(entries)) {
    throw new Error("Invalid backup format");
  }

  logger.info({ entryCount: entries.length, createdAt: manifest.createdAt }, "Importing backup");

  if (onProgress) {
    onProgress({ processed: 0, total: entries.length, bytesWritten: 0, errors: 0, phase: "import" });
  }

  let imported = 0;
  let skipped = 0;
  let errors = 0;

  if (target === "L1" || target === "both") {
    for (let i = 0; i < entries.length; i++) {
      try {
        const entry = entries[i];
        const existing = cacheService.get(entry.key);

        if (existing !== undefined && !overwrite) {
          skipped++;
          continue;
        }

        let parsedValue: unknown;
        try {
          parsedValue = JSON.parse(entry.value);
        } catch {
          parsedValue = entry.value;
        }

        cacheService.set(entry.key, parsedValue, { ttl: entry.ttl });
        imported++;
      } catch (err) {
        errors++;
        logger.warn({ err, key: entries[i].key }, "Failed to import L1 entry");
      }

      if (onProgress && (i % 100 === 0 || i === entries.length - 1)) {
        onProgress({ processed: i + 1, total: entries.length, bytesWritten: 0, errors, phase: "import" });
      }
    }
  }

  if (target === "L2" || target === "both") {
    const client = await getL2Client();
    if (client) {
      for (let i = 0; i < entries.length; i += 100) {
        const batch = entries.slice(i, i + 100);
        const pipeline = client.pipeline();

        for (const entry of batch) {
          if (!overwrite) {
            pipeline.set(entry.key, entry.value, "EX", entry.ttl, "NX");
          } else {
            pipeline.setex(entry.key, entry.ttl, entry.value);
          }
        }

        try {
          const results = await pipeline.exec();
          if (results) {
            for (const [err, result] of results) {
              if (err) {
                errors++;
              } else if (result === null) {
                skipped++;
              } else {
                imported++;
              }
            }
          }
        } catch (err) {
          errors += batch.length;
          logger.warn({ err, batch: batch.length }, "Failed to import L2 batch");
        }

        if (onProgress) {
          onProgress({
            processed: Math.min(i + 100, entries.length),
            total: entries.length,
            bytesWritten: 0,
            errors,
            phase: "import",
          });
        }
      }
    }
  }

  if (onProgress) {
    onProgress({ processed: entries.length, total: entries.length, bytesWritten: 0, errors, phase: "complete" });
  }

  logger.info({ imported, skipped, errors }, "Backup import complete");
  return { imported, skipped, errors };
}

export async function listBackups(
  backupDir?: string,
): Promise<{ path: string; size: number; createdAt: Date | null; source: string; entryCount: number }[]> {
  const dir = backupDir || DEFAULT_BACKUP_DIR;

  if (!existsSync(dir)) {
    return [];
  }

  const files = await readdir(dir);
  const backups: { path: string; size: number; createdAt: Date | null; source: string; entryCount: number }[] = [];

  for (const file of files) {
    if (!file.startsWith("cache-backup") || file.endsWith(".tmp")) continue;

    const filePath = resolve(dir, file);
    const stat = await readFile(filePath).then(
      (buf) => ({ size: buf.length }),
      () => ({ size: 0 }),
    );

    let createdAt: Date | null = null;
    let source = "unknown";
    let entryCount = 0;

    try {
      let raw: string;
      if (file.endsWith(".gz")) {
        const chunks: Buffer[] = [];
        const gunzip = createGunzip();
        const src = createReadStream(filePath);
        for await (const chunk of src.pipe(gunzip)) {
          chunks.push(chunk);
        }
        raw = Buffer.concat(chunks).toString("utf-8");
      } else {
        raw = await readFile(filePath, "utf-8");
      }

      const { manifest } = JSON.parse(raw);
      createdAt = new Date(manifest.createdAt);
      source = manifest.source;
      entryCount = manifest.entryCount;
    } catch {
      // corrupted backup, skip metadata
    }

    backups.push({ path: filePath, size: stat.size, createdAt, source, entryCount });
  }

  backups.sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0));
  return backups;
}

export async function deleteBackup(filePath: string): Promise<boolean> {
  if (!existsSync(filePath)) {
    throw new Error(`Backup not found: ${filePath}`);
  }

  await unlink(filePath);
  logger.info({ path: filePath }, "Backup deleted");
  return true;
}

export async function getBackupInfo(filePath: string): Promise<BackupManifest & { entryCount: number; fileSize: number } | null> {
  if (!existsSync(filePath)) return null;

  try {
    const stat = await readFile(filePath).then((b) => ({ size: b.length }), () => ({ size: 0 }));

    let raw: string;
    if (filePath.endsWith(".gz")) {
      const chunks: Buffer[] = [];
      const gunzip = createGunzip();
      const src = createReadStream(filePath);
      for await (const chunk of src.pipe(gunzip)) {
        chunks.push(chunk);
      }
      raw = Buffer.concat(chunks).toString("utf-8");
    } else {
      raw = await readFile(filePath, "utf-8");
    }

    const { manifest } = JSON.parse(raw);
    return { ...manifest, fileSize: stat.size };
  } catch {
    return null;
  }
}
