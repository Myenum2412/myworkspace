"use client";

import { useRef, useState } from "react";
import {
  DownloadIcon,
  MaximizeIcon,
  MinimizeIcon,
  BoxIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface ModelViewerProps {
  src: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
}

export function ModelViewer({ src, fileName, mimeType }: ModelViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  return (
    <div ref={containerRef} className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-2 border-b shrink-0">
        <div className="flex items-center gap-2">
          <BoxIcon className="size-4" />
          <span className="text-sm font-medium">{fileName}</span>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={toggleFullscreen}>
            {isFullscreen ? <MinimizeIcon className="size-3.5" /> : <MaximizeIcon className="size-3.5" />}
          </Button>
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => window.open(src, "_blank")}>
            <DownloadIcon className="size-3.5" />
          </Button>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-gray-900 to-gray-800 relative">
        <div className="flex flex-col items-center gap-4 text-white/60">
          <BoxIcon className="size-20 text-white/20" />
          <p className="text-sm">3D model preview not available in this browser</p>
          <p className="text-xs text-white/40">
            {mimeType} &middot; Download to view in a 3D application
          </p>
          <Button variant="secondary" size="sm" onClick={() => window.open(src, "_blank")}>
            <DownloadIcon className="size-3.5 mr-1.5" /> Download Model
          </Button>
        </div>
      </div>
    </div>
  );
}
