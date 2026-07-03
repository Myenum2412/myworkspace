export type UploadStatus = "pending" | "uploading" | "done" | "error" | "cancelled" | "duplicate";

export interface UploadItem {
  id: string;
  file: File;
  relativePath: string;
  size: number;
  progress: number;
  status: UploadStatus;
  error?: string;
  speed: number;
  xhr: XMLHttpRequest | null;
  startTime: number;
}

export interface DropZoneUploadProps {
  orgId: string;
  folderId?: string | null;
  clientId?: string | null;
  onUploadComplete?: () => void;
  maxConcurrency?: number;
}

export type WalkResult = { file: File; relativePath: string };

export const ALLOWED_EXTENSIONS = [
  "jpg", "jpeg", "png", "gif", "webp", "svg", "bmp", "tiff", "ico", "heic",
  "pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx",
  "txt", "csv", "rtf", "odt", "ods", "odp",
  "json", "xml", "yaml", "yml", "sql", "md",
  "zip", "rar", "7z", "tar", "gz",
  "mp4", "mov", "avi", "mkv", "webm", "mpeg", "mpg", "3gp",
  "mp3", "wav", "aac", "ogg", "flac", "m4a",
  "js", "ts", "jsx", "tsx", "py", "rb", "go", "rs", "java",
  "c", "cpp", "cs", "php", "sh",
  "css", "scss", "less", "html", "htm",
  "psd", "ai", "sketch", "fig",
  "woff", "woff2", "ttf", "eot",
];

export const MAX_FILE_SIZE = 500 * 1024 * 1024;

export function formatSize(bytes: number): string {
  if (!bytes) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

export function formatSpeed(bytesPerSec: number): string {
  if (!bytesPerSec) return "";
  if (bytesPerSec < 1024) return `${bytesPerSec.toFixed(0)} B/s`;
  if (bytesPerSec < 1024 * 1024) return `${(bytesPerSec / 1024).toFixed(1)} KB/s`;
  return `${(bytesPerSec / (1024 * 1024)).toFixed(1)} MB/s`;
}

export function walkEntry(entry: FileSystemEntry, parentPath = ""): Promise<WalkResult[]> {
  return new Promise((resolve) => {
    if (entry.isFile) {
      (entry as FileSystemFileEntry).file(
        (file) => {
          const relativePath = parentPath ? `${parentPath}/${file.name}` : file.name;
          resolve([{ file, relativePath }]);
        },
        () => resolve([]),
      );
    } else if (entry.isDirectory) {
      const dir = entry as FileSystemDirectoryEntry;
      const reader = dir.createReader();
      const readAll = (entries: FileSystemEntry[] = []): Promise<FileSystemEntry[]> =>
        new Promise((r) => {
          reader.readEntries((results) => {
            if (results.length) {
              readAll([...entries, ...results]).then(r);
            } else {
              r(entries);
            }
          });
        });
      readAll().then(async (entries) => {
        const dirPath = parentPath ? `${parentPath}/${entry.name}` : entry.name;
        const results = await Promise.all(entries.map((e) => walkEntry(e, dirPath)));
        resolve(results.flat());
      });
    } else {
      resolve([]);
    }
  });
}

export async function extractFiles(items: DataTransferItemList): Promise<WalkResult[]> {
  const entries: FileSystemEntry[] = [];
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (item.kind === "file") {
      const entry = item.webkitGetAsEntry();
      if (entry) entries.push(entry);
    }
  }
  const results = await Promise.all(entries.map((e) => walkEntry(e)));
  return results.flat();
}
