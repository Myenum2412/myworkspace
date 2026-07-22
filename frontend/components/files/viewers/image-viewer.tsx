"use client";

import { useState } from "react";
import {
  ZoomInIcon,
  ZoomOutIcon,
  RotateCwIcon,
  RotateCcwIcon,
  MaximizeIcon,
  MinimizeIcon,
  DownloadIcon,
  InfoIcon,
  ImageIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatSize } from "@/lib/file-system/types";

interface ImageViewerProps {
  src: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
}

export function ImageViewer({ src, fileName, fileSize, mimeType }: ImageViewerProps) {
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [imgDimensions, setImgDimensions] = useState({ w: 0, h: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const zoomStep = 0.25;
  const minZoom = 0.25;
  const maxZoom = 5;

  const handleZoomIn = () => setZoom((z) => Math.min(z + zoomStep, maxZoom));
  const handleZoomOut = () => setZoom((z) => Math.max(z - zoomStep, minZoom));
  const handleRotateCw = () => setRotation((r) => r + 90);
  const handleRotateCcw = () => setRotation((r) => r - 90);
  const handleReset = () => { setZoom(1); setRotation(0); };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-2 border-b shrink-0 gap-1">
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={handleZoomOut} disabled={zoom <= minZoom}>
            <ZoomOutIcon className="size-3.5" />
          </Button>
          <span className="text-xs text-muted-foreground w-10 text-center">{Math.round(zoom * 100)}%</span>
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={handleZoomIn} disabled={zoom >= maxZoom}>
            <ZoomInIcon className="size-3.5" />
          </Button>
          <div className="w-px h-4 bg-border mx-1" />
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={handleRotateCcw}>
            <RotateCcwIcon className="size-3.5" />
          </Button>
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={handleRotateCw}>
            <RotateCwIcon className="size-3.5" />
          </Button>
          <Button variant="ghost" size="sm" className="h-7 text-xs px-2" onClick={handleReset}>
            Reset
          </Button>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setShowInfo(!showInfo)}>
            <InfoIcon className="size-3.5" />
          </Button>
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={toggleFullscreen}>
            {isFullscreen ? <MinimizeIcon className="size-3.5" /> : <MaximizeIcon className="size-3.5" />}
          </Button>
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => window.open(src, "_blank")}>
            <DownloadIcon className="size-3.5" />
          </Button>
        </div>
      </div>

      {showInfo && (
        <div className="px-4 py-2 border-b bg-muted/20 text-xs text-muted-foreground space-y-0.5 shrink-0">
          <p>Name: {fileName}</p>
          <p>Size: {formatSize(fileSize)}</p>
          <p>Type: {mimeType}</p>
          {imgDimensions.w > 0 && <p>Dimensions: {imgDimensions.w} x {imgDimensions.h} px</p>}
        </div>
      )}

      <div className="flex-1 flex items-center justify-center overflow-auto bg-[repeating-conic-gradient(#e5e7eb_0%_25%,transparent_0%_50%)_50%/20px_20px] dark:bg-[repeating-conic-gradient(#374151_0%_25%,transparent_0%_50%)_50%/20px_20px]">
        {loading && !error && (
          <div className="flex flex-col items-center gap-3 text-muted-foreground">
            <div className="size-8 border-2 border-primary border-t-transparent rounded-sm animate-spin" />
            <p className="text-xs">Loading image...</p>
          </div>
        )}
        {error && (
          <div className="flex flex-col items-center gap-3 text-muted-foreground p-8">
            <ImageIcon className="size-12 text-muted-foreground/30" />
            <p className="text-sm">Failed to load image</p>
            <Button variant="outline" size="sm" onClick={() => window.open(src, "_blank")}>
              <DownloadIcon className="size-3.5 mr-1.5" /> Open in new tab
            </Button>
          </div>
        )}
        <img
          src={src}
          alt={fileName}
          style={{
            transform: `scale(${zoom}) rotate(${rotation}deg)`,
            transition: "transform 0.15s ease-out",
            maxWidth: "none",
          }}
          className={`max-w-full max-h-full object-contain ${loading || error ? "hidden" : ""}`}
          onLoad={(e) => {
            const img = e.currentTarget;
            setImgDimensions({ w: img.naturalWidth, h: img.naturalHeight });
            setLoading(false);
            setError(false);
          }}
          onError={() => { setLoading(false); setError(true); }}
          draggable={false}
        />
      </div>
    </div>
  );
}
