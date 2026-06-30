"use client";

import { useCallback, useState, useRef, type DragEvent } from "react";
import { Upload, Folder, File, AlertCircle } from "lucide-react";

interface UploadDropzoneProps {
  onFilesSelected: (files: FileList | File[]) => void;
  onFolderSelected: (files: FileList) => void;
  disabled?: boolean;
  maxSize?: number;
  acceptedMimeTypes?: string[];
}

export function UploadDropzone({
  onFilesSelected,
  onFolderSelected,
  disabled = false,
  maxSize = 10 * 1024 * 1024 * 1024,
  acceptedMimeTypes,
}: UploadDropzoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  const validateFiles = useCallback((files: File[]): File[] => {
    setError(null);
    const valid: File[] = [];

    for (const file of files) {
      if (file.size > maxSize) {
        setError(`File "${file.name}" exceeds maximum size of ${(maxSize / 1024 / 1024 / 1024).toFixed(1)}GB`);
        continue;
      }
      if (acceptedMimeTypes && !acceptedMimeTypes.includes(file.type)) {
        setError(`File "${file.name}" type "${file.type}" is not accepted`);
        continue;
      }
      valid.push(file);
    }

    return valid;
  }, [maxSize, acceptedMimeTypes]);

  const handleDragOver = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) setIsDragging(true);
  }, [disabled]);

  const handleDragLeave = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (disabled) return;

    const items = Array.from(e.dataTransfer.items);
    const hasFolders = items.some((item) => {
      const entry = item.webkitGetAsEntry?.();
      return entry?.isDirectory;
    });

    if (hasFolders) {
      const files = e.dataTransfer.files;
      if (files.length > 0) {
        onFolderSelected(files);
      }
    } else {
      const files = e.dataTransfer.files;
      if (files.length > 0) {
        const valid = validateFiles(Array.from(files));
        if (valid.length > 0) onFilesSelected(valid);
      }
    }
  }, [disabled, onFilesSelected, onFolderSelected, validateFiles]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const valid = validateFiles(Array.from(files));
      if (valid.length > 0) onFilesSelected(valid);
    }
    e.target.value = "";
  }, [onFilesSelected, validateFiles]);

  const handleFolderInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      onFolderSelected(files);
    }
    e.target.value = "";
  }, [onFolderSelected]);

  return (
    <div
      className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer
        ${isDragging
          ? "border-primary bg-primary/5"
          : "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50"
        }
        ${disabled ? "opacity-50 cursor-not-allowed" : ""}
      `}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={() => fileInputRef.current?.click()}
    >
      <div className="flex flex-col items-center gap-4">
        <div className="p-3 rounded-full bg-primary/10">
          <Upload className="h-8 w-8 text-primary" />
        </div>
        <div>
          <p className="text-sm font-medium">
            Drop files here or click to browse
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Supports files up to {(maxSize / 1024 / 1024 / 1024).toFixed(1)}GB
          </p>
        </div>
        <div className="flex gap-2 mt-2">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              fileInputRef.current?.click();
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border bg-background hover:bg-muted transition-colors"
          >
            <File className="h-3.5 w-3.5" />
            Select Files
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              folderInputRef.current?.click();
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border bg-background hover:bg-muted transition-colors"
          >
            <Folder className="h-3.5 w-3.5" />
            Select Folder
          </button>
        </div>
      </div>

      {error && (
        <div className="mt-3 flex items-center gap-2 text-sm text-destructive">
          <AlertCircle className="h-4 w-4" />
          <span>{error}</span>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        multiple
        onChange={handleFileInput}
        className="hidden"
        accept={acceptedMimeTypes?.join(",")}
      />
      <input
        ref={folderInputRef}
        type="file"
        multiple
        onChange={handleFolderInput}
        className="hidden"
        {...({ webkitdirectory: "" } as any)}
      />
    </div>
  );
}
