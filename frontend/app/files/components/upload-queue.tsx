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

const MAX_SIZE = 50 * 1024 * 1024;

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

  const uploadFile = useCallback(
    async (item: UploadItem, file: File) => {
      try {
        const formData = new FormData();
        formData.append("file", file);
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
              reject(new Error(`Upload failed: ${xhr.status}`));
            }
          };
          xhr.onerror = () => reject(new Error("Network error"));
          xhr.open("POST", "/api/files/upload");
          xhr.withCredentials = true;
          xhr.send(formData);
        });
      } catch (err) {
        setItems((prev) =>
          prev.map((i) =>
            i.id === item.id
              ? {
                  ...i,
                  status: "error",
                  error: err instanceof Error ? err.message : "Upload failed",
                }
              : i
          )
        );
      }
    },
    [orgId, currentFolderId]
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
