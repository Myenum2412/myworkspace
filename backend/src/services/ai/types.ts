export type AIProvider = "openrouter" | "openai" | "claude" | "azure";

export interface AIProviderConfig {
  apiKey: string;
  model: string;
  temperature: number;
  maxTokens: number;
  responseLength: "short" | "medium" | "long";
  systemPrompt: string;
  streamingEnabled: boolean;
}

export interface AICompletionRequest {
  messages: Array<{ role: "user" | "assistant" | "system"; content: string }>;
  config: AIProviderConfig;
  context?: Record<string, unknown>;
}

export interface AICompletionResponse {
  content: string;
  responseId?: string;
  model: string;
  tokens: {
    prompt: number;
    completion: number;
    total: number;
  };
  executionTime: number;
}

export interface AIStreamChunk {
  content: string;
  done: boolean;
  responseId?: string;
  tokens?: {
    prompt: number;
    completion: number;
    total: number;
  };
}

export interface IAIAction {
  id: string;
  label: string;
  icon: string;
  prompt: string;
  context: ("workspace" | "staff")[];
}
