"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { aiService, AISettings } from "@/lib/services/ai/ai-service";

export function useAISettings() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["ai-settings"],
    queryFn: () => aiService.getSettings(),
    staleTime: 30_000,
  });

  const updateMutation = useMutation({
    mutationFn: (settings: Partial<AISettings>) => aiService.updateSettings(settings),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ai-settings"] });
    },
  });

  return {
    settings: query.data,
    isLoading: query.isLoading,
    error: query.error,
    updateSettings: updateMutation.mutateAsync,
    isUpdating: updateMutation.isPending,
  };
}
