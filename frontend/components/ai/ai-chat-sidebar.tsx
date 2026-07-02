"use client";

import { useSession } from "next-auth/react";
import { usePathname, useRouter } from "next/navigation";
import { Bot, MessageSquare, Plus, Search, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

interface Conversation {
  id: string;
  title: string;
  createdAt: string;
}

export function AiChatSidebar() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const router = useRouter();
  const role = session?.user?.role || "";
  const isRestricted = role === "member" || role === "workspace" || role === "staff";

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const isActive = pathname.startsWith("/ai-chat");

  const fetchConversations = useCallback(async () => {
    try {
      const res = await fetch("/api/ai/conversations");
      if (res.ok) {
        const json = await res.json();
        setConversations(json.data || []);
      }
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    if (isActive && !isRestricted) fetchConversations();
  }, [isActive, isRestricted, fetchConversations]);

  const handleNewChat = () => {
    router.push("/ai-chat");
  };

  const handleSelectConversation = (id: string) => {
    router.push(`/ai-chat/${id}`);
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await fetch(`/api/ai/conversations/${id}`, { method: "DELETE" });
      fetchConversations();
      if (pathname === `/ai-chat/${id}`) {
        router.push("/ai-chat");
      }
    } catch { /* ignore */ }
  };

  if (isRestricted || !isActive) return null;

  const filteredConversations = conversations.filter((c) =>
    c.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b">
        <button
          onClick={handleNewChat}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          <Plus className="size-4" />
          New Chat
        </button>
        <div className="relative mt-2">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search conversations..."
            className="w-full rounded-md border border-input bg-background pl-7 pr-2 py-1.5 text-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
        </div>
      </div>
      <div className="flex-1 overflow-y-auto py-1">
        {filteredConversations.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-8">
            {searchQuery ? "No conversations found" : "No conversations yet"}
          </p>
        ) : (
          filteredConversations.map((conv) => (
            <button
              key={conv.id}
              onClick={() => handleSelectConversation(conv.id)}
              className={`w-full text-left px-3 py-2.5 text-sm hover:bg-accent transition-colors flex items-center justify-between gap-2 ${
                pathname === `/ai-chat/${conv.id}` ? "bg-accent" : ""
              }`}
            >
              <MessageSquare className="size-4 shrink-0 text-muted-foreground" />
              <span className="truncate flex-1 text-xs">{conv.title}</span>
              <button
                onClick={(e) => handleDelete(conv.id, e)}
                className="shrink-0 p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                title="Delete"
              >
                <Trash2 className="size-3" />
              </button>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
