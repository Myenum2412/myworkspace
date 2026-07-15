import { describe, it, expect, vi, beforeEach } from "vitest";

const mockFetch = vi.fn();
global.fetch = mockFetch;

vi.mock("@/lib/api", () => ({
  apiFetch: vi.fn((url: string, init?: RequestInit) => mockFetch(url, init)),
  apiUrl: (path: string) => `http://localhost:4000${path}`,
  qs: (params: Record<string, any>) => {
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (v !== null && v !== undefined && v !== "") sp.set(k, String(v));
    }
    return sp.toString() ? `?${sp.toString()}` : "";
  },
}));

const { aiService } = await import("@/lib/services/ai/ai-service");

describe("aiService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getActions", () => {
    it("fetches and returns AI actions", async () => {
      const mockActions = [
        { id: "summarize", label: "Summarize", icon: "FileText", context: ["workspace", "staff"] },
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true, data: mockActions }),
      });

      const actions = await aiService.getActions();
      expect(actions).toEqual(mockActions);
    });

    it("throws on API error", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: false, error: "Failed to fetch" }),
      });

      await expect(aiService.getActions()).rejects.toThrow("Failed to fetch");
    });
  });

  describe("getConversations", () => {
    it("fetches conversations with query params", async () => {
      const mockData = { data: [{ _id: "1", title: "Test" }], pagination: { total: 1, page: 1, totalPages: 1 } };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true, ...mockData }),
      });

      const result = await aiService.getConversations({ context: "workspace", page: 1 });
      expect(result.data).toHaveLength(1);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("context=workspace"),
        expect.any(Object)
      );
    });
  });

  describe("getMessages", () => {
    it("fetches messages for a conversation", async () => {
      const mockData = { data: [{ _id: "m1", role: "user", content: "Hello" }], pagination: { total: 1 } };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true, ...mockData }),
      });

      const result = await aiService.getMessages("conv-1");
      expect(result.data).toHaveLength(1);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("conv-1/messages"),
        expect.any(Object)
      );
    });
  });

  describe("updateTitle", () => {
    it("sends PATCH request to update title", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });

      await aiService.updateTitle("conv-1", "New Title");
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("conv-1/title"),
        expect.objectContaining({ method: "PATCH" })
      );
    });
  });

  describe("setFeedback", () => {
    it("sends POST request for feedback", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });

      await aiService.setFeedback("msg-1", "like");
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("msg-1/feedback"),
        expect.objectContaining({
          method: "POST",
          body: expect.stringContaining("like"),
        })
      );
    });
  });

  describe("getSettings", () => {
    it("fetches AI settings", async () => {
      const mockSettings = { provider: "openrouter", model: "tencent/hy3:free", temperature: 0.7 };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true, data: mockSettings }),
      });

      const settings = await aiService.getSettings();
      expect(settings.provider).toBe("openrouter");
    });
  });
});
