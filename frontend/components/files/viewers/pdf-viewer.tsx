"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  ZoomInIcon,
  ZoomOutIcon,
  SearchIcon,
  DownloadIcon,
  MaximizeIcon,
  MinimizeIcon,
  RotateCwIcon,
  SunIcon,
  MoonIcon,
  FileTextIcon,
  XIcon,
  Loader2Icon,
  AlertCircleIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface PDFViewerProps {
  src: string;
  fileName: string;
}

export function PDFViewer({ src, fileName }: PDFViewerProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [zoom, setZoom] = useState(100);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [darkMode, setDarkMode] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showThumbnails, setShowThumbnails] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  const toggleFullscreen = () => {
    const el = iframeRef.current?.parentElement;
    if (!el) return;
    if (!document.fullscreenElement) {
      el.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  const pdfSrc = `${src}#toolbar=0&navpanes=0&scrollbar=1`;

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-2 border-b shrink-0 gap-1">
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setZoom((z) => Math.max(25, z - 10))}>
            <ZoomOutIcon className="size-3.5" />
          </Button>
          <span className="text-xs text-muted-foreground w-12 text-center">{zoom}%</span>
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setZoom((z) => Math.min(200, z + 10))}>
            <ZoomInIcon className="size-3.5" />
          </Button>
          <div className="w-px h-4 bg-border mx-1" />
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setPage((p) => Math.max(1, p - 1))}>
            <ChevronLeftIcon className="size-3.5" />
          </Button>
          <span className="text-xs text-muted-foreground">
            {page}{totalPages > 0 ? ` / ${totalPages}` : ""}
          </span>
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setPage((p) => Math.min(totalPages || p + 1, p + 1))}>
            <ChevronRightIcon className="size-3.5" />
          </Button>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setShowSearch(!showSearch)}>
            <SearchIcon className="size-3.5" />
          </Button>
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setRotation((r) => r + 90)}>
            <RotateCwIcon className="size-3.5" />
          </Button>
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => {
            setShowThumbnails(!showThumbnails);
          }}>
            <FileTextIcon className="size-3.5" />
          </Button>
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setDarkMode(!darkMode)}>
            {darkMode ? <SunIcon className="size-3.5" /> : <MoonIcon className="size-3.5" />}
          </Button>
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={toggleFullscreen}>
            {isFullscreen ? <MinimizeIcon className="size-3.5" /> : <MaximizeIcon className="size-3.5" />}
          </Button>
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => window.open(src, "_blank")}>
            <DownloadIcon className="size-3.5" />
          </Button>
        </div>
      </div>

      {showSearch && (
        <div className="px-4 py-2 border-b shrink-0 flex items-center gap-2">
          <Input
            placeholder="Search in PDF..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-8 text-sm"
          />
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setShowSearch(false)}>
            <XIcon className="size-3.5" />
          </Button>
        </div>
      )}

      <div className="flex-1 min-h-0 flex relative bg-muted/10">
        {showThumbnails && (
          <div className="w-48 border-r shrink-0 overflow-y-auto p-2 space-y-2 bg-background">
            {Array.from({ length: Math.max(totalPages, 1) }).map((_, i) => (
              <div
                key={i}
                className={`aspect-[3/4] rounded border cursor-pointer transition-colors ${
                  page === i + 1 ? "border-primary ring-1 ring-primary" : "border-border hover:border-muted-foreground/30"
                }`}
                onClick={() => setPage(i + 1)}
              >
                <div className="w-full h-full bg-muted flex items-center justify-center text-[10px] text-muted-foreground">
                  {i + 1}
                </div>
              </div>
            ))}
          </div>
        )}

        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10">
            <div className="flex flex-col items-center gap-3 text-muted-foreground">
              <Loader2Icon className="size-8 animate-spin" />
              <p className="text-xs">Loading PDF...</p>
            </div>
          </div>
        )}
        {loadError && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10">
            <div className="flex flex-col items-center gap-3 text-muted-foreground">
              <AlertCircleIcon className="size-8" />
              <p className="text-sm">Failed to load PDF</p>
              <Button variant="outline" size="sm" onClick={() => window.open(src, "_blank")}>
                <DownloadIcon className="size-3.5 mr-1.5" /> Download to view
              </Button>
            </div>
          </div>
        )}
        <iframe
          ref={iframeRef}
          src={pdfSrc}
          className="w-full h-full border-0"
          title={fileName}
          style={{
            filter: darkMode ? "invert(0.9) hue-rotate(180deg)" : "none",
            transform: `rotate(${rotation}deg)`,
          }}
          onLoad={() => setLoading(false)}
          onError={() => { setLoading(false); setLoadError(true); }}
          sandbox="allow-scripts allow-same-origin allow-forms"
        />
      </div>
    </div>
  );
}
