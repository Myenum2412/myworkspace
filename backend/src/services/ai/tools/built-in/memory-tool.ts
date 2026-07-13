import { BaseTool } from "../base-tool.js";
import type { ToolDefinition, ToolExecutionResult, ToolExecutionOptions, ToolMetadata } from "../../types/tool.types.js";
import { AGENT_CONFIG } from "../../agent/agent-config.js";
import mongoose from "mongoose";

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
      description: `Manage persistent memories. Actions: list (show all), add (add a new memory), replace (replace existing memory by matching old text), remove (remove memory by matching text). Max ${AGENT_CONFIG.memoryCharLimit} characters total.`,
      parameters: {
        type: "object",
        properties: {
          action: { type: "string", enum: ["list", "add", "replace", "remove"], description: "Memory action" },
          content: { type: "string", description: "Memory content text" },
          oldText: { type: "string", description: "For replace/remove: substring of existing memory entry to match" },
          tags: { type: "string", description: "Comma-separated tags for the memory" },
        },
        required: ["action"],
      },
    };
  }

  async execute(args: Record<string, unknown>, options?: ToolExecutionOptions): Promise<ToolExecutionResult> {
    const action = String(args.action || "");
    const content = String(args.content || "");
    const userId = options?.userId || "anonymous";
    const db = mongoose.connection.db;
    if (!db) return this.error("Database not connected");

    const collection = db.collection("aiAgentMemory");

    try {
      switch (action) {
        case "list": {
          const memories = await collection
            .find({ userId, type: { $ne: "learned" } })
            .sort({ updatedAt: -1 })
            .limit(50)
            .toArray();

          if (memories.length === 0) return this.success("No memories stored", { action, count: 0 });

          const lines = memories.map((m: any, i: number) =>
            `${i + 1}. ${m.content}${m.tags?.length ? ` [${m.tags.join(", ")}]` : ""}`
          );
          return this.success(`Your memories (${memories.length}):\n${lines.join("\n")}`, {
            action, count: memories.length,
          });
        }

        case "add": {
          if (!content.trim()) return this.error("Memory content is required");

          const tags = String(args.tags || "").split(",").map((t) => t.trim()).filter(Boolean);

          const entry = {
            userId,
            id: `mem_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
            content: content.trim(),
            type: "fact",
            source: "agent",
            tags,
            createdAt: new Date(),
            updatedAt: new Date(),
            accessCount: 0,
          };

          await collection.insertOne(entry);
          return this.success(`Memory saved: ${content.substring(0, 100)}${content.length > 100 ? "..." : ""}`, {
            action, stored: true, memoryId: entry.id,
          });
        }

        case "replace": {
          const oldText = String(args.oldText || "");
          if (!oldText) return this.error("oldText is required for replace action");
          if (!content.trim()) return this.error("content is required for replace action");

          const result = await collection.updateOne(
            { userId, content: { $regex: oldText, $options: "i" } },
            { $set: { content: content.trim(), updatedAt: new Date() } }
          );

          if (result.modifiedCount === 0) return this.error(`No memory found matching "${oldText}"`);
          return this.success(`Memory updated: "${oldText.substring(0, 50)}..." updated successfully`, {
            action, replaced: true,
          });
        }

        case "remove": {
          const oldText = String(args.oldText || "");
          if (!oldText) return this.error("oldText is required for remove action");

          const result = await collection.deleteOne({
            userId,
            content: { $regex: oldText, $options: "i" },
          });

          if (result.deletedCount === 0) return this.error(`No memory found matching "${oldText}"`);
          return this.success(`Memory removed: matched "${oldText.substring(0, 50)}..."`, {
            action, removed: true,
          });
        }

        default:
          return this.error(`Unknown action: ${action}`);
      }
    } catch (error) {
      return this.error(`Memory operation failed: ${(error as Error).message}`);
    }
  }
}
