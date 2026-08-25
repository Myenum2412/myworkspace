export type FileItem = {
  id: string;
  originalName: string;
  mimeType: string;
  size: number;
  description?: string;
  tags?: string[];
  isLocked?: boolean;
  lockedBy?: string | null;
  currentVersion?: number;
  uploaderName?: string;
  uploaderId?: string;
  createdAt: string;
  updatedAt?: string;
  folderId?: string | null;
  category?: string;
};

export type FolderItem = {
  id: string;
  name: string;
  path: string;
  parentId: string | null;
  clientId?: string | null;
  children?: FolderItem[];
};

export type ViewMode = "grid" | "list";

export function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}
