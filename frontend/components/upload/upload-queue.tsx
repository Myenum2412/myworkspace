"use client";

import { Button } from "@/components/ui/button";
import type { UploadItem } from "./upload-types";
import { UploadProgress } from "./upload-progress";

interface UploadQueueProps {
  items: UploadItem[];
  uploadingCount: number;
  onCancelAll: () => void;
  onClearAll: () => void;
  onCancelItem: (id: string) => void;
  onRetryItem: (id: string) => void;
  onRemoveItem: (id: string) => void;
}

export function UploadQueue({
  items,
  uploadingCount,
  onCancelAll,
  onClearAll,
  onCancelItem,
  onRetryItem,
  onRemoveItem,
}: UploadQueueProps) {
  if (items.length === 0) return null;

  return (
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
            <Button variant="ghost" size="sm" className="text-xs" onClick={onCancelAll}>
              Cancel All
            </Button>
          )}
          <Button variant="ghost" size="sm" className="text-xs" onClick={onClearAll}>
            Clear All
          </Button>
        </div>
      </div>

      <div className="divide-y max-h-80 overflow-y-auto">
        {items.map((item) => (
          <UploadProgress
            key={item.id}
            item={item}
            onCancel={onCancelItem}
            onRetry={onRetryItem}
            onRemove={onRemoveItem}
          />
        ))}
      </div>
    </div>
  );
}
