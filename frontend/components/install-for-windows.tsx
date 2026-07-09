"use client";

import { useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Download, Loader2, CheckCircle2, Monitor, ExternalLink, AlertCircle } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

const INSTALLER_API_URL = `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"}/api/installer`;

interface InstallerInfo {
  name: string;
  version: string;
  publisher: string;
  downloadUrl: string;
  filename: string;
  size: number;
  sizeFormatted: string;
  requirements: {
    os: string;
    ram: string;
    storage: string;
    processor: string;
  };
  features: string[];
}

type DownloadState = "idle" | "downloading" | "completed" | "error";

export function InstallForWindows() {
  const [info, setInfo] = useState<InstallerInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloadState, setDownloadState] = useState<DownloadState>("idle");
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    fetchInstallerInfo();
  }, []);

  async function fetchInstallerInfo() {
    try {
      setLoading(true);
      const res = await fetch(`${INSTALLER_API_URL}/info`);
      const json = await res.json();
      if (json.success && json.data) {
        setInfo(json.data);
      }
    } catch {
      // Silent fail - installer info is non-critical
    } finally {
      setLoading(false);
    }
  }

  const handleDownload = useCallback(async () => {
    try {
      setDownloadState("downloading");
      setDownloadProgress(0);
      setError(null);

      const response = await fetch(`${INSTALLER_API_URL}/download`);

      if (!response.ok) {
        const errData = await response.json().catch(() => null);
        if (response.status === 404 && errData?.message) {
          setError(errData.message);
        } else {
          setError("Failed to download installer. Please try again.");
        }
        setDownloadState("error");
        return;
      }

      const contentLength = response.headers.get("Content-Length");
      const total = contentLength ? parseInt(contentLength, 10) : 0;
      const reader = response.body?.getReader();
      if (!reader) {
        setError("Failed to read download stream.");
        setDownloadState("error");
        return;
      }

      const chunks: Uint8Array[] = [];
      let received = 0;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
        received += value.length;
        if (total > 0) {
          setDownloadProgress(Math.round((received / total) * 100));
        }
      }

      const blob = new Blob(chunks as BlobPart[], {
        type: "application/vnd.microsoft.portable-executable",
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = info?.filename || "MyWorkspaceSetup.exe";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      setDownloadState("completed");
      setDownloadProgress(100);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Download failed");
      setDownloadState("error");
    }
  }, [info]);

  if (loading) return null;

  return (
    <Popover open={showDetails} onOpenChange={setShowDetails}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="gap-1.5 text-xs sm:text-sm h-8 sm:h-9 px-2 sm:px-3"
          disabled={downloadState === "downloading"}
        >
          {downloadState === "downloading" ? (
            <Loader2 className="size-3.5 sm:size-4 animate-spin" />
          ) : downloadState === "completed" ? (
            <CheckCircle2 className="size-3.5 sm:size-4 text-green-500" />
          ) : (
            <Download className="size-3.5 sm:size-4" />
          )}
          <span className="hidden sm:inline">
            {downloadState === "downloading"
              ? `Downloading... ${downloadProgress}%`
              : downloadState === "completed"
                ? "Downloaded"
                : "Install for Windows"}
          </span>
          <span className="sm:hidden">Install</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" sideOffset={8} className="w-80 p-0">
        <div className="p-4 space-y-3">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-lg bg-brand-800 shrink-0">
              <Monitor className="size-5 text-white" />
            </div>
            <div>
              <p className="font-semibold text-sm">MyWorkspace Desktop</p>
              {info && (
                <p className="text-xs text-muted-foreground">
                  v{info.version} | {info.sizeFormatted}
                </p>
              )}
            </div>
          </div>

          {error && (
            <div className="flex items-start gap-2 p-2 rounded bg-destructive/10 text-destructive text-xs">
              <AlertCircle className="size-3.5 mt-0.5 shrink-0" />
              <p>{error}</p>
            </div>
          )}

          <div className="space-y-1 text-xs text-muted-foreground">
            <p className="font-medium text-foreground">System Requirements:</p>
            {info?.requirements ? (
              <>
                <p>• {info.requirements.os}</p>
                <p>• {info.requirements.ram}</p>
                <p>• {info.requirements.storage}</p>
              </>
            ) : (
              <>
                <p>• Windows 10 (64-bit) or later</p>
                <p>• 4 GB RAM (8 GB recommended)</p>
                <p>• 500 MB free space</p>
              </>
            )}
          </div>

          <Button
            className="w-full gap-2"
            size="sm"
            onClick={handleDownload}
            disabled={downloadState === "downloading"}
          >
            {downloadState === "downloading" ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Downloading... {downloadProgress}%
              </>
            ) : downloadState === "completed" ? (
              <>
                <CheckCircle2 className="size-4" />
                Downloaded - Run MyWorkspaceSetup.exe
              </>
            ) : (
              <>
                <Download className="size-4" />
                Download Installer
              </>
            )}
          </Button>

          {downloadState === "completed" && (
            <p className="text-xs text-muted-foreground text-center">
              Run MyWorkspaceSetup.exe to begin installation
            </p>
          )}

          {info && (
            <div className="pt-1 space-y-1 text-xs text-muted-foreground">
              <p className="font-medium text-foreground">Features:</p>
              {info.features.slice(0, 4).map((feat, i) => (
                <p key={i}>• {feat}</p>
              ))}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
