import { AI_CONFIG } from "../config.js";
import { AGENT_CONFIG } from "../agent/agent-config.js";
import type { AIProvider, AIResponse, GenerationOptions, StreamChunk } from "./ai-provider.interface.js";
import type { AgentMessage } from "../types/message.types.js";

interface GeminiContent {
  role: string;
  parts: Array<{ text?: string; functionCall?: { name: string; args: Record<string, unknown> }; functionResponse?: { name: string; response: Record<string, unknown> } }>;
}

interface GeminiCandidate {
  content: GeminiContent;
  finishReason: string;
}

interface GeminiResponse {
  candidates: GeminiCandidate[];
  usageMetadata: {
    promptTokenCount: number;
    candidatesTokenCount: number;
    totalTokenCount: number;
  };
}

export class GeminiProvider implements AIProvider {
  name = "google";
  private apiKey: string;
  private model: string;
  private apiBase: string;

  constructor() {
    this.apiKey = process.env.GOOGLE_AI_API_KEY || process.env.GEMINI_API_KEY || "";
    this.model = process.env.GEMINI_MODEL || "gemini-2.0-flash";
    this.apiBase = process.env.GEMINI_API_BASE || "https://generativelanguage.googleapis.com/v1beta";
  }

  isAvailable(): boolean {
    return !!this.apiKey;
  }

  getModel(): string {
    return this.model;
  }

  private getUrl(): string {
    return `${this.apiBase}/models/${this.model}:generateContent`;
  }

  private getStreamUrl(): string {
    return `${this.apiBase}/models/${this.model}:streamGenerateContent?alt=sse`;
  }

  async generateResponse(messages: AgentMessage[], options?: GenerationOptions): Promise<AIResponse> {
    if (!this.isAvailable()) {
      throw new Error("Gemini API key not configured");
    }

    const contents = this.toGeminiContents(messages);
    const systemInstruction = messages.find((m) => m.role === "system")?.content;

    const body: Record<string, unknown> = {
      contents,
      generationConfig: {
        temperature: options?.temperature ?? AI_CONFIG.temperature,
        maxOutputTokens: options?.maxTokens ?? AI_CONFIG.maxTokens,
      },
    };

    if (systemInstruction) {
      body.systemInstruction = {
        role: "user",
        parts: [{ text: systemInstruction }],
      };
    }

    if (options?.tools && options.tools.length > 0) {
      body.tools = [
        {
          functionDeclarations: options.tools.map((t) => ({
            name: t.name,
            description: t.description,
            parameters: t.parameters,
          })),
        },
      ];
    }

    const url = `${this.getUrl()}?key=${this.apiKey}`;
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: options?.signal ?? AbortSignal.timeout(AGENT_CONFIG.requestTimeoutMs),
    });

    if (!response.ok) {
      throw new Error(`Gemini API error (${response.status}): ${await response.text()}`);
    }

    const data = (await response.json()) as GeminiResponse;

    let content = "";
    const toolCalls: Array<{ id: string; name: string; arguments: string }> = [];

    for (const candidate of data.candidates || []) {
      for (const part of candidate.content?.parts || []) {
        if (part.text) {
          content += part.text;
        }
        if (part.functionCall) {
          toolCalls.push({
            id: `fc_${Date.now()}_${toolCalls.length}`,
            name: part.functionCall.name,
            arguments: JSON.stringify(part.functionCall.args),
          });
        }
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
      tokensUsed: data.usageMetadata?.totalTokenCount || 0,
      model: this.model,
      finishReason: data.candidates?.[0]?.finishReason || "STOP",
    };
  }

  async *streamResponse(messages: AgentMessage[], options?: GenerationOptions): AsyncIterable<StreamChunk> {
    if (!this.isAvailable()) {
      throw new Error("Gemini API key not configured");
    }

    const contents = this.toGeminiContents(messages);
    const systemInstruction = messages.find((m) => m.role === "system")?.content;

    const body: Record<string, unknown> = {
      contents,
      generationConfig: {
        temperature: options?.temperature ?? AI_CONFIG.temperature,
        maxOutputTokens: options?.maxTokens ?? AI_CONFIG.maxTokens,
      },
    };

    if (systemInstruction) {
      body.systemInstruction = {
        role: "user",
        parts: [{ text: systemInstruction }],
      };
    }

    const url = `${this.getStreamUrl()}&key=${this.apiKey}`;
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: options?.signal ?? AbortSignal.timeout(AGENT_CONFIG.requestTimeoutMs),
    });

    if (!response.ok) {
      yield { type: "error", content: `Gemini API error (${response.status})` };
      return;
    }

    const reader = response.body?.getReader();
    if (!reader) return;

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

          try {
            const parsed = JSON.parse(data);
            const parts = parsed.candidates?.[0]?.content?.parts || [];
            for (const part of parts) {
              if (part.text) {
                yield { type: "text", content: part.text };
              }
              if (part.functionCall) {
                yield {
                  type: "tool_call",
                  toolCall: {
                    id: `fc_${Date.now()}`,
                    name: part.functionCall.name,
                    arguments: JSON.stringify(part.functionCall.args),
                  },
                };
              }
            }
          } catch {
            // Skip malformed
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  private toGeminiContents(messages: AgentMessage[]): GeminiContent[] {
    const contents: GeminiContent[] = [];

    for (const msg of messages) {
      if (msg.role === "system") continue;

      const role = msg.role === "assistant" ? "model" : "user";
      const parts: GeminiContent["parts"] = [];

      if (msg.content) {
        parts.push({ text: msg.content });
      }

      if (msg.tool_calls) {
        for (const tc of msg.tool_calls) {
          parts.push({
            functionCall: {
              name: tc.function.name,
              args: JSON.parse(tc.function.arguments || "{}"),
            },
          });
        }
      }

      if (msg.role === "tool") {
        contents.push({
          role: "function",
          parts: [
            {
              functionResponse: {
                name: msg.name || "unknown",
                response: { result: msg.content },
              },
            },
          ],
        });
        continue;
      }

      if (parts.length > 0) {
        contents.push({ role, parts });
      }
    }

    return contents;
  }
}
