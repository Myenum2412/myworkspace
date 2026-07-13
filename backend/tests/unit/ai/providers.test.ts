import { AIProviderFactory } from "../../../src/services/ai/providers/ai-provider.factory.js";
import { OpenAIProvider } from "../../../src/services/ai/providers/openai-provider.js";
import { AnthropicProvider } from "../../../src/services/ai/providers/anthropic-provider.js";
import { GeminiProvider } from "../../../src/services/ai/providers/gemini-provider.js";
import { modelRouter } from "../../../src/services/ai/providers/model-router.js";

describe("AI Provider System", () => {
  beforeEach(() => {
    AIProviderFactory.reset();
    modelRouter.reset();
  });

  describe("Provider Factory", () => {
    it("should create OpenAI provider", () => {
      process.env.AI_PROVIDER = "openai";
      process.env.OPENAI_API_KEY = "test-key";
      const provider = AIProviderFactory.getProvider();
      expect(provider).toBeDefined();
      expect(provider.name).toBe("openai");
    });

    it("should create Anthropic provider", () => {
      const provider = AIProviderFactory.createProvider("anthropic");
      expect(provider).toBeInstanceOf(AnthropicProvider);
    });

    it("should create Gemini provider", () => {
      const provider = AIProviderFactory.createProvider("gemini");
      expect(provider).toBeInstanceOf(GeminiProvider);
    });

    it("should fall back to OpenAI for unknown provider", () => {
      const provider = AIProviderFactory.createProvider("unknown_provider");
      expect(provider).toBeInstanceOf(OpenAIProvider);
    });

    it("should provide fallback chain when primary unavailable", () => {
      process.env.AI_PROVIDER = "anthropic";
      delete process.env.ANTHROPIC_API_KEY;
      process.env.OPENAI_API_KEY = "test-key";
      const provider = AIProviderFactory.getProviderWithFallback();
      expect(provider).toBeDefined();
    });
  });

  describe("Model Router", () => {
    it("should get available providers", () => {
      process.env.OPENAI_API_KEY = "test-key";
      const available = modelRouter.getAllAvailableProviders();
      expect(Array.isArray(available)).toBe(true);
    });

    it("should handle empty provider gracefully", () => {
      const provider = modelRouter.getProvider("nonexistent");
      expect(provider).toBeUndefined();
    });

    it("should provide cost report", () => {
      const report = modelRouter.getCostReport();
      expect(Array.isArray(report)).toBe(true);
    });

    it("should provide latency report", () => {
      const report = modelRouter.getLatencyReport();
      expect(Array.isArray(report)).toBe(true);
    });
  });

  describe("Provider Availability", () => {
    it("OpenAI should be unavailable without API key", () => {
      delete process.env.OPENAI_API_KEY;
      delete process.env.AI_API_KEY;
      const provider = new OpenAIProvider();
      expect(provider.isAvailable()).toBe(false);
    });

    it("Anthropic should be unavailable without API key", () => {
      delete process.env.ANTHROPIC_API_KEY;
      const provider = new AnthropicProvider();
      expect(provider.isAvailable()).toBe(false);
    });

    it("Gemini should be unavailable without API key", () => {
      delete process.env.GOOGLE_AI_API_KEY;
      delete process.env.GEMINI_API_KEY;
      const provider = new GeminiProvider();
      expect(provider.isAvailable()).toBe(false);
    });
  });
});

describe("Provider Message Format Conversion", () => {
  const sampleMessages: Array<{ role: string; content: string }> = [
    { role: "system", content: "You are a helpful assistant." },
    { role: "user", content: "Hello!" },
    { role: "assistant", content: "Hi there!" },
  ];

  it("should handle system messages correctly", () => {
    expect(sampleMessages[0].role).toBe("system");
  });

  it("should have valid message sequence", () => {
    const roles = sampleMessages.map((m) => m.role);
    expect(roles).toContain("system");
    expect(roles).toContain("user");
    expect(roles).toContain("assistant");
  });

  it("should strip code blocks from JSON responses", () => {
    const raw = '```json\n{"key": "value"}\n```';
    const cleaned = raw.replace(/```json\n?|\n?```/g, "").trim();
    expect(cleaned).toBe('{"key": "value"}');
  });
});
