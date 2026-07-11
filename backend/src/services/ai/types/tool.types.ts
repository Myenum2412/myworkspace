export interface ToolDefinition {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
  required?: string[];
}

export interface ToolMetadata {
  name: string;
  description: string;
  toolset: string;
  requiresEnv?: string[];
  isAsync?: boolean;
  emoji?: string;
  dangerLevel?: "none" | "low" | "medium" | "high";
}

export interface ToolExecutionResult {
  success: boolean;
  output: string;
  data?: Record<string, unknown>;
  error?: string;
  durationMs: number;
}

export interface ToolExecutionOptions {
  timeout?: number;
  retryCount?: number;
  userId?: string;
  organizationId?: string;
}

// ToolConstructor is defined in tools/registry.ts to avoid circular deps
