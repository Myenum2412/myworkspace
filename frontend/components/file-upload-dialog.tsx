"use client";

import { useState, useRef, useCallback } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  UploadIcon, XIcon, FileIcon, Loader2Icon, AlertCircleIcon, CheckCircle2Icon,
} from "lucide-react";

interface UploadFile {
  file: File;
  id: string;
  progress: number;
  status: "pending" | "uploading" | "done" | "error" | "duplicate";
  error?: string;
}

interface FileUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orgId: string;
  folderId?: string | null;
  clientId?: string | null;
  onUploadComplete?: () => void;
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function FileUploadDialog({ open, onOpenChange, orgId, folderId, clientId, onUploadComplete }: FileUploadDialogProps) {
  const [files, setFiles] = useState<UploadFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const reset = useCallback(() => {
    setFiles([]);
    setDescription("");
    setTags("");
    setUploading(false);
  }, []);

  const addFiles = useCallback((fileList: FileList | File[]) => {
    const newFiles: UploadFile[] = Array.from(fileList).map(file => ({
      file,
      id: Math.random().toString(36).slice(2),
      progress: 0,
      status: "pending" as const,
    }));
    setFiles(prev => [...prev, ...newFiles]);
  }, []);

  const removeFile = useCallback((id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id));
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files);
  }, [addFiles]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => setDragOver(false), []);

  const startUpload = async () => {
    if (!files.length || !orgId) return;
    setUploading(true);

    const formData = new FormData();
    files.forEach(f => formData.append("files", f.file));
    formData.append("orgId", orgId);
    formData.append("folderId", folderId || "");
    if (clientId) formData.append("clientId", clientId);
    formData.append("description", description);
    formData.append("tags", JSON.stringify(tags.split(",").map(t => t.trim()).filter(Boolean)));

    setFiles(prev => prev.map(f => ({ ...f, status: "uploading" as const })));

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"}/api/files/upload`, {
        method: "POST",
        credentials: "include",
        body: formData,
      });

      const data = await res.json();

      if (data.results) {
        setFiles(prev => prev.map((f, i) => {
          const result = data.results[i];
          if (!result) return { ...f, status: "error" as const, error: "Upload failed" };
          if (result.error === "duplicate_skipped") return { ...f, status: "duplicate" as const };
          if (result.fileId) return { ...f, status: "done" as const, progress: 100 };
          return { ...f, status: "error" as const, error: result.error || "Upload failed" };
        }));
      }
    } catch (err: any) {
      setFiles(prev => prev.map(f => f.status === "uploading" ? { ...f, status: "error" as const, error: err.message } : f));
    } finally {
      setUploading(false);
      onUploadComplete?.();
    }
  };

  const allDone = files.length > 0 && files.every(f => f.status === "done" || f.status === "duplicate");
  const hasError = files.some(f => f.status === "error");

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { onOpenChange(false); setTimeout(reset, 300); } }}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Upload Files</DialogTitle>
          <DialogDescription>
            Drag and drop files or click to browse. Max 500 MB per file.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
              dragOver ? "border-primary bg-primary/5" : "border-muted-foreground/25"
            }`}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => inputRef.current?.click()}
          >
            <UploadIcon className="mx-auto size-8 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">
              Drag & drop files here, or click to browse
            </p>
            <input
              ref={inputRef}
              type="file"
              multiple
              className="hidden"
              onChange={(e) => e.target.files && addFiles(e.target.files)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="desc">Description (optional)</Label>
              <Textarea
                id="desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Add a description..."
                className="mt-1"
                rows={2}
              />
            </div>
            <div>
              <Label htmlFor="tags">Tags (comma separated)</Label>
              <Input
                id="tags"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="e.g. design, proposal, Q2"
                className="mt-1"
              />
            </div>
          </div>

          {files.length > 0 && (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {files.map((f) => (
                <div key={f.id} className="flex items-center gap-3 p-2 rounded-md border text-sm">
                  <FileIcon className="size-6 shrink-0 text-muted-foreground" />
                  <div className="flex-1 min-w-0">
                    <p className="truncate font-medium">{f.file.name}</p>
                    <p className="text-xs text-muted-foreground">{formatSize(f.file.size)}</p>
                  </div>
                  {f.status === "uploading" && <Loader2Icon className="size-4 animate-spin" />}
                  {f.status === "done" && <CheckCircle2Icon className="size-4 text-success" />}
                  {f.status === "duplicate" && <Badge variant="secondary" className="text-xs">Duplicate</Badge>}
                  {f.status === "error" && <AlertCircleIcon className="size-4 text-destructive" data-tip={f.error} />}
                  {!uploading && f.status === "pending" && (
                    <button onClick={() => removeFile(f.id)} className="text-muted-foreground hover:text-foreground">
                      <XIcon className="size-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {hasError && (
            <div className="flex items-center gap-2 text-sm text-red-500 bg-red-50 p-2 rounded-md">
              <AlertCircleIcon className="size-4" /> Some files failed to upload
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => { onOpenChange(false); setTimeout(reset, 300); }}>
              Cancel
            </Button>
            <Button onClick={startUpload} disabled={!files.length || uploading}>
              {uploading ? (
                <><Loader2Icon className="mr-2 size-4 animate-spin" /> Uploading...</>
              ) : allDone ? (
                "Done"
              ) : (
                <><UploadIcon className="mr-2 size-4" /> Upload {files.length} file{files.length > 1 ? "s" : ""}</>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
