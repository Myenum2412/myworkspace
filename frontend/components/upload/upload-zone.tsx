"use client";

import { UploadIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface UploadZoneProps {
  dragOver: boolean;
  onDrop: (e: React.DragEvent) => void;
  onDragEnter: (e: React.DragEvent) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  onClick: () => void;
  inputRef: React.RefObject<HTMLInputElement | null>;
  onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export function UploadZone({
  dragOver,
  onDrop,
  onDragEnter,
  onDragLeave,
  onDragOver,
  onClick,
  inputRef,
  onFileSelect,
}: UploadZoneProps) {
  return (
    <div
      className={cn(
        "relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 transition-all duration-200 cursor-pointer",
        dragOver
          ? "border-primary bg-primary/5 shadow-lg shadow-primary/10 scale-[1.01]"
          : "border-muted-foreground/20 bg-muted/10 hover:border-muted-foreground/30 hover:bg-muted/20",
      )}
      onDrop={onDrop}
      onDragEnter={onDragEnter}
      onDragLeave={onDragLeave}
      onDragOver={onDragOver}
      onClick={onClick}
    >
      <div className={cn(
        "flex flex-col items-center gap-2 pointer-events-none",
        dragOver && "scale-105",
      )}>
        <div className={cn(
          "flex items-center justify-center size-14 rounded-full transition-colors",
          dragOver ? "bg-primary/10" : "bg-muted-foreground/10",
        )}>
          <UploadIcon className={cn(
            "size-6 transition-colors",
            dragOver ? "text-primary" : "text-muted-foreground/60",
          )} />
        </div>
        <p className="text-sm font-medium">
          {dragOver ? "Drop files here" : "Drag & drop files here"}
        </p>
        <p className="text-xs text-muted-foreground">
          or click to browse &middot; supports multiple files and folders &middot; up to 500 MB per file
        </p>
      </div>

      <input
        ref={inputRef}
        type="file"
        multiple
        className="hidden"
        onChange={onFileSelect}
      />
    </div>
  );
}
