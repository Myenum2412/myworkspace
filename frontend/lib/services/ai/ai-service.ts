import { apiFetch, apiUrl, qs } from "@/lib/api";

export interface AIChatParams {
  conversationId?: string;
  prompt: string;
  context: "workspace" | "staff";
  workspaceContext?: Record<string, unknown>;
  files?: Array<{ name: string; type: string; size: number; url?: string }>;
  streaming?: boolean;
}

export interface AIStreamChunk {
  content: string;
  done: boolean;
  responseId?: string;
  tokens?: { prompt: number; completion: number; total: number };
  conversationId?: string;
}

export interface Conversation {
  _id: string;
  orgId: string;
  userId: string;
  title: string;
  context: "workspace" | "staff";
  isPinned: boolean;
  messageCount: number;
  lastActivityAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface Message {
  _id: string;
  conversationId: string;
  role: "user" | "assistant" | "system";
  content: string;
  model?: string;
  tokens?: { prompt: number; completion: number; total: number };
  executionTime?: number;
  files?: Array<{ name: string; type: string; size: number; url?: string }>;
  feedback?: "like" | "dislike" | null;
  createdAt: string;
}

export interface AISettings {
  _id?: string;
  orgId?: string;
  provider: "openrouter" | "openai" | "claude" | "azure";
  model: string;
  temperature: number;
  maxTokens: number;
  responseLength: "short" | "medium" | "long";
  streamingEnabled: boolean;
  systemPrompt: string;
  allowedFileTypes: string[];
  maxUploadSize: number;
  conversationRetentionDays: number;
  rateLimitRequests: number;
  rateLimitWindowMs: number;
}

export interface AIAction {
  id: string;
  label: string;
  icon: string;
  prompt: string;
  context: ("workspace" | "staff")[];
}

export interface UsageStats {
  summary: {
    totalRequests: number;
    totalPromptTokens: number;
    totalCompletionTokens: number;
    totalTokens: number;
    totalCost: number;
    totalExecutionTime: number;
    uniqueUsers: number;
    avgResponseTime: number;
  };
  dailyStats: Array<{ _id: string; requests: number; tokens: number; cost: number }>;
  topUsers: Array<{ _id: string; requests: number; tokens: number }>;
  topActions: Array<{ _id: string; count: number }>;
}

async function handleResponse<T>(res: Response): Promise<T> {
  const json = await res.json();
  if (!json.success) throw new Error(json.error || "Request failed");
  return json.data as T;
}

export const aiService = {
  async chat(params: AIChatParams): Promise<ReadableStreamDefaultReader<Uint8Array> | { data: any; conversationId: string }> {
    if (params.streaming !== false) {
      const res = await apiFetch(apiUrl("/api/ai/chat"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(params),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Chat request failed");
      }

      return res.body!.getReader();
    }

    const res = await apiFetch(apiUrl("/api/ai/chat"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...params, streaming: false }),
    });

    const json = await res.json();
    if (!json.success) throw new Error(json.error || "Chat request failed");
    return json;
  },

  async regenerate(conversationId: string): Promise<ReadableStreamDefaultReader<Uint8Array>> {
    const res = await apiFetch(apiUrl(`/api/ai/chat/${conversationId}/regenerate`), {
      method: "POST",
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Regeneration failed");
    }

    return res.body!.getReader();
  },

  async continueResponse(conversationId: string): Promise<ReadableStreamDefaultReader<Uint8Array>> {
    const res = await apiFetch(apiUrl(`/api/ai/chat/${conversationId}/continue`), {
      method: "POST",
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Continue failed");
    }

    return res.body!.getReader();
  },

  async quickAction(action: string, params: { prompt?: string; context: "workspace" | "staff"; workspaceContext?: Record<string, unknown> }): Promise<any> {
    const res = await apiFetch(apiUrl(`/api/ai/actions/${action}`), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
    });
    return handleResponse(res);
  },

  async getActions(): Promise<AIAction[]> {
    const res = await apiFetch(apiUrl("/api/ai/actions"));
    return handleResponse(res);
  },

  async getConversations(params?: { userId?: string; context?: string; search?: string; page?: number; limit?: number }): Promise<{ data: Conversation[]; pagination: any }> {
    const res = await apiFetch(apiUrl(`/api/ai/conversations${params ? qs(params as any) : ""}`));
    const json = await res.json();
    if (!json.success) throw new Error(json.error || "Failed to fetch conversations");
    return json;
  },

  async getConversation(id: string): Promise<Conversation> {
    const res = await apiFetch(apiUrl(`/api/ai/conversations/${id}`));
    return handleResponse(res);
  },

  async getMessages(conversationId: string, page?: number, limit?: number): Promise<{ data: Message[]; pagination: any }> {
    const res = await apiFetch(apiUrl(`/api/ai/conversations/${conversationId}/messages${qs({ page, limit } as any)}`));
    const json = await res.json();
    if (!json.success) throw new Error(json.error || "Failed to fetch messages");
    return json;
  },

  async updateTitle(conversationId: string, title: string): Promise<void> {
    const res = await apiFetch(apiUrl(`/api/ai/conversations/${conversationId}/title`), {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title }),
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.error || "Failed to update title");
  },

  async togglePin(conversationId: string): Promise<void> {
    const res = await apiFetch(apiUrl(`/api/ai/conversations/${conversationId}/pin`), {
      method: "POST",
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.error || "Failed to toggle pin");
  },

  async deleteConversation(conversationId: string): Promise<void> {
    const res = await apiFetch(apiUrl(`/api/ai/conversations/${conversationId}`), {
      method: "DELETE",
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.error || "Failed to delete conversation");
  },

  async setFeedback(messageId: string, feedback: "like" | "dislike" | null): Promise<void> {
    const res = await apiFetch(apiUrl(`/api/ai/messages/${messageId}/feedback`), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ feedback }),
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.error || "Failed to set feedback");
  },

  async getSettings(): Promise<AISettings> {
    const res = await apiFetch(apiUrl("/api/ai/settings"));
    return handleResponse(res);
  },

  async updateSettings(settings: Partial<AISettings>): Promise<AISettings> {
    const res = await apiFetch(apiUrl("/api/ai/settings"), {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(settings),
    });
    return handleResponse(res);
  },

  async getAuditLogs(params?: { userId?: string; action?: string; status?: string; startDate?: string; endDate?: string; page?: number; limit?: number }): Promise<{ data: any[]; pagination: any }> {
    const res = await apiFetch(apiUrl(`/api/ai/audit-logs${params ? qs(params as any) : ""}`));
    const json = await res.json();
    if (!json.success) throw new Error(json.error || "Failed to fetch audit logs");
    return json;
  },

  async getUsageStats(params?: { userId?: string; startDate?: string; endDate?: string }): Promise<UsageStats> {
    const res = await apiFetch(apiUrl(`/api/ai/usage${params ? qs(params as any) : ""}`));
    return handleResponse(res);
  },
};
