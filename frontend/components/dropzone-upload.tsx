"use client";

import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import {
  UploadIcon, XIcon, FileIcon, FolderIcon, Loader2Icon,
  AlertCircleIcon, CheckCircle2Icon, RefreshCwIcon, BanIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type UploadStatus = "pending" | "uploading" | "done" | "error" | "cancelled" | "duplicate";

interface UploadItem {
  id: string;
  file: File;
  relativePath: string;
  size: number;
  progress: number;
  status: UploadStatus;
  error?: string;
  speed: number;
  xhr: XMLHttpRequest | null;
  startTime: number;
}

interface DropZoneUploadProps {
  orgId: string;
  folderId?: string | null;
  clientId?: string | null;
  onUploadComplete?: () => void;
  maxConcurrency?: number;
}

const ALLOWED_EXTENSIONS = [
  "jpg", "jpeg", "png", "gif", "webp", "svg", "bmp", "tiff", "ico", "heic",
  "pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx",
  "txt", "csv", "rtf", "odt", "ods", "odp",
  "json", "xml", "yaml", "yml", "sql", "md",
  "zip", "rar", "7z", "tar", "gz",
  "mp4", "mov", "avi", "mkv", "webm", "mpeg", "mpg", "3gp",
  "mp3", "wav", "aac", "ogg", "flac", "m4a",
  "js", "ts", "jsx", "tsx", "py", "rb", "go", "rs", "java",
  "c", "cpp", "cs", "php", "sh",
  "css", "scss", "less", "html", "htm",
  "psd", "ai", "sketch", "fig",
  "woff", "woff2", "ttf", "eot",
];

const MAX_FILE_SIZE = 500 * 1024 * 1024;

function formatSize(bytes: number): string {
  if (!bytes) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function formatSpeed(bytesPerSec: number): string {
  if (!bytesPerSec) return "";
  if (bytesPerSec < 1024) return `${bytesPerSec.toFixed(0)} B/s`;
  if (bytesPerSec < 1024 * 1024) return `${(bytesPerSec / 1024).toFixed(1)} KB/s`;
  return `${(bytesPerSec / (1024 * 1024)).toFixed(1)} MB/s`;
}

function getStatusIcon(status: UploadStatus) {
  switch (status) {
    case "uploading": return <Loader2Icon className="size-4 animate-spin" />;
    case "done": return <CheckCircle2Icon className="size-4 text-emerald-600" />;
    case "duplicate": return <CheckCircle2Icon className="size-4 text-amber-600" />;
    case "error": return <AlertCircleIcon className="size-4 text-destructive" />;
    case "cancelled": return <BanIcon className="size-4 text-muted-foreground" />;
    default: return null;
  }
}

type WalkResult = { file: File; relativePath: string };

function walkEntry(entry: FileSystemEntry, parentPath = ""): Promise<WalkResult[]> {
  return new Promise((resolve) => {
    if (entry.isFile) {
      (entry as FileSystemFileEntry).file(
        (file) => {
          const relativePath = parentPath ? `${parentPath}/${file.name}` : file.name;
          resolve([{ file, relativePath }]);
        },
        () => resolve([]),
      );
    } else if (entry.isDirectory) {
      const dir = entry as FileSystemDirectoryEntry;
      const reader = dir.createReader();
      const readAll = (entries: FileSystemEntry[] = []): Promise<FileSystemEntry[]> =>
        new Promise((r) => {
          reader.readEntries((results) => {
            if (results.length) {
              readAll([...entries, ...results]).then(r);
            } else {
              r(entries);
            }
          });
        });
      readAll().then(async (entries) => {
        const dirPath = parentPath ? `${parentPath}/${entry.name}` : entry.name;
        const results = await Promise.all(entries.map((e) => walkEntry(e, dirPath)));
        resolve(results.flat());
      });
    } else {
      resolve([]);
    }
  });
}

async function extractFiles(items: DataTransferItemList): Promise<WalkResult[]> {
  const entries: FileSystemEntry[] = [];
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (item.kind === "file") {
      const entry = item.webkitGetAsEntry();
      if (entry) entries.push(entry);
    }
  }
  const results = await Promise.all(entries.map((e) => walkEntry(e)));
  return results.flat();
}

export function DropZoneUpload({
  orgId,
  folderId,
  clientId,
  onUploadComplete,
  maxConcurrency = 3,
}: DropZoneUploadProps) {
  const [items, setItems] = useState<UploadItem[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const activeUploads = useRef(0);
  const uploadQueue = useRef<(() => Promise<void>)[]>([]);
  const processRef = useRef<() => void>(() => {});

  const completedCount = useMemo(
    () => items.filter((i) => i.status === "done" || i.status === "duplicate").length,
    [items],
  );

  const errorCount = useMemo(
    () => items.filter((i) => i.status === "error").length,
    [items],
  );

  const uploadingCount = useMemo(
    () => items.filter((i) => i.status === "uploading").length,
    [items],
  );

  useEffect(() => {
    if (completedCount > 0 && completedCount === items.length && errorCount === 0) {
      const timer = setTimeout(() => {
        setItems((prev) => prev.filter((i) => i.status !== "done" && i.status !== "duplicate"));
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [completedCount, items.length, errorCount]);

  const createFoldersForPath = useCallback(
    async (path: string): Promise<string | null> => {
      const parts = path.split("/").filter(Boolean);
      let parentFolderId = folderId || null;
      for (let i = 0; i < parts.length; i++) {
        const folderName = parts[i];
        try {
          const res = await fetch("/api/folders", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({
              orgId,
              parentId: parentFolderId,
              name: folderName,
              clientId: clientId || undefined,
            }),
          });
          if (res.ok) {
            const data = await res.json();
            parentFolderId = data.folderId || data.id || null;
          } else {
            const text = await res.text();
            try {
              const errData = JSON.parse(text);
              if (errData.folderId) {
                parentFolderId = errData.folderId;
              } else if (errData.id) {
                parentFolderId = errData.id;
              } else {
                return null;
              }
            } catch {
              return null;
            }
          }
        } catch {
          return null;
        }
      }
      return parentFolderId;
    },
    [orgId, folderId, clientId],
  );

  const uploadSingleFile = useCallback(
    async (item: UploadItem): Promise<void> => {
      const xhr = new XMLHttpRequest();
      const formData = new FormData();

      let targetFolderId = folderId || null;

      if (item.relativePath && item.relativePath !== item.file.name) {
        const dirPath = item.relativePath.substring(
          0,
          item.relativePath.length - item.file.name.length,
        );
        const created = await createFoldersForPath(dirPath);
        if (created) targetFolderId = created;
      }

      formData.append("files", item.file);
      formData.append("orgId", orgId);
      if (targetFolderId) formData.append("folderId", targetFolderId);
      if (clientId) formData.append("clientId", clientId);

      const url = `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"}/api/files/upload`;

      return new Promise<void>((resolve) => {
        xhr.open("POST", url);
        xhr.withCredentials = true;

        let lastLoaded = 0;
        let lastTime = Date.now();

        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            const pct = Math.round((e.loaded / e.total) * 100);
            const now = Date.now();
            const deltaBytes = e.loaded - lastLoaded;
            const deltaTime = (now - lastTime) / 1000;
            const speed = deltaTime > 0 ? deltaBytes / deltaTime : 0;
            lastLoaded = e.loaded;
            lastTime = now;

            setItems((prev) =>
              prev.map((i) =>
                i.id === item.id ? { ...i, progress: pct, speed, status: "uploading" as const } : i,
              ),
            );
          }
        };

        xhr.onload = () => {
          try {
            const data = JSON.parse(xhr.responseText);
            if (data.results?.[0]?.fileId) {
              setItems((prev) =>
                prev.map((i) =>
                  i.id === item.id
                    ? { ...i, progress: 100, status: "done" as const, speed: 0 }
                    : i,
                ),
              );
            } else if (data.results?.[0]?.error === "duplicate_skipped") {
              setItems((prev) =>
                prev.map((i) =>
                  i.id === item.id ? { ...i, status: "duplicate" as const, speed: 0 } : i,
                ),
              );
            } else {
              const serverError = data.error || data.results?.[0]?.error || "";
              const statusCode = xhr.status;
              let userMessage: string;
              if (statusCode === 401) {
                userMessage = "Authentication required. Please sign in again.";
              } else if (statusCode === 403) {
                userMessage = "You don't have permission to upload files.";
              } else if (statusCode === 413) {
                userMessage = "File exceeds the maximum allowed size.";
              } else if (serverError) {
                userMessage = serverError;
              } else {
                userMessage = "Upload failed";
              }
              setItems((prev) =>
                prev.map((i) =>
                  i.id === item.id
                    ? {
                        ...i,
                        status: "error" as const,
                        error: userMessage,
                        speed: 0,
                      }
                    : i,
                ),
              );
            }
          } catch {
            setItems((prev) =>
              prev.map((i) =>
                i.id === item.id
                  ? { ...i, status: "error" as const, error: `Upload failed (HTTP ${xhr.status})`, speed: 0 }
                  : i,
              ),
            );
          }
          resolve();
        };

        xhr.onerror = () => {
          setItems((prev) =>
            prev.map((i) =>
              i.id === item.id
                ? { ...i, status: "error" as const, error: "Network error", speed: 0 }
                : i,
            ),
          );
          resolve();
        };

        xhr.onabort = () => {
          setItems((prev) =>
            prev.map((i) =>
              i.id === item.id
                ? { ...i, status: "cancelled" as const, speed: 0 }
                : i,
            ),
          );
          resolve();
        };

        setItems((prev) =>
          prev.map((i) =>
            i.id === item.id ? { ...i, xhr, status: "uploading" as const } : i,
          ),
        );

        xhr.send(formData);
      });
    },
    [orgId, folderId, clientId, createFoldersForPath],
  );

  const processUploadQueue = useCallback(async () => {
    const next = uploadQueue.current.shift();
    if (!next) return;
    activeUploads.current++;
    await next();
    activeUploads.current--;
    processRef.current();
  }, []);

  useEffect(() => { processRef.current = processUploadQueue; }, [processUploadQueue]);

  const enqueueUpload = useCallback(
    async (fileResult: WalkResult) => {
      const ext = fileResult.file.name.split(".").pop()?.toLowerCase() || "";
      if (ALLOWED_EXTENSIONS.length > 0 && !ALLOWED_EXTENSIONS.includes(ext)) {
        setItems((prev) => [
          ...prev,
          {
            id: Math.random().toString(36).slice(2),
            file: fileResult.file,
            relativePath: fileResult.relativePath,
            size: fileResult.file.size,
            progress: 0,
            status: "error",
            error: `File type .${ext} is not allowed`,
            speed: 0,
            xhr: null,
            startTime: Date.now(),
          },
        ]);
        return;
      }

      if (fileResult.file.size > MAX_FILE_SIZE) {
        setItems((prev) => [
          ...prev,
          {
            id: Math.random().toString(36).slice(2),
            file: fileResult.file,
            relativePath: fileResult.relativePath,
            size: fileResult.file.size,
            progress: 0,
            status: "error",
            error: "File exceeds 500 MB limit",
            speed: 0,
            xhr: null,
            startTime: Date.now(),
          },
        ]);
        return;
      }

      const id = Math.random().toString(36).slice(2);
      const item: UploadItem = {
        id,
        file: fileResult.file,
        relativePath: fileResult.relativePath,
        size: fileResult.file.size,
        progress: 0,
        status: "pending",
        speed: 0,
        xhr: null,
        startTime: Date.now(),
      };

      setItems((prev) => [...prev, item]);

      const task = async () => {
        await uploadSingleFile(item);
      };

      uploadQueue.current.push(task);
      if (activeUploads.current < maxConcurrency) {
        processUploadQueue();
      }
    },
    [uploadSingleFile, maxConcurrency, processUploadQueue],
  );

  const addFiles = useCallback(
    async (files: WalkResult[]) => {
      for (const f of files) {
        await enqueueUpload(f);
      }
    },
    [enqueueUpload],
  );

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragOver(false);

      if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
        const extracted = await extractFiles(e.dataTransfer.items);
        if (extracted.length > 0) {
          addFiles(extracted);
          return;
        }
      }

      if (e.dataTransfer.files.length > 0) {
        const flatFiles: WalkResult[] = Array.from(e.dataTransfer.files).map((f) => ({
          file: f,
          relativePath: (f as File & { webkitRelativePath?: string }).webkitRelativePath || f.name,
        }));
        addFiles(flatFiles);
      }
    },
    [addFiles],
  );

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files) {
        const flatFiles: WalkResult[] = Array.from(e.target.files).map((f) => ({
          file: f,
          relativePath: f.name,
        }));
        addFiles(flatFiles);
        e.target.value = "";
      }
    },
    [addFiles],
  );

  const cancelItem = useCallback((id: string) => {
    setItems((prev) => {
      const item = prev.find((i) => i.id === id);
      if (item?.xhr) item.xhr.abort();
      return prev.map((i) =>
        i.id === id && (i.status === "uploading" || i.status === "pending")
          ? { ...i, status: "cancelled" as const, speed: 0 }
          : i,
      );
    });
  }, []);

  const retryItem = useCallback(
    (id: string) => {
      const item = items.find((i) => i.id === id);
      if (!item) return;

      const newItem: UploadItem = {
        ...item,
        id: Math.random().toString(36).slice(2),
        progress: 0,
        status: "pending",
        speed: 0,
        xhr: null,
        startTime: Date.now(),
        error: undefined,
      };

      setItems((prev) => prev.filter((i) => i.id !== id));

      const task = async () => {
        await uploadSingleFile(newItem);
      };

      uploadQueue.current.push(task);
      if (activeUploads.current < maxConcurrency) {
        processUploadQueue();
      }
    },
    [items, uploadSingleFile, maxConcurrency, processUploadQueue],
  );

  const removeItem = useCallback((id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  }, []);

  const cancelAll = useCallback(() => {
    items.forEach((item) => {
      if (item.status === "uploading" || item.status === "pending") {
        if (item.xhr) item.xhr.abort();
      }
    });
    uploadQueue.current = [];
    setItems((prev) =>
      prev.map((i) =>
        i.status === "uploading" || i.status === "pending"
          ? { ...i, status: "cancelled" as const, speed: 0 }
          : i,
      ),
    );
  }, [items]);

  const clearAll = useCallback(() => {
    items.forEach((item) => {
      if (item.xhr && (item.status === "uploading" || item.status === "pending")) {
        item.xhr.abort();
      }
    });
    uploadQueue.current = [];
    setItems([]);
  }, [items]);

  useEffect(() => {
    if (completedCount > 0 && items.some((i) => i.status === "done")) {
      onUploadComplete?.();
    }
  }, [completedCount, onUploadComplete, items]);

  return (
    <div className="space-y-3">
      <div
        className={cn(
          "relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 transition-all duration-200 cursor-pointer",
          dragOver
            ? "border-primary bg-primary/5 shadow-lg shadow-primary/10 scale-[1.01]"
            : "border-muted-foreground/20 bg-muted/10 hover:border-muted-foreground/30 hover:bg-muted/20",
        )}
        onDrop={handleDrop}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onClick={() => inputRef.current?.click()}
      >
        <div className={cn(
          "flex flex-col items-center gap-2 pointer-events-none",
          dragOver && "scale-105",
        )}>
          <div className={cn(
            "flex items-center justify-center size-14 rounded-full transition-colors",
            dragOver ? "bg-primary/10" : "bg-muted-foreground/10",
          )}>
            <UploadIcon className={cn(
              "size-6 transition-colors",
              dragOver ? "text-primary" : "text-muted-foreground/60",
            )} />
          </div>
          <p className="text-sm font-medium">
            {dragOver ? "Drop files here" : "Drag & drop files here"}
          </p>
          <p className="text-xs text-muted-foreground">
            or click to browse &middot; supports multiple files and folders &middot; up to 500 MB per file
          </p>
        </div>

        <input
          ref={inputRef}
          type="file"
          multiple
          className="hidden"
          onChange={handleFileSelect}
        />
      </div>

      {items.length > 0 && (
        <div className="rounded-xl border bg-card">
          <div className="flex items-center justify-between px-4 py-2.5 border-b">
            <p className="text-sm font-medium">
              Upload Queue
              <span className="text-muted-foreground font-normal ml-1.5">
                ({items.length} file{items.length !== 1 ? "s" : ""}
                {uploadingCount > 0 && ` · ${uploadingCount} uploading`})
              </span>
            </p>
            <div className="flex items-center gap-1.5">
              {items.some((i) => i.status === "uploading") && (
                <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={cancelAll}>
                  Cancel All
                </Button>
              )}
              <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={clearAll}>
                Clear All
              </Button>
            </div>
          </div>

          <div className="divide-y max-h-80 overflow-y-auto">
            {items.map((item) => (
              <div key={item.id} className="flex items-center gap-3 px-4 py-2.5 text-sm">
                <div className="size-8 shrink-0 rounded-lg bg-muted flex items-center justify-center">
                  {item.relativePath !== item.file.name ? (
                    <FolderIcon className="size-4 text-muted-foreground" />
                  ) : (
                    <FileIcon className="size-4 text-muted-foreground" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="truncate font-medium text-sm">
                      {item.relativePath}
                    </p>
                    {item.status === "duplicate" && (
                      <span className="shrink-0 text-[10px] font-medium text-amber-600 bg-amber-50 border border-amber-200 rounded px-1.5 py-0.5">
                        Duplicate
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{formatSize(item.size)}</span>
                    {(item.status === "uploading" || item.status === "done") && (
                      <>
                        <span>&middot;</span>
                        <span>{item.progress}%</span>
                      </>
                    )}
                    {item.status === "uploading" && item.speed > 0 && (
                      <>
                        <span>&middot;</span>
                        <span>{formatSpeed(item.speed)}</span>
                      </>
                    )}
                  </div>
                  {(item.status === "uploading" || item.status === "pending") && (
                    <div className="mt-1.5 h-1.5 w-full rounded-full bg-muted overflow-hidden">
                      <div
                        className={cn(
                          "h-full rounded-full transition-all duration-300",
                          item.progress > 0 ? "bg-primary" : "bg-muted-foreground/20",
                        )}
                        style={{ width: `${Math.max(item.progress, item.status === "pending" ? 2 : 0)}%` }}
                      />
                    </div>
                  )}
                  {item.status === "error" && item.error && (
                    <p className="text-xs text-destructive mt-0.5 truncate">{item.error}</p>
                  )}
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  {(item.status === "uploading" || item.status === "pending") && (
                    <button
                      onClick={(e) => { e.stopPropagation(); cancelItem(item.id); }}
                      className="flex items-center justify-center size-7 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                      title="Cancel"
                    >
                      <XIcon className="size-4" />
                    </button>
                  )}
                  {item.status === "error" && (
                    <button
                      onClick={(e) => { e.stopPropagation(); retryItem(item.id); }}
                      className="flex items-center justify-center size-7 rounded-md text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                      title="Retry"
                    >
                      <RefreshCwIcon className="size-4" />
                    </button>
                  )}
                  {(item.status === "done" || item.status === "duplicate" || item.status === "cancelled") && (
                    <button
                      onClick={(e) => { e.stopPropagation(); removeItem(item.id); }}
                      className="flex items-center justify-center size-7 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                      title="Remove"
                    >
                      <XIcon className="size-4" />
                    </button>
                  )}
                  {item.status !== "uploading" && item.status !== "pending" && getStatusIcon(item.status)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
