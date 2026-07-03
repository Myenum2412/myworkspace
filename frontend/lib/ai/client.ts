import { AIProvider, AI_PROVIDERS, isOpenAICompatible } from "./providers";
import OpenAI from "openai";

export function createOpenAIClient(provider: AIProvider): OpenAI {
  const config = AI_PROVIDERS[provider];
  const apiKey = process.env[config.apiKeyEnv];
  if (!apiKey) {
    throw new Error(`${config.apiKeyEnv} environment variable is not configured`);
  }
  const clientConfig: { apiKey: string; baseURL?: string } = { apiKey };
  if (config.requiresBaseUrl || process.env[config.baseUrlEnv]) {
    clientConfig.baseURL = process.env[config.baseUrlEnv] || undefined;
  }
  return new OpenAI(clientConfig);
}

export async function createAnthropicClient() {
  const { Anthropic } = await import("@anthropic-ai/sdk");
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY environment variable is not configured");
  }
  return new Anthropic({ apiKey });
}

export async function createGeminiClient() {
  const { GoogleGenerativeAI } = await import("@google/generative-ai");
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY environment variable is not configured");
  }
  return new GoogleGenerativeAI(apiKey);
}

export function getClientForProvider(provider: AIProvider) {
  if (isOpenAICompatible(provider)) {
    return { type: "openai" as const, client: createOpenAIClient(provider), config: AI_PROVIDERS[provider] };
  }
  if (provider === "anthropic") {
    return { type: "anthropic" as const, client: null, config: AI_PROVIDERS[provider] };
  }
  if (provider === "gemini") {
    return { type: "gemini" as const, client: null, config: AI_PROVIDERS[provider] };
  }
  throw new Error(`Unsupported provider: ${provider}`);
}
