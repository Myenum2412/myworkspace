import NodeCache from "node-cache";
import { getRedis, isRedisConnected } from "./redis.js";
import { logger } from "./logger/index.js";
import { metricsRegistry } from "./monitoring/index.js";

interface CacheTierConfig {
  l1Ttl: number;
  l2Ttl: number;
  staleTtl: number;
  maxKeys: number;
  prefix: string;
}

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
  version: number;
  tenantId?: string;
}

export class DistributedCache {
  private l1: NodeCache;
  private stale: NodeCache;
  private config: CacheTierConfig;
  private stats = { hits: { l1: 0, l2: 0, stale: 0 }, misses: 0, sets: 0, invalidations: 0 };

  constructor(config?: Partial<CacheTierConfig>) {
    this.config = {
      l1Ttl: config?.l1Ttl ?? 300,
      l2Ttl: config?.l2Ttl ?? 900,
      staleTtl: config?.staleTtl ?? 3600,
      maxKeys: config?.maxKeys ?? 50000,
      prefix: config?.prefix ?? "dc:",
    };

    this.l1 = new NodeCache({
      stdTTL: this.config.l1Ttl,
      checkperiod: 60,
      useClones: false,
      maxKeys: this.config.maxKeys,
    });

    this.stale = new NodeCache({
      stdTTL: this.config.staleTtl,
      checkperiod: 120,
      useClones: false,
      maxKeys: Math.floor(this.config.maxKeys / 2),
    });

    this.l1.on("expired", (key) => {
      const value = this.l1.get(key);
      if (value !== undefined) {
        this.stale.set(`s:${key}`, value);
      }
    });
  }

  private l1Key(key: string): string {
    return `${this.config.prefix}${key}`;
  }

  private l2Key(key: string): string {
    return `${this.config.prefix}${key}`;
  }

  async get<T>(key: string, tenantId?: string): Promise<T | undefined> {
    const k = this.l1Key(key);

    const l1 = this.l1.get<CacheEntry<T>>(k);
    if (l1 && (!tenantId || l1.tenantId === tenantId)) {
      this.stats.hits.l1++;
      metricsRegistry.incrementCounter("cache_hits_total", { layer: "l1" });
      return l1.value;
    }

    const stale = this.stale.get<CacheEntry<T>>(`s:${k}`);
    if (stale && (!tenantId || stale.tenantId === tenantId)) {
      this.stats.hits.stale++;
      metricsRegistry.incrementCounter("cache_hits_total", { layer: "stale" });
      return stale.value;
    }

    if (isRedisConnected()) {
      try {
        const redis = getRedis();
        const raw = await redis.get(this.l2Key(key));
        if (raw) {
          const entry: CacheEntry<T> = JSON.parse(raw);
          if (!tenantId || entry.tenantId === tenantId) {
            this.stats.hits.l2++;
            metricsRegistry.incrementCounter("cache_hits_total", { layer: "l2" });
            this.l1.set(k, entry, this.config.l1Ttl);
            return entry.value;
          }
        }
      } catch (err) {
        logger.warn({ err, key }, "Redis L2 read failed");
      }
    }

    this.stats.misses++;
    metricsRegistry.incrementCounter("cache_misses_total");
    return undefined;
  }

  async set<T>(
    key: string,
    value: T,
    ttl?: number,
    tenantId?: string,
  ): Promise<void> {
    const k = this.l1Key(key);
    const entry: CacheEntry<T> = {
      value,
      expiresAt: Date.now() + ((ttl ?? this.config.l1Ttl) * 1000),
      version: Date.now(),
      tenantId,
    };

    this.l1.set(k, entry, ttl ?? this.config.l1Ttl);
    this.stats.sets++;
    metricsRegistry.incrementCounter("cache_sets_total", { layer: "l1" });

    const l2Ttl = ttl ?? this.config.l2Ttl;
    if (isRedisConnected()) {
      try {
        const redis = getRedis();
        await redis.setex(this.l2Key(key), l2Ttl, JSON.stringify(entry));
        metricsRegistry.incrementCounter("cache_sets_total", { layer: "l2" });
      } catch (err) {
        logger.warn({ err, key }, "Redis L2 write failed");
      }
    }
  }

  async getOrSet<T>(
    key: string,
    factory: () => Promise<T>,
    ttl?: number,
    tenantId?: string,
  ): Promise<T> {
    const cached = await this.get<T>(key, tenantId);
    if (cached !== undefined) return cached;

    try {
      const value = await factory();
      await this.set(key, value, ttl, tenantId);
      return value;
    } catch (err) {
      logger.error({ err, key }, "Cache factory failed");
      throw err;
    }
  }

  async invalidate(key: string): Promise<void> {
    const k = this.l1Key(key);
    this.l1.del(k);
    this.stale.del(`s:${k}`);
    this.stats.invalidations++;

    if (isRedisConnected()) {
      try {
        const redis = getRedis();
        await redis.del(this.l2Key(key));
      } catch (err) {
        logger.warn({ err, key }, "Redis L2 delete failed");
      }
    }
  }

  async invalidatePattern(pattern: string): Promise<void> {
    const keys = this.l1.keys().filter((k: string) => k.includes(pattern));
    for (const k of keys) {
      this.l1.del(k);
      this.stale.del(`s:${k}`);
    }
    this.stats.invalidations += keys.length;

    if (isRedisConnected()) {
      try {
        const redis = getRedis();
        const l2Keys = keys.map(k => this.l2Key(k.replace(this.config.prefix, "")));
        if (l2Keys.length > 0) {
          await redis.del(...l2Keys.map(k => k));
        }
      } catch (err) {
        logger.warn({ err, pattern }, "Redis L2 pattern delete failed");
      }
    }
  }

  async invalidateTenant(tenantId: string): Promise<void> {
    const keys = this.l1.keys().filter((k: string) => {
      const val = this.l1.get(k) as CacheEntry<unknown> | undefined;
      return val?.tenantId === tenantId;
    });
    for (const k of keys) {
      this.l1.del(k);
      this.stale.del(`s:${k}`);
    }
    this.stats.invalidations += keys.length;
  }

  getStats() {
    const total = this.stats.hits.l1 + this.stats.hits.l2 + this.stats.hits.stale + this.stats.misses;
    return {
      l1Hits: this.stats.hits.l1,
      l2Hits: this.stats.hits.l2,
      staleHits: this.stats.hits.stale,
      misses: this.stats.misses,
      sets: this.stats.sets,
      invalidations: this.stats.invalidations,
      hitRate: total > 0 ? (this.stats.hits.l1 + this.stats.hits.l2 + this.stats.hits.stale) / total : 0,
      size: this.l1.keys().length,
      staleSize: this.stale.keys().length,
    };
  }

  flush(): void {
    this.l1.flushAll();
    this.stale.flushAll();
    this.stats = { hits: { l1: 0, l2: 0, stale: 0 }, misses: 0, sets: 0, invalidations: 0 };
  }
}

export const distributedCache = new DistributedCache();
