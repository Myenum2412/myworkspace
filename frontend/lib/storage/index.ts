import fs from "fs/promises";
import path from "path";

const UPLOADS_DIR = path.resolve(process.cwd(), "data", "uploads");

export async function deleteFile(storagePath: string): Promise<void> {
  const fp = path.join(UPLOADS_DIR, storagePath);
  const resolved = path.resolve(fp);
  if (!resolved.startsWith(UPLOADS_DIR)) {
    throw new Error("Path traversal detected");
  }
  try {
    await fs.unlink(resolved);
  } catch (err: any) {
    if (err.code !== "ENOENT") throw err;
  }
}

export interface R2UploadPart {
  partNumber: number;
  etag: string;
}

export interface R2MultipartUpload {
  uploadId: string;
  key: string;
}

export async function initiateR2MultipartUpload(fileName: string, orgId: string): Promise<R2MultipartUpload> {
  const res = await fetch("/api/files/multipart/init", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fileName, orgId }),
  });
  if (!res.ok) throw new Error("Failed to initiate multipart upload");
  const data = await res.json();
  return data.data;
}

export async function getR2UploadPartUrl(uploadId: string, key: string, partNumber: number): Promise<string> {
  const res = await fetch("/api/files/multipart/part-url", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ uploadId, key, partNumber }),
  });
  if (!res.ok) throw new Error("Failed to get part upload URL");
  const data = await res.json();
  return data.data.url;
}

export async function completeR2MultipartUpload(uploadId: string, key: string, parts: R2UploadPart[], orgId: string): Promise<void> {
  const res = await fetch("/api/files/multipart/complete", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ uploadId, key, parts, orgId }),
  });
  if (!res.ok) throw new Error("Failed to complete multipart upload");
}

export async function abortR2MultipartUpload(uploadId: string, key: string): Promise<void> {
  const res = await fetch("/api/files/multipart/abort", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ uploadId, key }),
  });
  if (!res.ok) throw new Error("Failed to abort multipart upload");
}

export async function getPresignedUploadUrl(fileName: string, contentType: string, orgId: string): Promise<string> {
  const res = await fetch("/api/files/presigned-upload", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fileName, contentType, orgId }),
  });
  if (!res.ok) throw new Error("Failed to get presigned upload URL");
  const data = await res.json();
  return data.data.url;
}

export function getR2PublicUrl(key: string): string {
  const base = process.env.NEXT_PUBLIC_R2_PUBLIC_URL || "";
  if (!base) return `/api/files/${key}`;
  return `${base}/${key}`;
}
