export const env = {
  PORT: parseInt(process.env.PORT || "4000", 10),
  MONGODB_URI: process.env.MONGODB_URI || "mongodb+srv://workmyspace2412_db_user:aREoh3wCAz0j6agO@cluster0.hvtabns.mongodb.net/?appName=Cluster0",
  JWT_SECRET: process.env.JWT_SECRET || "myworkspace-dev-secret-change-in-production",
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || "7d",
  CORS_ORIGIN: (process.env.CORS_ORIGIN || "http://localhost:3000,https://myworkspace.myenum.in").split(",").map(s => s.trim()),
  NODE_ENV: process.env.NODE_ENV || "development",
};
