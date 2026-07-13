import type { AIProvider, AIResponse, GenerationOptions } from "./ai-provider.interface.js";
import type { ProviderName, ProviderConfig, RouterConfig, ModelInfo } from "../types/provider.types.js";
import { PROVIDER_REGISTRY } from "../types/provider.types.js";
import { OpenAIProvider } from "./openai-provider.js";
import { OpenRouterProvider } from "./openrouter-provider.js";
import { AnthropicProvider } from "./anthropic-provider.js";
import { GeminiProvider } from "./gemini-provider.js";
import { OllamaProvider, LMStudioProvider, GroqProvider, DeepSeekProvider, TogetherProvider, MistralProvider, PerplexityProvider } from "./ollama-provider.js";
import { logger } from "../../../lib/logger/index.js";
import { EventEmitter } from "events";

const providerConstructors: Record<string, new () => AIProvider> = {
  openai: OpenAIProvider,
  openrouter: OpenRouterProvider,
  anthropic: AnthropicProvider,
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

export class ModelRouter extends EventEmitter {
  private providers: Map<string, AIProvider> = new Map();
  private costTracker: Map<string, { totalCost: number; totalTokens: number; totalCalls: number }> = new Map();
  private latencyTracker: Map<string, { totalMs: number; calls: number }> = new Map();
  private config: RouterConfig;

  constructor(config?: Partial<RouterConfig>) {
    super();
    this.config = {
      strategy: "auto",
      fallbackStrategy: "sequential",
      maxRetries: 3,
      timeoutMs: 30000,
      enableModelFallback: true,
      enableProviderFallback: true,
      enableCostTracking: true,
      enableLatencyTracking: true,
      ...config,
    };
  }

  getProvider(name: string): AIProvider | undefined {
    if (!this.providers.has(name)) {
      this.initializeProvider(name);
    }
    return this.providers.get(name);
  }

  getAllAvailableProviders(): AIProvider[] {
    const available: AIProvider[] = [];
    for (const [name] of Object.entries(providerConstructors)) {
      const provider = this.getProvider(name);
      if (provider?.isAvailable()) {
        available.push(provider);
      }
    }
    return available;
  }

  private initializeProvider(name: string): void {
    const normalized = name.toLowerCase();
    const ctor = providerConstructors[normalized];
    if (!ctor) {
      logger.warn({ provider: name }, "Unknown provider requested");
      return;
    }
    try {
      const provider = new ctor();
      this.providers.set(normalized, provider);
    } catch (error) {
      logger.error({ provider: name, error }, "Failed to initialize provider");
    }
  }

  async routeGenerate(
    messages: Array<{ role: string; content: string }>,
    options?: GenerationOptions & { preferredProvider?: string; preferredModel?: string }
  ): Promise<AIResponse> {
    const preferredProvider = options?.preferredProvider || process.env.AI_PROVIDER || "openrouter";
    const preferredModel = options?.preferredModel || process.env.AI_MODEL;

    let provider = this.getProvider(preferredProvider);

    if (!provider?.isAvailable()) {
      const fallbackResult = await this.tryFallbackProviders(messages, options);
      if (fallbackResult) return fallbackResult;
    }

    if (!provider) {
      throw new Error("No AI provider available");
    }

    const startTime = Date.now();
    let lastError: Error | undefined;

    for (let attempt = 0; attempt < this.config.maxRetries; attempt++) {
      try {
        const agentMessages = messages as any;
        const response = await provider!.generateResponse(agentMessages, options);

        if (this.config.enableCostTracking) {
          this.trackCost(provider!.name, response.tokensUsed);
        }
        if (this.config.enableLatencyTracking) {
          this.trackLatency(provider!.name, Date.now() - startTime);
        }

        return response;
      } catch (error) {
        lastError = error as Error;
        logger.warn({
          provider: provider!.name,
          attempt: attempt + 1,
          error: (error as Error).message,
        }, "Provider request failed, will retry/fallback");

        if (attempt < this.config.maxRetries - 1) {
          await this.delay(Math.pow(2, attempt) * 1000);
          continue;
        }

        if (this.config.enableProviderFallback) {
          const fallbackResult = await this.tryFallbackProviders(messages, options);
          if (fallbackResult) return fallbackResult;
        }
      }
    }

    throw lastError || new Error("All providers failed");
  }

  private async tryFallbackProviders(
    messages: Array<{ role: string; content: string }>,
    options?: GenerationOptions
  ): Promise<AIResponse | null> {
    const providers = Object.keys(providerConstructors);
    const sorted = providers
      .map((name) => ({ name, config: PROVIDER_REGISTRY[name as ProviderName] }))
      .filter((p) => p.config?.isEnabled)
      .sort((a, b) => a.config.priority - b.config.priority);

    for (const { name } of sorted) {
      const p = this.getProvider(name);
      if (!p?.isAvailable()) continue;

      try {
        logger.info({ fallbackProvider: name }, "Attempting fallback to provider");
        const agentMessages = messages as any;
        const response = await p.generateResponse(agentMessages, options);
        this.emit("provider_fallback", { from: "primary", to: name });
        return response;
      } catch {
        logger.warn({ provider: name }, "Fallback provider failed");
        continue;
      }
    }

    return null;
  }

  private trackCost(providerName: string, tokens: number): void {
    const current = this.costTracker.get(providerName) || { totalCost: 0, totalTokens: 0, totalCalls: 0 };
    current.totalTokens += tokens;
    current.totalCalls++;
    this.costTracker.set(providerName, current);
  }

  private trackLatency(providerName: string, ms: number): void {
    const current = this.latencyTracker.get(providerName) || { totalMs: 0, calls: 0 };
    current.totalMs += ms;
    current.calls++;
    this.latencyTracker.set(providerName, current);
  }

  getCostReport(): Array<{ provider: string; totalCost: number; totalTokens: number; totalCalls: number }> {
    const report: Array<{ provider: string; totalCost: number; totalTokens: number; totalCalls: number }> = [];
    for (const [provider, data] of this.costTracker) {
      const config = PROVIDER_REGISTRY[provider as ProviderName];
      const estimatedCost = config
        ? (data.totalTokens / 1000) * ((config.costPer1KTokens.input + config.costPer1KTokens.output) / 2)
        : 0;
      report.push({ provider, totalCost: estimatedCost, ...data });
    }
    return report;
  }

  getLatencyReport(): Array<{ provider: string; avgMs: number; totalCalls: number }> {
    const report: Array<{ provider: string; avgMs: number; totalCalls: number }> = [];
    for (const [provider, data] of this.latencyTracker) {
      report.push({ provider, avgMs: data.calls > 0 ? data.totalMs / data.calls : 0, totalCalls: data.calls });
    }
    return report;
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  reset(): void {
    this.providers.clear();
    this.costTracker.clear();
    this.latencyTracker.clear();
  }
}

export const modelRouter = new ModelRouter();
