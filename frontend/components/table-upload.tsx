"use client";

import { useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { FileText, Upload, X } from "@/lib/icons";

interface TableUploadProps {
  onFilesChange?: (files: any[]) => void;
  compactImage?: boolean;
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function TableUpload({ onFilesChange, compactImage }: TableUploadProps) {
  const [files, setFiles] = useState<File[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = (fileList: FileList | null) => {
    if (!fileList) return;
    const newFiles = Array.from(fileList);
    const updated = [...files, ...newFiles];
    setFiles(updated);
    onFilesChange?.(updated);
  };

  const removeFile = (index: number) => {
    const updated = files.filter((_, i) => i !== index);
    setFiles(updated);
    onFilesChange?.(updated);
  };

  return (
    <div className="space-y-2">
      <Card
        className="group flex cursor-pointer flex-col items-center justify-center gap-3 border-dashed py-6 text-sm shadow-none transition-colors hover:bg-muted/50"
        onClick={() => inputRef.current?.click()}
        onDrop={(e) => {
          e.preventDefault();
          handleFiles(e.dataTransfer.files);
        }}
        onDragOver={(e) => e.preventDefault()}
      >
        <Upload className="size-5 text-muted-foreground" />
        <div className="text-center">
          <p className="text-sm text-muted-foreground">Drop files here or click to browse</p>
          <p className="text-xs text-muted-foreground/60 mt-0.5">PDF, DOC, XLS, images</p>
        </div>
      </Card>
      <input
        ref={inputRef}
        type="file"
        multiple
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
      {files.length > 0 && (
        <div className="divide-y">
          {files.map((f, i) => (
            <div key={i} className="group flex items-center gap-3 py-2.5">
              <div className="grid size-8 shrink-0 place-content-center rounded border bg-muted">
                <FileText className="size-3.5 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm truncate">{f.name}</p>
                <p className="text-xs text-muted-foreground">{formatSize(f.size)}</p>
              </div>
              <button
                type="button"
                onClick={() => removeFile(i)}
                className="text-muted-foreground hover:text-destructive transition-colors p-1"
              >
                <X className="size-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
