export type AIProvider = "openai" | "anthropic" | "gemini" | "openrouter" | "nvidia" | "local";

export interface AIProviderConfig {
  name: AIProvider;
  displayName: string;
  apiKeyEnv: string;
  baseUrlEnv: string;
  defaultModel: string;
  requiresBaseUrl: boolean;
  streamingSupport: boolean;
}

export const AI_PROVIDERS: Record<AIProvider, AIProviderConfig> = {
  openai: { name: "openai", displayName: "OpenAI", apiKeyEnv: "OPENAI_API_KEY", baseUrlEnv: "OPENAI_BASE_URL", defaultModel: "gpt-4o", requiresBaseUrl: false, streamingSupport: true },
  anthropic: { name: "anthropic", displayName: "Anthropic", apiKeyEnv: "ANTHROPIC_API_KEY", baseUrlEnv: "ANTHROPIC_BASE_URL", defaultModel: "claude-sonnet-4-20250514", requiresBaseUrl: false, streamingSupport: true },
  gemini: { name: "gemini", displayName: "Google Gemini", apiKeyEnv: "GEMINI_API_KEY", baseUrlEnv: "GEMINI_BASE_URL", defaultModel: "gemini-2.0-flash", requiresBaseUrl: false, streamingSupport: true },
  openrouter: { name: "openrouter", displayName: "OpenRouter", apiKeyEnv: "OPENROUTER_API_KEY", baseUrlEnv: "OPENROUTER_BASE_URL", defaultModel: "openai/gpt-4o", requiresBaseUrl: false, streamingSupport: true },
  nvidia: { name: "nvidia", displayName: "NVIDIA NIM", apiKeyEnv: "NVIDIA_API_KEY", baseUrlEnv: "NVIDIA_API_BASE", defaultModel: "nvidia/nemotron-3-ultra-550b-a55b", requiresBaseUrl: true, streamingSupport: true },
  local: { name: "local", displayName: "Local LLM", apiKeyEnv: "LOCAL_LLM_API_KEY", baseUrlEnv: "LOCAL_LLM_BASE_URL", defaultModel: "local-model", requiresBaseUrl: true, streamingSupport: true },
};

export function getProviderConfig(provider: AIProvider): AIProviderConfig {
  return AI_PROVIDERS[provider];
}

export function isOpenAICompatible(provider: AIProvider): boolean {
  return provider === "openai" || provider === "openrouter" || provider === "nvidia" || provider === "local";
}
