import { getAIProvider, clearProviderCache } from "../../../../src/services/ai/ai-factory.js";

describe("AI Factory", () => {
  beforeEach(() => {
    clearProviderCache();
  });

  it("returns an OpenRouterProvider for 'openrouter'", () => {
    const provider = getAIProvider("openrouter");
    expect(provider.name).toBe("openrouter");
  });

  it("returns an OpenAIProvider for 'openai'", () => {
    const provider = getAIProvider("openai");
    expect(provider.name).toBe("openai");
  });

  it("returns a ClaudeProvider for 'claude'", () => {
    const provider = getAIProvider("claude");
    expect(provider.name).toBe("claude");
  });

  it("returns an AzureProvider for 'azure'", () => {
    const provider = getAIProvider("azure");
    expect(provider.name).toBe("azure");
  });

  it("caches and returns the same instance", () => {
    const a = getAIProvider("openrouter");
    const b = getAIProvider("openrouter");
    expect(a).toBe(b);
  });

  it("throws for unsupported providers", () => {
    expect(() => getAIProvider("invalid" as any)).toThrow("Unsupported AI provider");
  });

  it("returns a new instance after cache clear", () => {
    const a = getAIProvider("openrouter");
    clearProviderCache();
    const b = getAIProvider("openrouter");
    expect(a).not.toBe(b);
  });
});
