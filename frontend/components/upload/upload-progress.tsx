"use client";

import {
  XIcon, RefreshCwIcon, FileIcon,
  Loader2Icon, AlertCircleIcon, CheckCircle2Icon, BanIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatSize, formatSpeed } from "./upload-types";

type UploadProgressStatus = string;

function getStatusIcon(status: UploadProgressStatus) {
  switch (status) {
    case "uploading": return <Loader2Icon className="size-4 animate-spin" />;
    case "completed":
    case "duplicate": return <CheckCircle2Icon className="size-4 text-emerald-600" />;
    case "failed": return <AlertCircleIcon className="size-4 text-destructive" />;
    case "cancelled": return <BanIcon className="size-4 text-muted-foreground" />;
    default: return null;
  }
}

interface UploadProgressItem {
  id: string;
  file: File;
  name?: string;
  size: number;
  progress: number;
  status: string;
  speed: number;
  error?: string;
}

interface UploadProgressProps {
  item: UploadProgressItem;
  onCancel: (id: string) => void;
  onRetry: (id: string) => void;
  onRemove: (id: string) => void;
}

export function UploadProgress({ item, onCancel, onRetry, onRemove }: UploadProgressProps) {
  const isActive = item.status === "uploading" || item.status === "pending";
  const isDone = item.status === "completed" || item.status === "duplicate" || item.status === "cancelled";

  return (
    <div className="flex items-center gap-3 px-4 py-2.5 text-sm">
      <div className="size-8 shrink-0 rounded-lg bg-muted flex items-center justify-center">
        <FileIcon className="size-4 text-muted-foreground" />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="truncate font-medium text-sm">
            {item.name || item.file.name}
          </p>
          {item.status === "duplicate" && (
            <span className="shrink-0 text-[10px] font-medium text-amber-600 bg-amber-50 border border-amber-200 rounded px-1.5 py-0.5">
              Duplicate
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>{formatSize(item.size)}</span>
          {(item.status === "uploading" || item.status === "completed") && (
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
        {(item.status === "uploading" || item.status === "pending" || item.status === "paused") && (
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
        {(item.status === "failed") && item.error && (
          <p className="text-xs text-destructive mt-0.5 truncate">{item.error}</p>
        )}
      </div>

      <div className="flex items-center gap-1 shrink-0">
        {isActive && (
          <button
            onClick={(e) => { e.stopPropagation(); onCancel(item.id); }}
            className="flex items-center justify-center size-7 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
            title="Cancel"
          >
            <XIcon className="size-4" />
          </button>
        )}
        {item.status === "failed" && (
          <button
            onClick={(e) => { e.stopPropagation(); onRetry(item.id); }}
            className="flex items-center justify-center size-7 rounded-md text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
            title="Retry"
          >
            <RefreshCwIcon className="size-4" />
          </button>
        )}
        {isDone && (
          <button
            onClick={(e) => { e.stopPropagation(); onRemove(item.id); }}
            className="flex items-center justify-center size-7 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            title="Remove"
          >
            <XIcon className="size-4" />
          </button>
        )}
        {!isActive && getStatusIcon(item.status)}
      </div>
    </div>
  );
}
