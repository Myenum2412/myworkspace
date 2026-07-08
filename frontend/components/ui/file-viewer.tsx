"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import {
  FileIcon,
  DownloadIcon,
  ExternalLinkIcon,
  PrinterIcon,
  ZoomInIcon,
  ZoomOutIcon,
  RotateCwIcon,
  Maximize2Icon,
  Minimize2Icon,
  FileTextIcon,
  MusicIcon,
  VideoIcon,
  ImageIcon,
  ArchiveIcon,
  AlertCircleIcon,
  Loader2Icon,
} from "lucide-react"

export type ViewerFile = {
  url: string
  name: string
  mimeType: string
  size?: number
  uploadedAt?: string
  uploader?: string
}

type FileCategory = "pdf" | "image" | "video" | "audio" | "text" | "code" | "office" | "archive" | "unknown"

const CODE_EXTENSIONS = new Set([
  "js", "ts", "jsx", "tsx", "css", "scss", "less", "html", "xml", "json",
  "py", "rb", "go", "rs", "java", "kt", "swift", "php", "pl", "sh", "bash",
  "yaml", "yml", "toml", "ini", "cfg", "sql", "graphql", "mdx",
])

const TEXT_EXTENSIONS = new Set([
  "txt", "md", "rtf", "csv", "tsv", "log", "env", "gitignore", "dockerfile",
])

const OFFICE_EXTENSIONS = new Set([
  "doc", "docx", "xls", "xlsx", "ppt", "pptx", "odt", "ods", "odp",
])

function getFileCategory(mimeType: string, fileName: string): FileCategory {
  const ext = fileName.split(".").pop()?.toLowerCase() || ""

  if (mimeType === "application/pdf") return "pdf"
  if (mimeType.startsWith("image/")) return "image"
  if (mimeType.startsWith("video/")) return "video"
  if (mimeType.startsWith("audio/")) return "audio"

  if (mimeType.startsWith("text/")) {
    if (CODE_EXTENSIONS.has(ext)) return "code"
    return "text"
  }

  if (ext === "pdf") return "pdf"
  if (["jpg", "jpeg", "png", "gif", "svg", "webp", "bmp", "tiff", "tif", "ico", "avif"].includes(ext)) return "image"
  if (["mp4", "webm", "mov", "avi", "mkv", "wmv", "flv", "ogv"].includes(ext)) return "video"
  if (["mp3", "wav", "aac", "ogg", "flac", "wma", "m4a"].includes(ext)) return "audio"
  if (CODE_EXTENSIONS.has(ext)) return "code"
  if (TEXT_EXTENSIONS.has(ext)) return "text"
  if (OFFICE_EXTENSIONS.has(ext)) return "office"
  if (["zip", "rar", "7z", "tar", "gz", "bz2", "xz"].includes(ext)) return "archive"

  return "unknown"
}

function formatSize(bytes?: number): string {
  if (!bytes) return "—"
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`
}

function getCategoryIcon(category: FileCategory) {
  switch (category) {
    case "pdf": return FileTextIcon
    case "image": return ImageIcon
    case "video": return VideoIcon
    case "audio": return MusicIcon
    case "archive": return ArchiveIcon
    default: return FileIcon
  }
}

function getOfficeViewerUrl(url: string): string {
  return `https://docs.google.com/viewer?url=${encodeURIComponent(url)}&embedded=true`
}

type FileViewerProps = {
  file: ViewerFile | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function FileViewer({ file, open, onOpenChange }: FileViewerProps) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [textContent, setTextContent] = useState<string | null>(null)
  const [zoom, setZoom] = useState(1)
  const [rotation, setRotation] = useState(0)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [pdfPage, setPdfPage] = useState(1)
  const [panPosition, setPanPosition] = useState({ x: 0, y: 0 })
  const [isPanning, setIsPanning] = useState(false)
  const [panStart, setPanStart] = useState({ x: 0, y: 0 })
  const viewerRef = useRef<HTMLDivElement>(null)
  const imageRef = useRef<HTMLImageElement>(null)

  const category = file ? getFileCategory(file.mimeType, file.name) : "unknown"
  const CategoryIcon = getCategoryIcon(category)
  const ext = file ? file.name.split(".").pop()?.toUpperCase() || "FILE" : "FILE"

  useEffect(() => {
    if (!open || !file) return
    setLoading(true)
    setError(null)
    setTextContent(null)
    setZoom(1)
    setRotation(0)
    setPdfPage(1)
    setPanPosition({ x: 0, y: 0 })

    if (category === "text" || category === "code") {
      fetch(file.url)
        .then((r) => {
          if (!r.ok) throw new Error("Failed to load file content")
          return r.text()
        })
        .then(setTextContent)
        .catch((e) => setError(e.message))
        .finally(() => setLoading(false))
    } else if (category === "image") {
      const img = new Image()
      img.onload = () => setLoading(false)
      img.onerror = () => { setError("Failed to load image"); setLoading(false) }
      img.src = file.url
    } else {
      setLoading(false)
    }
  }, [open, file, category])

  const handleDownload = useCallback(() => {
    if (!file) return
    const a = document.createElement("a")
    a.href = file.url
    a.download = file.name
    a.click()
  }, [file])

  const handlePrint = useCallback(() => {
    if (!file) return
    if (category === "pdf") {
      const printWindow = window.open(file.url, "_blank")
      printWindow?.print()
    } else {
      window.print()
    }
  }, [file, category])

  const handleOpenInNewTab = useCallback(() => {
    if (file) window.open(file.url, "_blank")
  }, [file])

  const handleZoomIn = () => setZoom((z) => Math.min(z + 0.25, 5))
  const handleZoomOut = () => setZoom((z) => Math.max(z - 0.25, 0.25))
  const handleRotate = () => setRotation((r) => (r + 90) % 360)

  const toggleFullscreen = async () => {
    if (!isFullscreen) {
      await viewerRef.current?.requestFullscreen()
      setIsFullscreen(true)
    } else {
      await document.exitFullscreen()
      setIsFullscreen(false)
    }
  }

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement)
    document.addEventListener("fullscreenchange", handler)
    return () => document.removeEventListener("fullscreenchange", handler)
  }, [])

  const handleImageMouseDown = (e: React.MouseEvent) => {
    if (zoom <= 1) return
    setIsPanning(true)
    setPanStart({ x: e.clientX - panPosition.x, y: e.clientY - panPosition.y })
  }

  const handleImageMouseMove = (e: React.MouseEvent) => {
    if (!isPanning || zoom <= 1) return
    setPanPosition({ x: e.clientX - panStart.x, y: e.clientY - panStart.y })
  }

  const handleImageMouseUp = () => setIsPanning(false)
  const handleImageWheel = (e: React.WheelEvent) => {
    e.preventDefault()
    setZoom((z) => Math.max(0.25, Math.min(5, z - e.deltaY * 0.002))
    )
  }

  const handleImageKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case "+": case "=": handleZoomIn(); break
      case "-": handleZoomOut(); break
      case "r": handleRotate(); break
      case "f": toggleFullscreen(); break
    }
  }

  const handlePdfKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case "ArrowLeft": setPdfPage((p) => Math.max(1, p - 1)); break
      case "ArrowRight": setPdfPage((p) => p + 1); break
    }
  }

  const handleRetry = () => {
    if (!file) return
    setLoading(true)
    setError(null)
    const img = new Image()
    img.onload = () => setLoading(false)
    img.onerror = () => { setError("Failed to load image"); setLoading(false) }
    img.src = file.url + "?t=" + Date.now()
  }

  if (!file) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-screen-xl w-full min-w-[95vw] max-h-[95vh] h-[90vh] p-0 flex flex-col">
        <DialogHeader className="px-6 pt-6 pb-4 shrink-0 w-full border-b">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
              <CategoryIcon className="size-5 text-muted-foreground" />
            </div>
            <div className="min-w-0 flex-1">
              <DialogTitle className="text-lg truncate">{file.name}</DialogTitle>
              <DialogDescription className="flex items-center gap-2 mt-0.5">
                <Badge variant="outline" className="text-[10px]">{ext}</Badge>
                {file.size && (
                  <span className="text-[11px] text-muted-foreground">{formatSize(file.size)}</span>
                )}
              </DialogDescription>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              {(category === "image" || category === "pdf") && (
                <>
                  {category === "image" && (
                    <>
                      <Button variant="ghost" size="icon-sm" onClick={handleZoomOut} disabled={zoom <= 0.25} aria-label="Zoom out">
                        <ZoomOutIcon className="size-4" />
                      </Button>
                      <span className="text-xs text-muted-foreground w-10 text-center">{Math.round(zoom * 100)}%</span>
                      <Button variant="ghost" size="icon-sm" onClick={handleZoomIn} disabled={zoom >= 5} aria-label="Zoom in">
                        <ZoomInIcon className="size-4" />
                      </Button>
                      <Button variant="ghost" size="icon-sm" onClick={handleRotate} aria-label="Rotate">
                        <RotateCwIcon className="size-4" />
                      </Button>
                    </>
                  )}
                  <Button variant="ghost" size="icon-sm" onClick={toggleFullscreen} aria-label={isFullscreen ? "Exit fullscreen" : "Fullscreen"}>
                    {isFullscreen ? <Minimize2Icon className="size-4" /> : <Maximize2Icon className="size-4" />}
                  </Button>
                </>
              )}
              <Button variant="ghost" size="icon-sm" onClick={handlePrint} aria-label="Print">
                <PrinterIcon className="size-4" />
              </Button>
              <Button variant="ghost" size="icon-sm" onClick={handleOpenInNewTab} aria-label="Open in new tab">
                <ExternalLinkIcon className="size-4" />
              </Button>
              <Button variant="ghost" size="icon-sm" onClick={handleDownload} aria-label="Download">
                <DownloadIcon className="size-4" />
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-hidden flex flex-col lg:flex-row">
          <div ref={viewerRef} className="flex-1 min-h-0 min-w-0 flex items-center justify-center bg-muted/30 relative overflow-hidden">
            {loading && (
              <div className="flex flex-col items-center gap-3">
                <Loader2Icon className="size-8 animate-spin text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Loading...</span>
              </div>
            )}

            {error && (
              <div className="flex flex-col items-center gap-3 p-8 text-center">
                <AlertCircleIcon className="size-10 text-destructive" />
                <p className="text-sm text-destructive font-medium">Failed to load file</p>
                <p className="text-xs text-muted-foreground">{error}</p>
                <Button variant="outline" size="sm" onClick={handleRetry}>Retry</Button>
              </div>
            )}

            {!loading && !error && category === "image" && (
              <div
                className="w-full h-full flex items-center justify-center overflow-hidden"
                onMouseDown={handleImageMouseDown}
                onMouseMove={handleImageMouseMove}
                onMouseUp={handleImageMouseUp}
                onMouseLeave={handleImageMouseUp}
                onWheel={handleImageWheel}
                onKeyDown={handleImageKeyDown}
                tabIndex={0}
                role="img"
                aria-label={file.name}
                style={{ cursor: zoom > 1 ? "grab" : "default" }}
              >
                <img
                  ref={imageRef}
                  src={file.url}
                  alt={file.name}
                  className="max-w-full max-h-full transition-transform duration-200 select-none"
                  style={{
                    transform: `scale(${zoom}) rotate(${rotation}deg) translate(${panPosition.x}px, ${panPosition.y}px)`,
                  }}
                  draggable={false}
                  onLoad={() => setLoading(false)}
                  onError={() => { setError("Failed to load image"); setLoading(false) }}
                />
              </div>
            )}

            {!loading && !error && category === "pdf" && (
              <div
                className="w-full h-full"
                onKeyDown={handlePdfKeyDown}
                tabIndex={0}
              >
                <iframe
                  src={`${file.url}#page=${pdfPage}`}
                  className="w-full h-full border-0"
                  title={file.name}
                  onLoad={() => setLoading(false)}
                  onError={() => { setError("Failed to load PDF"); setLoading(false) }}
                />
              </div>
            )}

            {!loading && !error && category === "video" && (
              <div className="w-full h-full flex items-center justify-center p-4">
                <video
                  controls
                  className="max-w-full max-h-full rounded-lg"
                  onLoadedData={() => setLoading(false)}
                  onError={() => { setError("Failed to load video"); setLoading(false) }}
                >
                  <source src={file.url} type={file.mimeType} />
                </video>
              </div>
            )}

            {!loading && !error && category === "audio" && (
              <div className="w-full flex flex-col items-center justify-center p-8 gap-4">
                <div className="size-24 rounded-full bg-primary/10 flex items-center justify-center">
                  <MusicIcon className="size-12 text-primary" />
                </div>
                <p className="text-sm font-medium">{file.name}</p>
                <audio controls className="w-full max-w-md" onLoadedData={() => setLoading(false)}>
                  <source src={file.url} type={file.mimeType} />
                </audio>
              </div>
            )}

            {!loading && !error && (category === "text" || category === "code") && (
              <div className="w-full h-full overflow-auto p-4">
                <pre className={cn(
                  "text-sm leading-relaxed rounded-lg border bg-card p-4 overflow-x-auto min-h-full",
                  category === "code" && "font-mono"
                )}>
                  <code>{textContent || "Empty file"}</code>
                </pre>
              </div>
            )}

            {!loading && !error && category === "office" && (
              <div className="w-full h-full flex flex-col">
                <iframe
                  src={getOfficeViewerUrl(file.url)}
                  className="w-full flex-1 border-0"
                  title={file.name}
                  onLoad={() => setLoading(false)}
                  onError={() => { setError("Office preview unavailable"); setLoading(false) }}
                />
                <div className="shrink-0 p-3 bg-card border-t flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">Preview may not support all Office features</p>
                  <Button variant="outline" size="sm" onClick={handleDownload}>
                    <DownloadIcon className="size-3.5 mr-1" /> Download to view in full
                  </Button>
                </div>
              </div>
            )}

            {!loading && !error && category === "archive" && (
              <div className="flex flex-col items-center justify-center p-8 text-center gap-4">
                <ArchiveIcon className="size-16 text-muted-foreground" />
                <div>
                  <p className="font-medium">{file.name}</p>
                  <p className="text-sm text-muted-foreground mt-1">{formatSize(file.size)}</p>
                </div>
                <p className="text-xs text-muted-foreground">Archive files cannot be previewed inline.</p>
                <Button onClick={handleDownload}>
                  <DownloadIcon className="size-4 mr-1.5" /> Download Archive
                </Button>
              </div>
            )}

            {!loading && !error && category === "unknown" && (
              <div className="flex flex-col items-center justify-center p-8 text-center gap-4">
                <FileIcon className="size-16 text-muted-foreground" />
                <div>
                  <p className="font-medium">{file.name}</p>
                  <p className="text-sm text-muted-foreground mt-1">{formatSize(file.size)}</p>
                </div>
                <p className="text-xs text-muted-foreground">Preview not available for this file type.</p>
                <Button onClick={handleDownload}>
                  <DownloadIcon className="size-4 mr-1.5" /> Download File
                </Button>
              </div>
            )}
          </div>

          <div className="w-full lg:w-64 shrink-0 border-t lg:border-t-0 lg:border-l bg-card overflow-y-auto">
            <div className="p-4 space-y-3">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">File Info</h4>
              <MetadataRow label="Name" value={file.name} />
              <MetadataRow label="Type" value={ext} />
              <MetadataRow label="MIME" value={file.mimeType} />
              <MetadataRow label="Size" value={formatSize(file.size)} />
              {file.uploadedAt && (
                <MetadataRow label="Uploaded" value={new Date(file.uploadedAt).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })} />
              )}
              {file.uploader && <MetadataRow label="Uploader" value={file.uploader} />}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function MetadataRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">{label}</p>
      <p className="text-sm break-words mt-0.5">{value}</p>
    </div>
  )
}
