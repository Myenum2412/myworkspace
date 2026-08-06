"use client";

import { useFileSystemStore } from "@/lib/file-system/store";
import { FileViewer, getFileTypeCategory } from "@/components/files/viewers/file-viewer";
import { formatSize } from "@/lib/file-system/types";
import { getFileIcon } from "@/components/files/utils";
import { Button } from "@/components/ui/button";
import { DownloadIcon, ChevronLeftIcon, ChevronRightIcon, XIcon } from "@/lib/icons";
import { useState, useEffect } from "react";

export function PreviewDialog() {
  const { previewFile, setPreviewFile, files } = useFileSystemStore();
  const [previewUrl, setPreviewUrl] = useState("");
  const file = previewFile;

  useEffect(() => {
    if (!file) { setPreviewUrl(""); return; }
    setPreviewUrl("");
    fetch(`/api/files/preview-url/${file.id}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.success && d.data?.url) setPreviewUrl(d.data.url); })
      .catch(() => {});
  }, [file?.id]);

  if (!file) return null;

  const src = previewUrl || `/api/files/${file.id}/download?preview=true`;
  const currentIndex = files.findIndex((f) => f.id === file.id);
  const prevFile = currentIndex > 0 ? files[currentIndex - 1] : null;
  const nextFile = currentIndex < files.length - 1 ? files[currentIndex + 1] : null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      <div className="flex items-center justify-between px-4 py-3 shrink-0 border-b sm:px-6">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          {getFileIcon(file.mimeType)}
          <div className="min-w-0">
            <h2 className="text-base font-semibold truncate">{file.originalName}</h2>
            <p className="text-xs text-muted-foreground">
              {formatSize(file.size)} &middot; {file.mimeType}
              {file.uploaderName && <> &middot; Uploaded by {file.uploaderName}</>}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="p-0"
            disabled={!prevFile}
            onClick={() => prevFile && setPreviewFile(prevFile)}
          >
            <ChevronLeftIcon className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="p-0"
            disabled={!nextFile}
            onClick={() => nextFile && setPreviewFile(nextFile)}
          >
            <ChevronRightIcon className="size-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.open(`/api/files/${file.id}/download`, "_blank")}
          >
            <DownloadIcon className="mr-1.5" /> Download
          </Button>
          <Button variant="ghost" size="sm" className="p-0" onClick={() => setPreviewFile(null)}>
            <XIcon className="size-4" />
          </Button>
        </div>
      </div>

      <div className="flex-1 min-h-0 flex flex-col">
        <FileViewer file={file} src={src} showInfo />
      </div>
    </div>
  );
}
