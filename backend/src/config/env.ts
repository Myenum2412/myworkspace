export const env = {
  PORT: parseInt(process.env.PORT || "4000", 10),
  MONGODB_URI: process.env.MONGODB_URI || (() => {
    throw new Error("MONGODB_URI environment variable is required");
  })(),
  JWT_SECRET: process.env.JWT_SECRET || (() => {
    throw new Error("JWT_SECRET environment variable is required");
  })(),
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || "7d",
  ADMIN_EMAIL: process.env.ADMIN_EMAIL || "developer@myenum.in",
  ADMIN_PASSWORD: process.env.ADMIN_PASSWORD || "",
  CORS_ORIGIN: (process.env.CORS_ORIGIN || "http://localhost:3000,https://myworkspace.myenum.in").split(",").map(s => s.trim()),
  NODE_ENV: process.env.NODE_ENV || "development",
  R2_ENDPOINT: process.env.R2_ENDPOINT || "",
  R2_BUCKET_NAME: process.env.R2_BUCKET_NAME || "myworkspace",
  R2_ACCESS_KEY_ID: process.env.R2_ACCESS_KEY_ID || "",
  R2_SECRET_ACCESS_KEY: process.env.R2_SECRET_ACCESS_KEY || "",
  SES_REGION: process.env.SES_REGION || "us-east-1",
  SES_ACCESS_KEY_ID: process.env.SES_ACCESS_KEY_ID || "",
  SES_SECRET_ACCESS_KEY: process.env.SES_SECRET_ACCESS_KEY || "",
  MAIL_FROM: process.env.MAIL_FROM || "MyWorkspace <welcome@myworkspace.myenum.in>",
  APP_URL: process.env.APP_URL || "http://localhost:3000",

  // Websocket connect-src for Helmet CSP (derived from APP_URL).
  BASE_URL_WS: process.env.BASE_URL_WS || (process.env.APP_URL || "http://localhost:3000").replace(/^http/, "ws"),

  S3_ENDPOINT: process.env.S3_ENDPOINT || "",
  S3_BUCKET_NAME: process.env.S3_BUCKET_NAME || "",
  S3_ACCESS_KEY_ID: process.env.S3_ACCESS_KEY_ID || "",
  S3_SECRET_ACCESS_KEY: process.env.S3_SECRET_ACCESS_KEY || "",
  S3_REGION: process.env.S3_REGION || "us-east-1",

  // TUS resumable upload (tus-node-server + FileStore). Chunk persistence lands
  // under data/tus-uploads/; final objects go to R2 via the orchestrator.
  TUS_PREFIX: process.env.TUS_PREFIX || "/files-tus",
  TUS_MAX_SIZE: Number(process.env.TUS_MAX_SIZE || 10 * 1024 * 1024 * 1024),
  TUS_TTL_MS: Number(process.env.TUS_TTL_MS || 24 * 60 * 60 * 1000),

  GCS_BUCKET_NAME: process.env.GCS_BUCKET_NAME || "",
  GCS_KEYFILE: process.env.GCS_KEYFILE || "",

  // "1" enables per-request stage timing logs (PERF_LOG) and auth debug logs.
  // Off by default — zero cost in production.
  PERF_LOG: process.env.PERF_LOG || "0",
  AUTH_DEBUG: process.env.AUTH_DEBUG || "0",

  AZURE_STORAGE_CONNECTION_STRING: process.env.AZURE_STORAGE_CONNECTION_STRING || "",
  AZURE_STORAGE_CONTAINER: process.env.AZURE_STORAGE_CONTAINER || "",

  LOG_LEVEL: process.env.LOG_LEVEL || "",

  REDIS_URL: process.env.REDIS_URL || "redis://localhost:6379",
};
