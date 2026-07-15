"use client";

import { useState } from "react";
import { ThumbsUp, ThumbsDown, Copy, Check, User, Bot } from "lucide-react";
import { AiMarkdownRenderer } from "./ai-markdown-renderer";
import { Message } from "@/lib/services/ai/ai-service";

interface AiChatMessageProps {
  message: Message;
  onFeedback?: (messageId: string, feedback: "like" | "dislike") => void;
}

export function AiChatMessage({ message, onFeedback }: AiChatMessageProps) {
  const [copied, setCopied] = useState(false);
  const isUser = message.role === "user";

  const handleCopy = async () => {
    await navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={`flex gap-3 px-4 py-4 ${isUser ? "bg-transparent" : "bg-muted/30"}`}>
      <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
        isUser ? "bg-primary text-primary-foreground" : "bg-accent text-accent-foreground"
      }`}>
        {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
      </div>

      <div className="flex-1 min-w-0 space-y-2">
        <div className="text-sm font-medium">
          {isUser ? "You" : "AI Assistant"}
        </div>

        <div className="prose prose-sm dark:prose-invert max-w-none">
          {message.content ? (
            <AiMarkdownRenderer content={message.content} />
          ) : (
            <span className="text-muted-foreground italic">Processing...</span>
          )}
        </div>

        {message.files && message.files.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {message.files.map((file, i) => (
              <div key={i} className="flex items-center gap-1.5 bg-muted rounded px-2 py-1 text-xs text-muted-foreground">
                <span>{file.name}</span>
                <span className="text-[10px]">({(file.size / 1024).toFixed(0)} KB)</span>
              </div>
            ))}
          </div>
        )}

        {!isUser && message.content && (
          <div className="flex items-center gap-1 pt-1">
            <button
              onClick={handleCopy}
              className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              title="Copy response"
            >
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            </button>
            {onFeedback && (
              <>
                <button
                  onClick={() => onFeedback(message._id, "like")}
                  className={`p-1.5 rounded-md transition-colors ${
                    message.feedback === "like" ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  }`}
                  title="Like"
                >
                  <ThumbsUp className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => onFeedback(message._id, "dislike")}
                  className={`p-1.5 rounded-md transition-colors ${
                    message.feedback === "dislike" ? "text-destructive bg-destructive/10" : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  }`}
                  title="Dislike"
                >
                  <ThumbsDown className="h-3.5 w-3.5" />
                </button>
              </>
            )}
          </div>
        )}

        {!isUser && message.tokens && (
          <div className="text-[10px] text-muted-foreground">
            Tokens: {message.tokens.total} | Model: {message.model || "N/A"}
            {message.executionTime && ` | ${(message.executionTime / 1000).toFixed(1)}s`}
          </div>
        )}
      </div>
    </div>
  );
}
