import { AI_CONFIG } from "../config.js";
import { AGENT_CONFIG } from "../agent/agent-config.js";
import type { AIProvider } from "./ai-provider.interface.js";
import { OpenAIProvider } from "./openai-provider.js";
import { OpenRouterProvider } from "./openrouter-provider.js";
import { AnthropicProvider } from "./anthropic-provider.js";
import { GeminiProvider } from "./gemini-provider.js";
import { OllamaProvider, LMStudioProvider, GroqProvider, DeepSeekProvider, TogetherProvider, MistralProvider, PerplexityProvider } from "./ollama-provider.js";
import { modelRouter } from "./model-router.js";
import { logger } from "../../../lib/logger/index.js";

type ProviderConstructor = new () => AIProvider;

const providerRegistry: Record<string, ProviderConstructor> = {
  openai: OpenAIProvider,
  openrouter: OpenRouterProvider,
  anthropic: AnthropicProvider,
  claude: AnthropicProvider,
  google: GeminiProvider,
  gemini: GeminiProvider,
  ollama: OllamaProvider,
  lmstudio: LMStudioProvider,
  groq: GroqProvider,
  deepseek: DeepSeekProvider,
  together: TogetherProvider,
  mistral: MistralProvider,
  perplexity: PerplexityProvider,
};

export class AIProviderFactory {
  private static instance: AIProvider | null = null;
  private static fallbackChain: string[] = [];
  private static fallbackIndex = 0;

  static getProvider(): AIProvider {
    if (!this.instance) {
      this.instance = this.createProvider(AI_CONFIG.provider || "openrouter");
      this.fallbackChain = [
        ...AGENT_CONFIG.fallbackProviders,
        ...(process.env.AI_FALLBACK_PROVIDERS || "").split(",").filter(Boolean),
      ];
    }
    return this.instance;
  }

  static getProviderWithFallback(): AIProvider {
    const provider = this.getProvider();
    if (provider.isAvailable()) return provider;

    const chain = this.fallbackChain.length > 0
      ? this.fallbackChain
      : Object.keys(providerRegistry).filter((k) => k !== AI_CONFIG.provider);

    for (const fallback of chain) {
      const fb = this.createProvider(fallback);
      if (fb.isAvailable()) {
        logger.warn({ fallbackProvider: fallback }, "Using fallback AI provider");
        this.instance = fb;
        return fb;
      }
    }

    logger.error("No AI providers available (primary + all fallbacks)");
    return provider;
  }

  static getModelRouter() {
    return modelRouter;
  }

  static getAllProviders(): AIProvider[] {
    return modelRouter.getAllAvailableProviders();
  }

  static createProvider(providerName: string): AIProvider {
    const normalized = providerName.toLowerCase().trim();
    const Constructor = providerRegistry[normalized];

    if (Constructor) {
      return new Constructor();
    }

    logger.warn({ provider: providerName }, "Unknown AI provider, falling back to OpenAI");
    return new OpenAIProvider();
  }

  static async generateWithRouter(
    messages: Array<{ role: string; content: string }>,
    options?: {
      preferredProvider?: string;
      preferredModel?: string;
      temperature?: number;
      maxTokens?: number;
    }
  ) {
    return modelRouter.routeGenerate(messages, options);
  }

  static reset(): void {
    this.instance = null;
    this.fallbackChain = [];
    this.fallbackIndex = 0;
    modelRouter.reset();
  }
}
