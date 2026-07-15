"use client";

import { useCallback, useRef, useState } from "react";
import { useFileSystemStore } from "@/lib/file-system/store";
import { cn } from "@/lib/utils";
import { formatSize } from "@/lib/file-system/types";
import {
  UploadCloudIcon,
  XIcon,
  CheckCircleIcon,
  AlertCircleIcon,
  PauseIcon,
  PlayIcon,
  RefreshCwIcon,
  FileIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

export function UploadZone() {
  const {
    showUpload,
    setShowUpload,
    addUploadItem,
    updateUploadItem,
    removeUploadItem,
    uploadQueue,
    clearUploadQueue,
    orgId,
    currentFolderId,
  } = useFileSystemStore();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const handleUpload = useCallback(async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    for (const file of fileArray) {
      const id = `upload-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      addUploadItem({
        id,
        file,
        progress: 0,
        status: "pending",
      });
    }

    for (const item of useFileSystemStore.getState().uploadQueue.filter((q) => q.status === "pending")) {
      updateUploadItem(item.id, { status: "uploading" });
      try {
        const formData = new FormData();
        formData.append("file", item.file);
        if (currentFolderId) formData.append("folderId", currentFolderId);
        if (orgId) formData.append("orgId", orgId);

        const xhr = new XMLHttpRequest();
        updateUploadItem(item.id, { xhr: xhr as unknown as XMLHttpRequest });

        const result = await new Promise<{ kind: string; data: { originalName: string } }>((resolve, reject) => {
          xhr.upload.onprogress = (e) => {
            if (e.lengthComputable) {
              const pct = Math.round((e.loaded / e.total) * 100);
              updateUploadItem(item.id, { progress: pct });
            }
          };
          xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              resolve(JSON.parse(xhr.responseText));
            } else {
              reject(new Error(`Upload failed: ${xhr.status}`));
            }
          };
          xhr.onerror = () => reject(new Error("Network error"));
          xhr.open("POST", "/api/files/upload");
          xhr.withCredentials = true;
          xhr.send(formData);
        });

        updateUploadItem(item.id, { progress: 100, status: "completed" });
        setTimeout(() => removeUploadItem(item.id), 3000);
      } catch (err) {
        updateUploadItem(item.id, {
          status: "failed",
          error: err instanceof Error ? err.message : "Upload failed",
        });
      }
    }
  }, [orgId, currentFolderId, addUploadItem, updateUploadItem, removeUploadItem]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files.length > 0) {
      handleUpload(e.dataTransfer.files);
    }
  }, [handleUpload]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleUpload(e.target.files);
      e.target.value = "";
    }
  }, [handleUpload]);

  const retryUpload = useCallback((id: string) => {
    const item = uploadQueue.find((q) => q.id === id);
    if (!item) return;
    removeUploadItem(id);
    handleUpload([item.file] as unknown as FileList);
  }, [uploadQueue, removeUploadItem, handleUpload]);

  if (!showUpload) return null;

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={handleDrop}
      className={cn(
        "relative border-2 border-dashed rounded-lg p-6 transition-all",
        isDragOver && "border-primary bg-primary/5",
        "border-muted-foreground/20",
      )}
    >
      <input
        ref={inputRef}
        type="file"
        multiple
        onChange={handleFileSelect}
        className="sr-only"
        aria-label="Upload files"
      />

      <div className="flex flex-col items-center gap-2 text-center">
        <UploadCloudIcon className={cn("size-8 text-muted-foreground", isDragOver && "text-primary")} />
        <p className="text-sm font-medium">
          {isDragOver ? "Drop files here" : "Drag & drop files or click to browse"}
        </p>
        <p className="text-xs text-muted-foreground">Files are uploaded securely</p>
        <Button size="sm" variant="outline" onClick={() => inputRef.current?.click()}>
          Select Files
        </Button>
      </div>

      {uploadQueue.length > 0 && (
        <div className="mt-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium">Upload Queue ({uploadQueue.length})</span>
            <div className="flex gap-1">
              <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={clearUploadQueue}>
                Clear
              </Button>
              <Button variant="ghost" size="sm" className="h-6" onClick={() => setShowUpload(false)}>
                <XIcon className="size-3" />
              </Button>
            </div>
          </div>
          <div className="space-y-1.5 max-h-48 overflow-y-auto">
            {uploadQueue.map((item) => (
              <div key={item.id} className="flex items-center gap-2 p-2 bg-muted/50 rounded-md">
                <FileIcon className="size-4 shrink-0 text-muted-foreground" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate">{item.file.name}</p>
                  <div className="flex items-center gap-2">
                    <Progress value={item.progress} className="h-1 flex-1" />
                    <span className="text-[10px] text-muted-foreground shrink-0">{item.progress}%</span>
                  </div>
                </div>
                <div className="flex items-center gap-0.5 shrink-0">
                  {item.status === "completed" && <CheckCircleIcon className="size-3.5 text-green-500" />}
                  {item.status === "failed" && <AlertCircleIcon className="size-3.5 text-destructive" />}
                  {(item.status === "pending" || item.status === "uploading") && (
                    <button onClick={() => removeUploadItem(item.id)} className="text-muted-foreground hover:text-foreground">
                      <XIcon className="size-3.5" />
                    </button>
                  )}
                  {item.status === "failed" && (
                    <button onClick={() => retryUpload(item.id)} className="text-muted-foreground hover:text-foreground">
                      <RefreshCwIcon className="size-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}


