"use client";

import { useState, useRef, useCallback } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
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
  moduleName?: string;
  entityId?: string;
  projectId?: string;
  onUploadComplete?: () => void;
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function FileUploadDialog({ open, onOpenChange, orgId, folderId, clientId, moduleName, entityId, projectId, onUploadComplete }: FileUploadDialogProps) {
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
    if (moduleName) formData.append("moduleName", moduleName);
    if (entityId) formData.append("entityId", entityId);
    if (projectId) formData.append("projectId", projectId);
    formData.append("description", description);
    formData.append("tags", JSON.stringify(tags.split(",").map(t => t.trim()).filter(Boolean)));

    setFiles(prev => prev.map(f => ({ ...f, status: "uploading" as const })));

    try {
      const res = await fetch(`/api/files/upload`, {
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
      } else if (!res.ok) {
        const serverError = data.error || `HTTP ${res.status}`;
        setFiles(prev => prev.map(f => f.status === "uploading" ? { ...f, status: "error" as const, error: serverError } : f));
      }
    } catch (err: any) {
      setFiles(prev => prev.map(f => f.status === "uploading" ? { ...f, status: "error" as const, error: err.message || "Network error" } : f));
    } finally {
      setUploading(false);
      onUploadComplete?.();
    }
  };

  const allDone = files.length > 0 && files.every(f => f.status === "done" || f.status === "duplicate");
  const hasError = files.some(f => f.status === "error");

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { onOpenChange(false); setTimeout(reset, 300); } }}>
      <DialogContent className="w-auto h-auto min-w-[50vw] sm:max-w-fit p-0 overflow-hidden border-none shadow-2xl">
        <div className="bg-gradient-to-br from-primary/5 via-background to-background p-6 space-y-6">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-sm bg-primary/10 ring-4 ring-primary/5">
                <UploadIcon className="size-5 text-primary" />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold tracking-tight">Upload Files</DialogTitle>
                <DialogDescription className="text-sm mt-1">
                  Upload your documents, images, and other necessary files here.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="bg-amber-50/80 border border-amber-200/60 rounded-sm p-4 flex gap-3 text-sm text-amber-800 dark:bg-amber-900/10 dark:border-amber-900/30 dark:text-amber-400">
            <AlertCircleIcon className="size-5 shrink-0 mt-0.5 text-amber-600 dark:text-amber-500" />
            <div className="space-y-1">
              <p className="font-semibold">Important Upload Guidelines</p>
              <ul className="list-disc list-inside text-amber-700/80 dark:text-amber-400/80 text-xs space-y-1">
                <li>Maximum file size is <strong>500MB</strong> per file.</li>
                <li>Please ensure files are relevant to the client or project.</li>
                <li>Do not upload executable files (.exe, .bat) or sensitive unencrypted credentials.</li>
              </ul>
            </div>
          </div>

          <div
            className={`group relative border-2 border-dashed rounded-sm p-10 text-center cursor-pointer transition-all duration-200 ease-in-out ${
              dragOver 
                ? "border-primary bg-primary/10 scale-[1.02] shadow-inner" 
                : "border-muted-foreground/25 bg-card hover:bg-muted/50 hover:border-primary/50"
            }`}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => inputRef.current?.click()}
          >
            <div className="absolute inset-0 bg-gradient-to-t from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-sm" />
            <div className={`mx-auto flex size-16 items-center justify-center rounded-sm bg-primary/10 mb-4 transition-transform duration-300 ${dragOver ? "scale-110" : ""}`}>
              <UploadIcon className="size-8 text-primary" />
            </div>
            <p className="text-base font-medium text-foreground mb-1">
              {dragOver ? "Drop files here!" : "Drag & drop files here"}
            </p>
            <p className="text-sm text-muted-foreground">
              or click to browse your computer
            </p>
            <input
              ref={inputRef}
              type="file"
              multiple
              className="hidden"
              onChange={(e) => e.target.files && addFiles(e.target.files)}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Description (optional)</Label>
              <Textarea
                id="desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder=""
                className="resize-none focus-visible:ring-primary shadow-sm"
                rows={2}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Tags (comma separated)</Label>
              <Input
                id="tags"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder=""
                className="shadow-sm focus-visible:ring-primary"
              />
            </div>
          </div>

          {files.length > 0 && (
            <div className="space-y-2 max-h-52 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-muted-foreground/20">
              {files.map((f) => (
                <div key={f.id} className="flex items-center gap-3 p-3 rounded-sm border bg-card shadow-sm text-sm group transition-all hover:border-primary/30">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-sm bg-primary/10">
                    <FileIcon className="size-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="truncate font-medium text-foreground">{f.file.name}</p>
                    <p className="text-xs text-muted-foreground">{formatSize(f.file.size)}</p>
                  </div>
                  {f.status === "uploading" && <Loader2Icon className="size-5 text-primary animate-spin" />}
                  {f.status === "done" && <CheckCircle2Icon className="size-5 text-green-500" />}
                  {f.status === "duplicate" && <Badge variant="secondary" className="text-xs">Duplicate</Badge>}
                  {f.status === "error" && <span title={f.error}><AlertCircleIcon className="size-5 text-destructive" /></span>}
                  {!uploading && f.status === "pending" && (
                    <button 
                      onClick={(e) => { e.stopPropagation(); removeFile(f.id); }} 
                      className="text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-sm hover:bg-destructive/10"
                      title="Remove file"
                    >
                      <XIcon className="size-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {hasError && (
            <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 border border-destructive/20 p-3 rounded-sm">
              <AlertCircleIcon className="size-4 shrink-0" /> 
              <span>Some files failed to upload. Hover over the error icon for details.</span>
            </div>
          )}
        </div>

        <DialogFooter className="bg-muted/40 p-4 border-t border-border/50 flex flex-col sm:flex-row gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => { onOpenChange(false); setTimeout(reset, 300); }} className="w-full sm:w-auto">
            Cancel
          </Button>
          <Button 
            onClick={startUpload} 
            disabled={!files.length || uploading}
            className="w-full sm:w-auto shadow-md transition-all active:scale-95 bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            {uploading ? (
              <><Loader2Icon className="mr-2 size-4 animate-spin" /> Uploading...</>
            ) : allDone ? (
              <><CheckCircle2Icon className="mr-2 size-4" /> Done</>
            ) : (
              <><UploadIcon className="mr-2 size-4" /> Upload {files.length} file{files.length > 1 ? "s" : ""}</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
