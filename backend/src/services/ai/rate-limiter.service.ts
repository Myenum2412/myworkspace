import { AiSettings } from "../../lib/db/models/AiSettings.js";
import { AppError } from "../../middleware/error.js";

const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

export class RateLimiter {
  private cleanupInterval: ReturnType<typeof setInterval> | null = null;

  constructor() {
    this.startCleanup();
  }

  async check(orgId: string, userId: string): Promise<void> {
    const settings = await AiSettings.findOne({ orgId });
    const maxRequests = settings?.rateLimitRequests || 100;
    const windowMs = settings?.rateLimitWindowMs || 60000;

    const key = `${orgId}:${userId}`;
    const now = Date.now();

    let record = rateLimitStore.get(key);

    if (!record || now > record.resetAt) {
      record = { count: 1, resetAt: now + windowMs };
      rateLimitStore.set(key, record);
      return;
    }

    if (record.count >= maxRequests) {
      const retryAfter = Math.ceil((record.resetAt - now) / 1000);
      throw new AppError(429, `Rate limit exceeded. Try again in ${retryAfter} seconds.`);
    }

    record.count++;
  }

  getRemainingRequests(orgId: string, userId: string): { remaining: number; resetAt: number } {
    const key = `${orgId}:${userId}`;
    const record = rateLimitStore.get(key);
    if (!record) {
      return { remaining: 100, resetAt: Date.now() + 60000 };
    }
    return {
      remaining: Math.max(0, 100 - record.count),
      resetAt: record.resetAt,
    };
  }

  resetForUser(orgId: string, userId: string): void {
    const key = `${orgId}:${userId}`;
    rateLimitStore.delete(key);
  }

  private startCleanup(): void {
    this.cleanupInterval = setInterval(() => {
      const now = Date.now();
      for (const [key, record] of rateLimitStore.entries()) {
        if (now > record.resetAt) {
          rateLimitStore.delete(key);
        }
      }
    }, 60000);
  }

  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
  }
}
