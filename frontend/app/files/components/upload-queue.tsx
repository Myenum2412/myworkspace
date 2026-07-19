"use client";

import { useCallback, useRef, useState } from "react";
import { useFileSystemStore } from "@/lib/file-system/store";
import { cn } from "@/lib/utils";
import {
  RiAlertLine,
  RiCheckLine,
  RiCloseLine,
  RiUploadCloud2Line,
} from "@remixicon/react";
import { toast } from "sonner";
import {
  Attachment,
  AttachmentAction,
  AttachmentActions,
  AttachmentContent,
  AttachmentDescription,
  AttachmentMedia,
  AttachmentTitle,
} from "@/components/ui/attachment";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { apiFetch } from "@/lib/api";

const MAX_SIZE = 50 * 1024 * 1024;
const R2_CHUNK_SIZE = 5 * 1024 * 1024;
const R2_MAX_CONCURRENCY = 4;

function getCsrfToken(): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(/(?:^|;\s*)csrf-token=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : null;
}

type UploadStatus = "uploading" | "done" | "error";

type UploadItem = {
  id: string;
  name: string;
  size: number;
  progress: number;
  status: UploadStatus;
  error?: string;
  xhr?: XMLHttpRequest;
};

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function UploadZone() {
  const {
    showUpload,
    setShowUpload,
    orgId,
    currentFolderId,
  } = useFileSystemStore();

  const [items, setItems] = useState<UploadItem[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dragDepth = useRef(0);

  const uploadViaPresigned = useCallback(
    async (item: UploadItem, file: File) => {
      try {
        const totalChunks = Math.ceil(file.size / R2_CHUNK_SIZE);
        setItems((prev) =>
          prev.map((i) => (i.id === item.id ? { ...i, progress: 0 } : i))
        );

        const initRes = await apiFetch("/api/files/presigned/multipart/init", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fileName: file.name,
            fileSize: file.size,
            mimeType: file.type,
            folderId: currentFolderId || null,
            orgId,
          }),
        });
        const initData = await initRes.json();
        if (!initData.data?.uploadId) throw new Error("Failed to initiate multipart upload");
        const { uploadId } = initData.data;

        const partUrls: string[] = [];
        for (let i = 0; i < totalChunks; i++) {
          const urlRes = await apiFetch("/api/files/presigned/multipart/part-url", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ uploadId, partNumber: i + 1, fileName: file.name }),
          });
          const urlData = await urlRes.json();
          if (!urlData.data?.url) throw new Error(`Failed to get presigned URL for part ${i + 1}`);
          partUrls.push(urlData.data.url);
        }

        const uploadedParts: { PartNumber: number; ETag: string }[] = [];
        let aborted = false;

        const uploadChunk = async (partNumber: number): Promise<void> => {
          const start = (partNumber - 1) * R2_CHUNK_SIZE;
          const end = Math.min(start + R2_CHUNK_SIZE, file.size);
          const blob = file.slice(start, end);

          const res = await fetch(partUrls[partNumber - 1], {
            method: "PUT",
            body: blob,
          });
          if (!res.ok) throw new Error(`Part ${partNumber} upload failed: ${res.status}`);
          const etag = res.headers.get("ETag") || "";
          uploadedParts.push({ PartNumber: partNumber, ETag: etag.replace(/^"/, "").replace(/"$/, "") });

          const pct = Math.round((uploadedParts.length / totalChunks) * 100);
          setItems((prev) =>
            prev.map((i) => (i.id === item.id ? { ...i, progress: pct } : i))
          );
        };

        const queue = Array.from({ length: totalChunks }, (_, i) => i + 1);
        while (queue.length > 0 && !aborted) {
          const batch = queue.splice(0, R2_MAX_CONCURRENCY);
          await Promise.all(batch.map(uploadChunk));
        }

        if (!aborted) {
          uploadedParts.sort((a, b) => a.PartNumber - b.PartNumber);
          const completeRes = await apiFetch("/api/files/presigned/multipart/complete", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              uploadId,
              fileName: file.name,
              parts: uploadedParts,
            }),
          });
          if (!completeRes.ok) throw new Error("Failed to complete multipart upload");
          setItems((prev) =>
            prev.map((i) =>
              i.id === item.id ? { ...i, progress: 100, status: "done" } : i
            )
          );
          toast.success(`${file.name} uploaded`);
        }
      } catch (err) {
        setItems((prev) =>
          prev.map((i) =>
            i.id === item.id
              ? { ...i, status: "error", error: err instanceof Error ? err.message : "Upload failed" }
              : i
          )
        );
      }
    },
    [orgId, currentFolderId]
  );

  const uploadViaDirect = useCallback(
    async (item: UploadItem, file: File) => {
      try {
        // Ensure CSRF cookie exists (file list often hits Next-local routes that never set it)
        if (!getCsrfToken()) {
          await fetch("/api/auth/session", { credentials: "include" }).catch(() => null);
          await fetch(`/api/folders/tree?orgId=${encodeURIComponent(orgId || "")}`, {
            credentials: "include",
          }).catch(() => null);
        }

        const formData = new FormData();
        formData.append("files", file);
        if (currentFolderId) formData.append("folderId", currentFolderId);
        if (orgId) formData.append("orgId", orgId);

        const xhr = new XMLHttpRequest();
        setItems((prev) =>
          prev.map((i) => (i.id === item.id ? { ...i, xhr } : i))
        );

        await new Promise<void>((resolve, reject) => {
          xhr.upload.onprogress = (e) => {
            if (e.lengthComputable) {
              const pct = Math.round((e.loaded / e.total) * 100);
              setItems((prev) =>
                prev.map((i) => (i.id === item.id ? { ...i, progress: pct } : i))
              );
            }
          };
          xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              setItems((prev) =>
                prev.map((i) =>
                  i.id === item.id ? { ...i, progress: 100, status: "done" } : i
                )
              );
              toast.success(`${file.name} uploaded`);
              resolve();
            } else {
              let detail = `Upload failed: ${xhr.status}`;
              try {
                const body = JSON.parse(xhr.responseText);
                if (body?.error) detail = `Upload failed: ${body.error}`;
              } catch { /* ignore */ }
              reject(new Error(detail));
            }
          };
          xhr.onerror = () => reject(new Error("Network error"));
          xhr.open("POST", "/api/files/upload");
          xhr.withCredentials = true;
          const csrf = getCsrfToken();
          if (csrf) xhr.setRequestHeader("x-csrf-token", csrf);
          xhr.send(formData);
        });
      } catch (err) {
        setItems((prev) =>
          prev.map((i) =>
            i.id === item.id
              ? { ...i, status: "error", error: err instanceof Error ? err.message : "Upload failed" }
              : i
          )
        );
      }
    },
    [orgId, currentFolderId]
  );

  const uploadFile = useCallback(
    async (item: UploadItem, file: File) => {
      if (file.size > MAX_SIZE) {
        await uploadViaPresigned(item, file);
      } else {
        await uploadViaDirect(item, file);
      }
    },
    [uploadViaDirect, uploadViaPresigned]
  );

  const addFiles = useCallback(
    (fileList: FileList | null) => {
      if (!fileList) return;
      const newItems: UploadItem[] = Array.from(fileList).map((file) => ({
        id: `${file.name}-${file.size}-${Date.now()}-${Math.random()}`,
        name: file.name,
        size: file.size,
        progress: 0,
        status: "uploading" as UploadStatus,
      }));
      setItems((prev) => [...newItems, ...prev]);

      newItems.forEach((item, idx) => {
        uploadFile(item, Array.from(fileList)[idx]);
      });
    },
    [uploadFile]
  );

  const removeItem = useCallback((id: string) => {
    setItems((prev) => {
      const item = prev.find((i) => i.id === id);
      if (item?.xhr) item.xhr.abort();
      return prev.filter((i) => i.id !== id);
    });
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      dragDepth.current = 0;
      setIsDragging(false);
      addFiles(event.dataTransfer.files);
    },
    [addFiles]
  );

  if (!showUpload) return null;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => inputRef.current?.click()}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          inputRef.current?.click();
        }
      }}
      onDragOver={(event) => {
        event.preventDefault();
      }}
      onDragEnter={(event) => {
        event.preventDefault();
        dragDepth.current += 1;
        setIsDragging(true);
      }}
      onDragLeave={(event) => {
        event.preventDefault();
        dragDepth.current -= 1;
        if (dragDepth.current <= 0) {
          dragDepth.current = 0;
          setIsDragging(false);
        }
      }}
      onDrop={onDrop}
      className={cn(
        "relative cursor-pointer flex flex-col items-center justify-center gap-3 border border-dashed px-6 py-8 text-center transition-colors outline-none rounded-lg",
        "focus-visible:ring-[3px] focus-visible:ring-ring/50",
        isDragging
          ? "border-primary bg-primary/5"
          : "border-muted-foreground/20 hover:bg-muted/40"
      )}
    >
      <input
        ref={inputRef}
        type="file"
        multiple
        className="sr-only"
        onChange={(event) => {
          addFiles(event.target.files);
          event.target.value = "";
        }}
      />
      <div
        className={cn(
          "flex size-10 items-center justify-center border transition-colors",
          isDragging
            ? "border-primary bg-background text-primary"
            : "border-border bg-background text-muted-foreground"
        )}
      >
        <RiUploadCloud2Line className="size-5" aria-hidden="true" />
      </div>
      <div className="flex flex-col gap-1">
        <p className="text-sm font-medium text-foreground">
          {isDragging
            ? "Release to upload"
            : "Drag & drop files or click to browse"}
        </p>
        <p className="text-xs text-muted-foreground">
          Max file size: 50 MB
        </p>
      </div>

      {items.length > 0 && (
        <div
          className="mt-4 w-full"
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-muted-foreground tabular-nums">
              <span className="font-medium text-foreground">{items.length}</span>{" "}
              {items.length === 1 ? "File" : "Files"}
            </p>
            <button
              type="button"
              onClick={() => setItems([])}
              className="text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              Clear All
            </button>
          </div>
          <ul className="flex flex-col gap-2">
            {items.map((item) => (
              <li key={item.id}>
                <Attachment state={item.status} size="sm" className="w-full">
                  <AttachmentMedia>
                    {item.status === "error" ? (
                      <RiAlertLine aria-hidden="true" />
                    ) : item.status === "done" ? (
                      <RiCheckLine className="text-primary" aria-hidden="true" />
                    ) : (
                      <Spinner />
                    )}
                  </AttachmentMedia>
                  <AttachmentContent>
                    <AttachmentTitle>{item.name}</AttachmentTitle>
                    <AttachmentDescription className="tabular-nums">
                      {item.status === "error"
                        ? item.error
                        : item.status === "done"
                          ? `Uploaded ${formatSize(item.size)}`
                          : `Uploading ${Math.round(item.progress)}%`}
                    </AttachmentDescription>
                  </AttachmentContent>
                  <AttachmentActions>
                    <AttachmentAction
                      aria-label={`Remove ${item.name}`}
                      onClick={() => removeItem(item.id)}
                    >
                      <RiCloseLine aria-hidden="true" />
                    </AttachmentAction>
                  </AttachmentActions>
                </Attachment>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
