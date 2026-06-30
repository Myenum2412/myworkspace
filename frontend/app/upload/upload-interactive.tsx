"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { UploadIcon, FileIcon, XIcon, CheckCircleIcon, AlertCircleIcon, FolderIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type Project = {
  id: string;
  name: string;
};

export default function UploadInteractive({ projects, user }: { projects: Project[]; user: { name?: string; email?: string; image?: string } }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedProject, setSelectedProject] = useState("");
  const [status, setStatus] = useState<"idle" | "uploading" | "success" | "error">("idle");
  const [error, setError] = useState("");

  const handleSelect = (file: File | null) => {
    if (!file) return;
    setSelectedFile(file);
    setStatus("idle");
    setError("");
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setUploading(true);
    setStatus("uploading");
    setProgress(0);

    const formData = new FormData();
    formData.append("file", selectedFile);
    if (selectedProject) {
      formData.append("projectId", selectedProject);
    }

    const xhr = new XMLHttpRequest();
    xhr.upload.addEventListener("progress", (e) => {
      if (e.lengthComputable) {
        setProgress(Math.round((e.loaded / e.total) * 100));
      }
    });

    xhr.addEventListener("load", () => {
      setUploading(false);
      if (xhr.status === 200) {
        setStatus("success");
        setTimeout(() => {
          router.push("/files");
          router.refresh();
        }, 1500);
      } else {
        setStatus("error");
        setError("Upload failed");
      }
    });

    xhr.addEventListener("error", () => {
      setUploading(false);
      setStatus("error");
      setError("Network error");
    });

    xhr.open("POST", "/api/files");
    xhr.send(formData);
  };

  return (
    <main className="flex flex-1 flex-col gap-4 p-4">
      <h1 className="text-2xl font-bold">Upload File</h1>

      <Card className="py-8">
        <CardContent className="flex flex-col items-center justify-center gap-4">
          {status === "success" ? (
            <div className="flex flex-col items-center gap-3">
              <div className="rounded-full bg-green-100 p-4 dark:bg-green-900/30">
                <CheckCircleIcon className="size-8 text-success" />
              </div>
              <p className="text-sm font-medium text-success">
                File uploaded successfully!
              </p>
            </div>
          ) : status === "error" ? (
            <div className="flex flex-col items-center gap-3">
              <div className="rounded-full bg-red-100 p-4 dark:bg-red-900/30">
                <AlertCircleIcon className="size-8 text-destructive" />
              </div>
              <p className="text-sm font-medium text-destructive">{error}</p>
              <Button variant="outline" onClick={() => setStatus("idle")}>Try Again</Button>
            </div>
          ) : !selectedFile ? (
            <>
              <div
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => { e.preventDefault(); setDragOver(false); handleSelect(e.dataTransfer.files[0]); }}
                onClick={() => inputRef.current?.click()}
                className={cn(
                  "flex cursor-pointer flex-col items-center gap-3 rounded-xl border-2 border-dashed p-12 transition-colors",
                  dragOver
                    ? "border-primary bg-primary/5"
                    : "border-muted-foreground/25 hover:border-muted-foreground/50"
                )}
              >
                <div className="rounded-full bg-muted p-4">
                  <UploadIcon className="size-8 text-muted-foreground" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium">Drag and drop a file here</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    or click to browse (max 50 MB per file)
                  </p>
                </div>
                <Button type="button" variant="secondary">Choose File</Button>
              </div>
              <input
                ref={inputRef}
                type="file"
                className="hidden"
                onChange={(e) => handleSelect(e.target.files?.[0] || null)}
              />
            </>
          ) : (
            <div className="w-full max-w-md space-y-4">
              <div className="rounded-lg border p-4">
                <div className="flex items-center gap-3">
                  <FileIcon className="size-6 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{selectedFile.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {(selectedFile.size / (1024 * 1024)).toFixed(1)} MB
                    </p>
                  </div>
                  {!uploading && (
                    <button
                      onClick={() => setSelectedFile(null)}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <XIcon className="size-5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Project selector */}
              <div className="space-y-1.5">
                <Label htmlFor="project" className="text-sm flex items-center gap-1.5">
                  <FolderIcon className="size-3.5" />
                  Associate with Project
                </Label>
                <Select value={selectedProject} onValueChange={setSelectedProject}>
                  <SelectTrigger id="project">
                    <SelectValue placeholder="Select a project (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    {projects.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-[11px] text-muted-foreground">
                  Files will appear under this project in the file manager.
                </p>
              </div>

              {uploading && (
                <div>
                  <div className="flex justify-between text-xs text-muted-foreground mb-1">
                    <span>Uploading...</span>
                    <span>{progress}%</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-muted">
                    <div
                      className="h-2 rounded-full bg-primary transition-all duration-300"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              )}

              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => router.push("/files")} disabled={uploading}>
                  Cancel
                </Button>
                <Button onClick={handleUpload} disabled={uploading}>
                  <UploadIcon className="mr-2 size-4" />
                  {uploading ? "Uploading..." : "Upload"}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
