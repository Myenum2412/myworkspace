"use client";

import { useEffect, useState, use } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  FileIcon, DownloadIcon, LockIcon, Loader2Icon, AlertCircleIcon, FileTextIcon, ImageIcon,
} from "lucide-react";

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function ShareTokenPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const [file, setFile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [password, setPassword] = useState("");
  const [needsPassword, setNeedsPassword] = useState(false);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/shares/links/${token}`);
        if (!res.ok) {
          const err = await res.json();
          setError(err.error || "Share link not found");
          return;
        }
        const data = await res.json();
        setFile(data.data);
        setNeedsPassword(data.data.hasPassword);
      } catch {
        setError("Failed to load shared file");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [token]);

  const verifyAndDownload = async () => {
    if (needsPassword) {
      try {
        const res = await fetch(`/api/shares/links/${token}/verify`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ password }),
        });
        if (!res.ok) {
          setError("Invalid password");
          return;
        }
      } catch {
        setError("Verification failed");
        return;
      }
    }

    setDownloading(true);
    window.open(`/api/shares/links/${token}/download`, "_blank");
    setTimeout(() => setDownloading(false), 2000);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2Icon className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-96">
          <CardContent className="flex flex-col items-center gap-4 py-12">
            <AlertCircleIcon className="size-12 text-destructive" />
            <p className="text-lg font-medium">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-muted/30 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            {file?.mimeType?.startsWith("image/") ? (
              <ImageIcon className="size-16 text-muted-foreground" />
            ) : file?.mimeType?.includes("pdf") ? (
              <FileTextIcon className="size-16 text-muted-foreground" />
            ) : (
              <FileIcon className="size-16 text-muted-foreground" />
            )}
          </div>
          <CardTitle className="text-xl truncate">{file?.originalName || "Shared File"}</CardTitle>
          <p className="text-sm text-muted-foreground">
            {file?.mimeType} · {file?.size ? formatSize(file.size) : "Unknown size"}
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {needsPassword && (
            <div>
              <Label htmlFor="password">This file is password-protected</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={e => { setPassword(e.target.value); setError(""); }}
                placeholder="Enter password"
                className="mt-1"
              />
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 p-2 rounded-md">
              <AlertCircleIcon className="size-4" /> {error}
            </div>
          )}

          <Button className="w-full" onClick={verifyAndDownload} disabled={downloading || (needsPassword && !password)}>
            {downloading ? (
              <><Loader2Icon className="mr-2 size-4 animate-spin" /> Downloading...</>
            ) : (
              <><DownloadIcon className="mr-2 size-4" /> Download File</>
            )}
          </Button>

          {!file?.allowDownload && (
            <p className="text-xs text-center text-muted-foreground">
              <LockIcon className="inline size-3 mr-1" />
              Downloading is disabled for this shared file
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
