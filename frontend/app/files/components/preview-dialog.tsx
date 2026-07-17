"use client";

import { useState, useEffect } from "react";
import { useFileSystemStore } from "@/lib/file-system/store";
import { isPreviewable, formatSize } from "@/lib/file-system/types";
import { getFileIcon } from "@/components/files/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { DownloadIcon, FileIcon, XIcon } from "lucide-react";

function usePresignedUrl(fileId: string | null) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!fileId) { setUrl(null); return; }
    let cancelled = false;
    fetch(`/api/files/presigned/download/${fileId}`, { credentials: "include" })
      .then((r) => r.json())
      .then((data) => { if (!cancelled) setUrl(data.data?.url || null); })
      .catch(() => { if (!cancelled) setUrl(null); });
    return () => { cancelled = true; };
  }, [fileId]);

  return url;
}

export function PreviewDialog() {
  const { previewFile, setPreviewFile } = useFileSystemStore();
  const file = previewFile;
  const presignedUrl = usePresignedUrl(file?.id || null);
  const src = presignedUrl || (file ? `/api/files/${file.id}` : "");

  return (
    <Dialog open={!!file} onOpenChange={(o) => { if (!o) setPreviewFile(null); }}>
      <DialogContent className="max-w-screen-lg w-[95vw] max-h-[90vh] h-[85vh] p-0 flex flex-col">
        {file && (
          <>
            <DialogHeader className="px-6 pt-6 pb-3 shrink-0 border-b">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  {getFileIcon(file.mimeType)}
                  <div className="min-w-0">
                    <DialogTitle className="text-base truncate">{file.originalName}</DialogTitle>
                    <DialogDescription className="text-xs">
                      {formatSize(file.size)} &middot; {file.mimeType}
                      {file.uploaderName && <> &middot; Uploaded by {file.uploaderName}</>}
                    </DialogDescription>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(presignedUrl || `/api/files/${file.id}/download`, "_blank")}
                  >
                    <DownloadIcon className="size-3.5 mr-1.5" /> Download
                  </Button>
                </div>
              </div>
            </DialogHeader>

            <div className="flex-1 min-h-0 bg-muted/10">
              {isPreviewable(file.mimeType) ? (
                file.mimeType.startsWith("image/") ? (
                  <div className="flex items-center justify-center h-full p-4">
                    <img
                      src={src}
                      alt={file.originalName}
                      className="max-w-full max-h-full object-contain rounded-md"
                    />
                  </div>
                ) : file.mimeType.startsWith("video/") ? (
                  <div className="flex items-center justify-center h-full p-4">
                    <video controls className="max-w-full max-h-full rounded-md" src={src}>
                      Your browser does not support the video tag.
                    </video>
                  </div>
                ) : file.mimeType.startsWith("audio/") ? (
                  <div className="flex items-center justify-center h-full p-8">
                    <audio controls className="w-full max-w-lg" src={src}>
                      Your browser does not support the audio tag.
                    </audio>
                  </div>
                ) : (
                  <iframe
                    src={src}
                    className="w-full h-full border-0"
                    title={file.originalName}
                    sandbox="allow-scripts allow-same-origin"
                  />
                )
              ) : (
                <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground p-8">
                  <FileIcon className="size-16 text-muted-foreground/30" />
                  <p className="text-sm">Preview not available for this file type</p>
                  <Button
                    variant="outline"
                    onClick={() => window.open(presignedUrl || `/api/files/${file.id}/download`, "_blank")}
                  >
                    <DownloadIcon className="mr-2 size-4" />
                    Download to view
                  </Button>
                </div>
              )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
