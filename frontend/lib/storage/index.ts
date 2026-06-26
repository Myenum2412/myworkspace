import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";

const R2_ENDPOINT = process.env.R2_ENDPOINT || "";
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID || "";
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY || "";
const R2_BUCKET = process.env.R2_BUCKET_NAME || "myworkspace";

function getClient(): S3Client {
  return new S3Client({
    region: "auto",
    endpoint: R2_ENDPOINT,
    credentials: { accessKeyId: R2_ACCESS_KEY_ID, secretAccessKey: R2_SECRET_ACCESS_KEY },
  });
}

export function isR2Configured(): boolean {
  return !!(R2_ENDPOINT && R2_ACCESS_KEY_ID && R2_SECRET_ACCESS_KEY);
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
    Bucket: R2_BUCKET,
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
    const resp = await client.send(new GetObjectCommand({ Bucket: R2_BUCKET, Key: storagePath }));
    const chunks: Uint8Array[] = [];
    for await (const chunk of resp.Body as AsyncIterable<Uint8Array>) {
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
  await client.send(new DeleteObjectCommand({ Bucket: R2_BUCKET, Key: storagePath }));
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
    await client.send(new HeadObjectCommand({ Bucket: R2_BUCKET, Key: storagePath }));
    return true;
  } catch {
    return false;
  }
}
