"use client";

import { useState, useCallback, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { aiService, AIStreamChunk, Message } from "@/lib/services/ai/ai-service";

interface UseAIChatOptions {
  context: "workspace" | "staff";
  workspaceContext?: Record<string, unknown>;
}

export function useAIChat(options: UseAIChatOptions) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const queryClient = useQueryClient();

  const sendMessage = useCallback(async (prompt: string, files?: Array<{ name: string; type: string; size: number; url?: string }>) => {
    setError(null);
    setIsStreaming(true);

    const userMessage: Message = {
      _id: `temp-${Date.now()}`,
      conversationId: conversationId || "",
      role: "user",
      content: prompt,
      files,
      createdAt: new Date().toISOString(),
    };

    setMessages(prev => [...prev, userMessage]);

    const assistantMessage: Message = {
      _id: `temp-assistant-${Date.now()}`,
      conversationId: conversationId || "",
      role: "assistant",
      content: "",
      createdAt: new Date().toISOString(),
    };

    setMessages(prev => [...prev, assistantMessage]);

    try {
      abortControllerRef.current = new AbortController();
      const reader = (await aiService.chat({
        conversationId: conversationId || undefined,
        prompt,
        context: options.context,
        workspaceContext: options.workspaceContext,
        files,
        streaming: true,
      })) as ReadableStreamDefaultReader<Uint8Array>;

      const decoder = new TextDecoder();
      let fullContent = "";
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const chunk: AIStreamChunk = JSON.parse(line.slice(6));
              if (chunk.done) {
                if (chunk.conversationId) {
                  setConversationId(chunk.conversationId);
                }
                setIsStreaming(false);
                queryClient.invalidateQueries({ queryKey: ["ai-conversations"] });
              } else {
                fullContent += chunk.content;
                setMessages(prev => {
                  const updated = [...prev];
                  const lastMsg = updated[updated.length - 1];
                  if (lastMsg && lastMsg.role === "assistant") {
                    lastMsg.content = fullContent;
                  }
                  return updated;
                });
              }
            } catch {
              // skip malformed chunks
            }
          }
        }
      }
    } catch (err: any) {
      if (err.name !== "AbortError") {
        setError(err.message || "Failed to send message");
        setMessages(prev => prev.slice(0, -1));
      }
      setIsStreaming(false);
    }
  }, [conversationId, options.context, options.workspaceContext, queryClient]);

  const stopGeneration = useCallback(() => {
    abortControllerRef.current?.abort();
    setIsStreaming(false);
  }, []);

  const regenerate = useCallback(async () => {
    if (!conversationId) return;
    setError(null);
    setIsStreaming(true);

    setMessages(prev => prev.slice(0, -2));

    try {
      const reader = (await aiService.regenerate(conversationId)) as ReadableStreamDefaultReader<Uint8Array>;

      const decoder = new TextDecoder();
      let fullContent = "";
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const chunk: AIStreamChunk = JSON.parse(line.slice(6));
              if (!chunk.done) {
                fullContent += chunk.content;
                setMessages(prev => {
                  const updated = [...prev];
                  const lastMsg = updated[updated.length - 1];
                  if (lastMsg?.role === "assistant") {
                    lastMsg.content = fullContent;
                  }
                  return updated;
                });
              }
            } catch {}
          }
        }
      }
    } catch (err: any) {
      setError(err.message || "Regeneration failed");
    }
    setIsStreaming(false);
  }, [conversationId]);

  const continueResponse = useCallback(async () => {
    if (!conversationId) return;
    setError(null);
    setIsStreaming(true);

    try {
      const reader = (await aiService.continueResponse(conversationId)) as ReadableStreamDefaultReader<Uint8Array>;

      const decoder = new TextDecoder();
      let fullContent = "";
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const chunk: AIStreamChunk = JSON.parse(line.slice(6));
              if (!chunk.done) {
                fullContent += chunk.content;
                setMessages(prev => {
                  const updated = [...prev];
                  const lastMsg = updated[updated.length - 1];
                  if (lastMsg?.role === "assistant") {
                    lastMsg.content += chunk.content;
                  }
                  return updated;
                });
              }
            } catch {}
          }
        }
      }
    } catch (err: any) {
      setError(err.message || "Continue failed");
    }
    setIsStreaming(false);
  }, [conversationId]);

  const setFeedback = useCallback(async (messageId: string, feedback: "like" | "dislike") => {
    try {
      await aiService.setFeedback(messageId, feedback);
      setMessages(prev => prev.map(m =>
        m._id === messageId ? { ...m, feedback } : m
      ));
    } catch {}
  }, []);

  const loadConversation = useCallback(async (convId: string) => {
    setConversationId(convId);
    setMessages([]);
    setError(null);

    try {
      const { data } = await aiService.getMessages(convId);
      setMessages(data);
    } catch (err: any) {
      setError(err.message || "Failed to load conversation");
    }
  }, []);

  const newConversation = useCallback(() => {
    setConversationId(null);
    setMessages([]);
    setError(null);
  }, []);

  return {
    messages,
    isStreaming,
    conversationId,
    error,
    sendMessage,
    stopGeneration,
    regenerate,
    continueResponse,
    setFeedback,
    loadConversation,
    newConversation,
  };
}
