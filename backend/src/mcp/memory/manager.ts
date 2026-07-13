import { MCPMemory } from "../models/mcp-memory.js";
import type { MCPMemoryEntry } from "../types.js";

const MAX_MEMORY_ENTRIES = 50;

export class MCPMemoryManager {
  async addEntry(entry: Omit<MCPMemoryEntry, "timestamp">): Promise<void> {
    await MCPMemory.create({
      ...entry,
      timestamp: new Date(),
    });
  }

  async getConversationHistory(sessionId: string, userId: string, orgId: string, limit = MAX_MEMORY_ENTRIES): Promise<MCPMemoryEntry[]> {
    const docs = await MCPMemory.find({ sessionId, userId, orgId })
      .sort({ timestamp: -1 })
      .limit(limit)
      .lean();

    return docs.reverse().map((d) => ({
      sessionId: d.sessionId,
      userId: d.userId,
      orgId: d.orgId,
      role: d.role as "user" | "assistant" | "system",
      content: d.content,
      metadata: d.metadata,
      timestamp: d.timestamp,
    }));
  }

  async getOrgMemorySummary(orgId: string): Promise<string[]> {
    const recent = await MCPMemory.find({ orgId, role: "assistant" })
      .sort({ timestamp: -1 })
      .limit(10)
      .lean();

    return recent.map((e) => e.content).filter(Boolean);
  }

  async clearSessionMemory(sessionId: string, userId: string, orgId: string): Promise<void> {
    await MCPMemory.deleteMany({ sessionId, userId, orgId });
  }

  async clearOrgMemory(orgId: string): Promise<void> {
    await MCPMemory.deleteMany({ orgId });
  }
}

export const mcpMemoryManager = new MCPMemoryManager();
