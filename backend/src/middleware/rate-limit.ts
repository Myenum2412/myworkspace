import rateLimit from "express-rate-limit";
import RedisStore from "rate-limit-redis";

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: "Too many attempts. Try again later." },
  skip: (req) => req.path === "/health",
});

export const socketTokenLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: "Too many token requests. Try again later." },
});

export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 600,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: "Too many requests. Try again later." },
  skip: (req) => req.path === "/health",
});

export function promoteRateLimitersToRedis() {
  try {
    const { getRedis, isRedisConnected } = require("../lib/redis.js");
    getRedis();
    setTimeout(() => {
      if (isRedisConnected()) {
        const client = getRedis();
        const store = new RedisStore({
          sendCommand: (...args: string[]) => (client as any).call(...args),
        });
        (authLimiter as any).store = store;
        (socketTokenLimiter as any).store = store;
        (apiLimiter as any).store = store;
        console.log("✦ Rate limiters promoted to Redis-backed store");
      }
    }, 200);
  } catch {
    // silently fall back to in-memory
  }
}
