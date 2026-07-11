import { BaseTool } from "./base-tool.js";
import type { ToolDefinition, ToolMetadata, ToolExecutionResult, ToolExecutionOptions } from "../types/tool.types.js";

interface ToolConstructor {
  new (): BaseTool;
  metadata: ToolMetadata;
}
import { logger } from "../../../lib/logger/index.js";
import { AGENT_CONFIG } from "../agent/agent-config.js";

interface RegisteredTool {
  tool: BaseTool;
  metadata: ToolMetadata;
  definition: ToolDefinition;
}

export class ToolRegistry {
  private static instance: ToolRegistry;
  private tools: Map<string, RegisteredTool> = new Map();
  private availabilityCache: Map<string, boolean> = new Map();
  private initialized = false;

  static getInstance(): ToolRegistry {
    if (!this.instance) {
      this.instance = new ToolRegistry();
    }
    return this.instance;
  }

  register(toolClass: ToolConstructor): void {
    const tool = new toolClass();
    const metadata = toolClass.metadata;
    const definition = tool.getDefinition();

    if (this.tools.has(metadata.name)) {
      logger.warn({ toolName: metadata.name }, "Tool already registered, skipping duplicate");
      return;
    }

    this.tools.set(metadata.name, { tool, metadata, definition });
    this.availabilityCache.delete(metadata.name);
    logger.info({ toolName: metadata.name, toolset: metadata.toolset }, "Tool registered");
  }

  async initializeBuiltInTools(): Promise<void> {
    if (this.initialized) return;

    const { SearchTool } = await import("./built-in/search-tool.js");
    const { TaskTool } = await import("./built-in/task-tool.js");
    const { ProjectTool } = await import("./built-in/project-tool.js");
    const { MemoryTool } = await import("./built-in/memory-tool.js");
    const { TimeTool } = await import("./built-in/time-tool.js");

    this.register(SearchTool);
    this.register(TaskTool);
    this.register(ProjectTool);
    this.register(MemoryTool);
    this.register(TimeTool);

    this.initialized = true;
    logger.info({ toolCount: this.tools.size }, "Built-in tools initialized");
  }

  getTool(name: string): BaseTool | undefined {
    return this.tools.get(name)?.tool;
  }

  getDefinitions(
    enabledToolsets?: string[],
    disabledToolsets?: string[]
  ): ToolDefinition[] {
    let entries = Array.from(this.tools.values());

    if (enabledToolsets && enabledToolsets.length > 0) {
      entries = entries.filter((e) => enabledToolsets.includes(e.metadata.toolset));
    }

    if (disabledToolsets && disabledToolsets.length > 0) {
      entries = entries.filter((e) => !disabledToolsets.includes(e.metadata.toolset));
    }

    return entries
      .filter((e) => this.isToolAvailable(e.metadata.name))
      .map((e) => e.definition);
  }

  isToolAvailable(name: string): boolean {
    const cached = this.availabilityCache.get(name);
    if (cached !== undefined) return cached;

    const registered = this.tools.get(name);
    if (!registered) return false;

    try {
      const available = registered.tool.checkAvailability();
      this.availabilityCache.set(name, available);
      return available;
    } catch {
      this.availabilityCache.set(name, false);
      return false;
    }
  }

  async execute(
    name: string,
    args: Record<string, unknown>,
    options?: ToolExecutionOptions
  ): Promise<ToolExecutionResult> {
    const registered = this.tools.get(name);
    if (!registered) {
      return {
        success: false,
        output: `Tool "${name}" not found in registry`,
        error: `Unknown tool: ${name}`,
        durationMs: 0,
      };
    }

    const startTime = Date.now();
    logger.debug({ toolName: name, args }, "Executing tool");

    try {
      const result = await registered.tool.execute(args, {
        ...options,
        timeout: options?.timeout ?? AGENT_CONFIG.requestTimeoutMs,
      });
      result.durationMs = Date.now() - startTime;
      logger.debug({ toolName: name, durationMs: result.durationMs, success: result.success }, "Tool execution complete");
      return result;
    } catch (error: unknown) {
      const durationMs = Date.now() - startTime;
      const message = error instanceof Error ? error.message : String(error);
      logger.error({ toolName: name, error: message, durationMs }, "Tool execution failed");
      return {
        success: false,
        output: `Tool execution failed: ${message}`,
        error: message,
        durationMs,
      };
    }
  }

  getToolsetNames(): string[] {
    const sets = new Set<string>();
    for (const entry of this.tools.values()) {
      sets.add(entry.metadata.toolset);
    }
    return Array.from(sets).sort();
  }

  getToolCount(): number {
    return this.tools.size;
  }

  clearAvailabilityCache(): void {
    this.availabilityCache.clear();
  }

  reset(): void {
    this.tools.clear();
    this.availabilityCache.clear();
    this.initialized = false;
  }
}
