import type { AgentMessage } from "../types/message.types.js";
import type { ToolDefinition } from "../types/tool.types.js";

export interface AIMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface AIResponse {
  content: string;
  tokensUsed: number;
  model: string;
  finishReason: string;
}

export interface GenerationOptions {
  temperature?: number;
  maxTokens?: number;
  stopSequences?: string[];
  tools?: ToolDefinition[];
  toolChoice?: "auto" | "none" | { type: "function"; function: { name: string } };
  stream?: boolean;
  onStreamChunk?: (chunk: string) => void;
  signal?: AbortSignal;
}

export interface StreamChunk {
  type: "text" | "tool_call" | "done" | "error";
  content?: string;
  toolCall?: {
    id: string;
    name: string;
    arguments: string;
  };
  finishReason?: string;
  tokensUsed?: number;
}

export interface AIProvider {
  name: string;
  generateResponse(messages: AgentMessage[], options?: GenerationOptions): Promise<AIResponse>;
  streamResponse(messages: AgentMessage[], options?: GenerationOptions): AsyncIterable<StreamChunk>;
  isAvailable(): boolean;
  getModel(): string;
}
