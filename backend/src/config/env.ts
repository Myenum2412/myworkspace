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
  CORS_ORIGIN: (process.env.CORS_ORIGIN || "http://localhost:3000,https://myworkspace.myenum.in").split(",").map(s => s.trim()),
  NODE_ENV: process.env.NODE_ENV || "development",
};
