"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { aiService, Conversation } from "@/lib/services/ai/ai-service";

interface UseAIConversationsOptions {
  context?: "workspace" | "staff";
  search?: string;
  page?: number;
  limit?: number;
}

export function useAIConversations(options: UseAIConversationsOptions = {}) {
  const queryClient = useQueryClient();
  const { context, search, page = 1, limit = 50 } = options;

  const query = useQuery({
    queryKey: ["ai-conversations", context, search, page, limit],
    queryFn: () => aiService.getConversations({ context, search, page, limit }),
    staleTime: 10_000,
  });

  const updateTitleMutation = useMutation({
    mutationFn: ({ id, title }: { id: string; title: string }) =>
      aiService.updateTitle(id, title),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ai-conversations"] });
    },
  });

  const togglePinMutation = useMutation({
    mutationFn: (id: string) => aiService.togglePin(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ai-conversations"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => aiService.deleteConversation(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ai-conversations"] });
    },
  });

  return {
    conversations: (query.data?.data || []) as Conversation[],
    pagination: query.data?.pagination || { total: 0, page: 1, totalPages: 0 },
    isLoading: query.isLoading,
    error: query.error,
    updateTitle: updateTitleMutation.mutateAsync,
    togglePin: togglePinMutation.mutateAsync,
    deleteConversation: deleteMutation.mutateAsync,
    refetch: query.refetch,
  };
}
