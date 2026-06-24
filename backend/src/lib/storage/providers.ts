import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";
import { env } from "../../config/env.js";
import path from "path";
import fs from "fs";

export type StorageProviderType = "local" | "r2" | "s3" | "gcs" | "azure";

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
    if (!fs.existsSync(this.baseDir)) {
      fs.mkdirSync(this.baseDir, { recursive: true });
    }
  }

  private fullPath(key: string): string {
    const sanitized = key.replace(/\.\.\//g, "").replace(/~/g, "");
    return path.join(this.baseDir, sanitized);
  }

  async save(buffer: Buffer, key: string): Promise<void> {
    const fp = this.fullPath(key);
    const dir = path.dirname(fp);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(fp, buffer);
  }

  async get(key: string): Promise<Buffer | null> {
    const fp = this.fullPath(key);
    if (!fs.existsSync(fp)) return null;
    return fs.readFileSync(fp);
  }

  async delete(key: string): Promise<void> {
    const fp = this.fullPath(key);
    if (fs.existsSync(fp)) fs.unlinkSync(fp);
  }

  async exists(key: string): Promise<boolean> {
    return fs.existsSync(this.fullPath(key));
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

  if (env.R2_ENDPOINT && env.R2_ACCESS_KEY_ID && env.R2_SECRET_ACCESS_KEY) {
    provider = new S3CompatibleProvider({
      endpoint: env.R2_ENDPOINT,
      bucket: env.R2_BUCKET_NAME,
      accessKeyId: env.R2_ACCESS_KEY_ID,
      secretAccessKey: env.R2_SECRET_ACCESS_KEY,
      region: "auto",
    });
    return provider;
  }

  if (env.S3_ENDPOINT && env.S3_ACCESS_KEY_ID && env.S3_SECRET_ACCESS_KEY) {
    provider = new S3CompatibleProvider({
      endpoint: env.S3_ENDPOINT,
      bucket: env.S3_BUCKET_NAME || "myworkspace",
      accessKeyId: env.S3_ACCESS_KEY_ID,
      secretAccessKey: env.S3_SECRET_ACCESS_KEY,
      region: env.S3_REGION || "us-east-1",
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
