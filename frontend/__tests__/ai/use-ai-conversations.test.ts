import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";

const mockGetConversations = vi.fn();
const mockUpdateTitle = vi.fn();
const mockTogglePin = vi.fn();
const mockDeleteConversation = vi.fn();

vi.mock("@/lib/services/ai/ai-service", () => ({
  aiService: {
    getConversations: (...args: any[]) => mockGetConversations(...args),
    updateTitle: (...args: any[]) => mockUpdateTitle(...args),
    togglePin: (...args: any[]) => mockTogglePin(...args),
    deleteConversation: (...args: any[]) => mockDeleteConversation(...args),
  },
}));

const { useAIConversations } = await import("@/hooks/ai/use-ai-conversations");

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client: queryClient }, children);
  };
}

describe("useAIConversations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetConversations.mockResolvedValue({
      data: [
        { _id: "1", title: "Conv 1", isPinned: false },
        { _id: "2", title: "Conv 2", isPinned: true },
      ],
      pagination: { total: 2, page: 1, totalPages: 1 },
    });
  });

  it("fetches conversations on mount", async () => {
    const { result } = renderHook(() => useAIConversations({ context: "workspace" }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.conversations).toHaveLength(2);
    expect(mockGetConversations).toHaveBeenCalled();
  });
});
