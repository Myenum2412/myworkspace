"use client";

import { Sparkles, Bot, Globe, FileText, MessageSquare } from "lucide-react";
import { AiQuickActions } from "./ai-quick-actions";

interface AiChatEmptyProps {
  context: "workspace" | "staff";
  onAction: (actionId: string) => void;
  onSend: (prompt: string) => void;
}

export function AiChatEmpty({ context, onAction, onSend }: AiChatEmptyProps) {
  const capabilitySuggestions = context === "workspace"
    ? [
        { icon: Globe, label: "Project Planning", prompt: "Help me plan a structural detailing project" },
        { icon: FileText, label: "BOQ Assistance", prompt: "Help me with Bill of Quantities estimation" },
        { icon: MessageSquare, label: "Client Email", prompt: "Draft a professional email to the client about project status" },
        { icon: Bot, label: "Task Priorities", prompt: "Help me prioritize my current tasks" },
      ]
    : [
        { icon: FileText, label: "Documentation", prompt: "Generate technical documentation for this project" },
        { icon: Globe, label: "Report", prompt: "Create a daily work report" },
        { icon: MessageSquare, label: "Professional Response", prompt: "Help me write a professional response to this query" },
        { icon: Bot, label: "SOP", prompt: "Create a standard operating procedure for rebar detailing" },
      ];

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 space-y-8 overflow-y-auto">
      <div className="text-center space-y-3 max-w-xl">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10">
          <Sparkles className="h-8 w-8 text-primary" />
        </div>
        <h1 className="text-2xl font-semibold">AI Detailing Assistant</h1>
        <p className="text-sm text-muted-foreground">
          {context === "workspace"
            ? "Your intelligent workspace assistant. Ask questions, generate reports, draft emails, and get expert guidance on structural detailing projects."
            : "Your personal AI assistant. Ask work-related questions, generate documentation, create reports, and improve your professional communications."}
        </p>
      </div>

      <div className="w-full max-w-2xl space-y-6">
        <AiQuickActions context={context} onAction={(actionId) => onAction(actionId)} />

        <div className="space-y-2">
          <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Try Asking</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {capabilitySuggestions.map((suggestion, i) => {
              const Icon = suggestion.icon;
              return (
                <button
                  key={i}
                  onClick={() => onSend(suggestion.prompt)}
                  className="flex items-center gap-3 p-3 rounded-lg border border-border bg-card hover:bg-accent transition-colors text-left"
                >
                  <Icon className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                  <span className="text-sm">{suggestion.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
