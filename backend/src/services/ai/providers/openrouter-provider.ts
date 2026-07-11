import { AI_CONFIG } from "../config.js";
import { OpenAIProvider } from "./openai-provider.js";

export class OpenRouterProvider extends OpenAIProvider {
  name = "openrouter";

  constructor() {
    const headers: Record<string, string> = {};
    if (AI_CONFIG.openRouterSiteUrl) headers["HTTP-Referer"] = AI_CONFIG.openRouterSiteUrl;
    if (AI_CONFIG.openRouterSiteName) headers["X-Title"] = AI_CONFIG.openRouterSiteName;

    super({
      apiKey: AI_CONFIG.openRouterApiKey,
      model: AI_CONFIG.openRouterModel,
      apiBase: AI_CONFIG.openRouterApiBase,
      extraHeaders: headers,
    });
  }

  protected getApiKeyLabel(): string {
    return "OpenRouter";
  }
}
