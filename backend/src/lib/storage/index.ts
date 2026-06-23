import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";
import { env } from "../../config/env.js";

function getClient(): S3Client {
  return new S3Client({
    region: "auto",
    endpoint: env.R2_ENDPOINT,
    credentials: { accessKeyId: env.R2_ACCESS_KEY_ID, secretAccessKey: env.R2_SECRET_ACCESS_KEY },
  });
}

function isR2Configured(): boolean {
  return !!(env.R2_ENDPOINT && env.R2_ACCESS_KEY_ID && env.R2_SECRET_ACCESS_KEY);
}

export async function saveFile(buffer: Buffer, fileName: string): Promise<string> {
  const storagePath = `${Date.now()}-${fileName}`;
  if (!isR2Configured()) {
    const fs = await import("fs");
    const path = await import("path");
    const UPLOADS_DIR = path.resolve(process.cwd(), "data", "uploads");
    if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });
    fs.writeFileSync(path.join(UPLOADS_DIR, storagePath), buffer);
    return storagePath;
  }
  const client = getClient();
  await client.send(new PutObjectCommand({
    Bucket: env.R2_BUCKET_NAME,
    Key: storagePath,
    Body: buffer,
  }));
  return storagePath;
}

export async function getFileBuffer(storagePath: string): Promise<Buffer | null> {
  if (!isR2Configured()) {
    const fs = await import("fs");
    const path = await import("path");
    const UPLOADS_DIR = path.resolve(process.cwd(), "data", "uploads");
    const fullPath = path.join(UPLOADS_DIR, storagePath);
    if (!fs.existsSync(fullPath)) return null;
    return fs.readFileSync(fullPath);
  }
  try {
    const client = getClient();
    const resp = await client.send(new GetObjectCommand({ Bucket: env.R2_BUCKET_NAME, Key: storagePath }));
    const chunks: Uint8Array[] = [];
    for await (const chunk of resp.Body as any) {
      chunks.push(chunk);
    }
    return Buffer.concat(chunks);
  } catch {
    return null;
  }
}

export async function deleteFile(storagePath: string): Promise<void> {
  if (!isR2Configured()) {
    const fs = await import("fs");
    const path = await import("path");
    const UPLOADS_DIR = path.resolve(process.cwd(), "data", "uploads");
    const fullPath = path.join(UPLOADS_DIR, storagePath);
    if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
    return;
  }
  const client = getClient();
  await client.send(new DeleteObjectCommand({ Bucket: env.R2_BUCKET_NAME, Key: storagePath }));
}

export function getFilePath(storagePath: string): string {
  const path = require("path");
  return path.resolve(process.cwd(), "data", "uploads", storagePath);
}

export async function fileExists(storagePath: string): Promise<boolean> {
  if (!isR2Configured()) {
    const fs = await import("fs");
    const path = await import("path");
    const UPLOADS_DIR = path.resolve(process.cwd(), "data", "uploads");
    return fs.existsSync(path.join(UPLOADS_DIR, storagePath));
  }
  try {
    const client = getClient();
    await client.send(new HeadObjectCommand({ Bucket: env.R2_BUCKET_NAME, Key: storagePath }));
    return true;
  } catch {
    return false;
  }
}
