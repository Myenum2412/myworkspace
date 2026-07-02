"use client";

import { useParams } from "next/navigation";
import { Copy, RotateCcw, Trash2, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import AI_Input_Search from "@/components/kokonutui/ai-input-search";
import { AIBranch, AIBranchMessages, AIBranchData } from "@/components/smoothui/ai-branch";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  isStreaming?: boolean;
}

export default function AiChatConversationPage() {
  const params = useParams();
  const conversationId = params.id as string;

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [branches, setBranches] = useState<AIBranchData[]>([]);
  const abortRef = useRef<AbortController | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => { scrollToBottom(); }, [messages, scrollToBottom]);

  useEffect(() => {
    if (!conversationId || isLoaded) return;
    (async () => {
      try {
        const res = await fetch(`/api/ai/conversations/${conversationId}`);
        if (res.ok) {
          const json = await res.json();
          const conv = json.data;
          const loadedMessages: Message[] = (conv.messages || []).map((m: any) => ({
            id: m.id,
            role: m.role,
            content: m.content,
          }));
          setMessages(loadedMessages);
          setIsLoaded(true);
        }
      } catch { /* ignore */ }
    })();
  }, [conversationId, isLoaded]);

  const handleSubmit = useCallback(async (messageText?: string) => {
    const text = messageText || input;
    if (!text.trim() || isLoading) return;

    const userMessage: Message = { id: crypto.randomUUID(), role: "user", content: text.trim() };
    const assistantMessage: Message = { id: crypto.randomUUID(), role: "assistant", content: "", isStreaming: true };

    const updatedMessages = [...messages, userMessage, assistantMessage];
    setMessages(updatedMessages);
    setInput("");
    setIsLoading(true);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: updatedMessages.filter((m) => !m.isStreaming).map((m) => ({ role: m.role, content: m.content })),
          conversationId,
        }),
        signal: controller.signal,
      });

      if (!res.ok) throw new Error("Failed to fetch");
      const reader = res.body?.getReader();
      if (!reader) throw new Error("No reader");

      const decoder = new TextDecoder();
      let fullContent = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n").filter((l) => l.startsWith("data: "));
        for (const line of lines) {
          const data = line.slice(6);
          if (data === "[DONE]") continue;
          try {
            const parsed = JSON.parse(data);
            const content = parsed.content || "";
            fullContent += content;
            setMessages((prev) =>
              prev.map((m) => m.id === assistantMessage.id ? { ...m, content: fullContent } : m)
            );
          } catch { /* skip */ }
        }
      }

      setMessages((prev) =>
        prev.map((m) => m.id === assistantMessage.id ? { ...m, isStreaming: false } : m)
      );
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        setMessages((prev) =>
          prev.map((m) => m.id === assistantMessage.id ? { ...m, content: "Error: Failed to get response", isStreaming: false } : m)
        );
      }
    } finally {
      setIsLoading(false);
      abortRef.current = null;
    }
  }, [input, isLoading, messages, conversationId]);

  const handleStop = () => abortRef.current?.abort();
  const handleClear = () => { setMessages([]); setIsLoaded(false); };
  const handleRegenerate = () => {
    const lastUserMsg = [...messages].reverse().find((m) => m.role === "user");
    if (lastUserMsg) {
      setMessages((prev) => prev.slice(0, -1));
      setTimeout(() => handleSubmit(lastUserMsg.content), 0);
    }
  };
  const handleCopy = (content: string) => navigator.clipboard.writeText(content);

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto px-4 py-6 max-w-4xl mx-auto w-full space-y-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-[60vh] text-muted-foreground gap-3">
            <Bot className="size-12 opacity-40" />
            <h2 className="text-lg font-semibold">Loading...</h2>
          </div>
        )}
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[75%] rounded-xl px-4 py-3 ${msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
              {msg.isStreaming && !msg.content ? (
                <span className="inline-flex gap-1">
                  <span className="animate-bounce size-2 bg-current rounded-full" />
                  <span className="animate-bounce size-2 bg-current rounded-full [animation-delay:0.1s]" />
                  <span className="animate-bounce size-2 bg-current rounded-full [animation-delay:0.2s]" />
                </span>
              ) : msg.role === "assistant" ? (
                <div className="ai-chat-markdown text-sm leading-relaxed">
                  <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]}>
                    {msg.content}
                  </ReactMarkdown>
                </div>
              ) : (
                <p className="text-sm">{msg.content}</p>
              )}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div className="border-t bg-background px-4 py-3">
        <div className="max-w-3xl mx-auto">
          <AI_Input_Search
            placeholder="Ask AI..."
            onSubmit={(value) => handleSubmit(value)}
          />
          <div className="flex items-center justify-between mt-2">
            <div className="flex items-center gap-1">
              {messages.length > 0 && !isLoading && (
                <>
                  <button onClick={handleRegenerate} className="flex items-center gap-1 px-2 py-1 rounded text-xs text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">
                    <RotateCcw className="size-3" />
                    Retry
                  </button>
                  <button onClick={handleClear} className="flex items-center gap-1 px-2 py-1 rounded text-xs text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">
                    <Trash2 className="size-3" />
                    Clear
                  </button>
                </>
              )}
            </div>
            {isLoading && (
              <button onClick={handleStop} className="flex items-center gap-1 px-2 py-1 rounded text-xs text-destructive hover:bg-destructive/10 transition-colors">
                <X className="size-3" />
                Stop
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Bot(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="10" rx="2" />
      <circle cx="12" cy="5" r="2" />
      <path d="M12 7v4" />
      <line x1="8" y1="16" x2="8" y2="16" />
      <line x1="16" y1="16" x2="16" y2="16" />
    </svg>
  );
}
