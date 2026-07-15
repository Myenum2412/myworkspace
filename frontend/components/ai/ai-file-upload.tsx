"use client";

import { useState, useCallback, useRef } from "react";
import { Upload, File, X, FileText, Image } from "lucide-react";

interface UploadedFile {
  name: string;
  type: string;
  size: number;
  url?: string;
}

interface AiFileUploadProps {
  onFilesChange: (files: UploadedFile[]) => void;
  files: UploadedFile[];
  maxSize?: number;
  accept?: string;
}

export function AiFileUpload({ onFilesChange, files, maxSize = 50 * 1024 * 1024, accept = ".pdf,.docx,.xlsx,.csv,.png,.jpg,.jpeg,.gif,.webp,.txt" }: AiFileUploadProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const droppedFiles = Array.from(e.dataTransfer.files);
    processFiles(droppedFiles);
  }, [files]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    processFiles(selectedFiles);
    if (inputRef.current) inputRef.current.value = "";
  }, [files]);

  const processFiles = (newFiles: File[]) => {
    const validFiles: UploadedFile[] = [];
    for (const file of newFiles) {
      if (file.size > maxSize) {
        alert(`File "${file.name}" exceeds the maximum size of ${maxSize / 1024 / 1024}MB`);
        continue;
      }
      validFiles.push({
        name: file.name,
        type: file.type,
        size: file.size,
        url: URL.createObjectURL(file),
      });
    }
    onFilesChange([...files, ...validFiles]);
  };

  const removeFile = (index: number) => {
    const updated = files.filter((_, i) => i !== index);
    onFilesChange(updated);
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getFileIcon = (name: string) => {
    const ext = name.split(".").pop()?.toLowerCase();
    if (["png", "jpg", "jpeg", "gif", "webp"].includes(ext || "")) return <Image className="h-4 w-4" />;
    return <FileText className="h-4 w-4" />;
  };

  return (
    <div className="space-y-2">
      {files.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {files.map((file, index) => (
            <div key={index} className="flex items-center gap-2 bg-muted/50 rounded-md px-3 py-1.5 text-sm">
              {getFileIcon(file.name)}
              <span className="truncate max-w-[150px]">{file.name}</span>
              <span className="text-xs text-muted-foreground">({formatSize(file.size)})</span>
              <button onClick={() => removeFile(index)} className="text-muted-foreground hover:text-foreground ml-1">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div
        onDrop={handleDrop}
        onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
        onDragLeave={() => setIsDragOver(false)}
        onClick={() => inputRef.current?.click()}
        className={`flex items-center justify-center gap-2 border-2 border-dashed rounded-lg p-3 cursor-pointer transition-colors text-sm
          ${isDragOver ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"}`}
      >
        <Upload className="h-4 w-4 text-muted-foreground" />
        <span className="text-muted-foreground">Drop files or click to upload</span>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={accept}
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>
    </div>
  );
}
