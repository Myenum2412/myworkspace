"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  FileIcon, DownloadIcon, LockIcon, Loader2Icon, AlertCircleIcon, FileTextIcon, ImageIcon,
} from "lucide-react";

type ShareFileInfo = {
  fileId: string;
  originalName: string;
  mimeType: string;
  size: number;
  hasPassword: boolean;
  allowDownload: boolean;
} | null;

export function ShareTokenPageInteractive({ token, fileInfo }: { token: string; fileInfo: ShareFileInfo }) {
  const [error, setError] = useState("");
  const [password, setPassword] = useState("");
  const [needsPassword, setNeedsPassword] = useState(fileInfo?.hasPassword ?? false);
  const [downloading, setDownloading] = useState(false);

  if (!fileInfo) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-96">
          <CardContent className="flex flex-col items-center gap-4 py-12">
            <AlertCircleIcon className="size-12 text-destructive" />
            <p className="text-lg font-medium">Share link not found</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const verifyAndDownload = async () => {
    setError("");
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

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-muted/30 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            {fileInfo.mimeType?.startsWith("image/") ? (
              <ImageIcon className="size-16 text-muted-foreground" />
            ) : fileInfo.mimeType?.includes("pdf") ? (
              <FileTextIcon className="size-16 text-muted-foreground" />
            ) : (
              <FileIcon className="size-16 text-muted-foreground" />
            )}
          </div>
          <CardTitle className="text-xl truncate">{fileInfo.originalName || "Shared File"}</CardTitle>
          <p className="text-sm text-muted-foreground">
            {fileInfo.mimeType} · {fileInfo.size ? formatSize(fileInfo.size) : "Unknown size"}
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {needsPassword && (
            <div>
              <Label className="text-xs text-muted-foreground">This file is password-protected</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={e => { setPassword(e.target.value); setError(""); }}
                placeholder=""
                className="mt-1"
              />
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 p-2 rounded-sm">
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

          {!fileInfo.allowDownload && (
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

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
