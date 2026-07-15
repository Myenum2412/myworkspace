"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { formatSize, type FileItem, type FileVersion } from "@/lib/file-system/types";
import * as api from "@/lib/file-system/api";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  HistoryIcon,
  RotateCcwIcon,
  DownloadIcon,
  UploadIcon,
  UserIcon,
  ClockIcon,
  HardDriveIcon,
} from "lucide-react";

interface VersionHistoryProps {
  file: FileItem;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function VersionHistory({ file, open, onOpenChange }: VersionHistoryProps) {
  const [uploading, setUploading] = useState(false);
  const [rollingBack, setRollingBack] = useState<number | null>(null);

  const { data: versions, refetch } = useQuery({
    queryKey: ["versions", file.id],
    queryFn: () => api.listVersions(file.id),
    enabled: open,
  });

  async function handleUploadVersion(e: React.ChangeEvent<HTMLInputElement>) {
    const fileInput = e.target.files?.[0];
    if (!fileInput) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", fileInput);
      await api.uploadVersion(file.id, formData);
      refetch();
    } catch (err) {
      console.error("Version upload failed", err);
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  async function handleRollback(versionId: string, versionNumber: number) {
    if (!confirm(`Restore version ${versionNumber}? This will create a new current version.`)) return;
    setRollingBack(versionNumber);
    try {
      await api.rollbackVersion(file.id, versionId);
      refetch();
    } catch (err) {
      console.error("Rollback failed", err);
    } finally {
      setRollingBack(null);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <HistoryIcon className="size-4" /> Version History
          </DialogTitle>
          <DialogDescription className="truncate">{file.originalName}</DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-2 py-2">
          {(!versions || versions.length === 0) ? (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground gap-2">
              <HistoryIcon className="size-8 text-muted-foreground/20" />
              <p className="text-xs">No version history</p>
            </div>
          ) : (
            versions
              .sort((a, b) => b.versionNumber - a.versionNumber)
              .map((version) => (
                <div
                  key={version.id}
                  className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-accent/30 transition-colors"
                >
                  <div className="size-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                    <span className="text-xs font-bold">v{version.versionNumber}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">Version {version.versionNumber}</span>
                      {version.versionNumber === file.currentVersion && (
                        <Badge variant="secondary" className="text-[9px]">Current</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-muted-foreground mt-0.5">
                      {version.uploaderName && (
                        <span className="flex items-center gap-1"><UserIcon className="size-3" /> {version.uploaderName}</span>
                      )}
                      <span className="flex items-center gap-1"><HardDriveIcon className="size-3" /> {formatSize(version.size)}</span>
                      <span className="flex items-center gap-1"><ClockIcon className="size-3" /> {new Date(version.createdAt).toLocaleDateString()}</span>
                    </div>
                    {version.comment && <p className="text-xs text-muted-foreground mt-1 italic">{version.comment}</p>}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0"
                      onClick={() => window.open(`/api/files/${file.id}?version=${version.versionNumber}`, "_blank")}>
                      <DownloadIcon className="size-3" />
                    </Button>
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0"
                      onClick={() => handleRollback(version.id, version.versionNumber)}
                      disabled={rollingBack === version.versionNumber}>
                      <RotateCcwIcon className="size-3" />
                    </Button>
                  </div>
                </div>
              ))
          )}
        </div>

        <DialogFooter className="border-t pt-4 flex items-center justify-between">
          <Button variant="outline" size="sm" disabled={uploading} className="relative">
            <label className="flex items-center gap-1.5 cursor-pointer">
              <UploadIcon className="size-3.5" />
              {uploading ? "Uploading..." : "Upload New Version"}
              <input
                type="file"
                className="sr-only"
                onChange={handleUploadVersion}
                disabled={uploading}
              />
            </label>
          </Button>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
