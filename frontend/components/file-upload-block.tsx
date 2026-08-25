"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Toaster } from "@/components/ui/sonner";
import { AlertCircle, CheckCircle, FileText, Loader2, Upload, X } from "@/lib/icons";
import { cn } from "@/lib/utils";

const MAX_SIZE = 25 * 1024 * 1024;
const ACCEPTED = ["image/png", "image/jpeg", "application/pdf"];

type UploadStatus = "uploading" | "done" | "error";

type UploadItem = {
  id: string;
  name: string;
  size: number;
  progress: number;
  status: UploadStatus;
  error?: string;
};

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function validate(file: File) {
  if (!ACCEPTED.includes(file.type)) return "Unsupported file type";
  if (file.size > MAX_SIZE) return "File exceeds 25 MB limit";
  return undefined;
}

export default function FileUploadBlock() {
  const [items, setItems] = useState<UploadItem[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dragDepth = useRef(0);
  const hasActiveUploads = items.some((i) => i.status === "uploading");
  const toastedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!hasActiveUploads) return;
    const timer = setInterval(() => {
      setItems((prev) =>
        prev.map((item) => {
          if (item.status !== "uploading") return item;
          const next = Math.min(100, item.progress + Math.random() * 18 + 6);
          if (next >= 100) {
            return { ...item, progress: 100, status: "done" };
          }
          return { ...item, progress: next };
        }),
      );
    }, 600);
    return () => clearInterval(timer);
  }, [hasActiveUploads]);

  useEffect(() => {
    for (const item of items) {
      if (item.status === "done" && !toastedRef.current.has(item.id)) {
        toastedRef.current.add(item.id);
        toast.success(`${item.name} uploaded`);
      }
    }
  }, [items]);

  const addFiles = useCallback((fileList: FileList | null) => {
    if (!fileList) return;
    const next: UploadItem[] = Array.from(fileList).map((file) => {
      const error = validate(file);
      return {
        id: `${file.name}-${file.size}-${Date.now()}-${Math.random()}`,
        name: file.name,
        size: file.size,
        progress: 0,
        status: error ? "error" : "uploading",
        error,
      };
    });
    setItems((prev) => [...next, ...prev]);
  }, []);

  const removeItem = useCallback((id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      dragDepth.current = 0;
      setIsDragging(false);
      addFiles(event.dataTransfer.files);
    },
    [addFiles],
  );

  const activeUploads = items.filter((i) => i.status === "uploading");
  const completedUploads = items.filter((i) => i.status === "done");
  const failedUploads = items.filter((i) => i.status === "error");

  return (
    <section className="flex w-full items-center justify-center bg-muted/30 px-6 py-16 text-foreground">
      <Toaster />
      <Card className="w-full max-w-xl">
        <CardHeader>
          <CardTitle>Upload assets</CardTitle>
          <CardDescription>Drag and drop your files or browse to attach them.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          <div
            role="button"
            tabIndex={0}
            onClick={() => inputRef.current?.click()}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                inputRef.current?.click();
              }
            }}
            onDragOver={(event) => {
              event.preventDefault();
            }}
            onDragEnter={(event) => {
              event.preventDefault();
              dragDepth.current += 1;
              setIsDragging(true);
            }}
            onDragLeave={(event) => {
              event.preventDefault();
              dragDepth.current -= 1;
              if (dragDepth.current <= 0) {
                dragDepth.current = 0;
                setIsDragging(false);
              }
            }}
            onDrop={onDrop}
            className={cn(
              "group flex cursor-pointer flex-col items-center justify-center gap-3 border border-dashed px-6 py-10 text-center transition-colors outline-none",
              "focus-visible:ring-[3px] focus-visible:ring-ring/50",
              isDragging
                ? "border-primary bg-primary/5"
                : "border-border bg-muted/40 hover:bg-muted/60",
            )}
          >
            <input
              ref={inputRef}
              type="file"
              multiple
              accept={ACCEPTED.join(",")}
              className="sr-only"
              onChange={(event) => {
                addFiles(event.target.files);
                event.target.value = "";
              }}
            />
            <Upload
              className={cn(
                "size-6 transition-colors",
                isDragging ? "text-primary" : "text-muted-foreground",
              )}
            />
            <div className="flex flex-col gap-1">
              <p className="text-sm font-medium text-foreground">
                {isDragging ? "Release to upload" : "Drag & drop files or click to browse"}
              </p>
              <p className="text-xs text-muted-foreground">Supports PDF, PNG, JPG up to 25 MB</p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={(event) => {
                event.stopPropagation();
                inputRef.current?.click();
              }}
            >
              <Upload className="mr-1.5" />
              Browse Files
            </Button>
          </div>

          {items.length > 0 && (
            <div className="flex flex-col gap-4">
              {activeUploads.length > 0 && (
                <div>
                  <h3 className="mb-3 flex items-center text-xs font-mono font-normal uppercase text-muted-foreground">
                    <Loader2 className="mr-1 size-3.5 animate-spin" />
                    Uploading
                  </h3>
                  <div className="-mt-1 divide-y">
                    {activeUploads.map((item) => (
                      <div key={item.id} className="group flex items-center gap-3 py-3">
                        <div className="grid size-9 shrink-0 place-content-center rounded border bg-muted">
                          <FileText className="size-4 text-muted-foreground group-hover:hidden" />
                          <button
                            className="hidden size-4 items-center justify-center group-hover:flex"
                            onClick={() => removeItem(item.id)}
                          >
                            <X className="size-3.5" />
                          </button>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between gap-2">
                            <span className="text-sm truncate">{item.name}</span>
                            <span className="text-xs text-muted-foreground tabular-nums shrink-0">
                              {Math.round(item.progress)}%
                            </span>
                          </div>
                          <Progress className="mt-1 h-1.5" value={item.progress} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {failedUploads.length > 0 && (
                <div>
                  <h3 className="mb-3 flex items-center text-xs font-mono font-normal uppercase text-muted-foreground">
                    <AlertCircle className="mr-1 size-3.5 text-destructive" />
                    Failed
                  </h3>
                  <div className="-mt-1 divide-y">
                    {failedUploads.map((item) => (
                      <div key={item.id} className="flex items-center gap-3 py-3">
                        <div className="grid size-9 shrink-0 place-content-center rounded border bg-destructive/10">
                          <AlertCircle className="size-4 text-destructive" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm truncate">{item.name}</p>
                          {item.error && <p className="text-xs text-destructive">{item.error}</p>}
                        </div>
                        <button
                          onClick={() => removeItem(item.id)}
                          className="text-muted-foreground hover:text-destructive p-1"
                        >
                          <X className="size-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {(activeUploads.length > 0 || failedUploads.length > 0) &&
                completedUploads.length > 0 && <hr className="border-t" />}

              {completedUploads.length > 0 && (
                <div>
                  <h3 className="mb-3 flex items-center text-xs font-mono font-normal uppercase text-muted-foreground">
                    <CheckCircle className="mr-1 size-3.5 text-green-500" />
                    Finished
                  </h3>
                  <div className="-mt-1 divide-y">
                    {completedUploads.map((item) => (
                      <div key={item.id} className="group flex items-center gap-3 py-3">
                        <div className="grid size-9 shrink-0 place-content-center rounded border bg-muted">
                          <FileText className="size-4 text-muted-foreground" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm truncate">{item.name}</p>
                          <p className="text-xs text-muted-foreground">{formatSize(item.size)}</p>
                        </div>
                        <button
                          onClick={() => removeItem(item.id)}
                          className="text-muted-foreground hover:text-destructive p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="size-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
