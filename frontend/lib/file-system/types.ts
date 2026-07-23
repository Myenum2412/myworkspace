export type ViewMode = "grid" | "list";
export type SortField = "name" | "createdAt" | "updatedAt" | "size" | "uploaderName" | "mimeType";
export type SortDir = "asc" | "desc";
export type NavSection = "files" | "shared" | "recent" | "favorites" | "approvals" | "recycle" | "audit" | "starred" | "team" | "client-files" | "staff-files" | "company" | "storage";

export type FileItem = {
  id: string;
  originalName: string;
  name?: string;
  mimeType: string;
  size: number;
  description?: string;
  tags?: string[];
  isLocked?: boolean;
  lockedBy?: string | null;
  currentVersion?: number;
  uploaderName?: string;
  uploaderId?: string;
  uploaderEmail?: string;
  createdAt: string;
  updatedAt?: string;
  folderId?: string | null;
  clientId?: string | null;
  orgId?: string;
  category?: string;
  thumbnailPath?: string | null;
  storagePath?: string;
  isFavorite?: boolean;
  checksum?: string;
  virusScanStatus?: string;
  approvalStatus?: "none" | "pending" | "approved" | "rejected";
  approvedBy?: string | null;
  approvalNote?: string;
  deletedAt?: string | null;
  deletedBy?: string | null;
};

export type FolderItem = {
  id: string;
  name: string;
  path: string;
  parentId: string | null;
  clientId?: string | null;
  orgId?: string;
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
  color?: string;
  icon?: string;
  description?: string;
  ownerName?: string;
  permissions?: {
    clientCanView?: boolean;
    clientCanUpload?: boolean;
    clientCanDelete?: boolean;
  };
  isFavorite?: boolean;
  deletedAt?: string | null;
  children?: FolderItem[];
};

export type FileVersion = {
  id: string;
  fileId: string;
  versionNumber: number;
  size: number;
  checksum?: string;
  uploadedBy: string;
  uploaderName?: string;
  originalName?: string;
  comment?: string;
  createdAt: string;
};

export type ShareLink = {
  id: string;
  fileId: string;
  token: string;
  isPublic: boolean;
  hasPassword: boolean;
  expiresAt?: string | null;
  maxDownloads?: number | null;
  downloadCount: number;
  allowDownload: boolean;
  isActive: boolean;
  createdAt: string;
  shareUrl?: string;
};

export type FileShare = {
  id: string;
  fileId: string;
  file?: FileItem;
  sharedByUserId: string;
  sharedWithUserId: string | null;
  sharedWithName?: string;
  permission?: "view" | "download" | "edit" | "full";
  createdAt: string;
};

export type AuditLogEntry = {
  id: string;
  orgId: string;
  userId: string;
  userName?: string;
  userRole?: string;
  action: string;
  entityType: string;
  entityId?: string;
  entityName?: string;
  previousName?: string;
  description: string;
  metadata?: string;
  ipAddress?: string;
  userAgent?: string;
  device?: string;
  browser?: string;
  status?: "success" | "failed";
  company?: string;
  workspace?: string;
  createdAt: string;
};

export type StorageStats = {
  totalFiles: number;
  totalSize: number;
  usedStorage: number;
  maxStorage: number;
  deletedFiles: number;
  folderCount?: number;
  userStorage?: number;
  userLimit?: number;
  mimeTypeBreakdown?: Record<string, number>;
};

export type UploadQueueItem = {
  id: string;
  file: File;
  progress: number;
  status: "pending" | "uploading" | "paused" | "completed" | "failed" | "cancelled";
  error?: string;
  speed?: number;
  xhr?: XMLHttpRequest;
};

export type FilterState = {
  mimeType?: string;
  category?: string;
  dateFrom?: string;
  dateTo?: string;
  ownerId?: string;
  tags?: string[];
  sizeMin?: number;
  sizeMax?: number;
};

export function formatSize(bytes: number): string {
  if (!bytes || bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

export function getFileExtension(filename: string): string {
  const parts = filename.split(".");
  return parts.length > 1 ? parts.pop()!.toLowerCase() : "";
}

export function isPreviewable(mimeType: string): boolean {
  return !!(
    mimeType.startsWith("image/") ||
    mimeType.startsWith("video/") ||
    mimeType.startsWith("audio/") ||
    mimeType.startsWith("text/") ||
    mimeType === "application/pdf" ||
    mimeType === "application/json" ||
    mimeType === "application/xml"
  );
}
