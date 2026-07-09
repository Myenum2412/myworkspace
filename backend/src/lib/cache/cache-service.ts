import NodeCache from "node-cache";
import { EventEmitter } from "events";
import { redisGet, redisSet, redisDel, isRedisConnected, redisDelByPattern } from "../redis.js";
import { logger } from "../logger/index.js";
import { metricsRegistry } from "../monitoring/index.js";

interface CacheOptions {
  ttl: number;
  tags?: string[];
  namespace?: string;
  backgroundRefresh?: boolean;
  staleIfError?: boolean;
  staleWhileRevalidate?: boolean;
}

interface CacheLayerStats {
  keys: number;
  hits: number;
  misses: number;
  hitRate: number;
  memUsage: number;
}

class CacheService extends EventEmitter {
  private local: NodeCache;
  private staleLocal: NodeCache;
  private tagIndex: Map<string, Set<string>> = new Map();
  private stats = {
    hits: { l1: 0, l2: 0, l3: 0 },
    misses: { l1: 0, l2: 0, l3: 0 },
    localHits: 0,
    remoteHits: 0,
  };
  private refreshQueues: Map<string, Promise<unknown>> = new Map();
  private refreshTimers: Map<string, ReturnType<typeof setInterval>> = new Map();
  private version = 0;
  private maxKeys = 50000;

  constructor() {
    super();
    this.local = new NodeCache({
      stdTTL: 600,
      checkperiod: 120,
      maxKeys: this.maxKeys,
      useClones: false,
    });

    this.staleLocal = new NodeCache({
      stdTTL: 3600,
      checkperiod: 300,
      maxKeys: this.maxKeys,
      useClones: false,
    });

    this.local.on("expired", (key) => {
      const value = this.local.get(key);
      if (value !== undefined) {
        this.staleLocal.set(`stale:${key}`, value);
      }
      this.emit("evicted", { key, reason: "expired" });
      this.removeFromTagIndex(key);
    });
  }

  // ── L1: NodeCache ──
  async get<T>(key: string, options?: { acceptStale?: boolean }): Promise<T | undefined> {
    const localValue = this.local.get<T>(key);
    if (localValue !== undefined) {
      this.stats.hits.l1++;
      this.emit("hit", { key, layer: "l1" });
      metricsRegistry.incrementCounter("cache_layer_hits", { layer: "l1", key });
      return localValue;
    }

    // L1 stale
    if (options?.acceptStale) {
      const staleValue = this.staleLocal.get<T>(`stale:${key}`);
      if (staleValue !== undefined) {
        this.emit("hit", { key, layer: "l1_stale" });
        return staleValue;
      }
    }

    this.stats.misses.l1++;
    return undefined;
  }

  set<T>(key: string, value: T, options?: Partial<CacheOptions>): boolean {
    const ttl = options?.ttl || 600;
    const result = this.local.set(key, value, ttl);

    if (result) {
      if (options?.tags) this.addToTagIndex(key, options.tags);

      // L2: Redis write-through
      if (isRedisConnected()) {
        redisSet(key, value, ttl).catch((err) => {
          logger.warn({ err, key }, "L2 cache set failed");
        });
      }

      this.emit("set", { key, ttl, tags: options?.tags, layer: "l1" });
      metricsRegistry.incrementCounter("cache_sets_total", { layer: "l1" });

      // Background refresh timer
      if (options?.backgroundRefresh) {
        this.scheduleRefresh(key, ttl);
      }
    }

    return result;
  }

  // ── L2: Redis fetch —─
  async getFromL2<T>(key: string): Promise<T | null> {
    if (!isRedisConnected()) return null;
    try {
      const value = await redisGet<T>(key);
      if (value !== null) {
        this.stats.hits.l2++;
        this.emit("hit", { key, layer: "l2" });
        metricsRegistry.incrementCounter("cache_layer_hits", { layer: "l2" });
        return value;
      }
    } catch (err) {
      logger.warn({ err, key }, "L2 cache get failed");
    }
    this.stats.misses.l2++;
    return null;
  }

  // ── Full multi-layer getOrFetch (L1 → L1_stale → L2 → L3 → factory) ──
  async getOrFetch<T>(
    key: string,
    fetcher: () => Promise<T>,
    options?: Partial<CacheOptions>,
  ): Promise<T> {
    // L1: NodeCache
    const cached = this.local.get<T>(key);
    if (cached !== undefined) {
      this.stats.hits.l1++;
      return cached;
    }

    // L1 stale: serve stale + background refresh
    if (options?.staleWhileRevalidate || options?.staleIfError) {
      const stale = this.staleLocal.get<T>(`stale:${key}`);
      if (stale !== undefined) {
        this.refreshInBackground(key, fetcher, options);
        return stale;
      }
    }

    // Deduplicate concurrent fetches — register BEFORE any async operation
    const pending = this.refreshQueues.get(key);
    if (pending) return pending as T;

    const promise = (async () => {
      try {
        // L2: Redis
        const l2 = await this.getFromL2<T>(key);
        if (l2 !== null) {
          this.local.set(key, l2, options?.ttl || 600);
          return l2;
        }

        const value = await fetcher();
        this.set(key, value, options);
        return value;
      } catch (err) {
        // L1 stale on error
        if (options?.staleIfError) {
          const stale = this.staleLocal.get<T>(`stale:${key}`);
          if (stale !== undefined) return stale;
        }
        throw err;
      } finally {
        this.refreshQueues.delete(key);
      }
    })();
    this.refreshQueues.set(key, promise);
    return promise;
  }

  private refreshInBackground<T>(key: string, fetcher: () => Promise<T>, options?: Partial<CacheOptions>): void {
    if (this.refreshQueues.has(key)) return;
    const promise = fetcher()
      .then((value) => {
        this.set(key, value, options);
        this.refreshQueues.delete(key);
      })
      .catch(() => {
        this.refreshQueues.delete(key);
      });
    this.refreshQueues.set(key, promise);
  }

  private scheduleRefresh(key: string, ttl: number): void {
    this.cancelRefresh(key);
    const refreshAt = Math.max((ttl - 60) * 1000, 5000);
    const timer = setTimeout(() => {
      this.emit("refresh", { key });
    }, refreshAt);
    this.refreshTimers.set(key, timer as unknown as ReturnType<typeof setInterval>);
  }

  private cancelRefresh(key: string): void {
    const timer = this.refreshTimers.get(key);
    if (timer) {
      clearTimeout(timer as unknown as NodeJS.Timeout);
      this.refreshTimers.delete(key);
    }
  }

  // ── Invalidation ──
  invalidate(key: string): void {
    this.local.del(key);
    this.staleLocal.del(`stale:${key}`);
    this.cancelRefresh(key);

    // L2
    if (isRedisConnected()) {
      redisDel(key).catch(() => {});
    }
    this.emit("invalidate", { key });
  }

  invalidateByTag(tag: string): number {
    const keys = this.tagIndex.get(tag);
    if (!keys || keys.size === 0) return 0;
    const deleted = this.local.del(Array.from(keys));
    for (const key of keys) {
      this.staleLocal.del(`stale:${key}`);
      if (isRedisConnected()) {
        redisDel(key).catch(() => {});
      }
    }
    this.emit("invalidateByTag", { tag, count: deleted });
    return deleted;
  }

  invalidateByPattern(pattern: string): number {
    const regex = new RegExp(pattern.replace(/\*/g, ".*"));
    const keys = this.local.keys().filter((k) => regex.test(k));
    if (keys.length === 0) return 0;

    for (const key of keys) {
      this.staleLocal.del(`stale:${key}`);
      if (isRedisConnected()) {
        redisDel(key).catch(() => {});
      }
    }
    const deleted = this.local.del(keys);
    this.emit("invalidateByPattern", { pattern, count: deleted });
    return deleted;
  }

  invalidateNamespace(namespace: string): number {
    const keys = this.local.keys().filter((k) => k.startsWith(namespace));
    if (keys.length === 0) return 0;

    for (const key of keys) {
      this.staleLocal.del(`stale:${key}`);
      if (isRedisConnected()) {
        redisDel(key).catch(() => {});
      }
    }
    const deleted = this.local.del(keys);
    this.emit("invalidateNamespace", { namespace, count: deleted });
    return deleted;
  }

  flush(): void {
    this.local.flushAll();
    this.staleLocal.flushAll();
    this.tagIndex.clear();
    for (const [, timer] of this.refreshTimers) {
      clearTimeout(timer as unknown as NodeJS.Timeout);
    }
    this.refreshTimers.clear();
    this.refreshQueues.clear();
    this.stats = { hits: { l1: 0, l2: 0, l3: 0 }, misses: { l1: 0, l2: 0, l3: 0 }, localHits: 0, remoteHits: 0 };
    this.version++;
    this.emit("flush");
  }

  getStats(): CacheLayerStats & { layers: Record<string, unknown> } {
    const nodeStats = this.local.getStats();
    const total = this.stats.hits.l1 + this.stats.hits.l2 + this.stats.misses.l1 + this.stats.misses.l2;
    const keys = this.local.keys();

    return {
      keys: keys.length,
      hits: this.stats.hits.l1 + this.stats.hits.l2,
      misses: this.stats.misses.l1 + this.stats.misses.l2,
      hitRate: total > 0 ? (this.stats.hits.l1 + this.stats.hits.l2) / total : 0,
      memUsage: nodeStats.vsize,
      version: this.version,
      layers: {
        l1: { keys: keys.length, hits: this.stats.hits.l1, misses: this.stats.misses.l1 },
        l2: { hits: this.stats.hits.l2, misses: this.stats.misses.l2, connected: isRedisConnected() },
        staleKeys: this.staleLocal.keys().length,
        refreshQueues: this.refreshQueues.size,
        version: this.version,
      },
    };
  }

  keys(): string[] {
    return this.local.keys();
  }

  private addToTagIndex(key: string, tags: string[]): void {
    for (const tag of tags) {
      if (!this.tagIndex.has(tag)) this.tagIndex.set(tag, new Set());
      this.tagIndex.get(tag)!.add(key);
    }
  }

  private removeFromTagIndex(key: string): void {
    for (const [, keys] of this.tagIndex) keys.delete(key);
  }
}

export const cacheService = new CacheService();