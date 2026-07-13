import { OpenAIProvider } from "./openai-provider.js";

export class OllamaProvider extends OpenAIProvider {
  name = "ollama";

  constructor() {
    super({
      apiKey: "ollama",
      model: process.env.OLLAMA_MODEL || "llama3.1",
      apiBase: process.env.OLLAMA_BASE_URL || "http://localhost:11434/v1",
    });
  }

  isAvailable(): boolean {
    return true; // Local, always try
  }
}

export class LMStudioProvider extends OpenAIProvider {
  name = "lmstudio";

  constructor() {
    super({
      apiKey: "lmstudio",
      model: process.env.LMSTUDIO_MODEL || "local-model",
      apiBase: process.env.LMSTUDIO_BASE_URL || "http://localhost:1234/v1",
    });
  }

  isAvailable(): boolean {
    return true; // Local, always try
  }
}

export class GroqProvider extends OpenAIProvider {
  name = "groq";

  constructor() {
    super({
      apiKey: process.env.GROQ_API_KEY || "",
      model: process.env.GROQ_MODEL || "llama3-70b-8192",
      apiBase: "https://api.groq.com/openai/v1",
    });
  }

  isAvailable(): boolean {
    return !!process.env.GROQ_API_KEY;
  }
}

export class DeepSeekProvider extends OpenAIProvider {
  name = "deepseek";

  constructor() {
    super({
      apiKey: process.env.DEEPSEEK_API_KEY || "",
      model: process.env.DEEPSEEK_MODEL || "deepseek-chat",
      apiBase: "https://api.deepseek.com/v1",
    });
  }

  isAvailable(): boolean {
    return !!process.env.DEEPSEEK_API_KEY;
  }
}

export class TogetherProvider extends OpenAIProvider {
  name = "together";

  constructor() {
    super({
      apiKey: process.env.TOGETHER_API_KEY || "",
      model: process.env.TOGETHER_MODEL || "meta-llama/Llama-3.3-70B-Instruct-Turbo",
      apiBase: "https://api.together.xyz/v1",
    });
  }

  isAvailable(): boolean {
    return !!process.env.TOGETHER_API_KEY;
  }
}

export class MistralProvider extends OpenAIProvider {
  name = "mistral";

  constructor() {
    super({
      apiKey: process.env.MISTRAL_API_KEY || "",
      model: process.env.MISTRAL_MODEL || "mistral-large-latest",
      apiBase: "https://api.mistral.ai/v1",
    });
  }

  isAvailable(): boolean {
    return !!process.env.MISTRAL_API_KEY;
  }
}

export class PerplexityProvider extends OpenAIProvider {
  name = "perplexity";

  constructor() {
    super({
      apiKey: process.env.PERPLEXITY_API_KEY || "",
      model: process.env.PERPLEXITY_MODEL || "sonar-pro",
      apiBase: "https://api.perplexity.ai",
    });
  }

  isAvailable(): boolean {
    return !!process.env.PERPLEXITY_API_KEY;
  }
}
