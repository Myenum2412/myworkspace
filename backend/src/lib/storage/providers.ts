import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";
import { env } from "../../config/env.js";
import path from "path";
import fs from "fs/promises";
import { constants as fsConstants } from "fs";

export type StorageProviderType = "local" | "s3" | "gcs" | "azure";

export interface IStorageProvider {
  save(buffer: Buffer, key: string): Promise<void>;
  get(key: string): Promise<Buffer | null>;
  delete(key: string): Promise<void>;
  exists(key: string): Promise<boolean>;
  getUrl(key: string): string;
}

class LocalStorageProvider implements IStorageProvider {
  private baseDir: string;

  constructor() {
    this.baseDir = path.resolve(process.cwd(), "data", "uploads");
  }

  /**
   * Sanitize key: prevent path traversal by resolving relative to baseDir
   * and ensuring the result stays within baseDir.
   */
  private fullPath(key: string): string {
    // Strip null bytes and reject suspicious patterns
    const clean = key.replace(/\0/g, "");
    const resolved = path.resolve(this.baseDir, clean);
    if (!resolved.startsWith(this.baseDir)) {
      throw new Error(`Path traversal detected: ${key}`);
    }
    return resolved;
  }

  private async ensureDir(fp: string): Promise<void> {
    const dir = path.dirname(fp);
    try {
      await fs.mkdir(dir, { recursive: true });
    } catch (err: any) {
      if (err.code !== "EEXIST") throw err;
    }
  }

  async save(buffer: Buffer, key: string): Promise<void> {
    const fp = this.fullPath(key);
    await this.ensureDir(fp);
    await fs.writeFile(fp, buffer);
  }

  async get(key: string): Promise<Buffer | null> {
    const fp = this.fullPath(key);
    try {
      return await fs.readFile(fp);
    } catch (err: any) {
      if (err.code === "ENOENT") return null;
      throw err;
    }
  }

  async delete(key: string): Promise<void> {
    const fp = this.fullPath(key);
    try {
      await fs.unlink(fp);
    } catch (err: any) {
      if (err.code !== "ENOENT") throw err;
    }
  }

  async exists(key: string): Promise<boolean> {
    const fp = this.fullPath(key);
    try {
      await fs.access(fp, fsConstants.F_OK);
      return true;
    } catch {
      return false;
    }
  }

  getUrl(key: string): string {
    return `/uploads/${key}`;
  }
}

class S3CompatibleProvider implements IStorageProvider {
  private client: S3Client;
  private bucket: string;
  private endpoint: string;
  private publicUrlBase: string;

  constructor(config: { endpoint: string; bucket: string; accessKeyId: string; secretAccessKey: string; publicUrlBase?: string; region?: string }) {
    this.client = new S3Client({
      region: config.region || "auto",
      endpoint: config.endpoint,
      credentials: { accessKeyId: config.accessKeyId, secretAccessKey: config.secretAccessKey },
      forcePathStyle: true,
    });
    this.bucket = config.bucket;
    this.endpoint = config.endpoint;
    this.publicUrlBase = config.publicUrlBase || `${config.endpoint}/${config.bucket}`;
  }

  async save(buffer: Buffer, key: string): Promise<void> {
    await this.client.send(new PutObjectCommand({ Bucket: this.bucket, Key: key, Body: buffer }));
  }

  async get(key: string): Promise<Buffer | null> {
    try {
      const resp = await this.client.send(new GetObjectCommand({ Bucket: this.bucket, Key: key }));
      const chunks: Uint8Array[] = [];
      for await (const chunk of resp.Body as any) {
        chunks.push(chunk);
      }
      return Buffer.concat(chunks);
    } catch {
      return null;
    }
  }

  async delete(key: string): Promise<void> {
    await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
  }

  async exists(key: string): Promise<boolean> {
    try {
      await this.client.send(new HeadObjectCommand({ Bucket: this.bucket, Key: key }));
      return true;
    } catch {
      return false;
    }
  }

  getUrl(key: string): string {
    return `${this.publicUrlBase}/${key}`;
  }
}

let provider: IStorageProvider | null = null;

export function getStorageProvider(): IStorageProvider {
  if (provider) return provider;

  if (env.S3_ENDPOINT && env.S3_ACCESS_KEY_ID && env.S3_SECRET_ACCESS_KEY) {
    provider = new S3CompatibleProvider({
      endpoint: env.S3_ENDPOINT,
      bucket: env.S3_BUCKET_NAME || "myworkspace",
      accessKeyId: env.S3_ACCESS_KEY_ID,
      secretAccessKey: env.S3_SECRET_ACCESS_KEY,
      region: env.S3_REGION || "auto",
      publicUrlBase: env.S3_PUBLIC_URL || undefined,
    });
    return provider;
  }

  provider = new LocalStorageProvider();
  return provider;
}

export async function computeChecksum(buffer: Buffer): Promise<string> {
  const { createHash } = await import("crypto");
  return createHash("sha256").update(buffer).digest("hex");
}
