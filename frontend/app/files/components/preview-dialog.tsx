"use client";

import { useEffect, useState } from "react";
import { getFileIcon } from "@/components/files/utils";
import { FileViewer, getFileTypeCategory } from "@/components/files/viewers/file-viewer";
import { Button } from "@/components/ui/button";
import { useFileSystemStore } from "@/lib/file-system/store";
import { formatSize } from "@/lib/file-system/types";
import {
  CalendarIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ClockIcon,
  DatabaseIcon,
  DownloadIcon,
  FolderIcon,
  HardDriveIcon,
  HashIcon,
  InfoIcon,
  RulerIcon,
  ShieldCheckIcon,
  TagIcon,
  UserIcon,
  XIcon,
} from "@/lib/icons";

function DetailRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3 py-2">
      <Icon className="size-4 text-muted-foreground/60 mt-0.5 shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="text-[11px] text-muted-foreground">{label}</p>
        <p className="text-xs font-medium text-foreground truncate">{value}</p>
      </div>
    </div>
  );
}

function InfoSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border-b border-border/60 px-5 py-4">
      <h3 className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {title}
      </h3>
      {children}
    </div>
  );
}

export function PreviewDialog() {
  const { previewFile, setPreviewFile, files } = useFileSystemStore();
  const [previewUrl, setPreviewUrl] = useState("");
  const [showDetails, setShowDetails] = useState(true);
  const file = previewFile;

  useEffect(() => {
    if (!file) {
      setPreviewUrl("");
      return;
    }
    setPreviewUrl("");
    fetch(`/api/files/preview-url/${file.id}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.success && d.data?.url) setPreviewUrl(d.data.url);
      })
      .catch(() => {});
  }, [file?.id]);

  if (!file) return null;

  const src = previewUrl || `/api/files/${file.id}/download?preview=true`;
  const currentIndex = files.findIndex((f) => f.id === file.id);
  const prevFile = currentIndex > 0 ? files[currentIndex - 1] : null;
  const nextFile = currentIndex < files.length - 1 ? files[currentIndex + 1] : null;

  const extension = file.originalName?.split(".").pop()?.toUpperCase() || "—";
  const category = getFileTypeCategory(file);
  const isImage = file.mimeType?.startsWith("image/");

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      {/* Top toolbar */}
      <div className="flex items-center justify-between gap-3 px-4 py-3 shrink-0 border-b bg-background/80 backdrop-blur sm:px-6">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <Button
            variant="ghost"
            size="sm"
            className="p-0"
            disabled={!prevFile}
            onClick={() => prevFile && setPreviewFile(prevFile)}
          >
            <ChevronLeftIcon className="size-5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="p-0"
            disabled={!nextFile}
            onClick={() => nextFile && setPreviewFile(nextFile)}
          >
            <ChevronRightIcon className="size-5" />
          </Button>
          <div className="w-px h-5 bg-border mx-1" />
          <div className="grid size-10 shrink-0 place-items-center rounded-lg border border-border/70 bg-muted/40">
            {getFileIcon(file.mimeType)}
          </div>
          <div className="min-w-0">
            <h2 className="text-sm font-semibold truncate sm:text-base">{file.originalName}</h2>
            <p className="text-xs text-muted-foreground">
              {formatSize(file.size)} &middot; {file.mimeType || "Unknown"}
              {file.uploaderName && <> &middot; {file.uploaderName}</>}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <span className="hidden text-xs text-muted-foreground md:inline">
            {currentIndex + 1} / {files.length}
          </span>
          <Button
            variant="ghost"
            size="sm"
            className={showDetails ? "bg-accent text-primary" : ""}
            onClick={() => setShowDetails(!showDetails)}
          >
            <InfoIcon className="size-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.open(`/api/files/${file.id}/download`, "_blank")}
          >
            <DownloadIcon className="mr-1.5" /> Download
          </Button>
          <Button variant="ghost" size="sm" className="p-0" onClick={() => setPreviewFile(null)}>
            <XIcon className="size-5" />
          </Button>
        </div>
      </div>

      {/* Body */}
      <div className="flex min-h-0 flex-1">
        <div className="flex min-w-0 flex-1 flex-col">
          <FileViewer file={file} src={src} />
        </div>

        {/* Details sidebar */}
        {showDetails && (
          <aside className="hidden w-80 shrink-0 overflow-y-auto border-l border-border/70 bg-muted/20 lg:block">
            <InfoSection title="File">
              <DetailRow icon={HashIcon} label="Name" value={file.originalName || "—"} />
              <DetailRow icon={HashIcon} label="Extension" value={extension} />
              <DetailRow icon={DatabaseIcon} label="Type" value={file.mimeType || "Unknown"} />
              <DetailRow
                icon={FolderIcon}
                label="Category"
                value={file.category || category || "General"}
              />
              <DetailRow icon={HardDriveIcon} label="Size" value={formatSize(file.size || 0)} />
              {isImage && (
                <DetailRow
                  icon={RulerIcon}
                  label="Dimensions"
                  value={`${(file as any).width || "?"} × ${(file as any).height || "?"} px`}
                />
              )}
              <DetailRow icon={HashIcon} label="Version" value={String(file.currentVersion || 1)} />
            </InfoSection>

            <InfoSection title="Ownership">
              <DetailRow
                icon={UserIcon}
                label="Uploaded by"
                value={file.uploaderName || file.uploaderEmail || "Unknown"}
              />
              <DetailRow
                icon={CalendarIcon}
                label="Uploaded"
                value={file.createdAt ? new Date(file.createdAt).toLocaleString() : "—"}
              />
              <DetailRow
                icon={ClockIcon}
                label="Modified"
                value={
                  file.updatedAt
                    ? new Date(file.updatedAt).toLocaleString()
                    : file.createdAt
                      ? new Date(file.createdAt).toLocaleString()
                      : "—"
                }
              />
              <DetailRow icon={FolderIcon} label="Location" value={file.folderId || "My Files"} />
            </InfoSection>

            {file.description && (
              <InfoSection title="Description">
                <p className="text-xs text-muted-foreground leading-relaxed">{file.description}</p>
              </InfoSection>
            )}

            {file.tags && file.tags.length > 0 && (
              <InfoSection title="Tags">
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {file.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full border border-border/70 bg-background px-2.5 py-0.5 text-[11px] font-medium text-foreground"
                    >
                      <TagIcon className="mr-1 inline size-3 text-muted-foreground" />
                      {tag}
                    </span>
                  ))}
                </div>
              </InfoSection>
            )}

            <InfoSection title="Security">
              <DetailRow
                icon={ShieldCheckIcon}
                label="Virus scan"
                value={
                  file.virusScanStatus
                    ? file.virusScanStatus[0].toUpperCase() + file.virusScanStatus.slice(1)
                    : "Not scanned"
                }
              />
              <DetailRow
                icon={file.isLocked ? HashIcon : ShieldCheckIcon}
                label="Status"
                value={
                  file.isLocked
                    ? `Locked${file.lockedBy ? ` by ${file.lockedBy}` : ""}`
                    : "Available"
                }
              />
              <DetailRow icon={HashIcon} label="Approval" value={file.approvalStatus || "None"} />
            </InfoSection>

            <InfoSection title="System">
              <DetailRow icon={DatabaseIcon} label="File ID" value={file.id} />
              <DetailRow icon={FolderIcon} label="Folder ID" value={file.folderId || "Root"} />
              {file.checksum && (
                <DetailRow
                  icon={ShieldCheckIcon}
                  label="Checksum"
                  value={file.checksum.slice(0, 24) + "..."}
                />
              )}
            </InfoSection>
          </aside>
        )}
      </div>
    </div>
  );
}
