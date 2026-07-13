export type ProviderName =
  | "openai"
  | "anthropic"
  | "google"
  | "azure"
  | "ollama"
  | "lmstudio"
  | "groq"
  | "openrouter"
  | "deepseek"
  | "together"
  | "mistral"
  | "perplexity"
  | "replicate"
  | "cohere"
  | "custom";

export interface ProviderConfig {
  name: ProviderName;
  displayName: string;
  apiKey?: string;
  baseUrl?: string;
  models: string[];
  defaultModel: string;
  capabilities: ProviderCapability[];
  costPer1KTokens: {
    input: number;
    output: number;
  };
  rateLimits?: {
    requestsPerMinute: number;
    tokensPerMinute: number;
  };
  headers?: Record<string, string>;
  isEnabled: boolean;
  priority: number;
}

export type ProviderCapability =
  | "chat"
  | "streaming"
  | "function_calling"
  | "vision"
  | "embeddings"
  | "image_generation"
  | "json_mode"
  | "structured_output"
  | "tool_use";

export interface ModelInfo {
  id: string;
  provider: ProviderName;
  displayName: string;
  maxTokens: number;
  maxInputTokens: number;
  supportsStreaming: boolean;
  supportsFunctionCalling: boolean;
  supportsVision: boolean;
  supportsJsonMode: boolean;
  costPer1KTokens: {
    input: number;
    output: number;
  };
  isFree: boolean;
  contextWindow: number;
}

export interface RouterConfig {
  strategy: "manual" | "auto" | "cost_optimized" | "latency_optimized" | "capability_routed";
  fallbackStrategy: "sequential" | "parallel_first" | "failover";
  maxRetries: number;
  timeoutMs: number;
  enableModelFallback: boolean;
  enableProviderFallback: boolean;
  enableCostTracking: boolean;
  enableLatencyTracking: boolean;
}

export const PROVIDER_REGISTRY: Record<ProviderName, ProviderConfig> = {
  openai: {
    name: "openai",
    displayName: "OpenAI",
    models: ["gpt-4o", "gpt-4o-mini", "gpt-4-turbo", "gpt-3.5-turbo", "o1", "o3-mini"],
    defaultModel: "gpt-4o-mini",
    capabilities: ["chat", "streaming", "function_calling", "vision", "embeddings", "image_generation", "json_mode", "structured_output", "tool_use"],
    costPer1KTokens: { input: 0.15, output: 0.60 },
    isEnabled: true,
    priority: 1,
  },
  anthropic: {
    name: "anthropic",
    displayName: "Anthropic Claude",
    models: ["claude-3-5-sonnet-20241022", "claude-3-5-haiku-20241022", "claude-3-opus-20240229"],
    defaultModel: "claude-3-5-sonnet-20241022",
    capabilities: ["chat", "streaming", "function_calling", "vision", "json_mode"],
    costPer1KTokens: { input: 3.00, output: 15.00 },
    isEnabled: true,
    priority: 2,
  },
  google: {
    name: "google",
    displayName: "Google Gemini",
    models: ["gemini-2.0-flash", "gemini-2.0-pro", "gemini-1.5-pro", "gemini-1.5-flash"],
    defaultModel: "gemini-2.0-flash",
    capabilities: ["chat", "streaming", "function_calling", "vision", "embeddings", "json_mode"],
    costPer1KTokens: { input: 0.10, output: 0.40 },
    isEnabled: true,
    priority: 3,
  },
  azure: {
    name: "azure",
    displayName: "Azure OpenAI",
    models: ["gpt-4o", "gpt-4o-mini", "gpt-4-turbo"],
    defaultModel: "gpt-4o-mini",
    capabilities: ["chat", "streaming", "function_calling", "vision", "embeddings", "json_mode"],
    costPer1KTokens: { input: 0.15, output: 0.60 },
    isEnabled: true,
    priority: 4,
  },
  ollama: {
    name: "ollama",
    displayName: "Ollama (Local)",
    models: ["llama3.1", "llama3", "mistral", "mixtral", "qwen2.5", "deepseek-r1", "phi4", "gemma2"],
    defaultModel: "llama3.1",
    capabilities: ["chat", "streaming", "function_calling", "vision", "embeddings", "json_mode"],
    costPer1KTokens: { input: 0, output: 0 },
    isEnabled: true,
    priority: 10,
  },
  lmstudio: {
    name: "lmstudio",
    displayName: "LM Studio (Local)",
    models: ["local-model"],
    defaultModel: "local-model",
    capabilities: ["chat", "streaming", "function_calling"],
    costPer1KTokens: { input: 0, output: 0 },
    isEnabled: true,
    priority: 11,
  },
  groq: {
    name: "groq",
    displayName: "Groq",
    models: ["llama3-70b-8192", "llama3-8b-8192", "mixtral-8x7b-32768", "gemma2-9b-it"],
    defaultModel: "llama3-70b-8192",
    capabilities: ["chat", "streaming", "function_calling", "json_mode"],
    costPer1KTokens: { input: 0.59, output: 0.79 },
    isEnabled: true,
    priority: 5,
  },
  openrouter: {
    name: "openrouter",
    displayName: "OpenRouter",
    models: ["*"],
    defaultModel: "openai/gpt-4o-mini",
    capabilities: ["chat", "streaming", "function_calling", "vision", "json_mode"],
    costPer1KTokens: { input: 0, output: 0 },
    isEnabled: true,
    priority: 6,
  },
  deepseek: {
    name: "deepseek",
    displayName: "DeepSeek",
    models: ["deepseek-chat", "deepseek-coder", "deepseek-reasoner"],
    defaultModel: "deepseek-chat",
    capabilities: ["chat", "streaming", "function_calling", "json_mode"],
    costPer1KTokens: { input: 0.14, output: 0.28 },
    isEnabled: true,
    priority: 7,
  },
  together: {
    name: "together",
    displayName: "Together AI",
    models: ["meta-llama/Llama-3.3-70B-Instruct-Turbo", "mistralai/Mixtral-8x22B-Instruct-v0.1"],
    defaultModel: "meta-llama/Llama-3.3-70B-Instruct-Turbo",
    capabilities: ["chat", "streaming", "function_calling"],
    costPer1KTokens: { input: 0.10, output: 0.10 },
    isEnabled: true,
    priority: 8,
  },
  mistral: {
    name: "mistral",
    displayName: "Mistral AI",
    models: ["mistral-large-latest", "mistral-small-latest", "codestral-latest"],
    defaultModel: "mistral-large-latest",
    capabilities: ["chat", "streaming", "function_calling", "vision", "json_mode"],
    costPer1KTokens: { input: 2.00, output: 6.00 },
    isEnabled: true,
    priority: 9,
  },
  perplexity: {
    name: "perplexity",
    displayName: "Perplexity",
    models: ["sonar-pro", "sonar", "sonar-deep-research"],
    defaultModel: "sonar-pro",
    capabilities: ["chat", "streaming", "json_mode"],
    costPer1KTokens: { input: 1.00, output: 1.00 },
    isEnabled: true,
    priority: 12,
  },
  replicate: {
    name: "replicate",
    displayName: "Replicate",
    models: ["meta/meta-llama-3-70b-instruct"],
    defaultModel: "meta/meta-llama-3-70b-instruct",
    capabilities: ["chat", "streaming"],
    costPer1KTokens: { input: 0.65, output: 2.75 },
    isEnabled: true,
    priority: 13,
  },
  cohere: {
    name: "cohere",
    displayName: "Cohere",
    models: ["command-r-plus", "command-r", "command-light"],
    defaultModel: "command-r-plus",
    capabilities: ["chat", "streaming", "embeddings"],
    costPer1KTokens: { input: 3.00, output: 15.00 },
    isEnabled: true,
    priority: 14,
  },
  custom: {
    name: "custom",
    displayName: "Custom Provider",
    models: ["*"],
    defaultModel: "*",
    capabilities: ["chat", "streaming"],
    costPer1KTokens: { input: 0, output: 0 },
    isEnabled: true,
    priority: 99,
  },
};
