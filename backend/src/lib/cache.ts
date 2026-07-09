import NodeCache from "node-cache";
import { redisGet, redisSet, redisDel, isRedisConnected, redisDelByPattern } from "./redis.js";
import { logger } from "./logger/index.js";
import { metricsRegistry } from "./monitoring/index.js";

const env = {
  CACHE_TTL: parseInt(process.env.CACHE_TTL || "300", 10),
  CACHE_CHECK_PERIOD: parseInt(process.env.CACHE_CHECK_PERIOD || "60", 10),
  CACHE_STALE_TTL: parseInt(process.env.CACHE_STALE_TTL || "3600", 10),
};

export class CacheManager {
  private cache: NodeCache;
  private staleCache: NodeCache;
  private stats = { hits: { l1: 0, l2: 0 }, misses: 0, sets: 0, invalidations: 0 };

  constructor() {
    this.cache = new NodeCache({
      stdTTL: env.CACHE_TTL,
      checkperiod: env.CACHE_CHECK_PERIOD,
      useClones: false,
      maxKeys: 10000,
    });

    this.staleCache = new NodeCache({
      stdTTL: env.CACHE_STALE_TTL,
      checkperiod: env.CACHE_CHECK_PERIOD,
      useClones: false,
      maxKeys: 5000,
    });

    this.cache.on("expired", (key) => {
      const value = this.cache.get(key);
      if (value !== undefined) {
        this.staleCache.set(`stale:${key}`, value);
      }
    });
  }

  get<T>(key: string): T | undefined {
    const value = this.cache.get<T>(key);
    if (value !== undefined) {
      this.stats.hits.l1++;
      metricsRegistry.incrementCounter("cache_hits_total", { layer: "l1", key });
      return value;
    }
    this.stats.misses++;
    return undefined;
  }

  getStale<T>(key: string): T | undefined {
    return this.staleCache.get<T>(`stale:${key}`);
  }

  set<T>(key: string, value: T, ttl?: number): void {
    const ttlSec = ttl ?? env.CACHE_TTL;
    this.cache.set(key, value, ttlSec);
    this.stats.sets++;

    // L2: Redis (fire-and-forget)
    redisSet(key, value, ttlSec).catch((err: Error) => {
      logger.warn({ err, key }, "Redis cache set failed (L2)");
    });

    metricsRegistry.incrementCounter("cache_sets_total", { layer: "l1" });
  }

  del(keyOrKeys: string | string[]): number {
    const keys = Array.isArray(keyOrKeys) ? keyOrKeys : [keyOrKeys];
    for (const k of keys) {
      this.staleCache.del(`stale:${k}`);
      redisDel(k).catch((err: Error) => {
        logger.warn({ err, key: k }, "Redis cache del failed (L2)");
      });
    }
    this.stats.invalidations += keys.length;
    return this.cache.del(keyOrKeys);
  }

  delByPattern(pattern: string): number {
    const keys = this.cache.keys().filter((k: string) => k.includes(pattern));
    for (const k of keys) {
      this.staleCache.del(`stale:${k}`);
      redisDel(k).catch((err: Error) => {
        logger.warn({ err, key: k, pattern }, "Redis cache del-by-pattern (L2)");
      });
    }
    this.stats.invalidations += keys.length;
    return this.cache.del(keys);
  }

  async invalidatePattern(pattern: string): Promise<void> {
    this.delByPattern(pattern);
    if (isRedisConnected()) {
      try {
        await redisDelByPattern(`*${pattern}*`);
      } catch (err) {
        logger.warn({ err, pattern }, "Redis pattern invalidation (L2) failed");
      }
    }
  }

  flush(): void {
    this.cache.flushAll();
    this.staleCache.flushAll();
    this.stats = { hits: { l1: 0, l2: 0 }, misses: 0, sets: 0, invalidations: 0 };
  }

  getStats() {
    const nodeStats = this.cache.getStats();
    const total = this.stats.hits.l1 + this.stats.hits.l2 + this.stats.misses;
    return {
      ...nodeStats,
      l1Hits: this.stats.hits.l1,
      l2Hits: this.stats.hits.l2,
      misses: this.stats.misses,
      sets: this.stats.sets,
      invalidations: this.stats.invalidations,
      hitRate: total > 0 ? (this.stats.hits.l1 + this.stats.hits.l2) / total : 0,
      size: this.cache.keys().length,
      staleSize: this.staleCache.keys().length,
    };
  }

  async getOrSet<T>(key: string, factory: () => Promise<T>, ttl?: number): Promise<T> {
    const ttlSec = ttl ?? env.CACHE_TTL;

    // L1: NodeCache
    const l1 = this.get<T>(key);
    if (l1 !== undefined) return l1;

    // L1 stale: return stale data with background refresh
    const stale = this.getStale<T>(key);
    if (stale !== undefined) {
      metricsRegistry.incrementCounter("cache_stale_hits", { key });
      factory()
        .then((fresh) => this.set(key, fresh, ttlSec))
        .catch(() => {});
      return stale;
    }

    // L2: Redis
    if (isRedisConnected()) {
      try {
        const l2 = await redisGet<T>(key);
        if (l2 !== null) {
          this.stats.hits.l2++;
          metricsRegistry.incrementCounter("cache_hits_total", { layer: "l2", key });
          this.cache.set(key, l2, ttlSec);
          return l2;
        }
      } catch (err) {
        logger.warn({ err, key }, "Redis L2 read failed");
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

export async function getOrSet<T>(key: string, factory: () => Promise<T>, ttlMs?: number): Promise<T> {
  const ttlSec = ttlMs !== undefined ? Math.ceil(ttlMs / 1000) : 30;
  return cacheManager.getOrSet(key, factory, ttlSec);
}

export async function invalidatePattern(pattern: string): Promise<void> {
  return cacheManager.invalidatePattern(pattern);
}

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