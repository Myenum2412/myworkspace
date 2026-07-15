"use client";

import { AiChatInterface } from "@/components/ai/ai-chat-interface";

interface AiPageClientProps {
  context: "workspace" | "staff";
}

export function AiPageClient({ context }: AiPageClientProps) {
  return (
    <div className="h-[calc(100vh-3.5rem)]">
      <AiChatInterface context={context} />
    </div>
  );
}
