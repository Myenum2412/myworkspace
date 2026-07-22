"use client";

import { useState, useRef } from "react";
import { UploadIcon, XIcon, FileIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

interface TableUploadProps {
  onFilesChange?: (files: any[]) => void;
  compactImage?: boolean;
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
      <div
        className="border-2 border-dashed border-muted-foreground/20 rounded-sm p-6 text-center cursor-pointer hover:border-primary/40 transition-colors"
        onClick={() => inputRef.current?.click()}
        onDrop={(e) => { e.preventDefault(); handleFiles(e.dataTransfer.files); }}
        onDragOver={(e) => e.preventDefault()}
      >
        <UploadIcon className="size-8 mx-auto text-muted-foreground/40 mb-2" />
        <p className="text-sm text-muted-foreground">Drop files here or click to upload</p>
      </div>
      <input
        ref={inputRef}
        type="file"
        multiple
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
      {files.length > 0 && (
        <div className="space-y-1">
          {files.map((f, i) => (
            <div key={i} className="flex items-center gap-2 bg-muted/30 rounded-sm px-3 py-1.5 text-sm">
              <FileIcon className="size-4 text-muted-foreground shrink-0" />
              <span className="truncate flex-1">{f.name}</span>
              <button type="button" onClick={() => removeFile(i)} className="text-muted-foreground hover:text-destructive">
                <XIcon className="size-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
