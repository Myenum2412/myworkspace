"use client";

import { useState } from "react";
import { X, Pin, History, FolderKanban, ChevronDown, ChevronRight } from "lucide-react";
import { AiConversationList } from "./ai-conversation-list";
import { AiProjectsSection } from "./ai-projects-section";

interface AiChatSidebarProps {
  open: boolean;
  onClose: () => void;
  activeId?: string | null;
  context: "workspace" | "staff";
  onSelect: (id: string) => void;
  onNew: () => void;
  onSelectProject?: (projectName: string) => void;
}

export function AiChatSidebar({ open, onClose, activeId, context, onSelect, onNew, onSelectProject }: AiChatSidebarProps) {
  const [pinnedOpen, setPinnedOpen] = useState(true);
  const [historyOpen, setHistoryOpen] = useState(true);
  const [projectsOpen, setProjectsOpen] = useState(true);

  return (
    <>
      {open && (
        <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={onClose} />
      )}

      <aside className={`
        fixed lg:static inset-y-0 left-0 z-50 w-72 border-r border-border bg-background flex flex-col
        transform transition-transform duration-200 ease-in-out
        ${open ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
      `}>
        <div className="flex items-center justify-between p-3 border-b border-border shrink-0">
          <h2 className="text-sm font-semibold">AI Assistant</h2>
          <button onClick={onClose} className="p-1 hover:bg-muted rounded lg:hidden">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="p-3">
            <button
              onClick={onNew}
              className="w-full py-2 px-3 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 text-sm font-medium transition-colors"
            >
              + New Chat
            </button>
          </div>

          <div className="space-y-1 px-2">
            <button
              onClick={() => setPinnedOpen(!pinnedOpen)}
              className="flex items-center gap-2 w-full px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors rounded"
            >
              {pinnedOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
              <Pin className="h-3 w-3" />
              Pinned
            </button>
            {pinnedOpen && (
              <AiConversationList
                activeId={activeId}
                context={context}
                onSelect={(id) => { onSelect(id); onClose(); }}
                pinned
              />
            )}
          </div>

          <div className="space-y-1 px-2 mt-2">
            <button
              onClick={() => setHistoryOpen(!historyOpen)}
              className="flex items-center gap-2 w-full px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors rounded"
            >
              {historyOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
              <History className="h-3 w-3" />
              History
            </button>
            {historyOpen && (
              <AiConversationList
                activeId={activeId}
                context={context}
                onSelect={(id) => { onSelect(id); onClose(); }}
                excludePinned
              />
            )}
          </div>

          {context === "workspace" && (
            <div className="space-y-1 px-2 mt-2">
              <button
                onClick={() => setProjectsOpen(!projectsOpen)}
                className="flex items-center gap-2 w-full px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors rounded"
              >
                {projectsOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                <FolderKanban className="h-3 w-3" />
                Projects
              </button>
              {projectsOpen && (
                <AiProjectsSection
                  onSelectProject={(name) => { onSelectProject?.(name); onClose(); }}
                />
              )}
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
