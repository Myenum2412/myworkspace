import { EmailData } from "./types.js";

function ts(): string {
  return new Date().toLocaleString();
}

export const buildFileUploaded = (
  firstName: string,
  fileName: string,
  uploadedBy: string,
  projectName: string,
  fileSize: string,
  fileType: string,
  fileUrl: string
): EmailData => ({
  subject: `File Uploaded: ${fileName}`,
  previewText: `${uploadedBy} uploaded "${fileName}" to ${projectName}`,
  greeting: `Hi ${firstName},`,
  metadata: { module: "File Management", timestamp: ts(), action: "File Uploaded" },
  statusIndicator: { type: "info", label: "New File" },
  intro: [`${uploadedBy} has uploaded a new file to ${projectName}.`],
  details: [
    { label: "File Name", value: fileName },
    { label: "Type", value: fileType },
    { label: "Size", value: fileSize },
    { label: "Project", value: projectName },
    { label: "Uploaded By", value: uploadedBy },
  ],
  button: { text: "View File", url: fileUrl },
  supportEmail: "support@workspace.com",
});

export const buildFileDownloaded = (
  firstName: string,
  fileName: string,
  downloadedBy: string,
  projectName: string,
  ipAddress: string,
  fileUrl: string
): EmailData => ({
  subject: `File Downloaded: ${fileName}`,
  previewText: `${downloadedBy} downloaded "${fileName}"`,
  greeting: `Hi ${firstName},`,
  metadata: { module: "File Management", timestamp: ts(), action: "File Downloaded" },
  statusIndicator: { type: "neutral", label: "Downloaded" },
  intro: [`${downloadedBy} has downloaded the file "${fileName}" from ${projectName}.`],
  details: [
    { label: "File Name", value: fileName },
    { label: "Project", value: projectName },
    { label: "Downloaded By", value: downloadedBy },
    { label: "IP Address", value: ipAddress },
    { label: "Time", value: ts() },
  ],
  button: { text: "View File", url: fileUrl },
  supportEmail: "support@workspace.com",
});

export const buildFileShared = (
  firstName: string,
  fileName: string,
  sharedBy: string,
  projectName: string,
  sharedWith: string,
  permission: string,
  fileUrl: string
): EmailData => ({
  subject: `File Shared: ${fileName}`,
  previewText: `${sharedBy} shared "${fileName}" with you`,
  greeting: `Hi ${firstName},`,
  metadata: { module: "File Management", timestamp: ts(), action: "File Shared" },
  statusIndicator: { type: "info", label: "Shared with You" },
  intro: [`${sharedBy} has shared the file "${fileName}" with you from ${projectName}.`],
  details: [
    { label: "File Name", value: fileName },
    { label: "Project", value: projectName },
    { label: "Shared By", value: sharedBy },
    { label: "Permission", value: permission },
  ],
  button: { text: "View File", url: fileUrl },
  supportEmail: "support@workspace.com",
});

export const buildFileVersionUpdated = (
  firstName: string,
  fileName: string,
  updatedBy: string,
  projectName: string,
  versionNumber: string,
  changeSummary: string,
  fileUrl: string
): EmailData => ({
  subject: `File Version Updated: ${fileName} (v${versionNumber})`,
  previewText: `${updatedBy} uploaded version ${versionNumber} of "${fileName}"`,
  greeting: `Hi ${firstName},`,
  metadata: { module: "File Management", timestamp: ts(), action: "Version Updated" },
  statusIndicator: { type: "info", label: `v${versionNumber}` },
  intro: [`${updatedBy} has uploaded a new version of "${fileName}" in ${projectName}.`],
  details: [
    { label: "File Name", value: fileName },
    { label: "New Version", value: versionNumber },
    { label: "Updated By", value: updatedBy },
    { label: "Project", value: projectName },
    { label: "Changes", value: changeSummary },
  ],
  button: { text: "View File", url: fileUrl },
  tip: "Previous versions are preserved and can be accessed from the file history.",
  supportEmail: "support@workspace.com",
});

export const buildFileAccessChanged = (
  firstName: string,
  fileName: string,
  changedBy: string,
  projectName: string,
  oldPermission: string,
  newPermission: string,
  fileUrl: string
): EmailData => ({
  subject: `File Access Updated: ${fileName}`,
  previewText: `Access permissions for "${fileName}" have been changed`,
  greeting: `Hi ${firstName},`,
  metadata: { module: "File Management", timestamp: ts(), action: "Access Changed" },
  statusIndicator: { type: "warning", label: "Access Updated" },
  intro: [`${changedBy} has updated the access permissions for "${fileName}" in ${projectName}.`],
  details: [
    { label: "File Name", value: fileName },
    { label: "Project", value: projectName },
    { label: "Changed By", value: changedBy },
    { label: "Previous Access", value: oldPermission },
    { label: "New Access", value: newPermission },
  ],
  button: { text: "View File", url: fileUrl },
  tip: "If you believe this change was made in error, please contact your project administrator.",
  supportEmail: "support@workspace.com",
});

export const buildFileDeleted = (
  firstName: string,
  fileName: string,
  deletedBy: string,
  projectName: string,
  permanentlyDeleted: boolean,
  fileUrl: string
): EmailData => ({
  subject: `File Removed: ${fileName}`,
  previewText: `"${fileName}" has been removed from ${projectName}`,
  greeting: `Hi ${firstName},`,
  metadata: { module: "File Management", timestamp: ts(), action: "File Deleted" },
  statusIndicator: { type: "neutral", label: "Removed" },
  intro: [`${deletedBy} has removed "${fileName}" from ${projectName}.`],
  details: [
    { label: "File Name", value: fileName },
    { label: "Project", value: projectName },
    { label: "Removed By", value: deletedBy },
    { label: "Type", value: permanentlyDeleted ? "Permanently Deleted" : "Moved to Trash" },
  ],
  ...(!permanentlyDeleted ? {
    warning: "This file has been moved to the trash and can be restored within 30 days." as const,
  } : {}),
  button: { text: "View Trash", url: fileUrl },
  supportEmail: "support@workspace.com",
});

export const buildFileRenamed = (
  firstName: string,
  oldFileName: string,
  newFileName: string,
  renamedBy: string,
  projectName: string,
  fileUrl: string
): EmailData => ({
  subject: `File Renamed: ${oldFileName}`,
  previewText: `"${oldFileName}" has been renamed to "${newFileName}"`,
  greeting: `Hi ${firstName},`,
  metadata: { module: "File Management", timestamp: ts(), action: "File Renamed" },
  statusIndicator: { type: "info", label: "Renamed" },
  intro: [`${renamedBy} has renamed a file in ${projectName}.`],
  details: [
    { label: "Previous Name", value: oldFileName },
    { label: "New Name", value: newFileName },
    { label: "Project", value: projectName },
    { label: "Renamed By", value: renamedBy },
  ],
  button: { text: "View File", url: fileUrl },
  supportEmail: "support@workspace.com",
});

export const buildFolderShared = (
  firstName: string,
  folderName: string,
  sharedBy: string,
  projectName: string,
  sharedWith: string,
  permission: string,
  folderUrl: string
): EmailData => ({
  subject: `Folder Shared: ${folderName}`,
  previewText: `${sharedBy} shared the folder "${folderName}" with you`,
  greeting: `Hi ${firstName},`,
  metadata: { module: "File Management", timestamp: ts(), action: "Folder Shared" },
  statusIndicator: { type: "info", label: "Folder Shared" },
  intro: [`${sharedBy} has shared the folder "${folderName}" with you from ${projectName}.`],
  details: [
    { label: "Folder", value: folderName },
    { label: "Project", value: projectName },
    { label: "Shared By", value: sharedBy },
    { label: "Permission", value: permission },
  ],
  button: { text: "Open Folder", url: folderUrl },
  supportEmail: "support@workspace.com",
});

export const buildFileRestored = (
  firstName: string,
  fileName: string,
  restoredBy: string,
  projectName: string,
  fileUrl: string
): EmailData => ({
  subject: `File Restored: ${fileName}`,
  previewText: `"${fileName}" has been restored to ${projectName}`,
  greeting: `Hi ${firstName},`,
  metadata: { module: "File Management", timestamp: ts(), action: "File Restored" },
  statusIndicator: { type: "success", label: "Restored" },
  intro: [`${restoredBy} has restored "${fileName}" to ${projectName}.`],
  details: [
    { label: "File Name", value: fileName },
    { label: "Project", value: projectName },
    { label: "Restored By", value: restoredBy },
  ],
  button: { text: "View File", url: fileUrl },
  supportEmail: "support@workspace.com",
});

export const buildStorageQuotaWarning = (
  firstName: string,
  workspaceName: string,
  usedStorage: string,
  totalStorage: string,
  usagePercent: number,
  manageUrl: string
): EmailData => ({
  subject: `Storage Quota Warning - ${workspaceName}`,
  previewText: `Your ${workspaceName} storage is at ${usagePercent}% capacity`,
  greeting: `Hi ${firstName},`,
  metadata: { module: "File Management", timestamp: ts(), action: "Storage Warning" },
  statusIndicator: {
    type: usagePercent >= 95 ? "error" : "warning",
    label: `${usagePercent}% full`,
  },
  intro: [`Your ${workspaceName} storage is reaching its limit.`],
  details: [
    { label: "Workspace", value: workspaceName },
    { label: "Used Storage", value: usedStorage },
    { label: "Total Storage", value: totalStorage },
    { label: "Usage", value: `${usagePercent}%` },
  ],
  warning: usagePercent >= 95
    ? "Your workspace is almost out of storage. Please delete unnecessary files or upgrade your plan."
    : `You have used ${usagePercent}% of your storage capacity. Consider cleaning up old files.`,
  button: { text: "Manage Storage", url: manageUrl },
  supportEmail: "support@workspace.com",
});
