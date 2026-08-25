import NodeCache from "node-cache";
import { EventEmitter } from "events";

interface CacheStats {
  hits: number;
  misses: number;
  keys: number;
  memoryUsage: number;
  evictions: number;
  hitRate: number;
}

export class LocalCacheProvider extends EventEmitter {
  private cache: NodeCache;
  private stats = { hits: 0, misses: 0, evictions: 0 };
  private tagIndex: Map<string, Set<string>> = new Map();
  private version = 0;

  constructor(
    private options: {
      stdTTL: number;
      checkPeriod: number;
      maxKeys: number;
      useClones: boolean;
      namespace: string;
    }
  ) {
    super();
    this.cache = new NodeCache({
      stdTTL: options.stdTTL,
      checkperiod: options.checkPeriod,
      maxKeys: options.maxKeys,
      useClones: options.useClones,
    });

    this.cache.on("expired", (key: string) => {
      this.stats.evictions++;
      this.emit("evicted", { key, reason: "expired", namespace: options.namespace });
      this.removeFromTagIndex(key);
    });

    this.cache.on("del", (key: string) => {
      this.emit("deleted", { key, namespace: options.namespace });
      this.removeFromTagIndex(key);
    });

    this.cache.on("flush", () => {
      this.emit("flushed", { namespace: options.namespace });
      this.tagIndex.clear();
    });
  }

  get<T>(key: string): T | undefined {
    const value = this.cache.get<T>(key);
    if (value !== undefined) {
      this.stats.hits++;
      this.emit("hit", { key, namespace: this.options.namespace });
    } else {
      this.stats.misses++;
      this.emit("miss", { key, namespace: this.options.namespace });
    }
    return value;
  }

  set<T>(key: string, value: T, ttl?: number, tags?: string[]): boolean {
    const fullKey = `${this.options.namespace}:${key}`;
    const result = this.cache.set(fullKey, value, ttl || this.options.stdTTL);
    if (result && tags) {
      this.addToTagIndex(fullKey, tags);
    }
    this.emit("set", { key: fullKey, namespace: this.options.namespace });
    return result;
  }

  del(key: string): number {
    const fullKey = `${this.options.namespace}:${key}`;
    const result = this.cache.del(fullKey);
    this.removeFromTagIndex(fullKey);
    return result;
  }

  delByTag(tag: string): number {
    const keys = this.tagIndex.get(tag);
    if (!keys || keys.size === 0) return 0;
    const deleted = this.cache.del(Array.from(keys));
    this.emit("invalidate", { tag, keysDeleted: deleted, namespace: this.options.namespace });
    return deleted;
  }

  flush(): void {
    this.cache.flushAll();
    this.tagIndex.clear();
    this.stats = { hits: 0, misses: 0, evictions: 0 };
    this.version++;
  }

  getStats(): CacheStats {
    const nodeStats = this.cache.getStats();
    return {
      hits: this.stats.hits,
      misses: this.stats.misses,
      keys: this.cache.keys().length,
      memoryUsage: nodeStats.vsize || 0,
      evictions: this.stats.evictions,
      hitRate: this.stats.hits + this.stats.misses > 0
        ? this.stats.hits / (this.stats.hits + this.stats.misses)
        : 0,
    };
  }

  keys(): string[] {
    return this.cache.keys();
  }

  getTtl(key: string): number | undefined {
    return this.cache.getTtl(`${this.options.namespace}:${key}`);
  }

  private addToTagIndex(key: string, tags: string[]): void {
    for (const tag of tags) {
      if (!this.tagIndex.has(tag)) {
        this.tagIndex.set(tag, new Set());
      }
      this.tagIndex.get(tag)!.add(key);
    }
  }

  private removeFromTagIndex(key: string): void {
    for (const [, keys] of this.tagIndex) {
      keys.delete(key);
    }
  }
}

export const cacheProviders = {
  config: new LocalCacheProvider({ stdTTL: 3600, checkPeriod: 600, maxKeys: 1000, useClones: true, namespace: "config" }),
  query: new LocalCacheProvider({ stdTTL: 300, checkPeriod: 60, maxKeys: 10000, useClones: false, namespace: "query" }),
  api: new LocalCacheProvider({ stdTTL: 120, checkPeriod: 30, maxKeys: 5000, useClones: false, namespace: "api" }),
  session: new LocalCacheProvider({ stdTTL: 3600, checkPeriod: 300, maxKeys: 50000, useClones: false, namespace: "session" }),
  auth: new LocalCacheProvider({ stdTTL: 300, checkPeriod: 60, maxKeys: 10000, useClones: false, namespace: "auth" }),
  permission: new LocalCacheProvider({ stdTTL: 600, checkPeriod: 120, maxKeys: 5000, useClones: false, namespace: "permission" }),
  computation: new LocalCacheProvider({ stdTTL: 60, checkPeriod: 15, maxKeys: 2000, useClones: false, namespace: "computation" }),
};
