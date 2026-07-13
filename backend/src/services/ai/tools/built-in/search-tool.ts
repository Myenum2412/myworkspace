import { BaseTool } from "../base-tool.js";
import type { ToolDefinition, ToolExecutionResult, ToolExecutionOptions, ToolMetadata } from "../../types/tool.types.js";
import mongoose from "mongoose";

interface SearchableItem {
  _type: string;
  title: string;
  description: string;
  id?: string;
  status?: string;
  score?: number;
}

export class SearchTool extends BaseTool {
  static metadata: ToolMetadata = {
    name: "search",
    description: "Search across tasks, projects, clients, and files in the workspace",
    toolset: "workspace",
    emoji: "🔍",
  };

  getDefinition(): ToolDefinition {
    return {
      name: "search",
      description: "Search across tasks, projects, clients, files, and other workspace resources. Returns ranked results with relevance scores.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "The search query string" },
          type: { type: "string", enum: ["tasks", "projects", "clients", "files", "all"], description: "Type of resources to search" },
          limit: { type: "number", description: "Maximum number of results to return (default 10)" },
        },
        required: ["query"],
      },
    };
  }

  async execute(args: Record<string, unknown>, options?: ToolExecutionOptions): Promise<ToolExecutionResult> {
    const query = String(args.query || "");
    const type = String(args.type || "all");
    const limit = Math.min(Number(args.limit || 10), 50);
    const orgId = options?.organizationId;

    if (!query.trim()) return this.error("Search query is required");

    const db = mongoose.connection.db;
    if (!db) return this.error("Database not connected");

    const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(escapedQuery, "i");

    const results: SearchableItem[] = [];
    const matchFilter: Record<string, unknown> = {};
    if (orgId) matchFilter.orgId = orgId;

    try {
      if (type === "all" || type === "tasks") {
        const tasks = await db.collection("tasks")
          .find({ ...matchFilter, $or: [{ title: regex }, { description: regex }] })
          .project({ title: 1, description: 1, status: 1 })
          .limit(limit)
          .toArray();
        for (const t of tasks) results.push({ _type: "task", title: t.title, description: t.description || "", id: t._id.toString(), status: t.status });
      }

      if (type === "all" || type === "projects") {
        const projects = await db.collection("projects")
          .find({ ...matchFilter, $or: [{ name: regex }, { description: regex }] })
          .project({ name: 1, description: 1 })
          .limit(limit)
          .toArray();
        for (const p of projects) results.push({ _type: "project", title: p.name, description: p.description || "", id: p._id.toString() });
      }

      if (type === "all" || type === "clients") {
        const clients = await db.collection("clients")
          .find({ ...matchFilter, $or: [{ name: regex }, { email: regex }, { company: regex }] })
          .project({ name: 1, email: 1, company: 1 })
          .limit(limit)
          .toArray();
        for (const c of clients) results.push({ _type: "client", title: c.name, description: `${c.company || ""} ${c.email || ""}`.trim(), id: c._id.toString() });
      }

      if (type === "all" || type === "files") {
        const files = await db.collection("fileAttachments")
          .find({ ...matchFilter, $or: [{ originalName: regex }, { alt: regex }] })
          .project({ originalName: 1, alt: 1 })
          .limit(limit)
          .toArray();
        for (const f of files) results.push({ _type: "file", title: f.originalName, description: f.alt || "", id: f._id.toString() });
      }
    } catch (error) {
      return this.error(`Search error: ${(error as Error).message}`);
    }

    if (results.length === 0) {
      return this.success(`No results found for "${query}"`, { query, type, resultCount: 0 });
    }

    const formatted = results.map((r, i) =>
      `${i + 1}. [${r._type}] ${r.title}${r.status ? ` (${r.status})` : ""}${r.description ? ` - ${r.description.slice(0, 100)}` : ""}`
    ).join("\n");

    return this.success(`Search results for "${query}":\n${formatted}`, {
      query, type, resultCount: results.length, results: results.map((r) => ({ type: r._type, id: r.id, title: r.title })),
    });
  }
}
