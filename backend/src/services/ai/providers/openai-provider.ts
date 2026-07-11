import { AI_CONFIG } from "../config.js";
import { AGENT_CONFIG } from "../agent/agent-config.js";
import type { AIProvider, AIResponse, GenerationOptions, StreamChunk } from "./ai-provider.interface.js";
import type { AgentMessage, ToolCall } from "../types/message.types.js";
import { logger } from "../../../lib/logger/index.js";

interface OpenAIResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: string;
      content: string | null;
      tool_calls?: Array<{
        id: string;
        type: "function";
        function: { name: string; arguments: string };
      }>;
    };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

interface OpenAIStreamChunk {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    delta: {
      role?: string;
      content?: string | null;
      tool_calls?: Array<{
        index: number;
        id?: string;
        type?: "function";
        function?: { name?: string; arguments?: string };
      }>;
    };
    finish_reason: string | null;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export class OpenAIProvider implements AIProvider {
  name = "openai";
  private apiKey: string;
  private model: string;

  constructor() {
    this.apiKey = AI_CONFIG.apiKey;
    this.model = AI_CONFIG.model;
  }

  isAvailable(): boolean {
    return !!this.apiKey;
  }

  getModel(): string {
    return this.model;
  }

  async generateResponse(messages: AgentMessage[], options?: GenerationOptions): Promise<AIResponse> {
    if (!this.isAvailable()) {
      throw new Error("OpenAI API key not configured");
    }

    const body: Record<string, unknown> = {
      model: this.model,
      messages: this.toOpenAIMessages(messages),
      temperature: options?.temperature ?? AI_CONFIG.temperature,
      max_tokens: options?.maxTokens ?? AI_CONFIG.maxTokens,
      stop: options?.stopSequences,
    };

    if (options?.tools && options.tools.length > 0) {
      body.tools = options.tools;
      body.tool_choice = options.toolChoice || "auto";
    }

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(body),
      signal: options?.signal ?? AbortSignal.timeout(AGENT_CONFIG.requestTimeoutMs),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(`OpenAI API error (${response.status}): ${JSON.stringify(error)}`);
    }

    const data = (await response.json()) as OpenAIResponse;
    const choice = data.choices?.[0];

    if (!choice) {
      throw new Error("OpenAI API returned empty response");
    }

    let content = choice.message?.content || "";

    if (choice.message?.tool_calls) {
      content = JSON.stringify({
        content,
        tool_calls: choice.message.tool_calls.map((tc) => ({
          id: tc.id,
          type: "function" as const,
          function: { name: tc.function.name, arguments: tc.function.arguments },
        })),
      });
    }

    return {
      content,
      tokensUsed: data.usage?.total_tokens || 0,
      model: data.model || this.model,
      finishReason: choice.finish_reason || "unknown",
    };
  }

  async *streamResponse(messages: AgentMessage[], options?: GenerationOptions): AsyncIterable<StreamChunk> {
    if (!this.isAvailable()) {
      throw new Error("OpenAI API key not configured");
    }

    const body: Record<string, unknown> = {
      model: this.model,
      messages: this.toOpenAIMessages(messages),
      temperature: options?.temperature ?? AI_CONFIG.temperature,
      max_tokens: options?.maxTokens ?? AI_CONFIG.maxTokens,
      stream: true,
      stream_options: { include_usage: true },
    };

    if (options?.tools && options.tools.length > 0) {
      body.tools = options.tools;
      body.tool_choice = options.toolChoice || "auto";
    }

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(body),
      signal: options?.signal ?? AbortSignal.timeout(AGENT_CONFIG.requestTimeoutMs),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      yield { type: "error", content: `OpenAI API error (${response.status}): ${JSON.stringify(error)}` };
      return;
    }

    const reader = response.body?.getReader();
    if (!reader) {
      yield { type: "error", content: "Response body not readable" };
      return;
    }

    const decoder = new TextDecoder();
    let buffer = "";
    const toolCallAccumulators: Map<number, { id: string; name: string; arguments: string }> = new Map();

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith("data: ")) continue;

          const data = trimmed.substring(6);
          if (data === "[DONE]") {
            yield { type: "done" };
            continue;
          }

          try {
            const chunk = JSON.parse(data) as OpenAIStreamChunk;
            const delta = chunk.choices?.[0]?.delta;

            if (!delta) continue;

            if (delta.content) {
              yield { type: "text", content: delta.content };
            }

            if (delta.tool_calls) {
              for (const tc of delta.tool_calls) {
                const index = tc.index;
                let acc = toolCallAccumulators.get(index);

                if (!acc) {
                  acc = { id: tc.id || "", name: "", arguments: "" };
                  toolCallAccumulators.set(index, acc);
                }

                if (tc.id) acc.id = tc.id;
                if (tc.function?.name) acc.name += tc.function.name;
                if (tc.function?.arguments) acc.arguments += tc.function.arguments;

                if (tc.function?.name || tc.function?.arguments) {
                  yield {
                    type: "tool_call",
                    toolCall: {
                      id: acc.id,
                      name: acc.name || "unknown",
                      arguments: acc.arguments,
                    },
                  };
                }
              }
            }

            const finishReason = chunk.choices?.[0]?.finish_reason;
            if (finishReason) {
              yield {
                type: "done",
                finishReason,
                tokensUsed: chunk.usage?.total_tokens,
              };
            }
          } catch {
            // Skip malformed JSON lines
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  private toOpenAIMessages(messages: AgentMessage[]): Array<Record<string, unknown>> {
    return messages.map((msg) => {
      const base: Record<string, unknown> = { role: msg.role };

      if (msg.role === "tool") {
        base.content = msg.content;
        base.tool_call_id = msg.tool_call_id;
        base.name = msg.name;
      } else if (msg.tool_calls && msg.tool_calls.length > 0) {
        base.content = msg.content || null;
        base.tool_calls = msg.tool_calls.map((tc) => ({
          id: tc.id,
          type: "function",
          function: {
            name: tc.function.name,
            arguments: tc.function.arguments,
          },
        }));
      } else {
        base.content = msg.content;
      }

      return base;
    });
  }
}
