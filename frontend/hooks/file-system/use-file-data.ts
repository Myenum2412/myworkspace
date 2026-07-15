"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useFileSystemStore } from "@/lib/file-system/store";
import * as api from "@/lib/file-system/api";
import { useCallback, useEffect } from "react";

export function useFileData() {
  const { orgId, currentFolderId, search, filters, sortField, sortDir, currentNav } = useFileSystemStore();
  const queryClient = useQueryClient();

  const sort = `${sortDir === "desc" ? "-" : ""}${sortField}`;

  const fileParams = {
    orgId,
    folderId: currentFolderId ?? undefined,
    search: search || undefined,
    sort,
    category: filters.category || undefined,
    mimeType: filters.mimeType || undefined,
  };

  const filesQuery = useQuery({
    queryKey: ["files", fileParams],
    queryFn: () => api.listFiles(fileParams),
    enabled: !!orgId && currentNav === "files",
    staleTime: 30_000,
    gcTime: 5 * 60_000,
  });

  const foldersQuery = useQuery({
    queryKey: ["folders", orgId, currentFolderId],
    queryFn: () => api.listFolders({ orgId, parentId: currentFolderId }),
    enabled: !!orgId && currentNav === "files",
    staleTime: 30_000,
    gcTime: 5 * 60_000,
  });

  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["files", { orgId }] });
    queryClient.invalidateQueries({ queryKey: ["folders", orgId] });
  }, [queryClient, orgId]);

  useEffect(() => {
    if (filesQuery.data) useFileSystemStore.getState().setFiles(filesQuery.data);
  }, [filesQuery.data]);

  useEffect(() => {
    if (foldersQuery.data) useFileSystemStore.getState().setFolders(foldersQuery.data);
  }, [foldersQuery.data]);

  return {
    files: filesQuery.data ?? [],
    folders: foldersQuery.data ?? [],
    loading: filesQuery.isLoading || foldersQuery.isLoading,
    error: filesQuery.error || foldersQuery.error,
    refetch: () => { filesQuery.refetch(); foldersQuery.refetch(); },
    invalidate,
  };
}

export function useFileMutations() {
  const { orgId } = useFileSystemStore();
  const queryClient = useQueryClient();

  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["files", { orgId }] });
    queryClient.invalidateQueries({ queryKey: ["folders", orgId] });
    queryClient.invalidateQueries({ queryKey: ["stats", orgId] });
  }, [queryClient, orgId]);

  const uploadMutation = useMutation({
    mutationFn: (formData: FormData) => api.uploadFile(formData),
    onSuccess: invalidate,
  });

  const createFolderMutation = useMutation({
    mutationFn: (data: { name: string; parentId?: string | null }) =>
      api.createFolder({ orgId, ...data }),
    onSuccess: invalidate,
  });

  const renameFileMutation = useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) =>
      api.updateFile(id, { originalName: name, name }),
    onSuccess: invalidate,
  });

  const renameFolderMutation = useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) =>
      api.renameFolder(id, name),
    onSuccess: invalidate,
  });

  const deleteFileMutation = useMutation({
    mutationFn: (id: string) => api.deleteFile(id),
    onSuccess: invalidate,
  });

  const restoreFileMutation = useMutation({
    mutationFn: (id: string) => api.restoreFile(id),
    onSuccess: invalidate,
  });

  const permanentDeleteMutation = useMutation({
    mutationFn: (id: string) => api.permanentDeleteFile(id),
    onSuccess: invalidate,
  });

  const duplicateFileMutation = useMutation({
    mutationFn: (id: string) => api.duplicateFile(id),
    onSuccess: invalidate,
  });

  const moveFileMutation = useMutation({
    mutationFn: ({ ids, targetFolderId }: { ids: string[]; targetFolderId: string }) =>
      api.bulkMove(ids, targetFolderId),
    onSuccess: invalidate,
  });

  const copyFolderMutation = useMutation({
    mutationFn: ({ id, parentId }: { id: string; parentId: string | null }) =>
      api.copyFolder(id, parentId),
    onSuccess: invalidate,
  });

  const moveFolderMutation = useMutation({
    mutationFn: ({ id, parentId }: { id: string; parentId: string | null }) =>
      api.moveFolder(id, parentId),
    onSuccess: invalidate,
  });

  const deleteFolderMutation = useMutation({
    mutationFn: (id: string) => api.deleteFolder(id),
    onSuccess: invalidate,
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: (ids: string[]) => api.bulkDelete(ids),
    onSuccess: invalidate,
  });

  const bulkRestoreMutation = useMutation({
    mutationFn: (ids: string[]) => api.bulkRestore(ids),
    onSuccess: invalidate,
  });

  const bulkPermanentDeleteMutation = useMutation({
    mutationFn: (ids: string[]) => api.bulkPermanentDelete(ids),
    onSuccess: invalidate,
  });

  return {
    uploadMutation,
    createFolderMutation,
    renameFileMutation,
    renameFolderMutation,
    deleteFileMutation,
    restoreFileMutation,
    permanentDeleteMutation,
    duplicateFileMutation,
    moveFileMutation,
    copyFolderMutation,
    moveFolderMutation,
    deleteFolderMutation,
    bulkDeleteMutation,
    bulkRestoreMutation,
    bulkPermanentDeleteMutation,
    invalidate,
  };
}

export function useStorage() {
  const { orgId } = useFileSystemStore();
  return useQuery({
    queryKey: ["stats", orgId],
    queryFn: () => api.getStorageStats(orgId),
    enabled: !!orgId,
    staleTime: 60_000,
    gcTime: 5 * 60_000,
  });
}

export function useRecentFiles() {
  const { orgId } = useFileSystemStore();
  return useQuery({
    queryKey: ["recent", orgId],
    queryFn: () => api.listRecent(orgId),
    enabled: !!orgId,
    staleTime: 30_000,
  });
}

export function useRecycleBin() {
  const { orgId, search } = useFileSystemStore();
  return useQuery({
    queryKey: ["recycle", orgId, search],
    queryFn: () => api.listRecycleBin(orgId, search || undefined),
    enabled: !!orgId,
    staleTime: 15_000,
  });
}

export function useAuditLogs() {
  const { orgId } = useFileSystemStore();
  return useQuery({
    queryKey: ["audit", orgId],
    queryFn: () => api.listAuditLogs({ orgId }),
    enabled: !!orgId,
    staleTime: 30_000,
  });
}

export function useSharedFiles() {
  const { orgId } = useFileSystemStore();
  return useQuery({
    queryKey: ["shares", orgId],
    queryFn: () => api.listShares(orgId),
    enabled: !!orgId,
    staleTime: 30_000,
  });
}

export function useFolderTree() {
  const { orgId } = useFileSystemStore();
  return useQuery({
    queryKey: ["folderTree", orgId],
    queryFn: () => api.getFolderTree(orgId),
    enabled: !!orgId,
    staleTime: 60_000,
  });
}
