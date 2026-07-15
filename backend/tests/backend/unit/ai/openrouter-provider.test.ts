import { OpenRouterProvider } from "../../../../src/services/ai/openrouter-provider.js";

describe("OpenRouterProvider", () => {
  let provider: OpenRouterProvider;

  beforeEach(() => {
    provider = new OpenRouterProvider();
    process.env.OPENROUTER_API_KEY = "sk-or-v1-test-key";
  });

  afterEach(() => {
    delete process.env.OPENROUTER_API_KEY;
  });

  it("has name 'openrouter'", () => {
    expect(provider.name).toBe("openrouter");
  });

  it("validates config when API key is set", () => {
    process.env.OPENROUTER_API_KEY = "sk-or-v1-test";
    expect(provider.validateConfig()).toBe(true);
  });

  it("fails validation when API key is missing", () => {
    delete process.env.OPENROUTER_API_KEY;
    expect(provider.validateConfig()).toBe(false);
  });

  it("fails validation when API key is empty", () => {
    process.env.OPENROUTER_API_KEY = "";
    expect(provider.validateConfig()).toBe(false);
  });
});
