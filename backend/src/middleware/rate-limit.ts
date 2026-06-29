import rateLimit from "express-rate-limit";

/**
 * Per-IP rate limiters.
 *
 * Auth limiter is strict (credential stuffing / brute force protection on
 * login/signup/password-reset/client-auth). Api limiter is generous —
 * internal SPA makes many requests — but bounds abuse.
 *
 * We use the default in-memory store. Fine for a single-instance backend; if
 * you add a second instance, swap for the redis store from `rate-limit-redis`
 * so counters are shared.
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,
  standardHeaders: true, // X-RateLimit-*, RateLimit-* headers
  legacyHeaders: false,
  message: { success: false, error: "Too many attempts. Try again later." },
  skip: (req) => {
    // req.path here is relative to the mount point ("/api/auth"), so the
    // "/api/auth/socket-token" route lands at path "/socket-token".
    const p = req.path;
    return p === "/socket-token" || p === "/health" || p === "/socket-token";
  },
});

export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 600, // 600 / 15 min = 40 req/min — generous for an internal SPA
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: "Too many requests. Try again later." },
  skip: (req) => req.path === "/health", // mounted at "/api" so path is "/health"
});
