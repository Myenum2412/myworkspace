"use client";

import { formatSize } from "@/lib/file-system/types";
import type { FileItem } from "@/lib/file-system/types";
import {
  FileIcon,
  CalendarIcon,
  UserIcon,
  HardDriveIcon,
  HashIcon,
  FolderIcon,
  TagIcon,
  RulerIcon,
  ClockIcon,
  ShieldCheckIcon,
  DatabaseIcon,
} from "lucide-react";

interface FileInfoPanelProps {
  file: FileItem;
}

export function FileInfoPanel({ file }: FileInfoPanelProps) {
  const infoRows = [
    { label: "File Name", value: file.originalName, icon: FileIcon },
    { label: "Extension", value: file.originalName?.split(".").pop()?.toUpperCase() || "-", icon: HashIcon },
    { label: "MIME Type", value: file.mimeType || "-", icon: FileIcon },
    { label: "Size", value: formatSize(file.size || 0), icon: HardDriveIcon },
    { label: "Uploaded By", value: file.uploaderName || "Unknown", icon: UserIcon },
    { label: "Upload Date", value: file.createdAt ? new Date(file.createdAt).toLocaleString() : "-", icon: CalendarIcon },
    { label: "Last Modified", value: file.updatedAt ? new Date(file.updatedAt).toLocaleString() : file.createdAt ? new Date(file.createdAt).toLocaleString() : "-", icon: ClockIcon },
    { label: "Category", value: file.category || "General", icon: TagIcon },
    { label: "Folder ID", value: file.folderId || "Root", icon: FolderIcon },
    { label: "File ID", value: file.id, icon: DatabaseIcon },
    { label: "Checksum", value: file.checksum ? file.checksum.slice(0, 16) + "..." : "-", icon: ShieldCheckIcon },
    { label: "Version", value: String(file.currentVersion || 1), icon: HashIcon },
  ];

  if (file.mimeType?.startsWith("image/")) {
    infoRows.splice(4, 0, { label: "Dimensions", value: `${(file as any).width || "?"} x ${(file as any).height || "?"} px`, icon: RulerIcon });
  }

  return (
    <div className="p-4 space-y-0.5">
      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">File Information</h3>
      {infoRows.map((row) => (
        <div key={row.label} className="flex items-start gap-3 py-1.5">
          <row.icon className="size-3.5 text-muted-foreground/60 mt-0.5 shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="text-[11px] text-muted-foreground">{row.label}</p>
            <p className="text-xs font-medium truncate">{row.value}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
