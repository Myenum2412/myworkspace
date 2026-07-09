"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Download, CheckCircle2, Monitor, AlertCircle } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

const EXE_PATH = "/MyWorkspaceSetup.exe";

type DownloadState = "idle" | "completed" | "error";

export function InstallForWindows() {
  const [downloadState, setDownloadState] = useState<DownloadState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  const handleDownload = useCallback(() => {
    setError(null);

    const a = document.createElement("a");
    a.href = EXE_PATH;
    a.download = "MyWorkspaceSetup.exe";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    setDownloadState("completed");
  }, []);

  return (
    <Popover open={showDetails} onOpenChange={setShowDetails}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="gap-1.5 text-xs sm:text-sm h-8 sm:h-9 px-2 sm:px-3"
        >
          {downloadState === "completed" ? (
            <CheckCircle2 className="size-3.5 sm:size-4 text-green-500" />
          ) : (
            <Download className="size-3.5 sm:size-4" />
          )}
          <span className="hidden sm:inline">
            {downloadState === "completed" ? "Downloaded" : "Install for Windows"}
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
              <p className="text-xs text-muted-foreground">v1.0.0 | 78 MB</p>
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
            <p>• Windows 10 (64-bit) or later</p>
            <p>• 4 GB RAM (8 GB recommended)</p>
            <p>• 500 MB free space</p>
          </div>

          <Button
            className="w-full gap-2"
            size="sm"
            onClick={handleDownload}
          >
            {downloadState === "completed" ? (
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
        </div>
      </PopoverContent>
    </Popover>
  );
}
