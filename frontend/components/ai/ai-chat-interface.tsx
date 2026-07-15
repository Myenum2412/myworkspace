"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Menu, RotateCcw, Plus, ChevronDown } from "lucide-react";
import { useAIChat } from "@/hooks/ai/use-ai-chat";
import { useAIActions } from "@/hooks/ai/use-ai-actions";
import { AiChatSidebar } from "./ai-chat-sidebar";
import { AiChatMessage } from "./ai-chat-message";
import { AiChatInput } from "./ai-chat-input";
import { AiChatEmpty } from "./ai-chat-empty";
import { AiTypingIndicator } from "./ai-typing-indicator";

interface AiChatInterfaceProps {
  context: "workspace" | "staff";
  workspaceContext?: Record<string, unknown>;
}

export function AiChatInterface({ context, workspaceContext }: AiChatInterfaceProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const {
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
  } = useAIChat({ context, workspaceContext });

  const { actions } = useAIActions();

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const handleAction = async (actionId: string) => {
    const action = actions.find(a => a.id === actionId);
    if (action) {
      await sendMessage(`${action.prompt}...`);
    }
  };

  const handleProjectSelect = (projectName: string) => {
    newConversation();
    sendMessage(`Help me with project "${projectName}": provide an overview, key tasks, and status.`);
  };

  return (
    <div className="flex h-full">
      <AiChatSidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        activeId={conversationId}
        context={context}
        onSelect={loadConversation}
        onNew={newConversation}
        onSelectProject={handleProjectSelect}
      />

      <div className="flex-1 flex flex-col h-full min-w-0">
        <header className="flex items-center justify-between px-4 py-2.5 border-b border-border bg-background">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-1.5 rounded-md hover:bg-muted transition-colors"
            >
              <Menu className="h-4 w-4" />
            </button>
            <h2 className="text-sm font-semibold">AI Assistant</h2>
            {conversationId && (
              <span className="text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                {context === "workspace" ? "Workspace" : "Staff"}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1">
            {conversationId && (
              <>
                {!isStreaming && messages.length > 0 && (
                  <button
                    onClick={continueResponse}
                    className="flex items-center gap-1 px-2 py-1.5 text-xs text-muted-foreground hover:text-foreground rounded-md hover:bg-muted transition-colors"
                  >
                    <ChevronDown className="h-3.5 w-3.5" />
                    Continue
                  </button>
                )}
                {!isStreaming && messages.filter(m => m.role === "assistant").length > 0 && (
                  <button
                    onClick={regenerate}
                    className="flex items-center gap-1 px-2 py-1.5 text-xs text-muted-foreground hover:text-foreground rounded-md hover:bg-muted transition-colors"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    Regenerate
                  </button>
                )}
                <button
                  onClick={newConversation}
                  className="flex items-center gap-1 px-2 py-1.5 text-xs text-muted-foreground hover:text-foreground rounded-md hover:bg-muted transition-colors"
                >
                  <Plus className="h-3.5 w-3.5" />
                  New
                </button>
              </>
            )}
          </div>
        </header>

        <div ref={containerRef} className="flex-1 overflow-y-auto">
          {error && (
            <div className="mx-4 mt-4 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-sm text-destructive">
              {error}
            </div>
          )}

          {messages.length === 0 && !isStreaming ? (
            <AiChatEmpty
              context={context}
              onAction={handleAction}
              onSend={(prompt) => sendMessage(prompt)}
            />
          ) : (
            <div className="divide-y divide-border/50">
              {messages.map((msg, i) => (
                <AiChatMessage
                  key={msg._id || i}
                  message={msg}
                  onFeedback={setFeedback}
                />
              ))}
              {isStreaming && <AiTypingIndicator />}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        <AiChatInput
          onSend={sendMessage}
          onStop={stopGeneration}
          isStreaming={isStreaming}
          placeholder={context === "workspace" ? "Ask about projects, tasks, reports..." : "Ask work-related questions..."}
        />
      </div>
    </div>
  );
}
