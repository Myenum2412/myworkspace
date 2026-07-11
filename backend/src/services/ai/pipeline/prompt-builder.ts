import { AI_CONFIG, BUSINESS_CONFIG } from "../config.js";
import { AGENT_CONFIG } from "../agent/agent-config.js";
import type { AgentMessage } from "../types/message.types.js";
import type { SystemPromptTiers } from "../types/agent.types.js";
import type { ToolDefinition } from "../types/tool.types.js";

export class PromptBuilder {
  private stablePrompt: string;

  constructor() {
    this.stablePrompt = this.buildStableTier();
  }

  private buildStableTier(): string {
    return `You are an intelligent AI assistant for ${BUSINESS_CONFIG.name}, a workspace management platform.

Identity and Purpose:
- Your name is MyWorkSpace AI Assistant
- When introducing yourself, say: "Hello! I'm the MyWorkSpace AI Assistant. I can help you with managing your workspace — tasks, projects, clients, files, and team collaboration. How can I help you today?"
- You help users manage their workspace: tasks, projects, clients, files, and team collaboration
- You can search for information, create and update tasks, look up projects, and provide insights
- You have access to tools that let you interact with the workspace

Guidelines:
- Be helpful, warm, concise, and professional
- Think step-by-step when solving complex problems
- Use your tools when you need information - don't guess
- If a tool returns an error, explain it to the user clearly
- If you don't have enough information, ask clarifying questions
- Never make up data or hallucinate results
- When you need to perform multiple actions, use tools sequentially
- Auto-reply to any question the user asks — always provide a helpful response

Current time: ${new Date().toISOString()}
Timezone: ${BUSINESS_CONFIG.timezone || "UTC"}`;
  }

  buildSystemPrompt(
    volatileBlock: string,
    toolDefinitions: ToolDefinition[],
    soul?: string
  ): string {
    const tiers: SystemPromptTiers = {
      stable: this.stablePrompt,
      context: this.buildContextTier(),
      volatile: volatileBlock,
    };

    const parts: string[] = [tiers.stable];

    if (tiers.context) parts.push(tiers.context);
    if (tiers.volatile) parts.push(tiers.volatile);
    if (soul) parts.push(`## Your Soul / Personality\n${soul}`);

    if (toolDefinitions.length > 0) {
      parts.push(this.formatToolsPrompt(toolDefinitions));
    }

    return parts.join("\n\n");
  }

  private buildContextTier(): string {
    return "";
  }

  private formatToolsPrompt(definitions: ToolDefinition[]): string {
    const lines = definitions.map((def) => {
      const params = def.parameters?.properties
        ? Object.entries(def.parameters.properties as Record<string, any>)
            .map(([key, val]) => `  - ${key}: ${val.description || ""}${(def.parameters.required as string[] || []).includes(key) ? " (required)" : ""}`)
            .join("\n")
        : "";
      return `/${def.name}: ${def.description}\n${params}`;
    });

    return `## Available Tools\nYou can use these tools to interact with the workspace. When you need information or want to perform actions, call the appropriate tool.\n\n${lines.join("\n\n")}`;
  }

  buildApiMessages(
    systemPrompt: string,
    historyMessages: AgentMessage[],
    userMessage: string
  ): AgentMessage[] {
    const systemMsg: AgentMessage = { role: "system", content: systemPrompt };

    const alternatingMessages = this.ensureAlternation(historyMessages);

    return [systemMsg, ...alternatingMessages, { role: "user", content: userMessage }];
  }

  private ensureAlternation(messages: AgentMessage[]): AgentMessage[] {
    const result: AgentMessage[] = [];
    let lastRole: string | null = null;

    for (const msg of messages) {
      if (msg.role === "system") continue;

      if (msg.role === "tool" || msg.role === lastRole) {
        if (msg.role === "tool" && lastRole === "assistant") {
          result.push(msg);
          lastRole = "tool";
          continue;
        }
        if (lastRole === "tool" && msg.role === "tool") {
          result.push(msg);
          continue;
        }
        continue;
      }

      result.push(msg);
      lastRole = msg.role;
    }

    return result;
  }

  buildMemoryToolPrompt(): string {
    return `Use the memory tool to save important information about the user and their preferences.
- Add: Save new facts you learn about the user
- Replace: Update existing information when it changes
- Remove: Delete outdated or incorrect information`;
  }

  refreshStablePrompt(): void {
    this.stablePrompt = this.buildStableTier();
  }
}
