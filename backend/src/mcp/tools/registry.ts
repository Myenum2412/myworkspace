import type { MCPTool, MCPContext, MCPResponse } from "../types.js";
import { mcpSessionManager } from "../session/manager.js";
import { v4 as uuidv4 } from "uuid";

export class MCPToolRegistry {
  private tools: Map<string, MCPTool> = new Map();

  register(tool: MCPTool): void {
    if (this.tools.has(tool.name)) {
      throw new Error(`MCP Tool '${tool.name}' is already registered`);
    }
    this.tools.set(tool.name, tool);
  }

  getTool(name: string): MCPTool | undefined {
    return this.tools.get(name);
  }

  listTools(): MCPTool[] {
    return Array.from(this.tools.values());
  }

  async execute(
    toolName: string,
    params: Record<string, unknown>,
    ctx: MCPContext
  ): Promise<MCPResponse> {
    const requestId = uuidv4();
    const tool = this.tools.get(toolName);

    if (!tool) {
      return {
        success: false,
        error: `Unknown tool: '${toolName}'`,
        sessionId: ctx.user.sessionId,
        requestId,
      };
    }

    const hasRole = tool.requiredRole.some((r) => r === ctx.user.role);
    if (!hasRole) {
      return {
        success: false,
        error: `Role '${ctx.user.role}' is not authorized to use tool '${toolName}'`,
        sessionId: ctx.user.sessionId,
        requestId,
      };
    }

    try {
      const data = await tool.handler(params, ctx);
      await mcpSessionManager.refreshSession(ctx.user.sessionId);

      return {
        success: true,
        data,
        sessionId: ctx.user.sessionId,
        requestId,
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unknown error";
      return {
        success: false,
        error: message,
        sessionId: ctx.user.sessionId,
        requestId,
      };
    }
  }
}

export const toolRegistry = new MCPToolRegistry();
