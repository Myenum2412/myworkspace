"use client";

import { useQuery } from "@tanstack/react-query";
import { aiService, AIAction } from "@/lib/services/ai/ai-service";

export function useAIActions() {
  const query = useQuery({
    queryKey: ["ai-actions"],
    queryFn: () => aiService.getActions(),
    staleTime: 300_000,
  });

  return {
    actions: (query.data || []) as AIAction[],
    isLoading: query.isLoading,
  };
}
