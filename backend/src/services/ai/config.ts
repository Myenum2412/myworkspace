// AI Configuration
export const AI_CONFIG = {
  // AI Provider Settings
  provider: process.env.AI_PROVIDER || "openai",
  apiKey: process.env.AI_API_KEY || "",
  model: process.env.AI_MODEL || "gpt-3.5-turbo",
  temperature: parseFloat(process.env.AI_TEMPERATURE || "0.7"),
  maxTokens: parseInt(process.env.AI_MAX_TOKENS || "500"),

  // OpenRouter Settings (OpenAI-compatible routing service)
  openRouterApiKey: process.env.OPENROUTER_API_KEY || "",
  openRouterApiBase: process.env.OPENROUTER_API_BASE || "https://openrouter.ai/api/v1",
  openRouterModel: process.env.OPENROUTER_MODEL || "openai/gpt-3.5-turbo",
  openRouterSiteUrl: process.env.OPENROUTER_SITE_URL || "",
  openRouterSiteName: process.env.OPENROUTER_SITE_NAME || "",

  // Language Detection
  defaultLanguage: process.env.AI_DEFAULT_LANGUAGE || "en",
  supportedLanguages: ["en", "es", "fr", "de", "hi", "ar", "pt", "zh", "ja"],

  // Intent Detection
  intentConfidenceThreshold: parseFloat(process.env.AI_INTENT_THRESHOLD || "0.6"),

  // Conversation Memory
  maxMemoryMessages: parseInt(process.env.AI_MEMORY_MESSAGES || "20"),
  memoryExpiryHours: parseInt(process.env.AI_MEMORY_EXPIRY || "24"),

  // Product Search
  maxProductResults: parseInt(process.env.AI_MAX_PRODUCTS || "5"),
  productRelevanceThreshold: parseFloat(process.env.AI_PRODUCT_THRESHOLD || "0.5"),

  // Rate Limiting
  rateLimitWindowMs: parseInt(process.env.AI_RATE_LIMIT_WINDOW || "60000"),
  rateLimitMaxRequests: parseInt(process.env.AI_RATE_LIMIT_MAX || "30"),

  // Timeouts
  requestTimeoutMs: parseInt(process.env.AI_REQUEST_TIMEOUT || "30000"),

  // Logging
  logLevel: process.env.AI_LOG_LEVEL || "info",
  enableDebugLogs: process.env.AI_DEBUG === "true",
};

// Business Context Configuration
export const BUSINESS_CONFIG = {
  name: process.env.BUSINESS_NAME || "MyWorkSpace",
  timezone: process.env.BUSINESS_TIMEZONE || "Asia/Kolkata",
  currency: process.env.BUSINESS_CURRENCY || "INR",
  supportEmail: process.env.BUSINESS_SUPPORT_EMAIL || "support@myworkspace.com",
  workingHours: {
    start: parseInt(process.env.BUSINESS_HOURS_START || "9"),
    end: parseInt(process.env.BUSINESS_HOURS_END || "18"),
  },
};
