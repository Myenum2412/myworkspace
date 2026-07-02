import NodeCache from "node-cache";
import { redisGet, redisSet, redisDel, isRedisConnected, redisDelByPattern } from "./redis.js";
import { logger } from "./logger/index.js";

const env = {
  CACHE_TTL: parseInt(process.env.CACHE_TTL || "300", 10),
  CACHE_CHECK_PERIOD: parseInt(process.env.CACHE_CHECK_PERIOD || "60", 10),
};

export class CacheManager {
  private cache: NodeCache;

  constructor() {
    this.cache = new NodeCache({
      stdTTL: env.CACHE_TTL,
      checkperiod: env.CACHE_CHECK_PERIOD,
      useClones: false,
    });
  }

  get<T>(key: string): T | undefined {
    return this.cache.get<T>(key);
  }

  set<T>(key: string, value: T, ttl?: number): void {
    const ttlSec = ttl ?? env.CACHE_TTL;
    if (ttl !== undefined) {
      this.cache.set(key, value, ttl);
    } else {
      this.cache.set(key, value);
    }
    // Fire-and-forget to Redis — non-blocking, but log if it fails
    redisSet(key, value, ttlSec).catch((err: Error) => {
      logger.warn({ err, key }, "Redis cache set failed (L2 write)");
    });
  }

  del(keyOrKeys: string | string[]): number {
    const keys = Array.isArray(keyOrKeys) ? keyOrKeys : [keyOrKeys];
    for (const k of keys) {
      redisDel(k).catch((err: Error) => {
        logger.warn({ err, key: k }, "Redis cache del failed (L2 delete)");
      });
    }
    return this.cache.del(keyOrKeys);
  }

  delByPattern(pattern: string): number {
    const keys = this.cache.keys();
    const matchingKeys = keys.filter((k: string) => k.includes(pattern));
    for (const k of matchingKeys) {
      redisDel(k).catch((err: Error) => {
        logger.warn({ err, key: k, pattern }, "Redis cache del-by-pattern failed");
      });
    }
    return this.cache.del(matchingKeys);
  }

  async invalidatePattern(pattern: string): Promise<void> {
    // Invalidate L1 (local)
    this.delByPattern(pattern);
    // Invalidate L2 (Redis)
    if (isRedisConnected()) {
      try {
        await redisDelByPattern(`*${pattern}*`);
      } catch (err) {
        logger.warn({ err, pattern }, "Redis pattern invalidation failed");
      }
    }
  }

  flush(): void {
    this.cache.flushAll();
  }

  getStats() {
    return this.cache.getStats();
  }

  async getOrSet<T>(key: string, factory: () => Promise<T>, ttl?: number): Promise<T> {
    const ttlSec = ttl ?? env.CACHE_TTL;

    // L1: NodeCache
    const l1 = this.get<T>(key);
    if (l1 !== undefined) return l1;

    // L2: Redis
    if (isRedisConnected()) {
      try {
        const l2 = await redisGet<T>(key);
        if (l2 !== null) {
          this.set(key, l2, ttlSec);
          return l2;
        }
      } catch (err) {
        logger.warn({ err, key }, "Redis L2 read failed, falling through to source");
      }
    }

    // Miss: fetch from source
    try {
      const value = await factory();
      this.set(key, value, ttlSec);
      return value;
    } catch (err) {
      logger.error({ err, key }, "Cache factory function failed");
      throw err;
    }
  }
}

export const cacheManager = new CacheManager();

// Standalone convenience wrappers (for drop-in replacement of old cache/index.ts)
export async function getOrSet<T>(key: string, factory: () => Promise<T>, ttlMs?: number): Promise<T> {
  const ttlSec = ttlMs !== undefined ? Math.ceil(ttlMs / 1000) : 30;
  return cacheManager.getOrSet(key, factory, ttlSec);
}

export async function invalidatePattern(pattern: string): Promise<void> {
  return cacheManager.invalidatePattern(pattern);
}

// Cache key generators
export const CacheKeys = {
  taskList: (orgId: string, page: number, limit: number) => `tasks:${orgId}:p${page}:l${limit}`,
  taskDetail: (taskId: string) => `task:${taskId}`,
  teamList: (orgId: string) => `teams:${orgId}`,
  teamDetail: (teamId: string) => `team:${teamId}`,
  userProfile: (userId: string) => `user:${userId}:profile`,
  orgMetrics: (orgId: string) => `org:${orgId}:metrics`,
  dashboardMetrics: (orgId: string) => `dashboard:${orgId}:metrics`,
  employeeList: (orgId: string, page: number) => `employees:${orgId}:p${page}`,
  timeEntrySummary: (orgId: string, date: string) => `timesummary:${orgId}:${date}`,
};
