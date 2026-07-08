"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getSocketIO } from "@/lib/socketio-client";
import { useEffect } from "react";

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
      if (!res.ok) throw new Error("Failed to fetch files");
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
      if (!res.ok) throw new Error("Failed to fetch folders");
      const json = await res.json();
      return json.data || [];
    },
    staleTime: 30_000,
    gcTime: 5 * 60_000,
  });

  useEffect(() => {
    const refresh = () => {
      queryClient.invalidateQueries({ queryKey });
      queryClient.invalidateQueries({ queryKey: ["folders"] });
    };
    let sock: ReturnType<typeof getSocketIO> | null = null;
    try {
      sock = getSocketIO();
      sock.on("folder:created", refresh);
      sock.on("folder:updated", refresh);
      sock.on("folder:deleted", refresh);
      sock.on("file:uploaded", refresh);
      sock.on("file:updated", refresh);
      sock.on("file:deleted", refresh);
      sock.on("client:created", refresh);
    } catch {}
    return () => {
      if (sock) {
        sock.off("folder:created", refresh);
        sock.off("folder:updated", refresh);
        sock.off("folder:deleted", refresh);
        sock.off("file:uploaded", refresh);
        sock.off("file:updated", refresh);
        sock.off("file:deleted", refresh);
        sock.off("client:created", refresh);
      }
    };
  }, [queryClient, queryKey]);

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
