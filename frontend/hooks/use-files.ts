"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

interface FileQueryParams {
  orgId: string;
  folderId?: string | null;
  clientId?: string | null;
  search?: string;
  sort?: string;
}

export function useFiles(params: FileQueryParams) {
  const queryClient = useQueryClient();
  const queryKey = ["files", params.orgId, params.folderId || "", params.clientId || "", params.search || "", params.sort || "-createdAt"];

  const filesQuery = useQuery({
    queryKey,
    queryFn: async () => {
      const sp = new URLSearchParams({ orgId: params.orgId });
      if (params.folderId) sp.set("folderId", params.folderId);
      if (params.search) sp.set("search", params.search);
      if (params.sort) sp.set("sort", params.sort);
      if (params.clientId) sp.set("clientId", params.clientId);
      const res = await fetch(`/api/files?${sp}`, { credentials: "include" });
      if (!res.ok) throw new Error("Could not load files");
      const json = await res.json();
      return json.data || [];
    },
    staleTime: 30_000,
    gcTime: 5 * 60_000,
  });

  const foldersQuery = useQuery({
    queryKey: ["folders", params.orgId, params.folderId || "", params.clientId || ""],
    queryFn: async () => {
      const sp = new URLSearchParams({ orgId: params.orgId });
      if (params.folderId) sp.set("parentId", params.folderId);
      else sp.set("parentId", "");
      if (params.clientId) sp.set("clientId", params.clientId);
      const res = await fetch(`/api/folders?${sp}`, { credentials: "include" });
      if (!res.ok) throw new Error("Could not load folders");
      const json = await res.json();
      return json.data || [];
    },
    staleTime: 30_000,
    gcTime: 5 * 60_000,
  });

  return {
    files: filesQuery.data ?? [],
    folders: foldersQuery.data ?? [],
    loading: filesQuery.isLoading || foldersQuery.isLoading,
    error: filesQuery.error || foldersQuery.error,
    refetch: () => {
      filesQuery.refetch();
      foldersQuery.refetch();
    },
  };
}

export function useFileMutations(orgId: string) {
  const queryClient = useQueryClient();

  const invalidateFiles = () => {
    queryClient.invalidateQueries({ queryKey: ["files", orgId] });
    queryClient.invalidateQueries({ queryKey: ["folders"] });
  };

  const createFolder = useMutation({
    mutationFn: async ({ name, parentId }: { name: string; parentId: string | null }) => {
      const res = await fetch("/api/folders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ orgId, parentId, name }),
      });
      if (!res.ok) throw new Error("Failed to create folder");
      return res.json();
    },
    onSuccess: invalidateFiles,
  });

  const renameItem = useMutation({
    mutationFn: async ({ id, name, type }: { id: string; name: string; type: "file" | "folder" }) => {
      const endpoint = type === "file" ? `/api/files/${id}` : `/api/folders/${id}`;
      const res = await fetch(endpoint, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name }),
      });
      if (!res.ok) throw new Error("Failed to rename");
      return res.json();
    },
    onSuccess: invalidateFiles,
  });

  const deleteItem = useMutation({
    mutationFn: async ({ id, type }: { id: string; type: "file" | "folder" }) => {
      const endpoint = type === "file" ? `/api/files/${id}` : `/api/folders/${id}`;
      const res = await fetch(endpoint, { method: "DELETE", credentials: "include" });
      if (!res.ok) throw new Error("Delete failed");
      return res.json();
    },
    onSuccess: invalidateFiles,
  });

  return { createFolder, renameItem, deleteItem, invalidateFiles };
}
