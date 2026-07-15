"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Send, Square, ArrowRight } from "lucide-react";
import { AiFileUpload } from "./ai-file-upload";

interface UploadedFile {
  name: string;
  type: string;
  size: number;
  url?: string;
}

interface AiChatInputProps {
  onSend: (message: string, files?: UploadedFile[]) => void;
  onStop: () => void;
  isStreaming: boolean;
  disabled?: boolean;
  placeholder?: string;
}

export function AiChatInput({ onSend, onStop, isStreaming, disabled, placeholder }: AiChatInputProps) {
  const [input, setInput] = useState("");
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [input]);

  const handleSubmit = useCallback(() => {
    if (!input.trim() && files.length === 0) return;
    onSend(input.trim(), files.length > 0 ? files : undefined);
    setInput("");
    setFiles([]);
  }, [input, files, onSend]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!isStreaming) handleSubmit();
    }
  };

  const suggestedPrompts = [
    "Summarize my current tasks",
    "Help me plan this project",
    "Generate a status report",
    "Draft an email to the client",
  ];

  return (
    <div className="border-t border-border bg-background">
      <div className="max-w-4xl mx-auto p-4 space-y-3">
        <AiFileUpload files={files} onFilesChange={setFiles} />

        <div className="flex items-end gap-2">
          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={placeholder || "Ask AI anything about your workspace..."}
              disabled={disabled}
              rows={1}
              className="w-full resize-none rounded-lg border border-input bg-background px-4 py-3 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>

          {isStreaming ? (
            <button
              onClick={onStop}
              className="flex-shrink-0 h-10 w-10 rounded-lg bg-destructive text-destructive-foreground hover:bg-destructive/90 flex items-center justify-center transition-colors"
              title="Stop generation"
            >
              <Square className="h-4 w-4" />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={!input.trim() && files.length === 0}
              className="flex-shrink-0 h-10 w-10 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 flex items-center justify-center transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="Send message"
            >
              <Send className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          {suggestedPrompts.map((prompt) => (
            <button
              key={prompt}
              onClick={() => onSend(prompt)}
              disabled={isStreaming || disabled}
              className="inline-flex items-center gap-1 text-xs bg-muted hover:bg-muted/80 text-muted-foreground rounded-full px-3 py-1.5 transition-colors disabled:opacity-50"
            >
              {prompt}
              <ArrowRight className="h-3 w-3" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
