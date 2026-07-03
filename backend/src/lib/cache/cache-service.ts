import NodeCache from "node-cache";
import { EventEmitter } from "events";

interface CacheOptions {
  ttl: number;
  tags?: string[];
}

class CacheService extends EventEmitter {
  private local: NodeCache;
  private tagIndex: Map<string, Set<string>> = new Map();
  private stats = { hits: 0, misses: 0, localHits: 0, remoteHits: 0 };
  private refreshQueues: Map<string, Promise<unknown>> = new Map();
  private version = 0;

  constructor() {
    super();
    this.local = new NodeCache({
      stdTTL: 600,
      checkperiod: 120,
      maxKeys: 50000,
      useClones: false,
    });

    this.local.on("expired", (key) => {
      this.emit("evicted", { key, reason: "expired" });
      this.removeFromTagIndex(key);
    });
  }

  async get<T>(key: string): Promise<T | undefined> {
    const localValue = this.local.get<T>(key);
    if (localValue !== undefined) {
      this.stats.hits++;
      this.stats.localHits++;
      this.emit("hit", { key, layer: "local" });
      return localValue;
    }

    this.stats.misses++;
    this.emit("miss", { key });
    return undefined;
  }

  set<T>(key: string, value: T, options?: Partial<CacheOptions>): boolean {
    const ttl = options?.ttl || 600;
    const result = this.local.set(key, value, ttl);
    if (result && options?.tags) {
      this.addToTagIndex(key, options.tags);
    }
    this.emit("set", { key, ttl, tags: options?.tags });
    return result;
  }

  async getOrFetch<T>(
    key: string,
    fetcher: () => Promise<T>,
    options?: Partial<CacheOptions>
  ): Promise<T> {
    const cached = this.local.get<T>(key);
    if (cached !== undefined) {
      this.stats.hits++;
      return cached;
    }

    const pending = this.refreshQueues.get(key);
    if (pending) return pending as T;

    const promise = fetcher()
      .then((value) => {
        this.set(key, value, options);
        this.refreshQueues.delete(key);
        return value;
      })
      .catch((err) => {
        this.refreshQueues.delete(key);
        throw err;
      });

    this.refreshQueues.set(key, promise);
    return promise;
  }

  invalidate(key: string): void {
    this.local.del(key);
    this.emit("invalidate", { key });
  }

  invalidateByTag(tag: string): number {
    const keys = this.tagIndex.get(tag);
    if (!keys || keys.size === 0) return 0;
    const deleted = this.local.del(Array.from(keys));
    this.emit("invalidateByTag", { tag, count: deleted });
    return deleted;
  }

  invalidateByPattern(pattern: string): number {
    const regex = new RegExp(pattern.replace(/\*/g, ".*"));
    const keys = this.local.keys().filter((k) => regex.test(k));
    if (keys.length === 0) return 0;
    const deleted = this.local.del(keys);
    this.emit("invalidateByPattern", { pattern, count: deleted });
    return deleted;
  }

  invalidateNamespace(namespace: string): number {
    const keys = this.local.keys().filter((k) => k.startsWith(namespace));
    if (keys.length === 0) return 0;
    const deleted = this.local.del(keys);
    this.emit("invalidateNamespace", { namespace, count: deleted });
    return deleted;
  }

  flush(): void {
    this.local.flushAll();
    this.tagIndex.clear();
    this.stats = { hits: 0, misses: 0, localHits: 0, remoteHits: 0 };
    this.version++;
    this.emit("flush");
  }

  getStats() {
    const nodeStats = this.local.getStats();
    const total = this.stats.hits + this.stats.misses;
    const keys = this.local.keys();
    return {
      hits: this.stats.hits,
      misses: this.stats.misses,
      localHits: this.stats.localHits,
      remoteHits: this.stats.remoteHits,
      keys: keys.length,
      hitsPerSecond: nodeStats.hits,
      missesPerSecond: nodeStats.misses,
      memUsage: nodeStats.vsize,
      hitRate: total > 0 ? this.stats.hits / total : 0,
      version: this.version,
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
