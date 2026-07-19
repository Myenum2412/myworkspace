"use client";

import { useFileSystemStore } from "@/lib/file-system/store";
import { formatSize } from "@/lib/file-system/types";
import { getFileIcon } from "@/components/files/utils";
import { FileViewer, getFileTypeCategory } from "@/components/files/viewers/file-viewer";
import { Button } from "@/components/ui/button";
import {
  DownloadIcon,
  XIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  InfoIcon,
  PanelLeftIcon,
} from "lucide-react";
import { useState } from "react";
import { FileInfoPanel } from "@/components/files/viewers/file-info-panel";

interface PreviewPaneProps {
  onClose: () => void;
}

export function PreviewPane({ onClose }: PreviewPaneProps) {
  const {
    previewPaneFile,
    setPreviewPaneFile,
    files,
  } = useFileSystemStore();
  const [showInfo, setShowInfo] = useState(false);

  const file = previewPaneFile;
  const src = file ? `/api/files/${file.id}/download?preview=true` : "";

  if (!file) return null;

  const currentIndex = files.findIndex((f) => f.id === file.id);
  const prevFile = currentIndex > 0 ? files[currentIndex - 1] : null;
  const nextFile = currentIndex < files.length - 1 ? files[currentIndex + 1] : null;

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-background">
      <div className="flex items-center justify-between px-4 h-12 border-b shrink-0 bg-background">
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={onClose}>
            <PanelLeftIcon className="size-4" />
          </Button>
          <div className="w-px h-4 bg-border mx-1" />
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            disabled={!prevFile}
            onClick={() => prevFile && setPreviewPaneFile(prevFile)}
          >
            <ChevronLeftIcon className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            disabled={!nextFile}
            onClick={() => nextFile && setPreviewPaneFile(nextFile)}
          >
            <ChevronRightIcon className="size-4" />
          </Button>
          <span className="text-xs text-muted-foreground ml-1">
            {currentIndex + 1}/{files.length}
          </span>
        </div>

        <div className="flex items-center gap-2 min-w-0 flex-1 justify-center px-4">
          {getFileIcon(file.mimeType)}
          <span className="text-sm font-medium truncate">{file.originalName}</span>
          <span className="text-xs text-muted-foreground shrink-0">
            &middot; {formatSize(file.size)}
          </span>
        </div>

        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={() => setShowInfo(!showInfo)}
          >
            <InfoIcon className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={() => window.open(`/api/files/${file.id}/download`, "_blank")}
          >
            <DownloadIcon className="size-4" />
          </Button>
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={onClose}>
            <XIcon className="size-4" />
          </Button>
        </div>
      </div>

      {showInfo ? (
        <div className="flex-1 overflow-y-auto">
          <FileInfoPanel file={file} />
        </div>
      ) : (
        <div className="flex-1 min-h-0 flex flex-col">
          <FileViewer file={file} src={src} />
        </div>
      )}
    </div>
  );
}
