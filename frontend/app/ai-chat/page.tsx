"use client";

import { Copy, RotateCcw, Trash2, X, User, GitBranch, Sparkles, Zap, Lightbulb, Clock, FileText, ChevronRight } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import AI_Input_Search from "@/components/kokonutui/ai-input-search";
import { AIBranch, AIBranchMessages, AIBranchData } from "@/components/smoothui/ai-branch";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  isStreaming?: boolean;
}

export default function AiChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [branches, setBranches] = useState<AIBranchData[]>([]);
  const abortRef = useRef<AbortController | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => { scrollToBottom(); }, [messages, scrollToBottom]);

  const updateConversationTitle = async (id: string, content: string) => {
    const title = content.length > 50 ? content.slice(0, 50) + "..." : content;
    try {
      await fetch(`/api/ai/conversations/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title }),
      });
    } catch { /* ignore */ }
  };

  const handleSubmit = useCallback(async (messageText?: string) => {
    const text = messageText || input;
    if (!text.trim() || isLoading) return;

    const userMessage: Message = { id: crypto.randomUUID(), role: "user", content: text.trim() };
    const assistantMessage: Message = { id: crypto.randomUUID(), role: "assistant", content: "", isStreaming: true };

    const updatedMessages = [...messages, userMessage, assistantMessage];
    setMessages(updatedMessages);
    setInput("");
    setIsLoading(true);

    let convId = conversationId;
    if (!convId) {
      try {
        const res = await fetch("/api/ai/conversations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: text.trim().slice(0, 50) }),
        });
        if (res.ok) {
          const json = await res.json();
          convId = json.data.id;
          setConversationId(convId);
        }
      } catch { /* ignore */ }
    }

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: updatedMessages.filter((m) => !m.isStreaming).map((m) => ({ role: m.role, content: m.content })),
          conversationId: convId,
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

      if (convId && messages.length <= 2) {
        updateConversationTitle(convId, text.trim());
      }
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
  const handleClear = () => { setMessages([]); setConversationId(null); setBranches([]); };

  const handleRegenerate = () => {
    const lastUserMsg = [...messages].reverse().find((m) => m.role === "user");
    if (lastUserMsg) {
      setMessages((prev) => prev.slice(0, -1));
      setTimeout(() => handleSubmit(lastUserMsg.content), 0);
    }
  };

  const handleCopy = (content: string) => navigator.clipboard.writeText(content);

  return (
    <div className="flex h-full bg-background relative overflow-hidden">
      {/* Sidebar - Always visible for preview */}
      <div className="flex w-[240px] md:w-[280px] shrink-0 flex-col border-r border-border bg-muted/10">
        <div className="p-4 border-b border-border">
          <h3 className="font-semibold text-sm flex items-center gap-2 text-foreground">
            <Sparkles className="size-4 text-primary" />
            AI Dashboard
          </h3>
        </div>
        
        <div className="flex-1 overflow-y-auto py-4">
          <div className="px-3 space-y-8">
            {/* Quick Actions */}
            <div className="space-y-3">
              <h4 className="px-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Quick Actions</h4>
              <div className="space-y-0.5">
                <Button variant="ghost" className="w-full justify-start h-9 px-2 text-sm font-normal">
                  <Zap className="size-4 mr-2 text-amber-500" />
                  Summarize Document
                </Button>
                <Button variant="ghost" className="w-full justify-start h-9 px-2 text-sm font-normal">
                  <FileText className="size-4 mr-2 text-blue-500" />
                  Draft an Email
                </Button>
                <Button variant="ghost" className="w-full justify-start h-9 px-2 text-sm font-normal">
                  <Lightbulb className="size-4 mr-2 text-green-500" />
                  Brainstorm Ideas
                </Button>
              </div>
            </div>

            {/* Workspace Insight */}
            <div className="space-y-3">
              <h4 className="px-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Workspace Insight</h4>
              <div className="mx-2 px-3 py-3 bg-background rounded-xl border shadow-sm group hover:border-primary/50 transition-colors cursor-pointer">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-primary/10 rounded-md">
                      <Lightbulb className="size-3.5 text-primary" />
                    </div>
                    <span className="text-sm font-medium">Weekly Summary</span>
                  </div>
                  <ChevronRight className="size-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Your team completed 12 tasks this week. The "Marketing Campaign" project is 80% complete.
                </p>
              </div>
            </div>

            {/* Recent Files */}
            <div className="space-y-3">
              <h4 className="px-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Recent Files</h4>
              <div className="space-y-0.5">
                {[
                  { name: "Project_Proposal_v2.pdf", time: "2 hours ago" },
                  { name: "Q3_Financial_Report.xlsx", time: "Yesterday" },
                  { name: "Meeting_Notes_Design.docx", time: "Oct 24" }
                ].map((file, i) => (
                  <Button key={i} variant="ghost" className="w-full justify-start h-auto py-2 px-2 text-sm font-normal flex flex-col items-start gap-1">
                    <div className="flex items-center w-full">
                      <FileText className="size-3.5 mr-2 text-muted-foreground" />
                      <span className="truncate flex-1 text-left">{file.name}</span>
                    </div>
                    <div className="flex items-center pl-6 text-[11px] text-muted-foreground">
                      <Clock className="size-3 mr-1" />
                      {file.time}
                    </div>
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col h-full relative min-w-0 bg-background">
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-8 w-full scroll-smooth">
          <div className="max-w-3xl mx-auto w-full space-y-6 pb-32">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-[60vh] text-center gap-4 animate-in fade-in duration-500">
              <div className="size-16 rounded-full bg-muted/50 flex items-center justify-center mb-2">
                <Sparkles className="size-8 text-foreground/80" />
              </div>
              <h2 className="text-2xl font-semibold tracking-tight text-foreground">
                How can I help you today?
              </h2>
            </div>
          )}

          {messages.map((msg) => (
            <div key={msg.id} className={`flex w-full animate-in fade-in duration-300 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              {msg.role === "user" ? (
                <div className="max-w-[75%] md:max-w-[70%] bg-muted px-5 py-3 rounded-3xl rounded-tr-sm text-[15px] leading-relaxed text-foreground shadow-sm">
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                </div>
              ) : (
                <div className="flex w-full gap-4 max-w-full">
                  <Avatar className="size-8 mt-1 border shadow-sm">
                    <AvatarFallback className="bg-primary text-primary-foreground">
                      <Sparkles className="size-4" />
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0 max-w-[calc(100%-3rem)] group">
                    <div className="text-[15px] leading-relaxed text-foreground pt-1.5">
                      {msg.isStreaming && !msg.content ? (
                        <div className="flex items-center gap-1.5 h-5 px-1">
                          <span className="animate-pulse size-2 bg-foreground/40 rounded-full" />
                          <span className="animate-pulse size-2 bg-foreground/40 rounded-full [animation-delay:0.2s]" />
                          <span className="animate-pulse size-2 bg-foreground/40 rounded-full [animation-delay:0.4s]" />
                        </div>
                      ) : (
                        <div className="ai-chat-markdown prose prose-sm dark:prose-invert max-w-none prose-p:leading-relaxed prose-pre:bg-muted prose-pre:border prose-pre:border-border prose-pre:rounded-xl">
                          <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]}>
                            {msg.content}
                          </ReactMarkdown>
                        </div>
                      )}
                    </div>

                    {/* Actions for assistant message */}
                    {!msg.isStreaming && (
                      <div className="flex items-center gap-2 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="icon" className="size-7 text-muted-foreground hover:text-foreground" onClick={() => handleCopy(msg.content)} title="Copy">
                          <Copy className="size-3.5" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
          <div ref={messagesEndRef} className="h-4" />
          
          {/* Branch display */}
          {branches.length > 0 && (
            <div className="w-full mt-6">
              <AIBranch defaultBranch={0}>
                <AIBranchMessages>
                  {branches.map((branch, i) => (
                    <div key={i} className="px-5 py-4 bg-muted/30 border border-border rounded-2xl text-[14px] shadow-sm">
                      <div className="flex items-center gap-2 text-muted-foreground text-xs mb-2 font-medium">
                        <GitBranch className="size-3" />
                        <span>Branch {i + 1}</span>
                      </div>
                      <p className="leading-relaxed">{branch.aiResponse}</p>
                    </div>
                  ))}
                </AIBranchMessages>
              </AIBranch>
            </div>
          )}
        </div>
      </div>

      {/* Input Area */}
      <div className="absolute bottom-0 left-0 w-full bg-gradient-to-t from-background via-background to-transparent pt-10 pb-4 px-4 md:px-6">
        <div className="max-w-3xl mx-auto flex flex-col gap-2">
          <div className="bg-background rounded-3xl shadow-sm border focus-within:ring-1 focus-within:ring-ring focus-within:border-ring transition-shadow">
            <AI_Input_Search
              placeholder="Message AI..."
              onSubmit={(value) => handleSubmit(value)}
            />
          </div>
          
          <div className="flex items-center justify-between px-2 h-8">
            <div className="flex items-center gap-2">
              {messages.length > 0 && !isLoading && (
                <>
                  <Button variant="ghost" size="sm" onClick={handleRegenerate} className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground rounded-full">
                    <RotateCcw className="size-3 mr-1.5" />
                    Regenerate
                  </Button>
                  <Button variant="ghost" size="sm" onClick={handleClear} className="h-7 px-2 text-xs text-muted-foreground hover:text-destructive rounded-full">
                    <Trash2 className="size-3 mr-1.5" />
                    Clear Chat
                  </Button>
                </>
              )}
            </div>
            {isLoading && (
              <Button variant="ghost" size="sm" onClick={handleStop} className="h-7 px-2 text-xs text-foreground bg-secondary/50 rounded-full hover:bg-secondary">
                <X className="size-3 mr-1.5" />
                Stop
              </Button>
            )}
            <div className="text-xs text-muted-foreground/70 hidden sm:block ml-auto">
              AI can make mistakes. Verify important info.
            </div>
          </div>
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
