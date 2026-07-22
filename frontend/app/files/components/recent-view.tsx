"use client";

import { useRecentFiles } from "@/hooks/file-system/use-file-data";
import { useFileSystemStore } from "@/lib/file-system/store";
import { getFileIcon } from "@/components/files/utils";
import { formatSize } from "@/lib/file-system/types";
import { ClockIcon, DownloadIcon, EyeIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

export function RecentView() {
  const { data: files, isLoading } = useRecentFiles();
  const { setPreviewFile } = useFileSystemStore();

  if (isLoading) {
    return <div className="flex items-center justify-center py-12"><div className="size-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  }

  if (!files || files.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
        <ClockIcon className="size-12 text-muted-foreground/20" />
        <p className="text-sm font-medium">No recent files</p>
        <p className="text-xs">Files you open or upload will appear here</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <ClockIcon className="size-4" /> Recent Files
        </h2>
        <p className="text-sm text-muted-foreground">Last {files.length} files</p>
      </div>

      <div className="space-y-1">
        {files.map((file, idx) => (
          <div
            key={file.id}
            className="flex items-center gap-3 p-3 rounded-sm hover:bg-accent/30 cursor-pointer transition-colors"
            onDoubleClick={() => setPreviewFile(file)}
          >
            <span className="text-[10px] text-muted-foreground w-6 text-right font-mono">{idx + 1}</span>
            {getFileIcon(file.mimeType)}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{file.originalName}</p>
              <p className="text-[10px] text-muted-foreground">
                {formatSize(file.size)} &middot; {file.updatedAt ? new Date(file.updatedAt).toLocaleDateString() : new Date(file.createdAt).toLocaleDateString()}
                {file.uploaderName && <> &middot; {file.uploaderName}</>}
              </p>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setPreviewFile(file)}>
                <EyeIcon className="size-3.5" />
              </Button>
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => window.open(`/api/files/${file.id}/download`, "_blank")}>
                <DownloadIcon className="size-3.5" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
