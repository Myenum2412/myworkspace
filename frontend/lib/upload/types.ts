export type UploadStatus = "pending" | "uploading" | "paused" | "completed" | "failed" | "cancelled" | "duplicate" | "pending_approval";

export type NetworkQuality = "unknown" | "excellent" | "good" | "fair" | "poor";

export interface UploadFile {
  id: string;
  file: File;
  name: string;
  size: number;
  mimeType: string;
  progress: number;
  status: UploadStatus;
  speed: number;
  eta: number;
  error?: string;
  checksum: string;
  tusId?: string;
  uploadId?: string;
  fileId?: string;
  startedAt?: number;
  completedAt?: number;
  retryCount: number;
  chunkSize: number;
}

export interface UploadSessionData {
  uploadId: string;
  tusUrl: string;
  file: {
    name: string;
    size: number;
    mimeType: string;
  };
  metadata: Record<string, string>;
  offset: number;
  status: UploadStatus;
  createdAt: number;
  updatedAt: number;
  checksum: string;
}

export interface UploadOptions {
  orgId: string;
  workspaceId?: string;
  projectId?: string;
  clientId?: string;
  staffId?: string;
  departmentId?: string;
  folderId?: string;
  tags?: string[];
  description?: string;
  chunkSize?: number;
  parallelUploads?: number;
  maxRetries?: number;
}

export interface UploadStats {
  totalUploads: number;
  activeUploads: number;
  completedUploads: number;
  failedUploads: number;
  totalBytes: number;
  uploadedBytes: number;
  averageSpeed: number;
}

export interface SocketUploadEvent {
  uploadId?: string;
  tusId?: string;
  fileId?: string;
  orgId: string;
  fileName?: string;
  fileSize?: number;
  mimeType?: string;
  error?: string;
  reason?: string;
  approvedBy?: string;
  rejectedBy?: string;
  progress?: number;
  durationMs?: number;
  duplicate?: boolean;
  category?: string;
  folderId?: string;
  projectId?: string;
  workspaceId?: string;
  uploaderId?: string;
}
