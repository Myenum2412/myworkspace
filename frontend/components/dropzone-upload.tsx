"use client";

import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import type { UploadItem, WalkResult } from "./upload/upload-types";
import { ALLOWED_EXTENSIONS, MAX_FILE_SIZE, extractFiles } from "./upload/upload-types";
import type { DropZoneUploadProps } from "./upload/upload-types";
import { UploadZone } from "./upload/upload-zone";
import { UploadQueue } from "./upload/upload-queue";

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
      <UploadZone
        dragOver={dragOver}
        onDrop={handleDrop}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onClick={() => inputRef.current?.click()}
        inputRef={inputRef}
        onFileSelect={handleFileSelect}
      />

      <UploadQueue
        items={items}
        uploadingCount={uploadingCount}
        onCancelAll={cancelAll}
        onClearAll={clearAll}
        onCancelItem={cancelItem}
        onRetryItem={retryItem}
        onRemoveItem={removeItem}
      />
    </div>
  );
}
