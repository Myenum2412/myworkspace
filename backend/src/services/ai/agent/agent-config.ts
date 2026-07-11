export const AGENT_CONFIG = {
  maxTurns: parseInt(process.env.AI_AGENT_MAX_TURNS || "90"),
  maxToolIterations: parseInt(process.env.AI_AGENT_MAX_TOOL_ITERS || "25"),
  contextCompressionThreshold: parseFloat(process.env.AI_AGENT_COMPRESS_THRESHOLD || "0.50"),
  contextCompressionTargetRatio: parseFloat(process.env.AI_AGENT_COMPRESS_TARGET || "0.20"),
  protectLastNMessages: parseInt(process.env.AI_AGENT_PROTECT_LAST_N || "20"),

  enableStreaming: process.env.AI_AGENT_STREAMING !== "false",
  enableMemory: process.env.AI_AGENT_MEMORY !== "false",
  enableSelfReview: process.env.AI_AGENT_SELF_REVIEW === "true",
  selfReviewInterval: parseInt(process.env.AI_AGENT_REVIEW_INTERVAL || "10"),

  memoryCharLimit: parseInt(process.env.AI_AGENT_MEMORY_CHAR_LIMIT || "2200"),
  userProfileCharLimit: parseInt(process.env.AI_AGENT_USER_CHAR_LIMIT || "1375"),

  auxiliaryProvider: process.env.AI_AUXILIARY_PROVIDER || "auto",
  auxiliaryModel: process.env.AI_AUXILIARY_MODEL || "auto",

  fallbackProviders: (process.env.AI_FALLBACK_PROVIDERS || "").split(",").filter(Boolean),

  requestTimeoutMs: parseInt(process.env.AI_REQUEST_TIMEOUT || "30000"),
  maxRetries: parseInt(process.env.AI_MAX_RETRIES || "3"),
  retryDelayMs: parseInt(process.env.AI_RETRY_DELAY || "1000"),
};
