export const env = {
  PORT: parseInt(process.env.PORT || "4000", 10),
  MONGODB_URI: process.env.MONGODB_URI || "mongodb://localhost:27017/myworkspace",
  JWT_SECRET: process.env.JWT_SECRET || "myworkspace-dev-secret-change-in-production",
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || "7d",
  CORS_ORIGIN: process.env.CORS_ORIGIN || "http://localhost:3000",
  NODE_ENV: process.env.NODE_ENV || "development",
};
