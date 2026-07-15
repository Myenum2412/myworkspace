import { Response, NextFunction } from "express";
import { AuthRequest } from "./auth.js";
import { RateLimiter } from "../services/ai/rate-limiter.service.js";

const rateLimiter = new RateLimiter();

export async function aiRateLimit(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const orgId = req.user?.orgId || req.query.orgId as string;
    const userId = req.user?.userId || "";

    if (!orgId || !userId) {
      next();
      return;
    }

    const { remaining, resetAt } = rateLimiter.getRemainingRequests(orgId, userId);

    res.setHeader("X-RateLimit-Remaining", remaining);
    res.setHeader("X-RateLimit-Reset", Math.ceil(resetAt / 1000));

    await rateLimiter.check(orgId, userId);
    next();
  } catch (err: any) {
    if (err.statusCode === 429) {
      res.status(429).json({ success: false, error: err.message });
      return;
    }
    next();
  }
}
