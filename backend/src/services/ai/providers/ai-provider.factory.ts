import { AI_CONFIG } from "../config.js";
import { AGENT_CONFIG } from "../agent/agent-config.js";
import type { AIProvider } from "./ai-provider.interface.js";
import { OpenAIProvider } from "./openai-provider.js";
import { logger } from "../../../lib/logger/index.js";

export class AIProviderFactory {
  private static instance: AIProvider | null = null;
  private static fallbackChain: string[] = [];
  private static fallbackIndex = 0;

  static getProvider(): AIProvider {
    if (!this.instance) {
      this.instance = this.createProvider(AI_CONFIG.provider);
      this.fallbackChain = AGENT_CONFIG.fallbackProviders;
    }
    return this.instance;
  }

  static getProviderWithFallback(): AIProvider {
    const provider = this.getProvider();

    if (provider.isAvailable()) return provider;

    if (this.fallbackChain.length > 0) {
      for (const fallback of this.fallbackChain) {
        const fb = this.createProvider(fallback);
        if (fb.isAvailable()) {
          logger.warn({ fallbackProvider: fallback }, "Using fallback AI provider");
          this.instance = fb;
          return fb;
        }
      }
    }

    logger.error("No AI providers available (primary + all fallbacks)");
    return provider;
  }

  private static createProvider(providerName: string): AIProvider {
    switch (providerName.toLowerCase()) {
      case "openai":
        return new OpenAIProvider();
      default:
        logger.warn({ provider: providerName }, "Unknown AI provider, falling back to OpenAI");
        return new OpenAIProvider();
    }
  }

  static reset(): void {
    this.instance = null;
    this.fallbackChain = [];
    this.fallbackIndex = 0;
  }
}
