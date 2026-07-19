"use client";

import type { FileItem } from "@/lib/file-system/types";
import { ImageViewer } from "./image-viewer";
import { VideoViewer } from "./video-viewer";
import { AudioViewer } from "./audio-viewer";
import { PDFViewer } from "./pdf-viewer";
import { OfficeViewer } from "./office-viewer";
import { CodeViewer } from "./code-viewer";
import { ArchiveViewer } from "./archive-viewer";
import { ModelViewer } from "./model-viewer";
import { FileInfoPanel } from "./file-info-panel";
import { DownloadIcon, FileIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatSize } from "@/lib/file-system/types";

interface FileViewerProps {
  file: FileItem;
  src: string;
  showInfo?: boolean;
}

const IMAGE_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp", "image/avif", "image/svg+xml", "image/bmp", "image/tiff", "image/x-icon", "image/heic", "image/heif"];
const VIDEO_TYPES = ["video/mp4", "video/quicktime", "video/x-msvideo", "video/x-matroska", "video/x-ms-wmv", "video/x-flv", "video/webm", "video/mp4", "video/mpeg", "video/3gpp", "video/ogg", "video/mp2t"];
const AUDIO_TYPES = ["audio/mpeg", "audio/wav", "audio/ogg", "audio/aac", "audio/flac", "audio/x-m4a", "audio/x-ms-wma", "audio/x-aiff", "audio/opus", "audio/webm"];
const OFFICE_WORD = ["application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "application/vnd.ms-word"];
const OFFICE_EXCEL = ["application/vnd.ms-excel", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "text/csv"];
const OFFICE_PPT = ["application/vnd.ms-powerpoint", "application/vnd.openxmlformats-officedocument.presentationml.presentation"];
const OFFICE_TYPES = [...OFFICE_WORD, ...OFFICE_EXCEL, ...OFFICE_PPT];
const CODE_EXTENSIONS = ["txt", "md", "json", "xml", "yaml", "yml", "log", "csv", "sql", "js", "ts", "jsx", "tsx", "html", "css", "scss", "php", "java", "py", "go", "rs", "c", "cpp", "h", "cs", "sh", "bat", "env", "cfg", "ini", "toml"];
const ARCHIVE_TYPES = ["application/zip", "application/x-rar-compressed", "application/x-7z-compressed", "application/x-tar", "application/gzip", "application/x-bzip2"];
const MODEL_TYPES = ["model/gltf+json", "model/gltf-binary", "model/stl"];
const CAD_TYPES = ["image/vnd.dwg", "image/vnd.dxf", "application/x-step"];

function getFileExtension(filename: string): string {
  const parts = filename.split(".");
  return parts.length > 1 ? parts.pop()!.toLowerCase() : "";
}

function isCodeFile(file: FileItem): boolean {
  const ext = getFileExtension(file.originalName);
  return CODE_EXTENSIONS.includes(ext) || file.mimeType?.startsWith("text/");
}

function isOfficeFile(file: FileItem): boolean {
  const ext = getFileExtension(file.originalName);
  return OFFICE_TYPES.includes(file.mimeType) || ["doc", "docx", "xls", "xlsx", "ppt", "pptx", "csv"].includes(ext);
}

function isArchiveFile(file: FileItem): boolean {
  const ext = getFileExtension(file.originalName);
  return ARCHIVE_TYPES.includes(file.mimeType) || ["zip", "rar", "7z", "tar", "gz", "bz2"].includes(ext);
}

function isModelFile(file: FileItem): boolean {
  const ext = getFileExtension(file.originalName);
  return MODEL_TYPES.includes(file.mimeType) || ["glb", "gltf", "obj", "fbx", "stl", "ply"].includes(ext);
}

function isCADFile(file: FileItem): boolean {
  const ext = getFileExtension(file.originalName);
  return CAD_TYPES.includes(file.mimeType) || ["dwg", "dxf", "ifc", "dgn", "stp", "step", "igs", "iges"].includes(ext);
}

export function getFileTypeCategory(file: FileItem): string {
  if (IMAGE_TYPES.includes(file.mimeType)) return "image";
  if (VIDEO_TYPES.includes(file.mimeType)) return "video";
  if (AUDIO_TYPES.includes(file.mimeType)) return "audio";
  if (file.mimeType === "application/pdf") return "pdf";
  if (isOfficeFile(file)) return "office";
  if (isCodeFile(file)) return "code";
  if (isArchiveFile(file)) return "archive";
  if (isModelFile(file)) return "model";
  if (isCADFile(file)) return "cad";
  return "other";
}

export function FileViewer({ file, src, showInfo = false }: FileViewerProps) {
  const category = getFileTypeCategory(file);

  const renderViewer = () => {
    switch (category) {
      case "image":
        return <ImageViewer src={src} fileName={file.originalName} fileSize={file.size} mimeType={file.mimeType} />;
      case "video":
        return <VideoViewer src={src} fileName={file.originalName} />;
      case "audio":
        return <AudioViewer src={src} fileName={file.originalName} fileSize={file.size} mimeType={file.mimeType} />;
      case "pdf":
        return <PDFViewer src={src} fileName={file.originalName} />;
      case "office":
        return <OfficeViewer src={src} fileName={file.originalName} mimeType={file.mimeType} />;
      case "code":
        return <CodeViewer src={src} fileName={file.originalName} />;
      case "archive":
        return <ArchiveViewer src={src} fileName={file.originalName} fileSize={file.size} />;
      case "model":
      case "cad":
        return <ModelViewer src={src} fileName={file.originalName} mimeType={file.mimeType} fileSize={file.size} />;
      default:
        return (
          <div className="flex flex-col items-center justify-center h-full gap-4 text-muted-foreground p-8">
            <FileIcon className="size-16 text-muted-foreground/30" />
            <div className="text-center">
              <p className="text-sm font-medium">{file.originalName}</p>
              <p className="text-xs">{file.mimeType || "Unknown type"} &middot; {formatSize(file.size)}</p>
            </div>
            <p className="text-xs">Preview not available for this file type</p>
            <Button variant="outline" size="sm" onClick={() => window.open(src, "_blank")}>
              <DownloadIcon className="size-3.5 mr-1.5" /> Download to view
            </Button>
          </div>
        );
    }
  };

  if (showInfo) {
    return (
      <Tabs defaultValue="preview" className="flex flex-col h-full">
        <TabsList className="justify-start px-4 pt-2 rounded-none border-b shrink-0">
          <TabsTrigger value="preview" className="text-xs">Preview</TabsTrigger>
          <TabsTrigger value="info" className="text-xs">Info</TabsTrigger>
        </TabsList>
        <TabsContent value="preview" className="flex-1 min-h-0 p-0 m-0 data-[state=active]:flex flex-col">
          {renderViewer()}
        </TabsContent>
        <TabsContent value="info" className="flex-1 min-h-0 overflow-y-auto m-0 data-[state=active]:block">
          <FileInfoPanel file={file} />
        </TabsContent>
      </Tabs>
    );
  }

  return <div className="flex-1 min-h-0 flex flex-col">{renderViewer()}</div>;
}
