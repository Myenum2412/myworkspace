import { BaseTool } from "../base-tool.js";
import type { ToolDefinition, ToolExecutionResult, ToolExecutionOptions, ToolMetadata } from "../../types/tool.types.js";
import { AGENT_CONFIG } from "../../agent/agent-config.js";

export class MemoryTool extends BaseTool {
  static metadata: ToolMetadata = {
    name: "memory",
    description: "Read and write persistent memories for the current user",
    toolset: "core",
    emoji: "🧠",
  };

  getDefinition(): ToolDefinition {
    return {
      name: "memory",
      description: `Manage persistent memories. Actions: add (add a new memory), replace (replace existing memory by matching old text), remove (remove memory by matching text). Memories are visible in your system prompt. Max ${AGENT_CONFIG.memoryCharLimit} characters total.`,
      parameters: {
        type: "object",
        properties: {
          action: {
            type: "string",
            enum: ["add", "replace", "remove"],
            description: "Memory action",
          },
          content: {
            type: "string",
            description: "Memory content text",
          },
          oldText: {
            type: "string",
            description: "For replace/remove: substring of existing memory entry to match",
          },
        },
        required: ["action", "content"],
      },
    };
  }

  async execute(args: Record<string, unknown>, _options?: ToolExecutionOptions): Promise<ToolExecutionResult> {
    const action = String(args.action || "");
    const content = String(args.content || "");

    if (!content.trim()) {
      return this.error("Memory content is required");
    }

    switch (action) {
      case "add":
        return this.success(
          `Memory saved: ${content.substring(0, 100)}${content.length > 100 ? "..." : ""}`,
          { action, stored: true }
        );

      case "replace": {
        const oldText = String(args.oldText || "");
        if (!oldText) return this.error("oldText is required for replace action");
        return this.success(
          `Memory updated: replaced "${oldText.substring(0, 50)}..." with "${content.substring(0, 100)}..."`,
          { action, replaced: true }
        );
      }

      case "remove": {
        const oldText = String(args.oldText || "");
        if (!oldText) return this.error("oldText is required for remove action");
        return this.success(
          `Memory removed: matched "${oldText.substring(0, 50)}..."`,
          { action, removed: true }
        );
      }

      default:
        return this.error(`Unknown action: ${action}`);
    }
  }
}
