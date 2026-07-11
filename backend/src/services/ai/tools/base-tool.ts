import type { ToolDefinition, ToolMetadata, ToolExecutionResult, ToolExecutionOptions } from "../types/tool.types.js";

export class BaseTool {
  static metadata: ToolMetadata;

  getDefinition(): ToolDefinition {
    throw new Error("Tool must implement getDefinition()");
  }

  async execute(
    args: Record<string, unknown>,
    options?: ToolExecutionOptions
  ): Promise<ToolExecutionResult> {
    throw new Error("Tool must implement execute()");
  }

  checkAvailability(): boolean {
    const meta = (this.constructor as typeof BaseTool).metadata;
    if (!meta.requiresEnv || meta.requiresEnv.length === 0) return true;
    return meta.requiresEnv.every((key) => !!process.env[key]);
  }

  protected success(output: string, data?: Record<string, unknown>, durationMs?: number): ToolExecutionResult {
    return { success: true, output, data, durationMs: durationMs ?? 0 };
  }

  protected error(error: string, durationMs?: number): ToolExecutionResult {
    return { success: false, output: error, error, durationMs: durationMs ?? 0 };
  }
}
