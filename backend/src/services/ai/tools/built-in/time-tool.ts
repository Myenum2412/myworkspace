import { BaseTool } from "../base-tool.js";
import type { ToolDefinition, ToolExecutionResult, ToolExecutionOptions, ToolMetadata } from "../../types/tool.types.js";

export class TimeTool extends BaseTool {
  static metadata: ToolMetadata = {
    name: "get_time",
    description: "Get the current date and time",
    toolset: "core",
    emoji: "🕐",
  };

  getDefinition(): ToolDefinition {
    return {
      name: "get_time",
      description: "Get the current date and time information including timezone",
      parameters: {
        type: "object",
        properties: {
          timezone: {
            type: "string",
            description: "Optional timezone (e.g., 'Asia/Kolkata', 'America/New_York'). Defaults to UTC.",
          },
        },
      },
    };
  }

  async execute(args: Record<string, unknown>, _options?: ToolExecutionOptions): Promise<ToolExecutionResult> {
    const timezone = String(args.timezone || "UTC");
    const now = new Date();

    try {
      const formatter = new Intl.DateTimeFormat("en-US", {
        timeZone: timezone,
        dateStyle: "full",
        timeStyle: "long",
      });

      return this.success(
        `Current time (${timezone}): ${formatter.format(now)}`,
        {
          iso: now.toISOString(),
          timestamp: now.getTime(),
          timezone,
          formatted: formatter.format(now),
        }
      );
    } catch {
      return this.success(
        `Current time (UTC): ${now.toISOString()}`,
        {
          iso: now.toISOString(),
          timestamp: now.getTime(),
          timezone: "UTC",
          formatted: now.toISOString(),
        }
      );
    }
  }
}
