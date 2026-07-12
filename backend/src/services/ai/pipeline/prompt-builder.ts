import type { AgentMessage } from "../types/message.types.js";
import type { ToolDefinition } from "../types/tool.types.js";

export class PromptBuilder {
  buildSystemPrompt(
    volatileBlock: string,
    toolDefinitions: ToolDefinition[],
    soul?: string,
    orgContext?: string
  ): string {
    const parts: string[] = [];

    if (orgContext) parts.push(orgContext);
    if (volatileBlock) parts.push(volatileBlock);

    if (soul) {
      parts.push(soul);
    } else {
      parts.push(`You are a helpful AI assistant.

Guidelines:
- Be helpful, warm, concise, and professional
- Think step-by-step when solving complex problems
- Use your tools when you need information - don't guess
- If a tool returns an error, explain it to the user clearly
- If you don't have enough information, ask clarifying questions
- Never make up data or hallucinate results
- When you need to perform multiple actions, use tools sequentially

Current time: ${new Date().toISOString()}
Timezone: ${process.env.TZ || "UTC"}`);
    }

    if (toolDefinitions.length > 0) {
      parts.push(this.formatToolsPrompt(toolDefinitions));
    }

    const prompt = parts.join("\n\n");

    if (soul) {
      return prompt + "\n\nFollow your assigned personality above. Answer concisely, no fluff.";
    }

    return prompt;
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

    return `## Available Tools\nYou can use these tools to interact with the system. When you need information or want to perform actions, call the appropriate tool.\n\n${lines.join("\n\n")}`;
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

}
