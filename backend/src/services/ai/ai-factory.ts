import { AIProvider } from "./types.js";
import type { IAIProvider } from "./base-provider.js";
import { OpenRouterProvider } from "./openrouter-provider.js";
import { OpenAIProvider } from "./openai-provider.js";
import { ClaudeProvider } from "./claude-provider.js";
import { AzureProvider } from "./azure-provider.js";
import { AppError } from "../../middleware/error.js";

const providerCache = new Map<string, IAIProvider>();

export function getAIProvider(provider: AIProvider): IAIProvider {
  const cached = providerCache.get(provider);
  if (cached) return cached;

  let instance: IAIProvider;

  switch (provider) {
    case "openrouter":
      instance = new OpenRouterProvider();
      break;
    case "openai":
      instance = new OpenAIProvider();
      break;
    case "claude":
      instance = new ClaudeProvider();
      break;
    case "azure":
      instance = new AzureProvider();
      break;
    default:
      throw new AppError(400, `Unsupported AI provider: ${provider}`);
  }

  providerCache.set(provider, instance);
  return instance;
}

export function clearProviderCache(): void {
  providerCache.clear();
}
