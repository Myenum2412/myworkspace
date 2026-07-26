"use client";

import { useCallback, useRef, useState } from "react";
import { Upload, FileText, Copy, ExternalLink, X, Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

interface UploadedFile {
  name: string;
  size: number;
  type: string;
  url: string;
}

interface UploadThingDropzoneProps {
  onUpload?: (files: File[]) => Promise<UploadedFile[]>;
  onSelect?: (files: File[]) => void;
  onProgress?: (progress: number) => void;
  accept?: string;
  maxFiles?: number;
  maxSize?: number;
  disabled?: boolean;
  className?: string;
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

export function UploadThingDropzone({
  onUpload,
  onSelect,
  onProgress,
  accept = "image/*",
  maxFiles = 4,
  maxSize = 4 * 1024 * 1024,
  disabled = false,
  className,
}: UploadThingDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [error, setError] = useState<string | null>(null);

  const handleFiles = useCallback(
    async (files: File[]) => {
      if (files.length === 0) return;

      const validFiles = files.slice(0, maxFiles);
      setError(null);

      for (const file of validFiles) {
        if (file.size > maxSize) {
          setError(`File too large. Max size: ${formatFileSize(maxSize)}`);
          return;
        }
      }

      onSelect?.(validFiles);

      if (onUpload) {
        try {
          setIsUploading(true);
          setProgress(0);

          const interval = setInterval(() => {
            setProgress((prev) => {
              const next = Math.min(prev + 10, 90);
              onProgress?.(next);
              return next;
            });
          }, 200);

          const results = await onUpload(validFiles);
          clearInterval(interval);
          setProgress(100);
          onProgress?.(100);
          setUploadedFiles((prev) => [...prev, ...results]);

          setTimeout(() => {
            setProgress(0);
          }, 1000);
        } catch (err) {
          setError(err instanceof Error ? err.message : "Upload failed");
        } finally {
          setIsUploading(false);
        }
      }
    },
    [maxFiles, maxSize, onSelect, onUpload, onProgress]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled) setIsDragOver(true);
  }, [disabled]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      if (disabled || isUploading) return;

      const files = Array.from(e.dataTransfer.files);
      handleFiles(files);
    },
    [disabled, isUploading, handleFiles]
  );

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files ? Array.from(e.target.files) : [];
      handleFiles(files);
      e.target.value = "";
    },
    [handleFiles]
  );

  const handleClick = () => {
    if (!disabled && !isUploading) {
      inputRef.current?.click();
    }
  };

  const removeFile = (index: number) => {
    setUploadedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const copyUrl = (url: string) => {
    navigator.clipboard.writeText(url);
  };

  return (
    <div data-slot="uploadthing-dropzone" className={cn("w-full space-y-4", className)}>
      <div
        onClick={handleClick}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          "group flex cursor-pointer flex-col items-center justify-center gap-3 border border-dashed px-6 py-10 text-center transition-colors outline-none",
          "focus-visible:ring-[3px] focus-visible:ring-ring/50",
          isDragOver
            ? "border-primary bg-primary/5"
            : "border-border bg-muted/40 hover:bg-muted/60",
          disabled && "opacity-50 cursor-not-allowed",
          isUploading && "pointer-events-none"
        )}
      >
        <div className={cn(
          "flex size-12 items-center justify-center border transition-colors rounded-sm",
          isDragOver
            ? "border-primary bg-background text-primary"
            : "border-border bg-background text-muted-foreground"
        )}>
          {isUploading ? (
            <Loader2 className="size-6 animate-spin" />
          ) : (
            <Upload className="size-6" />
          )}
        </div>

        <div className="flex flex-col gap-1">
          {isUploading ? (
            <div className="w-48 space-y-2">
              <Progress value={progress} className="h-2" />
              <p className="text-sm text-muted-foreground">{progress}% uploading...</p>
            </div>
          ) : (
            <>
              <p className="text-sm font-medium text-foreground">
                {isDragOver ? "Drop files here" : "Drop files here or click to browse"}
              </p>
              <p className="text-xs text-muted-foreground">
                Max {maxFiles} files, up to {formatFileSize(maxSize)} each
              </p>
            </>
          )}
        </div>

        {!isUploading && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              inputRef.current?.click();
            }}
          >
            <Upload className="mr-1.5" />
            Browse Files
          </Button>
        )}

        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple={maxFiles > 1}
          onChange={handleFileChange}
          disabled={disabled || isUploading}
          className="sr-only"
          aria-label="Upload files"
        />
      </div>

      {error && (
        <div className="flex items-center gap-2 text-sm text-destructive">
          <AlertCircle className="size-4 shrink-0" />
          {error}
        </div>
      )}

      {uploadedFiles.length > 0 && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium">Uploaded Files</h4>
            <button
              type="button"
              onClick={() => setUploadedFiles([])}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Clear all
            </button>
          </div>
          <div className="divide-y max-h-48 overflow-y-auto">
            {uploadedFiles.map((file, index) => (
              <div key={`${file.name}-${index}`} className="group flex items-center gap-3 py-2.5">
                <div className="grid size-9 shrink-0 place-content-center rounded border bg-muted">
                  <FileText className="size-4 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{file.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatFileSize(file.size)}{file.type ? ` • ${file.type}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    type="button"
                    onClick={() => copyUrl(file.url)}
                    className="p-1.5 hover:bg-muted rounded-sm text-muted-foreground hover:text-foreground transition-colors"
                    title="Copy URL"
                  >
                    <Copy className="size-3.5" />
                  </button>
                  <a
                    href={file.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1.5 hover:bg-muted rounded-sm text-muted-foreground hover:text-foreground transition-colors"
                    title="Open file"
                  >
                    <ExternalLink className="size-3.5" />
                  </a>
                  <button
                    type="button"
                    onClick={() => removeFile(index)}
                    className="p-1.5 hover:bg-destructive/10 rounded-sm text-muted-foreground hover:text-destructive transition-colors"
                    title="Remove"
                  >
                    <X className="size-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
