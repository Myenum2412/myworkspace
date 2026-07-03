import { ImageIcon, FileIcon, FileTextIcon, ArchiveIcon } from "lucide-react";

export function getFileIcon(mimeType: string) {
  if (mimeType.startsWith("image/")) return <ImageIcon className="size-5 text-muted-foreground" />;
  if (mimeType.startsWith("video/")) return <FileIcon className="size-5 text-muted-foreground" />;
  if (mimeType.startsWith("audio/")) return <FileIcon className="size-5 text-muted-foreground" />;
  if (mimeType.includes("pdf")) return <FileTextIcon className="size-5 text-muted-foreground" />;
  if (mimeType.includes("zip") || mimeType.includes("rar")) return <ArchiveIcon className="size-5 text-muted-foreground" />;
  if (mimeType.includes("sheet") || mimeType.includes("excel")) return <FileTextIcon className="size-5 text-muted-foreground" />;
  if (mimeType.includes("document") || mimeType.includes("word")) return <FileTextIcon className="size-5 text-muted-foreground" />;
  if (mimeType.startsWith("text/")) return <FileTextIcon className="size-5 text-muted-foreground" />;
  return <FileIcon className="size-5 text-muted-foreground" />;
}
