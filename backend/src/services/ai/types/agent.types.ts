import type { AgentMessage } from "./message.types.js";
import type { ToolMetadata, ToolExecutionResult } from "./tool.types.js";
import type { ConversationSession, MemoryEntry } from "./memory.types.js";
import type { IntentResult } from "../intent/intent-detector.js";

export type AgentState = "idle" | "thinking" | "executing_tool" | "responding" | "error" | "interrupted";

export interface AgentContext {
  sessionId: string;
  userId: string;
  organizationId?: string;
  turnCount: number;
  state: AgentState;
}

export interface TurnLog {
  turnNumber: number;
  userMessage: string;
  intent: IntentResult;
  systemPrompt: string;
  assistantResponse: string;
  toolCalls: ToolCallLog[];
  tokensUsed: number;
  durationMs: number;
  error?: string;
  compressed: boolean;
}

export interface ToolCallLog {
  toolName: string;
  arguments: Record<string, unknown>;
  result: ToolExecutionResult;
  timestamp: Date;
}

export interface AgentConfig {
  maxTurns: number;
  maxToolIterations: number;
  contextCompressionThreshold: number;
  contextCompressionTargetRatio: number;
  protectLastNMessages: number;
  enableStreaming: boolean;
  enableMemory: boolean;
  enableSelfReview: boolean;
  selfReviewInterval: number;
}

export interface SystemPromptTiers {
  stable: string;
  context: string;
  volatile: string;
}

export interface AgentRunResult {
  response: string;
  turnLogs: TurnLog[];
  session: ConversationSession;
  memoryUpdates: MemoryEntry[];
  durationMs: number;
  tokensUsed: number;
  error?: string;
}

export interface AgentError {
  code: string;
  message: string;
  recoverable: boolean;
  retryAfter?: number;
}
