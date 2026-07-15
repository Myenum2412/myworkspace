"use client";

import { useState } from "react";
import { MessageSquare, Pin, Trash2, Pencil, Check, X, Search, PinOff, Inbox } from "lucide-react";
import { useAIConversations } from "@/hooks/ai/use-ai-conversations";
import { Conversation } from "@/lib/services/ai/ai-service";

interface AiConversationListProps {
  activeId?: string | null;
  context: "workspace" | "staff";
  onSelect: (id: string) => void;
  pinned?: boolean;
  excludePinned?: boolean;
}

export function AiConversationList({ activeId, context, onSelect, pinned, excludePinned }: AiConversationListProps) {
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const { conversations, isLoading, updateTitle, togglePin, deleteConversation } = useAIConversations({
    context,
    search: search || undefined,
  });

  const filtered = conversations.filter(c => {
    if (pinned) return c.isPinned;
    if (excludePinned) return !c.isPinned;
    return true;
  });

  const handleRename = async (id: string) => {
    if (editTitle.trim()) {
      await updateTitle({ id, title: editTitle.trim() });
    }
    setEditingId(null);
  };

  const startRename = (conv: Conversation) => {
    setEditingId(conv._id);
    setEditTitle(conv.title);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    if (days === 0) return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    if (days === 1) return "Yesterday";
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString([], { month: "short", day: "numeric" });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-6">
        <div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (filtered.length === 0) {
    const label = pinned ? "pinned" : "";
    return (
      <div className="flex flex-col items-center gap-1 py-6 text-xs text-muted-foreground">
        <Inbox className="h-8 w-8 text-muted-foreground/40" />
        <span>{search ? "No conversations found" : pinned ? "No pinned conversations" : "No conversations yet"}</span>
      </div>
    );
  }

  return (
    <div className="space-y-0.5">
      {filtered.map((conv) => (
        <div
          key={conv._id}
          className={`group flex items-start gap-2 p-2 rounded-lg cursor-pointer transition-colors text-sm ${
            activeId === conv._id ? "bg-accent text-accent-foreground" : "hover:bg-muted"
          }`}
          onClick={() => onSelect(conv._id)}
        >
          <MessageSquare className="h-3.5 w-3.5 mt-1 flex-shrink-0 text-muted-foreground" />

          <div className="flex-1 min-w-0">
            {editingId === conv._id ? (
              <div className="flex items-center gap-1">
                <input
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="flex-1 text-xs bg-background border border-input rounded px-1.5 py-0.5"
                  autoFocus
                  onClick={(e) => e.stopPropagation()}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleRename(conv._id);
                    if (e.key === "Escape") setEditingId(null);
                  }}
                />
                <button onClick={(e) => { e.stopPropagation(); handleRename(conv._id); }}>
                  <Check className="h-3 w-3 text-green-500" />
                </button>
                <button onClick={(e) => { e.stopPropagation(); setEditingId(null); }}>
                  <X className="h-3 w-3 text-muted-foreground" />
                </button>
              </div>
            ) : (
              <div className="text-xs font-medium truncate">{conv.title}</div>
            )}

            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[10px] text-muted-foreground">{formatDate(conv.lastActivityAt)}</span>
              {conv.isPinned && <Pin className="h-2 w-2 text-primary" />}
            </div>
          </div>

          <div className="hidden group-hover:flex items-center gap-0.5">
            {editingId !== conv._id && (
              <>
                <button
                  onClick={(e) => { e.stopPropagation(); startRename(conv); }}
                  className="p-1 rounded hover:bg-muted-foreground/20"
                >
                  <Pencil className="h-3 w-3 text-muted-foreground" />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); togglePin(conv._id); }}
                  className="p-1 rounded hover:bg-muted-foreground/20"
                >
                  {conv.isPinned ? <PinOff className="h-3 w-3 text-muted-foreground" /> : <Pin className="h-3 w-3 text-muted-foreground" />}
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); deleteConversation(conv._id); }}
                  className="p-1 rounded hover:bg-destructive/20"
                >
                  <Trash2 className="h-3 w-3 text-destructive" />
                </button>
              </>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
