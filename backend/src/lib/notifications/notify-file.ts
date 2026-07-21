import { createNotification } from "../../services/notification.service.js";

export const notifyFile = {
  async uploaded(userId: string, orgId: string, uploadedBy: string, fileName: string, fileId: string) {
    return createNotification({
      userId, orgId, createdBy: userId,
      type: "file_uploaded", category: "files",
      title: "File Uploaded",
      message: `"${fileName}" uploaded by ${uploadedBy}`,
      link: `/files?id=${fileId}`,
      actions: [{ label: "View File", action: "view", url: `/files?id=${fileId}`, primary: true }],
      metadata: { fileId, fileName },
    });
  },

  async bulkUploaded(userId: string, orgId: string, uploadedBy: string, fileCount: number, folderId?: string) {
    return createNotification({
      userId, orgId, createdBy: userId,
      type: "file_bulk_uploaded", category: "files",
      title: "Files Uploaded",
      message: `${uploadedBy} uploaded ${fileCount} files`,
      link: folderId ? `/files?folder=${folderId}` : "/files",
      metadata: { fileCount },
    });
  },

  async folderCreated(userId: string, orgId: string, createdBy: string, folderName: string, folderId: string) {
    return createNotification({
      userId, orgId, createdBy,
      type: "folder_created", category: "files",
      title: "Folder Created",
      message: `Folder "${folderName}" created by ${createdBy}`,
      link: `/files?folder=${folderId}`,
      metadata: { folderId, folderName },
    });
  },

  async folderRenamed(userId: string, orgId: string, renamedBy: string, oldName: string, newName: string, folderId: string) {
    return createNotification({
      userId, orgId, createdBy: userId,
      type: "folder_renamed", category: "files",
      title: "Folder Renamed",
      message: `${renamedBy} renamed folder "${oldName}" to "${newName}"`,
      link: `/files?folder=${folderId}`,
      metadata: { folderId, oldName, newName },
    });
  },

  async renamed(userId: string, orgId: string, renamedBy: string, oldName: string, newName: string, fileId: string) {
    return createNotification({
      userId, orgId, createdBy: userId,
      type: "file_renamed", category: "files",
      title: "File Renamed",
      message: `${renamedBy} renamed "${oldName}" to "${newName}"`,
      link: `/files?id=${fileId}`,
      metadata: { fileId, oldName, newName },
    });
  },

  async moved(userId: string, orgId: string, movedBy: string, fileName: string, fileId: string, destinationFolder: string) {
    return createNotification({
      userId, orgId, createdBy: userId,
      type: "file_moved", category: "files",
      title: "File Moved",
      message: `${movedBy} moved "${fileName}" to ${destinationFolder}`,
      link: `/files?id=${fileId}`,
      metadata: { fileId, destinationFolder },
    });
  },

  async copied(userId: string, orgId: string, copiedBy: string, fileName: string, fileId: string, destinationFolder: string) {
    return createNotification({
      userId, orgId, createdBy: userId,
      type: "file_copied", category: "files",
      title: "File Copied",
      message: `${copiedBy} copied "${fileName}" to ${destinationFolder}`,
      link: `/files?id=${fileId}`,
      metadata: { fileId, destinationFolder },
    });
  },

  async shared(userId: string, orgId: string, sharedBy: string, fileName: string, fileId: string, sharedWith: string) {
    return createNotification({
      userId, orgId, createdBy: userId,
      type: "file_shared", category: "files",
      title: "File Shared",
      message: `${sharedBy} shared "${fileName}" with ${sharedWith}`,
      link: `/files?id=${fileId}`,
      actions: [{ label: "View File", action: "view", url: `/files?id=${fileId}`, primary: true }],
      metadata: { fileId, sharedWith },
    });
  },

  async downloaded(userId: string, orgId: string, downloadedBy: string, fileName: string, fileId: string) {
    return createNotification({
      userId, orgId, createdBy: userId,
      type: "file_downloaded", category: "files",
      title: "File Downloaded",
      message: `"${fileName}" was downloaded by ${downloadedBy}`,
      metadata: { fileId },
    });
  },

  async previewed(userId: string, orgId: string, previewedBy: string, fileName: string, fileId: string) {
    return createNotification({
      userId, orgId, createdBy: userId,
      type: "file_previewed", category: "files",
      title: "File Previewed",
      message: `"${fileName}" was previewed by ${previewedBy}`,
      metadata: { fileId },
    });
  },

  async approved(userId: string, orgId: string, approvedBy: string, fileName: string, fileId: string) {
    return createNotification({
      userId, orgId, createdBy: userId,
      type: "file_approved", category: "files",
      title: "File Approved",
      message: `${approvedBy} approved "${fileName}"`,
      link: `/files?id=${fileId}`,
      metadata: { fileId },
    });
  },

  async rejected(userId: string, orgId: string, rejectedBy: string, fileName: string, fileId: string, reason?: string) {
    return createNotification({
      userId, orgId, createdBy: userId,
      type: "file_rejected", category: "files", priority: "high",
      title: "File Rejected",
      message: `${rejectedBy} rejected "${fileName}"${reason ? `: ${reason}` : ""}`,
      link: `/files?id=${fileId}`,
      metadata: { fileId, reason },
    });
  },

  async deleted(userId: string, orgId: string, deletedBy: string, fileName: string, fileId: string) {
    return createNotification({
      userId, orgId, createdBy: userId,
      type: "file_deleted", category: "files",
      title: "File Deleted",
      message: `"${fileName}" was deleted by ${deletedBy}`,
      metadata: { fileId },
    });
  },

  async restored(userId: string, orgId: string, restoredBy: string, fileName: string, fileId: string) {
    return createNotification({
      userId, orgId, createdBy: userId,
      type: "file_restored", category: "files",
      title: "File Restored",
      message: `${restoredBy} restored "${fileName}" from trash`,
      link: `/files?id=${fileId}`,
      metadata: { fileId },
    });
  },

  async permanentlyDeleted(userId: string, orgId: string, deletedBy: string, fileName: string, fileId: string) {
    return createNotification({
      userId, orgId, createdBy: userId,
      type: "file_permanently_deleted", category: "files",
      title: "File Permanently Deleted",
      message: `"${fileName}" was permanently deleted by ${deletedBy}`,
      metadata: { fileId },
    });
  },

  async storageNearingLimit(userId: string, orgId: string, usagePercent: number) {
    return createNotification({
      userId, orgId, createdBy: userId,
      type: "storage_nearing_limit", category: "files", priority: "high",
      title: "Storage Nearing Limit",
      message: `Storage usage is at ${usagePercent}%. Please free up space or upgrade.`,
      link: "/settings/billing",
      actions: [
        { label: "Manage Storage", action: "view", url: "/files", primary: true },
        { label: "Upgrade Plan", action: "view", url: "/settings/billing" },
      ],
      metadata: { usagePercent },
    });
  },

  async storageExceeded(userId: string, orgId: string) {
    return createNotification({
      userId, orgId, createdBy: userId,
      type: "storage_exceeded", category: "files", priority: "critical",
      title: "Storage Limit Exceeded",
      message: "You have exceeded your storage limit. Uploads may be blocked until space is freed.",
      link: "/settings/billing",
      actions: [
        { label: "Upgrade Plan", action: "view", url: "/settings/billing", primary: true },
        { label: "Manage Files", action: "view", url: "/files" },
      ],
    });
  },

  async virusScanFailed(userId: string, orgId: string, fileName: string, fileId: string) {
    return createNotification({
      userId, orgId, createdBy: userId,
      type: "virus_scan_failed", category: "files", priority: "high",
      title: "Virus Scan Failed",
      message: `Virus scan failed for "${fileName}". The file may be infected.`,
      link: `/files?id=${fileId}`,
      metadata: { fileId },
    });
  },

  async uploadFailed(userId: string, orgId: string, fileName: string, error: string) {
    return createNotification({
      userId, orgId, createdBy: userId,
      type: "upload_failed", category: "files", priority: "high",
      title: "Upload Failed",
      message: `Failed to upload "${fileName}": ${error}`,
      metadata: { fileName, error },
    });
  },

  async uploadCompleted(userId: string, orgId: string, fileName: string, fileId: string) {
    return createNotification({
      userId, orgId, createdBy: userId,
      type: "upload_completed", category: "files",
      title: "Upload Complete",
      message: `"${fileName}" has been uploaded successfully.`,
      link: `/files?id=${fileId}`,
      metadata: { fileId },
    });
  },
};
