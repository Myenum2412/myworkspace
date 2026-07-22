"use client"
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
import { FileIcon, Calendar, User, HardDrive, Tag, Clock } from "lucide-react";

type RecycledFile = {
  id: string;
  originalName: string;
  mimeType: string;
  size: number;
  createdAt: string;
  deletedAt: string;
  uploaderName?: string;
};

type FileViewDialogProps = {
  file: RecycledFile | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function Field({ icon: Icon, label, value }: { icon?: React.FC<{ className?: string }>; label: string; value?: string | number | null }) {
  return (
    <div className="flex items-start gap-3 rounded-sm border bg-card px-4 py-3">
      {Icon && <Icon className="size-4 text-muted-foreground shrink-0 mt-0.5" />}
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">{label}</p>
        <p className="text-sm font-medium mt-0.5 break-words">{value ?? "\u2014"}</p>
      </div>
    </div>
  );
}

export function FileViewDialog({ file, open, onOpenChange }: FileViewDialogProps) {
  if (!file) return null;

  const fileExt = file.mimeType.split("/").pop()?.toUpperCase() || "FILE";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl w-full p-0 flex flex-col">
        <DialogHeader className="px-6 pt-6 pb-4 shrink-0 border-b">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-sm bg-muted flex items-center justify-center shrink-0">
              <FileIcon className="size-5 text-muted-foreground" />
            </div>
            <div className="min-w-0 flex-1">
              <DialogTitle className="text-lg truncate">{file.originalName}</DialogTitle>
              <DialogDescription>
                <Badge variant="outline" className="text-[10px]">{fileExt}</Badge>
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 px-6 py-4 space-y-3 overflow-y-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field icon={FileIcon} label="File Name" value={file.originalName} />
            <Field icon={Tag} label="File Type" value={fileExt} />
            <Field icon={HardDrive} label="Size" value={formatSize(file.size)} />
            <Field icon={User} label="Uploaded By" value={file.uploaderName} />
            <Field icon={Calendar} label="Uploaded Date" value={file.createdAt ? new Date(file.createdAt).toLocaleDateString() : null} />
            <Field icon={Clock} label="Deleted Date" value={file.deletedAt ? new Date(file.deletedAt).toLocaleDateString() : null} />
            <Field icon={Tag} label="File ID" value={file.id} />
            <Field icon={Tag} label="MIME Type" value={file.mimeType} />
          </div>
        </div>

        <DialogFooter className="shrink-0 border-t px-6 py-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
