import * as tus from "tus-js-client";
import { v4 as uuid } from "uuid";
import SparkMD5 from "spark-md5";
import type { UploadOptions, UploadFile, UploadSessionData, UploadStatus } from "./types";
import { saveSession, getSession, updateSessionStatus, updateSessionOffset, deleteSession } from "./idb-sessions";
import { networkDetector } from "./network-detector";

const TUS_ENDPOINT = process.env.NEXT_PUBLIC_TUS_ENDPOINT || "/api/files-tus";
const DEFAULT_CHUNK_SIZE = 10 * 1024 * 1024;
const MAX_RETRIES = 5;
const RETRY_DELAYS = [1000, 2000, 4000, 8000, 16000];
const MAX_PARALLEL_UPLOADS = 3;

function generateUploadId(): string {
  return `upload_${uuid()}`;
}

function calculateChecksum(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunkSize = 2 * 1024 * 1024;
    const spark = new SparkMD5.ArrayBuffer();
    const reader = new FileReader();
    let currentChunk = 0;

    reader.onerror = () => reject(new Error("Failed to read file for checksum"));

    const loadNext = () => {
      const start = currentChunk * chunkSize;
      const end = Math.min(start + chunkSize, file.size);
      const blob = file.slice(start, end);
      reader.readAsArrayBuffer(blob);
    };

    reader.onload = (e) => {
      if (e.target?.result) {
        spark.append(e.target.result as ArrayBuffer);
        currentChunk++;
        if (currentChunk * chunkSize < file.size) {
          loadNext();
        } else {
          resolve(spark.end());
        }
      }
    };

    loadNext();
  });
}

function getAuthToken(): string | null {
  if (typeof window === "undefined") return null;
  const token = localStorage.getItem("auth-token");
  if (token) return token;
  try {
    const nextAuth = document.cookie
      .split("; ")
      .find((row) => row.startsWith("next-auth.session-token="))
      ?.split("=")[1];
    return nextAuth || null;
  } catch {
    return null;
  }
}

export interface CreateUploadResult {
  uploadId: string;
  file: UploadFile;
  start: () => void;
  pause: () => void;
  resume: () => void;
  cancel: () => void;
}

type ProgressCallback = (update: Partial<UploadFile>) => void;
type CompletionCallback = (result: { success: boolean; fileId?: string; error?: string }) => void;

export async function createUpload(
  file: File,
  options: UploadOptions,
  onProgress?: ProgressCallback,
  onComplete?: CompletionCallback,
): Promise<CreateUploadResult> {
  const uploadId = generateUploadId();
  const checksum = await calculateChecksum(file);
  const chunkSize = options.chunkSize || networkDetector.getChunkSizeForNetwork();
  const parallelCount = options.parallelUploads || networkDetector.getParallelUploadsForNetwork() || MAX_PARALLEL_UPLOADS;

  const uploadFile: UploadFile = {
    id: uploadId,
    file,
    name: file.name,
    size: file.size,
    mimeType: file.type || "application/octet-stream",
    progress: 0,
    status: "pending",
    speed: 0,
    eta: 0,
    checksum,
    retryCount: 0,
    chunkSize,
    parallelUploads: parallelCount,
  };

  const context = btoa(
    JSON.stringify({
      orgId: options.orgId,
      workspaceId: options.workspaceId,
      projectId: options.projectId,
      clientId: options.clientId,
      staffId: options.staffId,
      departmentId: options.departmentId,
      folderId: options.folderId,
      fileName: file.name,
      originalName: file.name,
      mimeType: file.type || "application/octet-stream",
      checksum,
      tags: options.tags,
      description: options.description,
    }),
  );

  let upload: tus.Upload | null = null;
  let startTime = 0;
  let lastBytes = 0;
  let lastTime = 0;
  let isCancelled = false;

  const metadata: Record<string, string> = {
    fileName: file.name,
    originalName: file.name,
    mimeType: file.type || "application/octet-stream",
    orgId: options.orgId,
    checksum,
    uploaderId: "",
  };
  if (options.folderId) metadata.folderId = options.folderId;
  if (options.projectId) metadata.projectId = options.projectId;
  if (options.clientId) metadata.clientId = options.clientId;
  if (options.workspaceId) metadata.workspaceId = options.workspaceId;

  const sessionData: UploadSessionData = {
    uploadId,
    tusUrl: TUS_ENDPOINT,
    file: { name: file.name, size: file.size, mimeType: file.type || "application/octet-stream" },
    metadata,
    offset: 0,
    status: "pending",
    createdAt: Date.now(),
    updatedAt: Date.now(),
    checksum,
  };

  await saveSession(sessionData);

  const createTusUpload = (): tus.Upload => {
    const token = getAuthToken();
    const headers: Record<string, string> = {};
    if (token) headers["Authorization"] = `Bearer ${token}`;
    headers["x-upload-context"] = context;

    return new tus.Upload(file, {
      endpoint: TUS_ENDPOINT,
      retryDelays: RETRY_DELAYS,
      chunkSize,
      parallelUploads: parallelCount,
      metadata,
      headers,
      removeFingerprintOnSuccess: true,
      storeFingerprintForResuming: true,
      uploadDataDuringCreation: false,
      parallelUploadBoundaries: parallelCount > 1 ? undefined : undefined,

      onError: async (error: Error) => {
        if (isCancelled) return;
        uploadFile.retryCount++;
        uploadFile.error = error.message;
        uploadFile.status = "failed";
        onProgress?.(uploadFile);

        await updateSessionStatus(uploadId, "failed");

        if (uploadFile.retryCount < MAX_RETRIES) {
          const delay = RETRY_DELAYS[Math.min(uploadFile.retryCount - 1, RETRY_DELAYS.length - 1)];
          setTimeout(() => {
            if (!isCancelled) {
              uploadFile.status = "uploading";
              onProgress?.(uploadFile);
              upload = createTusUpload();
              upload.start();
            }
          }, delay);
          return;
        }

        onComplete?.({ success: false, error: error.message });
      },

      onProgress: async (bytesSent: number, bytesTotal: number) => {
        const now = Date.now();
        if (startTime === 0) startTime = now;

        const elapsed = (now - startTime) / 1000;
        const progress = bytesTotal > 0 ? Math.round((bytesSent / bytesTotal) * 100) : 0;

        if (lastTime > 0) {
          const deltaBytes = bytesSent - lastBytes;
          const deltaTime = (now - lastTime) / 1000;
          uploadFile.speed = deltaTime > 0 ? deltaBytes / deltaTime : 0;
        }

        lastBytes = bytesSent;
        lastTime = now;
        uploadFile.progress = progress;
        uploadFile.startedAt = startTime;

        if (uploadFile.speed > 0) {
          const remaining = bytesTotal - bytesSent;
          uploadFile.eta = remaining / uploadFile.speed;
        }

        onProgress?.(uploadFile);
        await updateSessionOffset(uploadId, bytesSent);
      },

      onSuccess: async () => {
        if (isCancelled) return;
        uploadFile.status = "completed";
        uploadFile.progress = 100;
        uploadFile.completedAt = Date.now();
        onProgress?.(uploadFile);

        await updateSessionStatus(uploadId, "completed");
        onComplete?.({ success: true });
      },

      onAfterResponse: async (_req: any, res: tus.HttpResponse) => {
        const location = res.getHeader("Location");
        if (location) {
          const tusId = location.split("/").pop();
          if (tusId) {
            uploadFile.tusId = tusId;
            sessionData.uploadId = tusId;
            await updateSessionStatus(uploadId, "uploading");
          }
        }
      },
    });
  };

  upload = createTusUpload();

  return {
    uploadId,
    file: uploadFile,
    start: () => {
      isCancelled = false;
      uploadFile.status = "uploading";
      onProgress?.(uploadFile);
      upload?.start();
    },
    pause: () => {
      upload?.abort();
      uploadFile.status = "paused";
      onProgress?.(uploadFile);
      updateSessionStatus(uploadId, "paused");
    },
    resume: () => {
      uploadFile.status = "uploading";
      onProgress?.(uploadFile);
      upload = createTusUpload();
      upload.start();
    },
    cancel: () => {
      isCancelled = true;
      upload?.abort();
      uploadFile.status = "cancelled";
      onProgress?.(uploadFile);
      deleteSession(uploadId);
    },
  };
}

export async function getUploadStatus(tusId: string): Promise<{ success: boolean; data: any } | null> {
  try {
    const token = getAuthToken();
    const headers: Record<string, string> = {};
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const res = await fetch(`/api/files-advanced/status/${tusId}`, { headers });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export async function resumePendingSessions(
  options: UploadOptions,
  onProgress?: ProgressCallback,
  onComplete?: CompletionCallback,
): Promise<void> {
  const { getPendingSessions: getPending } = await import("./idb-sessions");
  const pending = await getPending();

  for (const session of pending) {
    if (session.status === "completed" || session.status === "cancelled") continue;

    const status = await getUploadStatus(session.uploadId);
    if (status?.success && status.data) {
      const { status: serverStatus, fileId } = status.data;
      if (serverStatus === "finalized" || serverStatus === "duplicate") {
        await updateSessionStatus(session.uploadId, "completed");
        onComplete?.({ success: true, fileId: fileId || undefined });
        continue;
      }
    }
  }
}