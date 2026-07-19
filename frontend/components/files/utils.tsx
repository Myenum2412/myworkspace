import {
  ImageIcon, FileIcon, FileTextIcon, ArchiveIcon, FilmIcon, MusicIcon,
  TableIcon, PresentationIcon, FileCodeIcon, FileJsonIcon, FileSpreadsheetIcon,
  FileTypeIcon, VideoIcon,
} from "lucide-react";

const imageTypes = ["image/jpeg", "image/png", "image/gif", "image/webp", "image/avif", "image/svg+xml", "image/bmp", "image/tiff", "image/x-icon", "image/heic", "image/heif"];
const videoTypes = ["video/mp4", "video/quicktime", "video/x-msvideo", "video/x-matroska", "video/x-ms-wmv", "video/x-flv", "video/webm", "video/mpeg", "video/3gpp", "video/ogg", "video/mp2t"];
const audioTypes = ["audio/mpeg", "audio/wav", "audio/ogg", "audio/aac", "audio/flac", "audio/x-m4a", "audio/x-ms-wma", "audio/x-aiff", "audio/opus"];
const archiveTypes = ["application/zip", "application/x-rar-compressed", "application/x-7z-compressed", "application/x-tar", "application/gzip", "application/x-bzip2"];
const codeTypes = ["text/html", "text/css", "text/javascript", "application/json", "application/xml", "text/xml", "text/x-yaml", "text/x-python", "text/x-java", "text/x-go", "text/x-rust", "text/x-c", "text/x-cpp", "text/x-typescript"];
const spreadsheetTypes = ["text/csv", "application/vnd.ms-excel", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"];
const presentationTypes = ["application/vnd.ms-powerpoint", "application/vnd.openxmlformats-officedocument.presentationml.presentation"];

const extMap: Record<string, string> = {
  js: "code", ts: "code", jsx: "code", tsx: "code", html: "code", css: "code",
  scss: "code", json: "code", xml: "code", yaml: "code", yml: "code",
  py: "code", java: "code", go: "code", rs: "code", c: "code", cpp: "code",
  cs: "code", php: "code", sh: "code", sql: "code", rb: "code",
  md: "text", txt: "text", log: "text", env: "text", cfg: "text", ini: "text",
  csv: "spreadsheet", xls: "spreadsheet", xlsx: "spreadsheet",
  ppt: "presentation", pptx: "presentation",
  zip: "archive", rar: "archive", "7z": "archive", tar: "archive", gz: "archive", bz2: "archive",
  pdf: "pdf",
  doc: "document", docx: "document",
  mp4: "video", mov: "video", avi: "video", mkv: "video", webm: "video",
  mp3: "audio", wav: "audio", ogg: "audio", flac: "audio",
  jpg: "image", jpeg: "image", png: "image", gif: "image", webp: "image", svg: "image",
};

function getCategoryByExt(filename: string): string | null {
  const ext = filename.split(".").pop()?.toLowerCase();
  return ext ? extMap[ext] || null : null;
}

export function getFileIcon(mimeType: string, fileName?: string) {
  const extCat = fileName ? getCategoryByExt(fileName) : null;

  if (extCat === "image" || imageTypes.includes(mimeType)) return <ImageIcon className="size-5 text-sky-500" />;
  if (extCat === "video" || videoTypes.includes(mimeType)) return <VideoIcon className="size-5 text-purple-500" />;
  if (extCat === "audio" || audioTypes.includes(mimeType)) return <MusicIcon className="size-5 text-emerald-500" />;
  if (mimeType === "application/pdf" || extCat === "pdf") return <FileTextIcon className="size-5 text-red-500" />;
  if (extCat === "spreadsheet" || spreadsheetTypes.includes(mimeType)) return <TableIcon className="size-5 text-green-600" />;
  if (extCat === "presentation" || presentationTypes.includes(mimeType)) return <PresentationIcon className="size-5 text-orange-500" />;
  if (extCat === "document") return <FileTextIcon className="size-5 text-blue-500" />;
  if (extCat === "archive" || archiveTypes.includes(mimeType)) return <ArchiveIcon className="size-5 text-amber-500" />;
  if (extCat === "code" || codeTypes.includes(mimeType)) return <FileCodeIcon className="size-5 text-indigo-500" />;
  if (mimeType.startsWith("image/")) return <ImageIcon className="size-5 text-sky-500" />;
  if (mimeType.startsWith("video/")) return <VideoIcon className="size-5 text-purple-500" />;
  if (mimeType.startsWith("audio/")) return <MusicIcon className="size-5 text-emerald-500" />;
  if (mimeType.includes("sheet") || mimeType.includes("excel")) return <TableIcon className="size-5 text-green-600" />;
  if (mimeType.includes("presentation") || mimeType.includes("powerpoint")) return <PresentationIcon className="size-5 text-orange-500" />;
  if (mimeType.includes("pdf")) return <FileTextIcon className="size-5 text-red-500" />;
  if (mimeType.includes("zip") || mimeType.includes("rar") || mimeType.includes("tar")) return <ArchiveIcon className="size-5 text-amber-500" />;
  if (mimeType.includes("document") || mimeType.includes("word")) return <FileTextIcon className="size-5 text-blue-500" />;
  if (mimeType.startsWith("text/")) return <FileCodeIcon className="size-5 text-indigo-500" />;
  if (mimeType.includes("json") || mimeType.includes("xml")) return <FileJsonIcon className="size-5 text-yellow-500" />;
  return <FileIcon className="size-5 text-muted-foreground" />;
}

export function getFileTypeColor(mimeType: string, fileName?: string): string {
  const extCat = fileName ? getCategoryByExt(fileName) : null;

  if (extCat === "image" || mimeType.startsWith("image/")) return "bg-sky-100 text-sky-600 dark:bg-sky-950 dark:text-sky-400";
  if (extCat === "video" || mimeType.startsWith("video/")) return "bg-purple-100 text-purple-600 dark:bg-purple-950 dark:text-purple-400";
  if (extCat === "audio" || mimeType.startsWith("audio/")) return "bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400";
  if (mimeType === "application/pdf" || extCat === "pdf") return "bg-red-100 text-red-600 dark:bg-red-950 dark:text-red-400";
  if (extCat === "spreadsheet") return "bg-green-100 text-green-600 dark:bg-green-950 dark:text-green-400";
  if (extCat === "presentation") return "bg-orange-100 text-orange-600 dark:bg-orange-950 dark:text-orange-400";
  if (extCat === "document") return "bg-blue-100 text-blue-600 dark:bg-blue-950 dark:text-blue-400";
  if (extCat === "archive") return "bg-amber-100 text-amber-600 dark:bg-amber-950 dark:text-amber-400";
  if (extCat === "code" || mimeType.startsWith("text/")) return "bg-indigo-100 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400";
  return "bg-muted text-muted-foreground";
}
