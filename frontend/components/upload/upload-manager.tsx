"use client";

import { useEffect, useCallback } from "react";
import { Upload, Network, Wifi, WifiOff, RefreshCw, Trash2, Download, BarChart3 } from "lucide-react";
import { useUpload } from "../../lib/upload/use-upload";
import { UploadDropzone } from "./upload-dropzone";
import { UploadProgress } from "./upload-progress";
import { socketIOManager } from "../../lib/ws/client";
import type { UploadOptions } from "../../lib/upload/types";

interface UploadManagerProps {
  options: UploadOptions;
  maxSize?: number;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

function formatSpeed(bytesPerSecond: number): string {
  if (bytesPerSecond < 1024) return `${bytesPerSecond.toFixed(0)} B/s`;
  if (bytesPerSecond < 1024 * 1024) return `${(bytesPerSecond / 1024).toFixed(1)} KB/s`;
  return `${(bytesPerSecond / 1024 / 1024).toFixed(1)} MB/s`;
}

export function UploadManager({ options, maxSize }: UploadManagerProps) {
  const {
    uploads,
    activeUploads,
    completedUploads,
    failedUploads,
    stats,
    networkQuality,
    isOnline,
    uploadFiles,
    uploadFolder,
    pauseUpload,
    resumeUpload,
    cancelUpload,
    retryUpload,
    clearCompleted,
    handleSocketEvent,
  } = useUpload(options);

  useEffect(() => {
    const unsub = socketIOManager.onEvent((event, data) => {
      if (event.startsWith("upload:") || event.startsWith("file:")) {
        handleSocketEvent(event, data as any);
      }
    });
    return unsub;
  }, [handleSocketEvent]);

  const handleFilesSelected = useCallback((files: FileList | File[]) => {
    uploadFiles(files);
  }, [uploadFiles]);

  const handleFolderSelected = useCallback((files: FileList) => {
    uploadFolder(files);
  }, [uploadFolder]);

  const networkIcon = isOnline ? (
    <Wifi className={`h-3.5 w-3.5 ${
      networkQuality === "excellent" ? "text-green-500" :
      networkQuality === "good" ? "text-green-400" :
      networkQuality === "fair" ? "text-yellow-500" :
      "text-orange-500"
    }`} />
  ) : (
    <WifiOff className="h-3.5 w-3.5 text-destructive" />
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Upload className="h-5 w-5" />
          <h2 className="text-lg font-semibold">File Upload</h2>
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-1" title={`Network: ${networkQuality}`}>
            {networkIcon}
            <span className="capitalize">{networkQuality}</span>
          </div>
          <div className="flex items-center gap-1" title="Queue status">
            <BarChart3 className="h-3.5 w-3.5" />
            <span>{stats.activeUploads} active</span>
          </div>
        </div>
      </div>

      {stats.totalUploads > 0 && (
        <div className="grid grid-cols-4 gap-3">
          <div className="p-3 rounded-lg border bg-card text-center">
            <p className="text-xs text-muted-foreground">Total</p>
            <p className="text-lg font-semibold">{stats.totalUploads}</p>
          </div>
          <div className="p-3 rounded-lg border bg-card text-center">
            <p className="text-xs text-muted-foreground">Active</p>
            <p className="text-lg font-semibold text-primary">{stats.activeUploads}</p>
          </div>
          <div className="p-3 rounded-lg border bg-card text-center">
            <p className="text-xs text-muted-foreground">Completed</p>
            <p className="text-lg font-semibold text-green-500">{stats.completedUploads}</p>
          </div>
          <div className="p-3 rounded-lg border bg-card text-center">
            <p className="text-xs text-muted-foreground">Failed</p>
            <p className="text-lg font-semibold text-destructive">{stats.failedUploads}</p>
          </div>
        </div>
      )}

      {stats.totalBytes > 0 && (
        <div className="p-3 rounded-lg border bg-card">
          <div className="flex items-center justify-between text-sm mb-1">
            <span>Overall Progress</span>
            <span className="text-muted-foreground">
              {formatSize(stats.uploadedBytes)} / {formatSize(stats.totalBytes)}
              {stats.averageSpeed > 0 && ` • ${formatSpeed(stats.averageSpeed)}`}
            </span>
          </div>
          <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-300"
              style={{ width: `${stats.totalBytes > 0 ? (stats.uploadedBytes / stats.totalBytes) * 100 : 0}%` }}
            />
          </div>
        </div>
      )}

      <UploadDropzone
        onFilesSelected={handleFilesSelected}
        onFolderSelected={handleFolderSelected}
        disabled={!isOnline}
        maxSize={maxSize}
      />

      {(activeUploads.length > 0 || failedUploads.length > 0) && (
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium">
            {activeUploads.length > 0 ? `Uploading (${activeUploads.length})` : "Uploads"}
          </h3>
          <div className="flex items-center gap-2">
            {failedUploads.length > 0 && (
              <button
                onClick={() => failedUploads.forEach((f) => retryUpload(f.id))}
                className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
              >
                <RefreshCw className="h-3 w-3" />
                Retry All
              </button>
            )}
            {completedUploads.length > 0 && (
              <button
                onClick={clearCompleted}
                className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
              >
                <Trash2 className="h-3 w-3" />
                Clear Completed
              </button>
            )}
          </div>
        </div>
      )}

      <div className="space-y-2 max-h-96 overflow-y-auto">
        {uploads.map((file) => (
          <UploadProgress
            key={file.id}
            file={file}
            onPause={() => pauseUpload(file.id)}
            onResume={() => resumeUpload(file.id)}
            onCancel={() => cancelUpload(file.id)}
            onRetry={() => retryUpload(file.id)}
          />
        ))}

        {uploads.length === 0 && (
          <div className="text-center py-8 text-sm text-muted-foreground">
            <Download className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No uploads yet. Drop files or click to browse.</p>
          </div>
        )}
      </div>
    </div>
  );
}
