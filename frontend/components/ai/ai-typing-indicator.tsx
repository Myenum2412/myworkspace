"use client";

export function AiTypingIndicator() {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <div className="flex items-center gap-1">
        <span className="h-2 w-2 bg-primary/60 rounded-full animate-bounce [animation-delay:0ms]" />
        <span className="h-2 w-2 bg-primary/60 rounded-full animate-bounce [animation-delay:150ms]" />
        <span className="h-2 w-2 bg-primary/60 rounded-full animate-bounce [animation-delay:300ms]" />
      </div>
      <span className="text-xs text-muted-foreground">AI is thinking...</span>
    </div>
  );
}
