import path from "path";
import fs from "fs/promises";
import { constants as fsConstants } from "fs";
import { Readable } from "stream";
import {
  getR2Client,
  getR2Config,
  isR2Configured,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  CopyObjectCommand,
  CreateMultipartUploadCommand,
  UploadPartCommand,
  CompleteMultipartUploadCommand,
  AbortMultipartUploadCommand,
  ListPartsCommand,
  getSignedUrl,
} from "./r2-client.js";
import { logger } from "../logger/index.js";

export type StorageProviderType = "local" | "r2";

export interface IStorageProvider {
  save(buffer: Buffer, key: string): Promise<void>;
  saveStream(stream: Readable, key: string): Promise<void>;
  get(key: string): Promise<Buffer | null>;
  getStream(key: string): Promise<Readable | null>;
  delete(key: string): Promise<void>;
  exists(key: string): Promise<boolean>;
  getUrl(key: string): string;
  getPresignedUrl(key: string, expiresIn?: number): Promise<string>;
  getPresignedUploadUrl(key: string, expiresIn?: number): Promise<string>;
  copy(sourceKey: string, destKey: string): Promise<void>;
  initMultipartUpload(key: string): Promise<string>;
  getPresignedUploadPartUrl(key: string, uploadId: string, partNumber: number): Promise<string>;
  completeMultipartUpload(key: string, uploadId: string, parts: { ETag: string; PartNumber: number }[]): Promise<void>;
  abortMultipartUpload(key: string, uploadId: string): Promise<void>;
  list(prefix: string): Promise<string[]>;
}

export class LocalStorageProvider implements IStorageProvider {
  private baseDir: string;

  constructor() {
    this.baseDir = path.resolve(process.cwd(), "data", "uploads");
  }

  private fullPath(key: string): string {
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

  async saveStream(stream: Readable, key: string): Promise<void> {
    const fp = this.fullPath(key);
    await this.ensureDir(fp);
    const ws = (await import("fs")).createWriteStream(fp);
    await new Promise<void>((resolve, reject) => {
      stream.pipe(ws);
      ws.on("finish", resolve);
      ws.on("error", reject);
      stream.on("error", reject);
    });
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

  async getStream(key: string): Promise<Readable | null> {
    const fp = this.fullPath(key);
    try {
      await fs.access(fp, fsConstants.F_OK);
      const { createReadStream } = await import("fs");
      return createReadStream(fp) as Readable;
    } catch {
      return null;
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

  async getPresignedUrl(_key: string, _expiresIn = 3600): Promise<string> {
    throw new Error("Presigned URLs not supported for local storage");
  }

  async getPresignedUploadUrl(_key: string, _expiresIn = 3600): Promise<string> {
    throw new Error("Presigned upload URLs not supported for local storage");
  }

  async copy(sourceKey: string, destKey: string): Promise<void> {
    const buffer = await this.get(sourceKey);
    if (!buffer) throw new Error(`Source not found: ${sourceKey}`);
    await this.save(buffer, destKey);
  }

  async initMultipartUpload(_key: string): Promise<string> {
    throw new Error("Multipart upload not supported for local storage");
  }

  async getPresignedUploadPartUrl(_key: string, _uploadId: string, _partNumber: number): Promise<string> {
    throw new Error("Multipart upload not supported for local storage");
  }

  async completeMultipartUpload(_key: string, _uploadId: string, _parts: { ETag: string; PartNumber: number }[]): Promise<void> {
    throw new Error("Multipart upload not supported for local storage");
  }

  async abortMultipartUpload(_key: string, _uploadId: string): Promise<void> {
    throw new Error("Multipart upload not supported for local storage");
  }

  async list(prefix: string): Promise<string[]> {
    const dir = this.fullPath(prefix);
    try {
      const entries = await fs.readdir(path.dirname(dir), { withFileTypes: true });
      return entries.filter(e => e.isFile()).map(e => e.name);
    } catch {
      return [];
    }
  }
}

export class R2StorageProvider implements IStorageProvider {
  async save(buffer: Buffer, key: string): Promise<void> {
    const client = getR2Client();
    const { bucket } = getR2Config();
    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: buffer,
    });
    await client.send(command);
  }

  async saveStream(stream: Readable, key: string): Promise<void> {
    const client = getR2Client();
    const { bucket } = getR2Config();
    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: Buffer.concat(chunks),
    });
    await client.send(command);
  }

  async get(key: string): Promise<Buffer | null> {
    const client = getR2Client();
    const { bucket } = getR2Config();
    try {
      const command = new GetObjectCommand({ Bucket: bucket, Key: key });
      const response = await client.send(command);
      if (!response.Body) return null;
      const chunks: Uint8Array[] = [];
      const stream = response.Body as Readable;
      for await (const chunk of stream) {
        chunks.push(chunk instanceof Buffer ? chunk : Buffer.from(chunk));
      }
      return Buffer.concat(chunks);
    } catch (err: any) {
      if (err.name === "NoSuchKey") return null;
      throw err;
    }
  }

  async getStream(key: string): Promise<Readable | null> {
    const client = getR2Client();
    const { bucket } = getR2Config();
    try {
      const command = new GetObjectCommand({ Bucket: bucket, Key: key });
      const response = await client.send(command);
      if (!response.Body) return null;
      return response.Body as Readable;
    } catch (err: any) {
      if (err.name === "NoSuchKey") return null;
      throw err;
    }
  }

  async delete(key: string): Promise<void> {
    const client = getR2Client();
    const { bucket } = getR2Config();
    const command = new DeleteObjectCommand({ Bucket: bucket, Key: key });
    await client.send(command);
  }

  async exists(key: string): Promise<boolean> {
    const client = getR2Client();
    const { bucket } = getR2Config();
    try {
      const command = new HeadObjectCommand({ Bucket: bucket, Key: key });
      await client.send(command);
      return true;
    } catch (err: any) {
      if (err.name === "NotFound" || err.name === "NoSuchKey") return false;
      throw err;
    }
  }

  getUrl(key: string): string {
    const { publicUrl, bucket, endpoint } = getR2Config();
    if (publicUrl) {
      return `${publicUrl.replace(/\/+$/, "")}/${key}`;
    }
    return `${endpoint.replace(/\/+$/, "")}/${bucket}/${key}`;
  }

  async getPresignedUrl(key: string, expiresIn = 3600): Promise<string> {
    const client = getR2Client();
    const { bucket } = getR2Config();
    const command = new GetObjectCommand({ Bucket: bucket, Key: key });
    return getSignedUrl(client, command, { expiresIn });
  }

  async getPresignedUploadUrl(key: string, expiresIn = 3600): Promise<string> {
    const client = getR2Client();
    const { bucket } = getR2Config();
    const command = new PutObjectCommand({ Bucket: bucket, Key: key });
    return getSignedUrl(client, command, { expiresIn });
  }

  async copy(sourceKey: string, destKey: string): Promise<void> {
    const client = getR2Client();
    const { bucket } = getR2Config();
    const command = new CopyObjectCommand({
      Bucket: bucket,
      CopySource: `${bucket}/${sourceKey}`,
      Key: destKey,
    });
    await client.send(command);
  }

  async initMultipartUpload(key: string): Promise<string> {
    const client = getR2Client();
    const { bucket } = getR2Config();
    const command = new CreateMultipartUploadCommand({ Bucket: bucket, Key: key });
    const response = await client.send(command);
    return response.UploadId || "";
  }

  async getPresignedUploadPartUrl(key: string, uploadId: string, partNumber: number): Promise<string> {
    const client = getR2Client();
    const { bucket } = getR2Config();
    const command = new UploadPartCommand({
      Bucket: bucket,
      Key: key,
      UploadId: uploadId,
      PartNumber: partNumber,
    });
    return getSignedUrl(client, command, { expiresIn: 3600 });
  }

  async completeMultipartUpload(key: string, uploadId: string, parts: { ETag: string; PartNumber: number }[]): Promise<void> {
    const client = getR2Client();
    const { bucket } = getR2Config();
    const command = new CompleteMultipartUploadCommand({
      Bucket: bucket,
      Key: key,
      UploadId: uploadId,
      MultipartUpload: { Parts: parts },
    });
    await client.send(command);
  }

  async abortMultipartUpload(key: string, uploadId: string): Promise<void> {
    const client = getR2Client();
    const { bucket } = getR2Config();
    const command = new AbortMultipartUploadCommand({
      Bucket: bucket,
      Key: key,
      UploadId: uploadId,
    });
    await client.send(command);
  }

  async list(prefix: string): Promise<string[]> {
    const client = getR2Client();
    const { bucket } = getR2Config();
    const keys: string[] = [];
    let continuationToken: string | undefined;

    do {
      const command = new ListObjectsV2Command({
        Bucket: bucket,
        Prefix: prefix,
        ContinuationToken: continuationToken,
      });
      const response = await client.send(command);
      if (response.Contents) {
        for (const obj of response.Contents) {
          if (obj.Key) keys.push(obj.Key);
        }
      }
      continuationToken = response.NextContinuationToken;
    } while (continuationToken);

    return keys;
  }
}

export function getStorageProvider(): IStorageProvider {
  if (isR2Configured()) {
    logger.info("Using R2 storage provider");
    return new R2StorageProvider();
  }
  return new LocalStorageProvider();
}

export function isLocalProvider(): boolean {
  return !isR2Configured();
}

export function getStorageType(): "local" | "r2" {
  return isR2Configured() ? "r2" : "local";
}

export async function computeChecksum(buffer: Buffer): Promise<string> {
  const { createHash } = await import("crypto");
  return createHash("sha256").update(buffer).digest("hex");
}
