"use client";

import { Pause, Play, X, RefreshCw, File, AlertCircle, CheckCircle2, Clock } from "lucide-react";
import type { UploadFile } from "../../lib/upload/types";

interface UploadProgressProps {
  file: UploadFile;
  onPause?: () => void;
  onResume?: () => void;
  onCancel?: () => void;
  onRetry?: () => void;
}

function formatSpeed(bytesPerSecond: number): string {
  if (bytesPerSecond === 0) return "";
  if (bytesPerSecond < 1024) return `${bytesPerSecond.toFixed(0)} B/s`;
  if (bytesPerSecond < 1024 * 1024) return `${(bytesPerSecond / 1024).toFixed(1)} KB/s`;
  return `${(bytesPerSecond / 1024 / 1024).toFixed(1)} MB/s`;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

function formatEta(seconds: number): string {
  if (seconds === 0) return "";
  if (seconds < 60) return `${Math.round(seconds)}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${Math.round(seconds % 60)}s`;
  return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
}

function getStatusIcon(status: UploadFile["status"]) {
  switch (status) {
    case "completed": return <CheckCircle2 className="h-4 w-4 text-green-500" />;
    case "failed": return <AlertCircle className="h-4 w-4 text-destructive" />;
    case "cancelled": return <X className="h-4 w-4 text-muted-foreground" />;
    case "duplicate": return <CheckCircle2 className="h-4 w-4 text-yellow-500" />;
    case "paused": return <Clock className="h-4 w-4 text-muted-foreground" />;
    case "pending_approval": return <Clock className="h-4 w-4 text-amber-500" />;
    default: return <File className="h-4 w-4 text-primary" />;
  }
}

export function UploadProgress({ file, onPause, onResume, onCancel, onRetry }: UploadProgressProps) {
  const isActive = file.status === "uploading" || file.status === "pending";
  const showProgress = file.status === "uploading" || file.status === "pending" || file.status === "paused";

  return (
    <div className="flex items-start gap-3 p-3 rounded-lg border bg-card">
      <div className="mt-0.5 flex-shrink-0">
        {getStatusIcon(file.status)}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-medium truncate">{file.name}</p>
          <p className="text-xs text-muted-foreground whitespace-nowrap">{formatSize(file.size)}</p>
        </div>

        {showProgress && (
          <div className="mt-1.5">
            <div className="flex items-center justify-between gap-2 mb-1">
              <span className="text-xs text-muted-foreground">{file.progress}%</span>
              <span className="text-xs text-muted-foreground">{formatSpeed(file.speed)}</span>
            </div>
            <div className="w-full h-1.5 bg-secondary rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  file.status === "failed" ? "bg-destructive" : "bg-primary"
                }`}
                style={{ width: `${file.progress}%` }}
              />
            </div>
            {file.eta > 0 && file.status === "uploading" && (
              <p className="text-xs text-muted-foreground mt-0.5">ETA: {formatEta(file.eta)}</p>
            )}
          </div>
        )}

        {file.status === "failed" && file.error && (
          <p className="text-xs text-destructive mt-1">{file.error}</p>
        )}

        {file.status === "duplicate" && (
          <p className="text-xs text-yellow-600 mt-1">Duplicate file skipped</p>
        )}
        {file.status === "pending_approval" && (
          <p className="text-xs text-amber-600 mt-1">Upload complete — pending approval</p>
        )}
      </div>

      <div className="flex items-center gap-1 flex-shrink-0">
        {file.status === "uploading" && onPause && (
          <button onClick={onPause} className="p-1 rounded hover:bg-muted transition-colors" title="Pause">
            <Pause className="h-3.5 w-3.5" />
          </button>
        )}
        {file.status === "paused" && onResume && (
          <button onClick={onResume} className="p-1 rounded hover:bg-muted transition-colors" title="Resume">
            <Play className="h-3.5 w-3.5" />
          </button>
        )}
        {file.status === "failed" && onRetry && (
          <button onClick={onRetry} className="p-1 rounded hover:bg-muted transition-colors" title="Retry">
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
        )}
        {(file.status === "pending" || file.status === "uploading" || file.status === "paused" || file.status === "pending_approval") && onCancel && (
          <button onClick={onCancel} className="p-1 rounded hover:bg-muted transition-colors" title="Cancel">
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}
