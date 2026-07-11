import { createModuleLogger, type Logger } from "../../../lib/logger/index.js";
import { AI_CONFIG } from "../config.js";
import type { TurnLog, AgentRunResult, AgentError } from "../types/agent.types.js";

export type AIInteractionEvent =
  | "agent_start"
  | "agent_complete"
  | "agent_error"
  | "turn_start"
  | "turn_complete"
  | "tool_call"
  | "tool_result"
  | "stream_chunk"
  | "memory_update"
  | "context_compressed"
  | "provider_fallback"
  | "rate_limited"
  | "interrupted";

export interface AIInteractionLog {
  event: AIInteractionEvent;
  sessionId: string;
  userId: string;
  organizationId?: string;
  timestamp: Date;
  durationMs?: number;
  metadata: Record<string, unknown>;
}

export class AILogger {
  private logger: Logger;
  private turnLogs: Map<string, TurnLog[]> = new Map();
  private sessionTokens: Map<string, number> = new Map();
  private sessionDurations: Map<string, number> = new Map();

  constructor() {
    this.logger = createModuleLogger("ai-agent");
  }

  startSession(sessionId: string, userId: string, organizationId?: string): void {
    this.turnLogs.set(sessionId, []);
    this.sessionTokens.set(sessionId, 0);
    this.sessionDurations.set(sessionId, Date.now());

    this.logInteraction({
      event: "agent_start",
      sessionId,
      userId,
      organizationId,
      timestamp: new Date(),
      metadata: {},
    });
  }

  endSession(sessionId: string, userId: string, result: AgentRunResult): void {
    this.logInteraction({
      event: "agent_complete",
      sessionId,
      userId,
      organizationId: result.session.organizationId,
      timestamp: new Date(),
      durationMs: result.durationMs,
      metadata: {
        totalTurns: result.turnLogs.length,
        totalTokens: result.tokensUsed,
        error: result.error || null,
      },
    });

    if (AI_CONFIG.enableDebugLogs) {
      this.logger.info({
        sessionId,
        turns: result.turnLogs.length,
        tokens: result.tokensUsed,
        durationMs: result.durationMs,
        error: result.error || null,
      }, "AI Agent session complete");
    }
  }

  logTurn(turn: TurnLog): void {
    const logs = this.turnLogs.get(turn.turnNumber.toString()) || [];
    logs.push(turn);
    this.turnLogs.set(turn.turnNumber.toString(), logs);

    const currentTokens = this.sessionTokens.get(turn.turnNumber.toString()) || 0;
    this.sessionTokens.set(turn.turnNumber.toString(), currentTokens + turn.tokensUsed);

    this.logInteraction({
      event: "turn_complete",
      sessionId: "",
      userId: "",
      timestamp: new Date(),
      durationMs: turn.durationMs,
      metadata: {
        turnNumber: turn.turnNumber,
        intent: turn.intent.intent,
        toolCalls: turn.toolCalls.length,
        tokensUsed: turn.tokensUsed,
        compressed: turn.compressed,
      },
    });
  }

  logToolCall(sessionId: string, toolName: string, args: Record<string, unknown>, durationMs: number, success: boolean): void {
    this.logInteraction({
      event: success ? "tool_result" : "tool_call",
      sessionId,
      userId: "",
      timestamp: new Date(),
      durationMs,
      metadata: {
        tool: toolName,
        arguments: args,
        success,
      },
    });
  }

  logError(sessionId: string, userId: string, error: AgentError): void {
    this.logInteraction({
      event: "agent_error",
      sessionId,
      userId,
      timestamp: new Date(),
      metadata: {
        code: error.code,
        message: error.message,
        recoverable: error.recoverable,
        retryAfter: error.retryAfter,
      },
    });

    this.logger.error({ sessionId, error }, "AI Agent error");
  }

  logProviderFallback(sessionId: string, fromProvider: string, toProvider: string): void {
    this.logInteraction({
      event: "provider_fallback",
      sessionId,
      userId: "",
      timestamp: new Date(),
      metadata: { from: fromProvider, to: toProvider },
    });
  }

  logContextCompression(sessionId: string, beforeCount: number, afterCount: number): void {
    this.logInteraction({
      event: "context_compressed",
      sessionId,
      userId: "",
      timestamp: new Date(),
      metadata: { beforeCount, afterCount },
    });
  }

  logInteraction(data: AIInteractionLog): void {
    const logLevel = data.event === "agent_error" ? "error" : "debug";
    (this.logger as any)[logLevel](
      {
        event: data.event,
        sessionId: data.sessionId,
        userId: data.userId,
        durationMs: data.durationMs,
        ...data.metadata,
      },
      `[AI] ${data.event}`
    );
  }

  getTurnLogs(sessionId: string): TurnLog[] {
    return this.turnLogs.get(sessionId) || [];
  }
}

export const aiLogger = new AILogger();
