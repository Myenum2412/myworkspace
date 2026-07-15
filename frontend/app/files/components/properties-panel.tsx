"use client";

import { useQuery } from "@tanstack/react-query";
import { useFileSystemStore } from "@/lib/file-system/store";
import { formatSize } from "@/lib/file-system/types";
import { getFileIcon } from "@/components/files/utils";
import * as api from "@/lib/file-system/api";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  FileIcon,
  FolderIcon,
  UserIcon,
  CalendarIcon,
  HardDriveIcon,
  TagIcon,
  HashIcon,
  LockIcon,
  FileTextIcon,
  ShieldCheckIcon,
} from "lucide-react";

function Field({ icon: Icon, label, value }: { icon: React.FC<{ className?: string }>; label: string; value?: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 py-2">
      {Icon && <Icon className="size-4 text-muted-foreground shrink-0 mt-0.5" />}
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">{label}</p>
        <div className="text-sm mt-0.5 break-words">{value ?? <span className="text-muted-foreground/50">—</span>}</div>
      </div>
    </div>
  );
}

export function PropertiesPanel() {
  const { propertiesTarget, setPropertiesTarget } = useFileSystemStore();

  const { data: file } = useQuery({
    queryKey: ["file", propertiesTarget?.id],
    queryFn: () => propertiesTarget?.type === "file" ? api.getFile(propertiesTarget.id) : null,
    enabled: propertiesTarget?.type === "file" && !!propertiesTarget.id,
  });

  const { data: folder } = useQuery({
    queryKey: ["folder", propertiesTarget?.id],
    queryFn: () => propertiesTarget?.type === "folder" ? api.getFolder(propertiesTarget.id) : null,
    enabled: propertiesTarget?.type === "folder" && !!propertiesTarget.id,
  });

  const isOpen = !!propertiesTarget;
  const isFile = propertiesTarget?.type === "file";

  return (
    <Sheet open={isOpen} onOpenChange={(o) => { if (!o) setPropertiesTarget(null); }}>
      <SheetContent className="w-80 sm:w-96">
        <SheetHeader>
          <div className="flex items-center gap-3">
            {isFile ? getFileIcon(file?.mimeType || "") : <FolderIcon className="size-5 text-primary/60" />}
            <div className="min-w-0">
              <SheetTitle className="text-base truncate">
                {isFile ? file?.originalName : folder?.name}
              </SheetTitle>
              <SheetDescription>{isFile ? "File Properties" : "Folder Properties"}</SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <div className="mt-6 space-y-1">
          {isFile && file ? (
            <>
              <Field icon={FileIcon} label="File Name" value={file.originalName} />
              <Field icon={FileTextIcon} label="MIME Type" value={file.mimeType} />
              <Field icon={HardDriveIcon} label="Size" value={formatSize(file.size)} />
              <Field icon={HashIcon} label="Version" value={file.currentVersion ? `v${file.currentVersion}` : "v1"} />
              <Separator />
              <Field icon={UserIcon} label="Uploaded By" value={file.uploaderName || file.uploaderId} />
              <Field icon={CalendarIcon} label="Created" value={file.createdAt ? new Date(file.createdAt).toLocaleString() : "—"} />
              <Field icon={CalendarIcon} label="Modified" value={file.updatedAt ? new Date(file.updatedAt).toLocaleString() : "—"} />
              <Separator />
              {file.tags && file.tags.length > 0 && (
                <Field icon={TagIcon} label="Tags" value={
                  <div className="flex flex-wrap gap-1 mt-1">
                    {file.tags.map((t) => <Badge key={t} variant="secondary" className="text-[9px]">{t}</Badge>)}
                  </div>
                } />
              )}
              <Field icon={LockIcon} label="Locked" value={file.isLocked ? `Yes${file.lockedBy ? ` (by ${file.lockedBy})` : ""}` : "No"} />
              <Field icon={ShieldCheckIcon} label="Virus Scan" value={file.virusScanStatus || "pending"} />
              {file.description && (
                <>
                  <Separator />
                  <Field icon={FileTextIcon} label="Description" value={file.description} />
                </>
              )}
            </>
          ) : folder ? (
            <>
              <Field icon={FolderIcon} label="Folder Name" value={folder.name} />
              <Field icon={HashIcon} label="Path" value={folder.path} />
              <Field icon={UserIcon} label="Created By" value={folder.createdBy || "—"} />
              <Field icon={CalendarIcon} label="Created" value={folder.createdAt ? new Date(folder.createdAt).toLocaleString() : "—"} />
              {folder.description && (
                <Field icon={FileTextIcon} label="Description" value={folder.description} />
              )}
            </>
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  );
}
