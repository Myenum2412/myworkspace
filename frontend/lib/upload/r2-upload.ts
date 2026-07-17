const CHUNK_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_CONCURRENT = 4;
const MAX_RETRIES = 3;

export interface UploadProgress {
  fileId: string;
  fileName: string;
  fileSize: number;
  uploadedBytes: number;
  totalBytes: number;
  speed: number; // bytes/sec
  status: "pending" | "uploading" | "paused" | "completed" | "error";
  error?: string;
  parts: { partNumber: number; etag?: string; status: "pending" | "uploading" | "completed" | "error" }[];
}

export type UploadEventCallback = (progress: UploadProgress) => void;

const activeUploads = new Map<string, { abort: () => void }>();

export class R2UploadService {
  async uploadFile(
    file: File,
    orgId: string,
    onProgress?: UploadEventCallback,
    options?: { signal?: AbortSignal }
  ): Promise<string> {
    const fileId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const totalChunks = Math.ceil(file.size / CHUNK_SIZE);

    const progress: UploadProgress = {
      fileId, fileName: file.name, fileSize: file.size,
      uploadedBytes: 0, totalBytes: file.size,
      speed: 0, status: "uploading",
      parts: Array.from({ length: totalChunks }, (_, i) => ({
        partNumber: i + 1, status: "pending" as const,
      })),
    };

    const cb = onProgress || (() => {});
    if (file.size <= CHUNK_SIZE) {
      return this.uploadSingle(file, file.name, orgId, cb, progress);
    }

    return this.uploadMultipart(file, file.name, orgId, totalChunks, cb, progress, options);
  }

  private async uploadSingle(
    file: File, fileName: string, orgId: string,
    onProgress: UploadEventCallback, progress: UploadProgress
  ): Promise<string> {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("orgId", orgId);

    const res = await fetch("/api/files/upload", { method: "POST", body: formData });
    if (!res.ok) throw new Error("Upload failed");

    const data = await res.json();
    progress.status = "completed";
    progress.uploadedBytes = file.size;
    onProgress(progress);
    return data.data?.id || data.data?.fileId || "";
  }

  private async uploadMultipart(
    file: File, fileName: string, orgId: string, totalChunks: number,
    onProgress: UploadEventCallback, progress: UploadProgress,
    options?: { signal?: AbortSignal }
  ): Promise<string> {
    const initRes = await fetch("/api/files/multipart/init", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fileName, orgId, contentType: file.type }),
    });
    if (!initRes.ok) throw new Error("Failed to initiate multipart upload");
    const { data: { uploadId, key } } = await initRes.json();

    const startTime = Date.now();
    let lastBytes = 0;
    const uploadedParts: { partNumber: number; etag: string }[] = [];
    let paused = false;

    const controller = new AbortController();
    const uploadId_ = uploadId;
    activeUploads.set(progress.fileId, { abort: () => controller.abort() });

    const uploadPart = async (partNumber: number): Promise<void> => {
      const start = (partNumber - 1) * CHUNK_SIZE;
      const end = Math.min(start + CHUNK_SIZE, file.size);
      const chunk = file.slice(start, end);

      for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
        try {
          if (options?.signal?.aborted || controller.signal.aborted) throw new DOMException("Aborted", "AbortError");
          if (paused) await new Promise(r => setTimeout(r, 100));

          const urlRes = await fetch("/api/files/multipart/part-url", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ uploadId: uploadId_, key, partNumber }),
          });
          if (!urlRes.ok) throw new Error("Failed to get part URL");
          const { data: { url } } = await urlRes.json();

          const uploadRes = await fetch(url, {
            method: "PUT", body: chunk,
            signal: controller.signal,
          });
          if (!uploadRes.ok) throw new Error(`Part ${partNumber} upload failed: ${uploadRes.status}`);

          const etag = uploadRes.headers.get("etag")?.replace(/"/g, "") || "";
          progress.parts[partNumber - 1] = { partNumber, etag, status: "completed" };
          uploadedParts.push({ partNumber, etag });

          const bytesUploaded = partNumber * CHUNK_SIZE < file.size ? partNumber * CHUNK_SIZE : file.size;
          progress.uploadedBytes = bytesUploaded;

          const elapsed = (Date.now() - startTime) / 1000;
          progress.speed = elapsed > 0 ? (bytesUploaded - lastBytes) / elapsed : 0;
          lastBytes = bytesUploaded;

          onProgress?.({ ...progress });
          return;
        } catch (err: any) {
          if (err.name === "AbortError") throw err;
          progress.parts[partNumber - 1] = { partNumber, status: "error" };
          onProgress?.({ ...progress });
          if (attempt < MAX_RETRIES - 1) {
            await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
          } else {
            throw err;
          }
        }
      }
    };

    try {
      const queue: Promise<void>[] = [];
      for (let i = 1; i <= totalChunks; i++) {
        while (queue.length >= MAX_CONCURRENT) {
          await queue.shift();
        }
        queue.push(uploadPart(i));
      }
      await Promise.all(queue);

      const completeRes = await fetch("/api/files/multipart/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uploadId: uploadId_, key, parts: uploadedParts, orgId }),
      });
      if (!completeRes.ok) throw new Error("Failed to complete multipart upload");

      progress.status = "completed";
      progress.uploadedBytes = file.size;
      onProgress?.({ ...progress });

      const data = await completeRes.json();
      return data.data?.fileId || key;
    } catch (err: any) {
      if (err.name !== "AbortError") {
        progress.status = "error";
        progress.error = err.message;
        onProgress?.({ ...progress });
        await fetch("/api/files/multipart/abort", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ uploadId: uploadId_, key }),
        });
      }
      throw err;
    } finally {
      activeUploads.delete(progress.fileId);
    }
  }

  pauseUpload(fileId: string): void {
    const upload = activeUploads.get(fileId);
    if (upload) upload.abort();
  }

  cancelUpload(fileId: string): void {
    const upload = activeUploads.get(fileId);
    if (upload) upload.abort();
    activeUploads.delete(fileId);
  }

  cancelAll(): void {
    for (const [id, upload] of activeUploads) {
      upload.abort();
      activeUploads.delete(id);
    }
  }
}

export const r2UploadService = new R2UploadService();
