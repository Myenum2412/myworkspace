"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  FileIcon, DownloadIcon, LockIcon, UnlockIcon, HistoryIcon,
  Trash2Icon, RotateCcwIcon, CopyIcon, Share2Icon, FileTextIcon,
  AlertCircleIcon, Loader2Icon,
} from "lucide-react";

type FileItem = {
  id: string;
  originalName: string;
  mimeType: string;
  size: number;
  description?: string;
  tags?: string[];
  isLocked?: boolean;
  lockedBy?: string | null;
  currentVersion?: number;
  uploaderName?: string;
  createdAt: string;
  updatedAt?: string;
  folderId?: string | null;
};

interface FilePreviewDialogProps {
  file: FileItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orgId?: string;
  onDelete?: (fileId: string) => void;
  onRestore?: (fileId: string) => void;
  onDuplicate?: (fileId: string) => void;
  onLockToggle?: (fileId: string, locked: boolean) => void;
  onShare?: (file: FileItem) => void;
  trashed?: boolean;
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function isPreviewable(mimeType: string) {
  return /^(image|text|video|audio)\//.test(mimeType)
    || mimeType.includes("pdf")
    || mimeType === "application/json"
    || mimeType === "application/xml";
}

function getFileIcon(mimeType: string) {
  if (mimeType.startsWith("image/")) return "🖼️";
  if (mimeType.startsWith("video/")) return "🎬";
  if (mimeType.startsWith("audio/")) return "🎵";
  if (mimeType.includes("pdf")) return "📄";
  if (mimeType.includes("zip") || mimeType.includes("rar") || mimeType.includes("tar")) return "📦";
  if (mimeType.includes("sheet") || mimeType.includes("excel")) return "📊";
  if (mimeType.includes("document") || mimeType.includes("word")) return "📝";
  if (mimeType.startsWith("text/")) return "📃";
  return "📁";
}

export function FilePreviewDialog({ file, open, onOpenChange, orgId, onDelete, onRestore, onDuplicate, onLockToggle, onShare, trashed }: FilePreviewDialogProps) {
  const [versions, setVersions] = useState<any[]>([]);
  const [showVersions, setShowVersions] = useState(false);
  const [loadingVersions, setLoadingVersions] = useState(false);

  useEffect(() => {
    setShowVersions(false);
    setVersions([]);
  }, [file?.id]);

  const loadVersions = useCallback(async () => {
    if (!file || !orgId) return;
    setLoadingVersions(true);
    try {
      const res = await fetch(`/api/files/${file.id}/versions`);
      const data = await res.json();
      setVersions(data.data || []);
      setShowVersions(true);
    } catch {
      setVersions([]);
    } finally {
      setLoadingVersions(false);
    }
  }, [file, orgId]);

  if (!file) return null;

  const previewUrl = `/api/files/${file.id}?preview=true`;
  const downloadUrl = `/api/files/${file.id}?download=true`;

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onOpenChange(false); }}>
      <DialogContent className="max-w-screen-xl w-full min-w-[95vw] max-h-[95vh] h-[90vh] p-0 flex flex-col">
        <DialogHeader className="px-6 pt-6 pb-4 shrink-0">
          <DialogTitle className="flex items-center gap-2 text-lg">
            <span>{getFileIcon(file.mimeType)}</span>
            <span className="truncate max-w-[60vw]">{file.originalName}</span>
            {file.isLocked && <LockIcon className="size-4 text-warning" />}
            {file.currentVersion && file.currentVersion > 1 && (
              <Badge variant="outline" className="text-xs">v{file.currentVersion}</Badge>
            )}
          </DialogTitle>
          <DialogDescription className="flex flex-wrap items-center gap-2 mt-1">
            <span>{formatSize(file.size)}</span>
            <span>·</span>
            <span className="text-xs text-muted-foreground">{file.mimeType}</span>
            {file.uploaderName && (
              <>
                <span>·</span>
                <span>by {file.uploaderName}</span>
              </>
            )}
            <span>·</span>
            <span>{new Date(file.createdAt).toLocaleDateString()}</span>
          </DialogDescription>
          {file.description && (
            <p className="text-sm text-muted-foreground mt-1">{file.description}</p>
          )}
          {file.tags && file.tags.length > 0 && (
            <div className="flex gap-1 mt-1 flex-wrap">
              {file.tags.map((tag, i) => (
                <Badge key={i} variant="secondary" className="text-xs">{tag}</Badge>
              ))}
            </div>
          )}
        </DialogHeader>

        <div className="flex-1 px-6 pb-6 min-h-0 overflow-hidden flex gap-4">
          <div className="flex-1 min-h-0 overflow-hidden">
            {isPreviewable(file.mimeType) ? (
              file.mimeType.startsWith("video/") ? (
                <video controls className="w-full h-full rounded-sm border" key={file.id}>
                  <source src={previewUrl} type={file.mimeType} />
                </video>
              ) : file.mimeType.startsWith("audio/") ? (
                <div className="flex items-center justify-center h-full">
                  <audio controls className="w-full max-w-lg" key={file.id}>
                    <source src={previewUrl} type={file.mimeType} />
                  </audio>
                </div>
              ) : (
                <iframe src={previewUrl} className="w-full h-full border rounded-sm" title={file.originalName} />
              )
            ) : (
              <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground">
                <FileIcon className="size-16" />
                <p className="text-sm">Preview not available for this file type</p>
                <Button variant="outline" onClick={() => window.open(downloadUrl, "_blank")}>
                  <DownloadIcon className="mr-2 size-4" />
                  Download to view
                </Button>
              </div>
            )}
          </div>

          {showVersions && versions.length > 0 && (
            <div className="w-64 shrink-0 border-l pl-4 overflow-y-auto">
              <h4 className="text-sm font-medium mb-2">Version History</h4>
              <div className="space-y-2">
                {versions.map((v: any) => (
                  <div key={v.id} className="text-xs p-2 rounded-sm border">
                    <div className="font-medium">v{v.versionNumber}</div>
                    <div className="text-muted-foreground">{formatSize(v.size)}</div>
                    {v.comment && <div className="text-muted-foreground mt-1">"{v.comment}"</div>}
                    <div className="text-muted-foreground mt-1">{new Date(v.createdAt).toLocaleDateString()}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="px-6 pb-4 flex items-center gap-2 border-t pt-3 shrink-0">
          <Button variant="outline" size="sm" onClick={() => window.open(downloadUrl, "_blank")}>
            <DownloadIcon className="mr-1 size-4" /> Download
          </Button>

          {!trashed && (
            <>
              {onDuplicate && (
                <Button variant="outline" size="sm" onClick={() => onDuplicate(file.id)}>
                  <CopyIcon className="mr-1 size-4" /> Duplicate
                </Button>
              )}
              {onLockToggle && (
                <Button variant="outline" size="sm" onClick={() => onLockToggle(file.id, !!file.isLocked)}>
                  {file.isLocked ? <><UnlockIcon className="mr-1 size-4" /> Unlock</> : <><LockIcon className="mr-1 size-4" /> Lock</>}
                </Button>
              )}
              {onShare && (
                <Button variant="outline" size="sm" onClick={() => onShare(file)}>
                  <Share2Icon className="mr-1 size-4" /> Share
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={loadVersions} disabled={loadingVersions}>
                <HistoryIcon className="mr-1 size-4" /> Versions
              </Button>
              {onDelete && (
                <Button variant="destructive" size="sm" className="ml-auto" onClick={() => onDelete(file.id)}>
                  <Trash2Icon className="mr-1 size-4" /> Delete
                </Button>
              )}
            </>
          )}

          {trashed && onRestore && (
            <Button variant="outline" size="sm" className="ml-auto" onClick={() => onRestore(file.id)}>
              <RotateCcwIcon className="mr-1 size-4" /> Restore
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
