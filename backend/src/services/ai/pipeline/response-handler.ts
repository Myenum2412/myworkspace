import type { AgentMessage, OutgoingMessage } from "../types/message.types.js";
import { logger } from "../../../lib/logger/index.js";

export type StreamChunkCallback = (chunk: string) => void;
export type ToolCallCallback = (toolName: string, args: Record<string, unknown>) => void;
export type StatusCallback = (status: string) => void;

export interface ResponseCallbacks {
  onStreamChunk?: StreamChunkCallback;
  onToolCall?: ToolCallCallback;
  onStatus?: StatusCallback;
}

export class ResponseHandler {
  private isStreaming = false;

  async formatResponse(
    content: string,
    callbacks?: ResponseCallbacks
  ): Promise<OutgoingMessage> {
    const trimmed = content.trim();
    const silenceTokens = ["[SILENT]", "SILENT", "NO_REPLY", "NO REPLY"];

    if (silenceTokens.includes(content.trim())) {
      return { text: "", isFinal: true };
    }

    callbacks?.onStatus?.("complete");

    return {
      text: trimmed,
      isFinal: true,
    };
  }

  async processStreamedChunk(
    chunk: string,
    callbacks?: ResponseCallbacks
  ): Promise<string | null> {
    if (!this.isStreaming) {
      this.isStreaming = true;
      callbacks?.onStatus?.("streaming");
    }

    callbacks?.onStreamChunk?.(chunk);

    return chunk;
  }

  formatToolResult(
    toolName: string,
    result: string,
    durationMs: number
  ): string {
    return `[Tool ${toolName} completed in ${durationMs}ms]\n${result}`;
  }

  formatToolError(toolName: string, error: string): string {
    logger.error({ toolName, error }, "Tool error formatted for model");
    return `[Tool ${toolName} error: ${error}]`;
  }

  extractTextContent(msg: AgentMessage): string {
    if (msg.role === "tool") {
      return `[Tool result: ${msg.content.substring(0, 200)}]`;
    }
    return msg.content || "";
  }

  async finalize(callbacks?: ResponseCallbacks): Promise<void> {
    this.isStreaming = false;
    callbacks?.onStatus?.("complete");
  }
}
