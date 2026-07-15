"use client";

import {
  FileText, PenTool, RefreshCw, Languages, HelpCircle, Minimize, Maximize, Minus,
  CheckSquare, Mail, Clipboard, ListTodo, AlertTriangle, FileCheck, BookOpen,
  Table, Workflow,
} from "lucide-react";
import { useAIActions } from "@/hooks/ai/use-ai-actions";

const iconMap: Record<string, React.ElementType> = {
  FileText, PenTool, RefreshCw, Languages, HelpCircle, Minimize, Maximize, Minus,
  CheckSquare, Mail, Clipboard, ListTodo, AlertTriangle, FileCheck, BookOpen,
  Table, Workflow, WorkflowIcon: Workflow,
};

interface AiQuickActionsProps {
  context: "workspace" | "staff";
  onAction: (actionId: string) => void;
  loading?: boolean;
}

export function AiQuickActions({ context, onAction, loading }: AiQuickActionsProps) {
  const { actions, isLoading } = useAIActions();

  const filteredActions = actions.filter(a => a.context.includes(context));

  if (isLoading || filteredActions.length === 0) return null;

  return (
    <div className="space-y-2">
      <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Detailing Actions</h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
        {filteredActions.map((action) => {
          const Icon = iconMap[action.icon] || FileText;
          return (
            <button
              key={action.id}
              onClick={() => onAction(action.id)}
              disabled={loading}
              className="flex items-center gap-2 px-3 py-2.5 rounded-lg border border-border bg-card hover:bg-accent transition-colors text-sm disabled:opacity-50"
            >
              <Icon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <span className="truncate">{action.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
