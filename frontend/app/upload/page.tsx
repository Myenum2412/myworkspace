"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { AppSidebar } from "@/components/app-sidebar";
import { Header } from "@/components/header";
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { UploadIcon, FileIcon, XIcon, CheckCircleIcon, AlertCircleIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export default function UploadPage() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [user, setUser] = useState({ name: "", email: "", avatar: "" });
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [status, setStatus] = useState<"idle" | "uploading" | "success" | "error">("idle");
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/user/me")
      .then((r) => r.json())
      .then((u) => setUser({ name: u.name || "User", email: u.email || "", avatar: u.image || "" }))
      .catch(() => {});
  }, []);

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
    <SidebarProvider>
      <AppSidebar user={user} />
      <SidebarInset>
        <Header />
        <main className="flex flex-1 flex-col gap-4 p-4">
          <h1 className="text-2xl font-bold">Upload File</h1>

          <Card className="py-12">
            <CardContent className="flex flex-col items-center justify-center gap-4">
              {status === "success" ? (
                <div className="flex flex-col items-center gap-3">
                  <div className="rounded-full bg-emerald-100 p-4 dark:bg-emerald-900/30">
                    <CheckCircleIcon className="size-8 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
                    File uploaded successfully!
                  </p>
                </div>
              ) : status === "error" ? (
                <div className="flex flex-col items-center gap-3">
                  <div className="rounded-full bg-red-100 p-4 dark:bg-red-900/30">
                    <AlertCircleIcon className="size-8 text-red-600 dark:text-red-400" />
                  </div>
                  <p className="text-sm font-medium text-red-600 dark:text-red-400">{error}</p>
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
                <>
                  <div className="w-full max-w-md rounded-lg border p-4">
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
                    {uploading && (
                      <div className="mt-3">
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
                  </div>
                  {!uploading && (
                    <Button onClick={handleUpload} disabled={uploading}>
                      <UploadIcon className="mr-2 size-4" />
                      Upload
                    </Button>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
