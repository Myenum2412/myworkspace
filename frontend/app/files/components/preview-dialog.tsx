"use client";

import { useFileSystemStore } from "@/lib/file-system/store";
import { FileViewer, getFileTypeCategory } from "@/components/files/viewers/file-viewer";
import { formatSize } from "@/lib/file-system/types";
import { getFileIcon } from "@/components/files/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { DownloadIcon, ChevronLeftIcon, ChevronRightIcon } from "lucide-react";

export function PreviewDialog() {
  const { previewFile, setPreviewFile, files } = useFileSystemStore();
  const file = previewFile;

  if (!file) return null;

  const src = `/api/files/${file.id}/download?preview=true`;
  const currentIndex = files.findIndex((f) => f.id === file.id);
  const prevFile = currentIndex > 0 ? files[currentIndex - 1] : null;
  const nextFile = currentIndex < files.length - 1 ? files[currentIndex + 1] : null;

  return (
    <Dialog open={!!file} onOpenChange={(o) => { if (!o) setPreviewFile(null); }}>
      <DialogContent className="max-w-screen-lg w-[95vw] max-h-[90vh] h-[85vh] p-0 flex flex-col">
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
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0"
                disabled={!prevFile}
                onClick={() => prevFile && setPreviewFile(prevFile)}
              >
                <ChevronLeftIcon className="size-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0"
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
                <DownloadIcon className="size-3.5 mr-1.5" /> Download
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 min-h-0 flex flex-col">
          <FileViewer file={file} src={src} showInfo />
        </div>
      </DialogContent>
    </Dialog>
  );
}
