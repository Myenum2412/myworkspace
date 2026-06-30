"use client";

import { useRef, useCallback, useState, useEffect, type UIEvent } from "react";
import { File, Folder, Download, Trash2, Undo2, Eye, MoreHorizontal } from "lucide-react";

export interface FileItem {
  id: string;
  name: string;
  originalName: string;
  mimeType: string;
  size: number;
  category: string;
  createdAt: string;
  uploaderId: string;
  deletedAt?: string | null;
  folderId?: string | null;
}

interface FileListVirtualizedProps {
  files: FileItem[];
  onDownload?: (fileId: string) => void;
  onDelete?: (fileId: string) => void;
  onRestore?: (fileId: string) => void;
  onView?: (fileId: string) => void;
  isLoading?: boolean;
  hasMore?: boolean;
  onLoadMore?: () => void;
  itemHeight?: number;
  containerHeight?: number;
  emptyMessage?: string;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

export function FileListVirtualized({
  files,
  onDownload,
  onDelete,
  onRestore,
  onView,
  isLoading = false,
  hasMore = false,
  onLoadMore,
  itemHeight = 56,
  containerHeight = 400,
  emptyMessage = "No files found",
}: FileListVirtualizedProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);

  const totalHeight = files.length * itemHeight;
  const visibleCount = Math.ceil(containerHeight / itemHeight) + 2;
  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight));
  const endIndex = Math.min(files.length, startIndex + visibleCount);

  const visibleItems = files.slice(startIndex, endIndex);
  const offsetY = startIndex * itemHeight;

  const handleScroll = useCallback((e: UIEvent<HTMLDivElement>) => {
    const target = e.target as HTMLDivElement;
    setScrollTop(target.scrollTop);

    if (hasMore && onLoadMore && target.scrollHeight - target.scrollTop - target.clientHeight < 200) {
      onLoadMore();
    }
  }, [hasMore, onLoadMore]);

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith("image/")) return "🖼";
    if (mimeType.startsWith("video/")) return "🎬";
    if (mimeType.startsWith("audio/")) return "🎵";
    if (mimeType.includes("pdf")) return "📄";
    if (mimeType.includes("zip") || mimeType.includes("rar")) return "📦";
    return "📎";
  };

  if (files.length === 0 && !isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-sm text-muted-foreground">
        <File className="h-12 w-12 mb-3 opacity-30" />
        <p>{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className="overflow-auto border rounded-lg"
      style={{ height: containerHeight }}
    >
      <div style={{ height: totalHeight, position: "relative" }}>
        <div style={{ transform: `translateY(${offsetY}px)` }}>
          {visibleItems.map((file) => (
            <div
              key={file.id}
              className="flex items-center gap-3 px-4 border-b last:border-b-0 hover:bg-muted/50 transition-colors"
              style={{ height: itemHeight }}
            >
              <span className="text-lg flex-shrink-0">{getFileIcon(file.mimeType)}</span>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium truncate">{file.originalName}</span>
                  <span className="text-xs px-1.5 py-0.5 rounded bg-secondary text-secondary-foreground">
                    {file.category}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {formatSize(file.size)} • {formatDate(file.createdAt)}
                </p>
              </div>

              <div className="flex items-center gap-1 flex-shrink-0">
                {file.deletedAt ? (
                  onRestore && (
                    <button
                      onClick={() => onRestore(file.id)}
                      className="p-1.5 rounded hover:bg-muted transition-colors"
                      title="Restore"
                    >
                      <Undo2 className="h-3.5 w-3.5" />
                    </button>
                  )
                ) : (
                  <>
                    {onView && (
                      <button
                        onClick={() => onView(file.id)}
                        className="p-1.5 rounded hover:bg-muted transition-colors"
                        title="View"
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </button>
                    )}
                    {onDownload && (
                      <button
                        onClick={() => onDownload(file.id)}
                        className="p-1.5 rounded hover:bg-muted transition-colors"
                        title="Download"
                      >
                        <Download className="h-3.5 w-3.5" />
                      </button>
                    )}
                    {onDelete && (
                      <button
                        onClick={() => onDelete(file.id)}
                        className="p-1.5 rounded hover:bg-muted transition-colors text-destructive"
                        title="Delete"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-4 text-sm text-muted-foreground">
          <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full mr-2" />
          Loading...
        </div>
      )}
    </div>
  );
}
