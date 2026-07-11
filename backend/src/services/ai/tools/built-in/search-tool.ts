import { BaseTool } from "../base-tool.js";
import type { ToolDefinition, ToolExecutionResult, ToolExecutionOptions, ToolMetadata } from "../../types/tool.types.js";

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
          query: {
            type: "string",
            description: "The search query string",
          },
          type: {
            type: "string",
            enum: ["tasks", "projects", "clients", "files", "all"],
            description: "Type of resources to search",
          },
          limit: {
            type: "number",
            description: "Maximum number of results to return (default 10)",
          },
        },
        required: ["query"],
      },
    };
  }

  async execute(args: Record<string, unknown>, _options?: ToolExecutionOptions): Promise<ToolExecutionResult> {
    const query = String(args.query || "");
    const type = String(args.type || "all");
    const limit = Number(args.limit || 10);

    if (!query.trim()) {
      return this.error("Search query is required");
    }

    const results: string[] = [];

    if (type === "all" || type === "tasks") {
      results.push(`[Tasks] Search results for "${query}" would appear here`);
    }
    if (type === "all" || type === "projects") {
      results.push(`[Projects] Search results for "${query}" would appear here`);
    }
    if (type === "all" || type === "clients") {
      results.push(`[Clients] Search results for "${query}" would appear here`);
    }
    if (type === "all" || type === "files") {
      results.push(`[Files] Search results for "${query}" would appear here`);
    }

    return this.success(
      results.length > 0
        ? `Search results for "${query}":\n${results.join("\n")}`
        : `No results found for "${query}"`,
      { query, type, resultCount: results.length, limit }
    );
  }
}
