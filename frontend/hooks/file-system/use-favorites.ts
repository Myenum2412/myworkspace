"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useFileSystemStore } from "@/lib/file-system/store";

type FavoriteItem = {
  id: string;
  name: string;
  type: "file" | "folder";
  mimeType?: string;
  size?: number;
  createdAt?: string;
};

export function useFavorites() {
  const { orgId } = useFileSystemStore();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["favorites", orgId],
    queryFn: async () => {
      const res = await fetch(`/api/file-favorites/favorites?orgId=${orgId}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch favorites");
      const json = await res.json();
      return (json.data || []) as FavoriteItem[];
    },
    enabled: !!orgId,
    staleTime: 30_000,
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, type }: { id: string; type: string }) => {
      const res = await fetch(`/api/file-favorites/${id}/favorite`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to toggle favorite");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["favorites", orgId] });
      queryClient.invalidateQueries({ queryKey: ["files", { orgId }] });
    },
  });

  return {
    favorites: query.data ?? [],
    isLoading: query.isLoading,
    toggleFavorite: (id: string, type: string) => toggleMutation.mutate({ id, type }),
    refetch: query.refetch,
  };
}
