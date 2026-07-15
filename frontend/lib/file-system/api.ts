import type { FileItem, FolderItem, FileVersion, ShareLink, FileShare, AuditLogEntry, StorageStats, FilterState, SortField, SortDir } from "./types";

const API = {
  files: "/api/files",
  folders: "/api/folders",
  shares: "/api/shares",
  search: "/api/search",
  activity: "/api/activity",
  favorites: "/api/files/favorites",
  recent: "/api/files/recent",
};

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    credentials: "include",
    headers: { "Content-Type": "application/json", ...options?.headers },
    ...options,
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`API error ${res.status}: ${body}`);
  }
  const json = await res.json();
  return (json.data ?? json) as T;
}

function qs(params: Record<string, string | number | boolean | undefined | null>): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== "") sp.set(k, String(v));
  }
  const s = sp.toString();
  return s ? `?${s}` : "";
}

// ── Files ──

export function listFiles(params: {
  orgId: string;
  folderId?: string | null;
  clientId?: string | null;
  search?: string;
  sort?: string;
  category?: string;
  mimeType?: string;
  tags?: string[];
  page?: number;
  limit?: number;
}) {
  const sp = new URLSearchParams({ orgId: params.orgId });
  if (params.folderId) sp.set("folderId", params.folderId);
  if (params.clientId) sp.set("clientId", params.clientId);
  if (params.search) sp.set("search", params.search);
  if (params.sort) sp.set("sort", params.sort);
  if (params.category) sp.set("category", params.category);
  if (params.mimeType) sp.set("mimeType", params.mimeType);
  if (params.tags?.length) sp.set("tags", params.tags.join(","));
  if (params.page) sp.set("page", String(params.page));
  if (params.limit) sp.set("limit", String(params.limit));
  return request<FileItem[]>(`${API.files}?${sp}`);
}

export function getFile(id: string) {
  return request<FileItem>(`${API.files}/${id}`);
}

export function uploadFile(formData: FormData, moduleContext?: { moduleName?: string; entityId?: string; projectId?: string }) {
  if (moduleContext?.moduleName) formData.append("moduleName", moduleContext.moduleName);
  if (moduleContext?.entityId) formData.append("entityId", moduleContext.entityId);
  if (moduleContext?.projectId) formData.append("projectId", moduleContext.projectId);
  return request<{ kind: string; data: FileItem }>(`${API.files}/upload`, {
    method: "POST",
    body: formData,
    headers: {},
  });
}

export function updateFile(id: string, data: Partial<FileItem>) {
  return request<FileItem>(`${API.files}/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export function duplicateFile(id: string) {
  return request<FileItem>(`${API.files}/${id}/duplicate`, { method: "POST" });
}

export function deleteFile(id: string) {
  return request<void>(`${API.files}/${id}`, { method: "DELETE" });
}

export function restoreFile(id: string) {
  return request<void>(`${API.files}/${id}/restore`, { method: "POST" });
}

export function permanentDeleteFile(id: string) {
  return request<void>(`${API.files}/${id}/permanent`, { method: "DELETE" });
}

export function downloadFile(id: string) {
  window.open(`${API.files}/${id}/download`, "_blank");
}

export function getFileUrl(id: string) {
  return `${API.files}/${id}`;
}

// ── Versions ──

export function listVersions(fileId: string) {
  return request<FileVersion[]>(`${API.files}/${fileId}/versions`);
}

export function uploadVersion(fileId: string, formData: FormData) {
  return request<FileVersion>(`${API.files}/${fileId}/versions`, {
    method: "POST",
    body: formData,
    headers: {},
  });
}

export function rollbackVersion(fileId: string, versionId: string) {
  return request<FileItem>(`${API.files}/${fileId}/rollback`, {
    method: "POST",
    body: JSON.stringify({ versionId }),
  });
}

// ── Bulk ──

export function bulkDelete(ids: string[]) {
  return request<void>(`${API.files}/bulk/delete`, {
    method: "POST",
    body: JSON.stringify({ fileIds: ids }),
  });
}

export function bulkRestore(ids: string[]) {
  return request<void>(`${API.files}/bulk/restore`, {
    method: "POST",
    body: JSON.stringify({ fileIds: ids }),
  });
}

export function bulkMove(ids: string[], targetFolderId: string) {
  return request<void>(`${API.files}/bulk/move`, {
    method: "POST",
    body: JSON.stringify({ fileIds: ids, targetFolderId }),
  });
}

export function bulkPermanentDelete(ids: string[]) {
  return request<void>(`${API.files}/bulk/permanent`, {
    method: "POST",
    body: JSON.stringify({ fileIds: ids }),
  });
}

// ── Folders ──

export function listFolders(params: {
  orgId: string;
  parentId?: string | null;
  clientId?: string | null;
}) {
  const sp = new URLSearchParams({ orgId: params.orgId });
  if (params.parentId) sp.set("parentId", params.parentId);
  else if (params.parentId === null || params.parentId === "") sp.set("parentId", "");
  if (params.clientId) sp.set("clientId", params.clientId);
  return request<FolderItem[]>(`${API.folders}?${sp}`);
}

export function getFolderTree(orgId: string) {
  return request<FolderItem[]>(`${API.folders}/tree?orgId=${orgId}`);
}

export function getFolder(id: string) {
  return request<FolderItem>(`${API.folders}/${id}`);
}

export function createFolder(data: {
  orgId: string;
  name: string;
  parentId?: string | null;
  clientId?: string | null;
  description?: string;
  color?: string;
  icon?: string;
}) {
  return request<FolderItem>(API.folders, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function renameFolder(id: string, name: string) {
  return request<FolderItem>(`${API.folders}/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ name }),
  });
}

export function moveFolder(id: string, parentId: string | null) {
  return request<FolderItem>(`${API.folders}/${id}/move`, {
    method: "POST",
    body: JSON.stringify({ parentId }),
  });
}

export function copyFolder(id: string, parentId: string | null) {
  return request<FolderItem>(`${API.folders}/${id}/copy`, {
    method: "POST",
    body: JSON.stringify({ parentId }),
  });
}

export function deleteFolder(id: string) {
  return request<void>(`${API.folders}/${id}`, { method: "DELETE" });
}

// ── Sharing ──

export function listShares(orgId: string) {
  return request<FileShare[]>(`${API.shares}/internal?orgId=${orgId}`);
}

export function createInternalShare(data: {
  fileId: string;
  sharedWithUserId: string;
  permission?: string;
  orgId: string;
}) {
  return request<FileShare>(`${API.shares}/internal`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function removeInternalShare(id: string) {
  return request<void>(`${API.shares}/internal/${id}`, { method: "DELETE" });
}

export function createShareLink(data: {
  fileId: string;
  isPublic?: boolean;
  password?: string;
  expiresAt?: string;
  maxDownloads?: number;
  allowDownload?: boolean;
}) {
  return request<ShareLink>(`${API.shares}/links`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function listShareLinks(orgId: string, fileId?: string) {
  const sp = new URLSearchParams({ orgId });
  if (fileId) sp.set("fileId", fileId);
  return request<ShareLink[]>(`${API.shares}/links?${sp}`);
}

export function deactivateShareLink(id: string) {
  return request<void>(`${API.shares}/links/${id}`, { method: "DELETE" });
}

// ── Search ──

export function globalSearch(params: { orgId: string; q: string }) {
  return request<Record<string, unknown[]>>(`${API.search}?orgId=${params.orgId}&q=${encodeURIComponent(params.q)}`);
}

// ── Storage ──

export function getStorageStats(orgId: string) {
  return request<StorageStats>(`${API.files}/stats?orgId=${orgId}`);
}

// ── Audit Log ──

export function listAuditLogs(params: {
  orgId: string;
  entityType?: string;
  action?: string;
  userId?: string;
  search?: string;
  page?: number;
  limit?: number;
}) {
  const sp = new URLSearchParams({ orgId: params.orgId });
  if (params.entityType) sp.set("entityType", params.entityType);
  if (params.action) sp.set("action", params.action);
  if (params.userId) sp.set("userId", params.userId);
  if (params.search) sp.set("search", params.search);
  if (params.page) sp.set("page", String(params.page));
  if (params.limit) sp.set("limit", String(params.limit));
  return request<AuditLogEntry[]>(`${API.activity}?${sp}`);
}

// ── Recycle Bin ──

export function listRecycleBin(orgId: string, search?: string) {
  const sp = new URLSearchParams({ orgId });
  if (search) sp.set("search", search);
  return request<FileItem[]>(`${API.files}/recycle-bin?${sp}`);
}

// ── Recent ──
export function listRecent(orgId: string, limit = 20) {
  return request<FileItem[]>(`${API.files}/recent?orgId=${orgId}&limit=${limit}`);
}

// ── Client Folders ──

export function getClientFolderTree(clientId: string, orgId: string) {
  return request<FolderItem[]>(`/api/client-folders/${clientId}/tree?orgId=${orgId}`);
}

export function getClientFolderStats(clientId: string, orgId: string) {
  return request<Record<string, unknown>>(`/api/client-folders/${clientId}/stats?orgId=${orgId}`);
}

export function getClientSubfolders(clientId: string, orgId: string) {
  return request<string[]>(`/api/client-folders/${clientId}/subfolders?orgId=${orgId}`);
}

export function syncClientFolders(clientId: string, orgId: string, clientName?: string) {
  return request<Record<string, unknown>>(`/api/client-folders/${clientId}/sync`, {
    method: "POST",
    body: JSON.stringify({ orgId, clientName }),
  });
}
