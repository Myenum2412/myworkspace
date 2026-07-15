"use client";

import { create } from "zustand";
import type { FileItem, FolderItem, ViewMode, SortField, SortDir, NavSection, FilterState, UploadQueueItem } from "./types";

interface FileSystemState {
  orgId: string;
  userId: string;
  userRole: string;

  currentFolderId: string | null;
  currentNav: NavSection;
  viewMode: ViewMode;
  sortField: SortField;
  sortDir: SortDir;

  files: FileItem[];
  folders: FolderItem[];
  breadcrumbs: { id: string | null; name: string }[];
  selectedIds: Set<string>;
  clipboard: { ids: string[]; action: "copy" | "cut" } | null;

  search: string;
  filters: FilterState;

  isLoading: boolean;
  uploadQueue: UploadQueueItem[];

  // ── UI State ──
  previewFile: FileItem | null;
  shareFile: FileItem | null;
  propertiesTarget: { type: "file" | "folder"; id: string } | null;
  renameTarget: { type: "file" | "folder"; id: string; name: string } | null;
  moveTarget: { type: "file" | "folder"; id: string } | null;
  isCreatingFolder: boolean;
  showUpload: boolean;

  // ── Actions ──
  setOrgContext: (orgId: string, userId: string, role: string) => void;
  setCurrentFolder: (id: string | null) => void;
  setCurrentNav: (nav: NavSection) => void;
  setViewMode: (mode: ViewMode) => void;
  setSort: (field: SortField, dir: SortDir) => void;
  setFiles: (files: FileItem[]) => void;
  setFolders: (folders: FolderItem[]) => void;
  setBreadcrumbs: (crumbs: { id: string | null; name: string }[]) => void;
  setSearch: (q: string) => void;
  setFilters: (f: FilterState) => void;
  setLoading: (l: boolean) => void;
  toggleSelection: (id: string) => void;
  selectAll: () => void;
  clearSelection: () => void;
  setClipboard: (c: { ids: string[]; action: "copy" | "cut" } | null) => void;
  addUploadItem: (item: UploadQueueItem) => void;
  updateUploadItem: (id: string, partial: Partial<UploadQueueItem>) => void;
  removeUploadItem: (id: string) => void;
  clearUploadQueue: () => void;
  setPreviewFile: (f: FileItem | null) => void;
  setShareFile: (f: FileItem | null) => void;
  setPropertiesTarget: (t: { type: "file" | "folder"; id: string } | null) => void;
  setRenameTarget: (t: { type: "file" | "folder"; id: string; name: string } | null) => void;
  setMoveTarget: (t: { type: "file" | "folder"; id: string } | null) => void;
  setIsCreatingFolder: (v: boolean) => void;
  setShowUpload: (v: boolean) => void;
  removeFile: (id: string) => void;
  removeFolder: (id: string) => void;
  addFolder: (f: FolderItem) => void;
  updateFileInList: (id: string, data: Partial<FileItem>) => void;
  updateFolderInList: (id: string, data: Partial<FolderItem>) => void;
}

export const useFileSystemStore = create<FileSystemState>((set) => ({
  orgId: "",
  userId: "",
  userRole: "",
  currentFolderId: null,
  currentNav: "files",
  viewMode: "grid",
  sortField: "updatedAt",
  sortDir: "desc",
  files: [],
  folders: [],
  breadcrumbs: [{ id: null, name: "My Files" }],
  selectedIds: new Set(),
  clipboard: null,
  search: "",
  filters: {},
  isLoading: false,
  uploadQueue: [],
  previewFile: null,
  shareFile: null,
  propertiesTarget: null,
  renameTarget: null,
  moveTarget: null,
  isCreatingFolder: false,
  showUpload: false,

  setOrgContext: (orgId, userId, role) => set({ orgId, userId, userRole: role }),
  setCurrentFolder: (id) => set({ currentFolderId: id, selectedIds: new Set() }),
  setCurrentNav: (nav) => set({ currentNav: nav, currentFolderId: null, search: "", selectedIds: new Set() }),
  setViewMode: (mode) => set({ viewMode: mode }),
  setSort: (field, dir) => set({ sortField: field, sortDir: dir }),
  setFiles: (files) => set({ files }),
  setFolders: (folders) => set({ folders }),
  setBreadcrumbs: (crumbs) => set({ breadcrumbs: crumbs }),
  setSearch: (q) => set({ search: q }),
  setFilters: (f) => set({ filters: f }),
  setLoading: (l) => set({ isLoading: l }),
  toggleSelection: (id) => set((s) => {
    const next = new Set(s.selectedIds);
    if (next.has(id)) next.delete(id); else next.add(id);
    return { selectedIds: next };
  }),
  selectAll: () => set((s) => {
    const all = [...s.files.map((f) => f.id), ...s.folders.map((f) => f.id)];
    return { selectedIds: new Set(all) };
  }),
  clearSelection: () => set({ selectedIds: new Set() }),
  setClipboard: (c) => set({ clipboard: c }),
  addUploadItem: (item) => set((s) => ({ uploadQueue: [...s.uploadQueue, item] })),
  updateUploadItem: (id, partial) => set((s) => ({
    uploadQueue: s.uploadQueue.map((item) => item.id === id ? { ...item, ...partial } : item),
  })),
  removeUploadItem: (id) => set((s) => ({
    uploadQueue: s.uploadQueue.filter((item) => item.id !== id),
  })),
  clearUploadQueue: () => set({ uploadQueue: [] }),
  setPreviewFile: (f) => set({ previewFile: f }),
  setShareFile: (f) => set({ shareFile: f }),
  setPropertiesTarget: (t) => set({ propertiesTarget: t }),
  setRenameTarget: (t) => set({ renameTarget: t }),
  setMoveTarget: (t) => set({ moveTarget: t }),
  setIsCreatingFolder: (v) => set({ isCreatingFolder: v }),
  setShowUpload: (v) => set({ showUpload: v }),
  removeFile: (id) => set((s) => ({ files: s.files.filter((f) => f.id !== id) })),
  removeFolder: (id) => set((s) => ({ folders: s.folders.filter((f) => f.id !== id) })),
  addFolder: (f) => set((s) => ({ folders: [...s.folders, f] })),
  updateFileInList: (id, data) => set((s) => ({
    files: s.files.map((f) => f.id === id ? { ...f, ...data } : f),
  })),
  updateFolderInList: (id, data) => set((s) => ({
    folders: s.folders.map((f) => f.id === id ? { ...f, ...data } : f),
  })),
}));
