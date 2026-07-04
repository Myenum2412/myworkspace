import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";

const S3_ENDPOINT = process.env.S3_ENDPOINT || "";
const S3_ACCESS_KEY_ID = process.env.S3_ACCESS_KEY_ID || "";
const S3_SECRET_ACCESS_KEY = process.env.S3_SECRET_ACCESS_KEY || "";
const S3_BUCKET = process.env.S3_BUCKET_NAME || "myworkspace";
const S3_REGION = process.env.S3_REGION || "us-east-1";

function getClient(): S3Client {
  return new S3Client({
    region: S3_REGION,
    endpoint: S3_ENDPOINT,
    credentials: { accessKeyId: S3_ACCESS_KEY_ID, secretAccessKey: S3_SECRET_ACCESS_KEY },
  });
}

export function isS3Configured(): boolean {
  return !!(S3_ENDPOINT && S3_ACCESS_KEY_ID && S3_SECRET_ACCESS_KEY);
}

export async function saveFile(buffer: Buffer, fileName: string): Promise<string> {
  const storagePath = `${Date.now()}-${fileName}`;
  if (!isS3Configured()) {
    const fs = await import("fs");
    const path = await import("path");
    const UPLOADS_DIR = path.resolve(process.cwd(), "data", "uploads");
    if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });
    fs.writeFileSync(path.join(UPLOADS_DIR, storagePath), buffer);
    return storagePath;
  }
  const client = getClient();
  await client.send(new PutObjectCommand({
    Bucket: S3_BUCKET,
    Key: storagePath,
    Body: buffer,
  }));
  return storagePath;
}

export async function getFileBuffer(storagePath: string): Promise<Buffer | null> {
  if (!isS3Configured()) {
    const fs = await import("fs");
    const path = await import("path");
    const UPLOADS_DIR = path.resolve(process.cwd(), "data", "uploads");
    const fullPath = path.join(UPLOADS_DIR, storagePath);
    if (!fs.existsSync(fullPath)) return null;
    return fs.readFileSync(fullPath);
  }
  try {
    const client = getClient();
    const resp = await client.send(new GetObjectCommand({ Bucket: S3_BUCKET, Key: storagePath }));
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
  if (!isS3Configured()) {
    const fs = await import("fs");
    const path = await import("path");
    const UPLOADS_DIR = path.resolve(process.cwd(), "data", "uploads");
    const fullPath = path.join(UPLOADS_DIR, storagePath);
    if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
    return;
  }
  const client = getClient();
  await client.send(new DeleteObjectCommand({ Bucket: S3_BUCKET, Key: storagePath }));
}

export async function fileExists(storagePath: string): Promise<boolean> {
  if (!isS3Configured()) {
    const fs = await import("fs");
    const path = await import("path");
    const UPLOADS_DIR = path.resolve(process.cwd(), "data", "uploads");
    return fs.existsSync(path.join(UPLOADS_DIR, storagePath));
  }
  try {
    const client = getClient();
    await client.send(new HeadObjectCommand({ Bucket: S3_BUCKET, Key: storagePath }));
    return true;
  } catch {
    return false;
  }
}
