import { AI_CONFIG } from "../config.js";
import { AGENT_CONFIG } from "../agent/agent-config.js";
import type { AIProvider, AIResponse, GenerationOptions, StreamChunk } from "./ai-provider.interface.js";
import type { AgentMessage } from "../types/message.types.js";
import { logger } from "../../../lib/logger/index.js";

interface AnthropicMessage {
  role: "user" | "assistant";
  content: string | AnthropicContentBlock[];
}

interface AnthropicContentBlock {
  type: "text" | "tool_use" | "tool_result";
  text?: string;
  id?: string;
  name?: string;
  input?: Record<string, unknown>;
  content?: string;
  tool_use_id?: string;
}

interface AnthropicResponse {
  id: string;
  type: string;
  role: string;
  content: AnthropicContentBlock[];
  model: string;
  stop_reason: string;
  usage: {
    input_tokens: number;
    output_tokens: number;
  };
}

export class AnthropicProvider implements AIProvider {
  name = "anthropic";
  private apiKey: string;
  private model: string;
  private apiBase: string;
  private apiVersion: string;

  constructor() {
    this.apiKey = process.env.ANTHROPIC_API_KEY || "";
    this.model = process.env.ANTHROPIC_MODEL || "claude-3-5-sonnet-20241022";
    this.apiBase = process.env.ANTHROPIC_API_BASE || "https://api.anthropic.com/v1";
    this.apiVersion = "2023-06-01";
  }

  isAvailable(): boolean {
    return !!this.apiKey;
  }

  getModel(): string {
    return this.model;
  }

  private getHeaders(): Record<string, string> {
    return {
      "Content-Type": "application/json",
      "x-api-key": this.apiKey,
      "anthropic-version": this.apiVersion,
    };
  }

  async generateResponse(messages: AgentMessage[], options?: GenerationOptions): Promise<AIResponse> {
    if (!this.isAvailable()) {
      throw new Error("Anthropic API key not configured");
    }

    const { system, anthropicMessages } = this.toAnthropicMessages(messages);

    const body: Record<string, unknown> = {
      model: this.model,
      max_tokens: options?.maxTokens ?? AI_CONFIG.maxTokens,
      messages: anthropicMessages,
      temperature: options?.temperature ?? AI_CONFIG.temperature,
    };

    if (system) {
      body.system = system;
    }

    if (options?.tools && options.tools.length > 0) {
      body.tools = options.tools.map((t) => ({
        name: t.name,
        description: t.description,
        input_schema: t.parameters as Record<string, unknown>,
      }));
    }

    const response = await fetch(`${this.apiBase}/messages`, {
      method: "POST",
      headers: this.getHeaders(),
      body: JSON.stringify(body),
      signal: options?.signal ?? AbortSignal.timeout(AGENT_CONFIG.requestTimeoutMs),
    });

    if (!response.ok) {
      const error = await response.text().catch(() => "Unknown error");
      throw new Error(`Anthropic API error (${response.status}): ${error}`);
    }

    const data = (await response.json()) as AnthropicResponse;

    let content = "";
    const toolCalls: Array<{ id: string; name: string; arguments: string }> = [];

    for (const block of data.content) {
      if (block.type === "text") {
        content += block.text || "";
      } else if (block.type === "tool_use" && block.name && block.input) {
        toolCalls.push({
          id: block.id || `tc_${Date.now()}`,
          name: block.name,
          arguments: JSON.stringify(block.input),
        });
      }
    }

    if (toolCalls.length > 0) {
      content = JSON.stringify({
        content,
        tool_calls: toolCalls.map((tc) => ({
          id: tc.id,
          type: "function" as const,
          function: { name: tc.name, arguments: tc.arguments },
        })),
      });
    }

    return {
      content,
      tokensUsed: (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0),
      model: data.model || this.model,
      finishReason: data.stop_reason || "end_turn",
    };
  }

  async *streamResponse(messages: AgentMessage[], options?: GenerationOptions): AsyncIterable<StreamChunk> {
    if (!this.isAvailable()) {
      throw new Error("Anthropic API key not configured");
    }

    const { system, anthropicMessages } = this.toAnthropicMessages(messages);

    const body: Record<string, unknown> = {
      model: this.model,
      max_tokens: options?.maxTokens ?? AI_CONFIG.maxTokens,
      messages: anthropicMessages,
      temperature: options?.temperature ?? AI_CONFIG.temperature,
      stream: true,
    };

    if (system) {
      body.system = system;
    }

    const response = await fetch(`${this.apiBase}/messages`, {
      method: "POST",
      headers: this.getHeaders(),
      body: JSON.stringify(body),
      signal: options?.signal ?? AbortSignal.timeout(AGENT_CONFIG.requestTimeoutMs),
    });

    if (!response.ok) {
      const error = await response.text().catch(() => "");
      yield { type: "error", content: `Anthropic API error (${response.status}): ${error}` };
      return;
    }

    const reader = response.body?.getReader();
    if (!reader) {
      yield { type: "error", content: "Response body not readable" };
      return;
    }

    const decoder = new TextDecoder();
    let buffer = "";

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith("data: ")) continue;
          const data = trimmed.substring(6);

          if (data === "[DONE]") {
            yield { type: "done" };
            continue;
          }

          try {
            const event = JSON.parse(data);

            if (event.type === "content_block_delta" && event.delta?.type === "text_delta") {
              yield { type: "text", content: event.delta.text };
            }

            if (event.type === "content_block_start" && event.content_block?.type === "tool_use") {
              yield {
                type: "tool_call",
                toolCall: {
                  id: event.content_block.id,
                  name: event.content_block.name,
                  arguments: JSON.stringify(event.content_block.input || {}),
                },
              };
            }

            if (event.type === "message_delta") {
              yield {
                type: "done",
                finishReason: event.delta?.stop_reason,
                tokensUsed: (event.usage?.input_tokens || 0) + (event.usage?.output_tokens || 0),
              };
            }
          } catch {
            // Skip malformed JSON
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  private toAnthropicMessages(messages: AgentMessage[]): {
    system?: string;
    anthropicMessages: AnthropicMessage[];
  } {
    let system: string | undefined;
    const anthropicMessages: AnthropicMessage[] = [];

    for (const msg of messages) {
      if (msg.role === "system") {
        system = (system ? system + "\n" : "") + msg.content;
        continue;
      }

      if (msg.role === "tool") {
        const lastAssistant = anthropicMessages[anthropicMessages.length - 1];
        if (lastAssistant?.role === "assistant" && Array.isArray(lastAssistant.content)) {
          (lastAssistant.content as AnthropicContentBlock[]).push({
            type: "tool_result",
            tool_use_id: msg.tool_call_id,
            content: msg.content,
          });
        }
        continue;
      }

      const role = msg.role === "assistant" ? "assistant" : "user";

      if (msg.tool_calls && msg.tool_calls.length > 0) {
        const content: AnthropicContentBlock[] = [];
        if (msg.content) {
          content.push({ type: "text", text: msg.content });
        }
        for (const tc of msg.tool_calls) {
          content.push({
            type: "tool_use",
            id: tc.id,
            name: tc.function.name,
            input: JSON.parse(tc.function.arguments || "{}"),
          });
        }
        anthropicMessages.push({ role, content });
      } else {
        anthropicMessages.push({ role, content: msg.content });
      }
    }

    return { system, anthropicMessages };
  }
}
