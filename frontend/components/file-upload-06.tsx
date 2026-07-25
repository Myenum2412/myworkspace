'use client';

import { CheckCircle, FileText, Loader2, Upload, X } from 'lucide-react';
import type React from 'react';
import { useRef, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { FolderIcon } from 'lucide-react';

interface UploadItem {
  id: string;
  name: string;
  size: number;
  progress: number;
  status: 'pending' | 'uploading' | 'completed' | 'error';
  error?: string;
}

interface Project {
  id: string;
  name: string;
}

interface FileUpload06Props {
  projects: Project[];
  onUpload: (file: File, projectId: string, onProgress: (pct: number) => void) => Promise<void>;
  maxSizeMB?: number;
  acceptedFormats?: string;
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function generateId() {
  return Math.random().toString(36).slice(2, 9);
}

export default function FileUpload06({
  projects,
  onUpload,
  maxSizeMB = 50,
  acceptedFormats = 'image/png,image/jpeg,image/gif,application/pdf',
}: FileUpload06Props) {
  const filePickerRef = useRef<HTMLInputElement>(null);
  const [uploads, setUploads] = useState<UploadItem[]>([]);
  const [selectedProject, setSelectedProject] = useState("");

  const openFilePicker = () => {
    filePickerRef.current?.click();
  };

  const addFiles = useCallback((fileList: FileList) => {
    const newItems: UploadItem[] = Array.from(fileList).map((f) => ({
      id: generateId(),
      name: f.name,
      size: f.size,
      progress: 0,
      status: 'pending' as const,
    }));
    setUploads((prev) => [...prev, ...newItems]);

    Array.from(fileList).forEach((file, i) => {
      const itemId = newItems[i].id;
      setUploads((prev) =>
        prev.map((u) => (u.id === itemId ? { ...u, status: 'uploading' as const } : u))
      );
      onUpload(file, selectedProject, (pct) => {
        setUploads((prev) =>
          prev.map((u) => (u.id === itemId ? { ...u, progress: pct } : u))
        );
      })
        .then(() => {
          setUploads((prev) =>
            prev.map((u) => (u.id === itemId ? { ...u, status: 'completed' as const, progress: 100 } : u))
          );
        })
        .catch((err) => {
          setUploads((prev) =>
            prev.map((u) =>
              u.id === itemId ? { ...u, status: 'error' as const, error: err.message || 'Upload failed' } : u
            )
          );
        });
    });
  }, [onUpload, selectedProject]);

  const onFileInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = event.target.files;
    if (selectedFiles && selectedFiles.length > 0) {
      addFiles(selectedFiles);
    }
    if (filePickerRef.current) filePickerRef.current.value = '';
  };

  const onDragOver = (event: React.DragEvent) => {
    event.preventDefault();
  };

  const onDropFiles = (event: React.DragEvent) => {
    event.preventDefault();
    const droppedFiles = event.dataTransfer.files;
    if (droppedFiles && droppedFiles.length > 0) {
      addFiles(droppedFiles);
    }
  };

  const removeUploadById = (id: string) => {
    setUploads((prev) => prev.filter((file) => file.id !== id));
  };

  const activeUploads = uploads.filter((f) => f.status === 'pending' || f.status === 'uploading');
  const completedUploads = uploads.filter((f) => f.status === 'completed');
  const failedUploads = uploads.filter((f) => f.status === 'error');

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-y-6">
      {projects.length > 0 && (
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
            <FolderIcon className="size-3.5" />
            Associate with Project
          </Label>
          <Select value={selectedProject} onValueChange={setSelectedProject}>
            <SelectTrigger>
              <SelectValue placeholder="Select a project (optional)" />
            </SelectTrigger>
            <SelectContent>
              {projects.map((p) => (
                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <Card
        className="group flex max-h-[200px] w-full cursor-pointer flex-col items-center justify-center gap-4 border-dashed py-8 text-sm shadow-none transition-colors hover:bg-muted/50"
        onClick={openFilePicker}
        onDragOver={onDragOver}
        onDrop={onDropFiles}
      >
        <div className="grid space-y-3">
          <div className="flex items-center gap-x-2 text-muted-foreground">
            <Upload className="size-5" />
            <div>
              Drop files here or{' '}
              <Button
                className="h-auto p-0 font-normal text-primary"
                onClick={openFilePicker}
                variant="link"
              >
                browse files
              </Button>{' '}
              to add
            </div>
          </div>
        </div>
        <input
          accept={acceptedFormats}
          className="hidden"
          multiple
          onChange={onFileInputChange}
          ref={filePickerRef}
          type="file"
        />
        <span className="mt-2 block text-base/6 text-muted-foreground group-disabled:opacity-50 sm:text-xs">
          Supported: PNG, JPG, PDF (max {maxSizeMB} MB)
        </span>
      </Card>

      <div className="flex flex-col gap-y-4">
        {activeUploads.length > 0 && (
          <div>
            <h2 className="mb-4 flex items-center text-balance font-mono font-normal text-foreground text-lg uppercase sm:text-xs">
              <Loader2 className="mr-1 size-4 animate-spin" />
              Uploading
            </h2>
            <div className="-mt-2 divide-y">
              {activeUploads.map((file) => (
                <div className="group flex items-center py-4" key={file.id}>
                  <div className="mr-3 grid size-10 shrink-0 place-content-center rounded border bg-muted">
                    <FileText className="inline size-4 group-hover:hidden" />
                    <Button
                      aria-label="Cancel"
                      className="hidden size-4 h-auto p-0 group-hover:inline"
                      onClick={() => removeUploadById(file.id)}
                      size="icon"
                      variant="ghost"
                    >
                      <X className="size-4" />
                    </Button>
                  </div>
                  <div className="mb-1 flex w-full flex-col">
                    <div className="flex justify-between gap-2">
                      <span className="select-none text-base/6 text-foreground group-disabled:opacity-50 sm:text-sm/6 truncate">
                        {file.name}
                      </span>
                      <span className="text-muted-foreground text-sm tabular-nums shrink-0">
                        {file.progress}%
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <Progress
                        className="mt-1 h-2 flex-1"
                        value={file.progress}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {failedUploads.length > 0 && (
          <div>
            <h2 className="mb-4 flex items-center text-balance font-mono font-normal text-foreground text-lg uppercase sm:text-xs">
              <X className="mr-1 size-4 text-destructive" />
              Failed
            </h2>
            <div className="-mt-2 divide-y">
              {failedUploads.map((file) => (
                <div className="group flex items-center py-4" key={file.id}>
                  <div className="mr-3 grid size-10 shrink-0 place-content-center rounded border bg-destructive/10">
                    <X className="size-4 text-destructive" />
                  </div>
                  <div className="flex w-full flex-col">
                    <span className="select-none text-base/6 text-foreground sm:text-sm/6 truncate">
                      {file.name}
                    </span>
                    {file.error && (
                      <span className="text-xs text-destructive">{file.error}</span>
                    )}
                  </div>
                  <Button
                    aria-label="Remove"
                    size="icon"
                    variant="ghost"
                    className="ml-2 shrink-0"
                    onClick={() => removeUploadById(file.id)}
                  >
                    <X className="size-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {(activeUploads.length > 0 || failedUploads.length > 0) && completedUploads.length > 0 && (
          <Separator className="my-0" />
        )}

        {completedUploads.length > 0 && (
          <div>
            <h2 className="mb-4 flex items-center text-balance font-mono font-normal text-foreground text-lg uppercase sm:text-xs">
              <CheckCircle className="mr-1 size-4 text-green-500" />
              Finished
            </h2>
            <div className="-mt-2 divide-y">
              {completedUploads.map((file) => (
                <div className="group flex items-center py-4" key={file.id}>
                  <div className="mr-3 grid size-10 shrink-0 place-content-center rounded border bg-muted">
                    <FileText className="inline size-4 group-hover:hidden" />
                    <Button
                      aria-label="Remove"
                      className="hidden size-4 h-auto p-0 group-hover:inline"
                      onClick={() => removeUploadById(file.id)}
                      size="icon"
                      variant="ghost"
                    >
                      <X className="size-4" />
                    </Button>
                  </div>
                  <div className="flex w-full flex-col">
                    <span className="select-none text-base/6 text-foreground sm:text-sm/6 truncate">
                      {file.name}
                    </span>
                    <span className="text-xs text-muted-foreground">{formatSize(file.size)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
