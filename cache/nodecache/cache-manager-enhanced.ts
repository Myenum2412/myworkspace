import { EventEmitter } from "events";
import NodeCache from "node-cache";
import { Redis, Cluster, RedisOptions, ClusterNode, ClusterOptions } from "ioredis";
import { cacheProviders, LocalCacheProvider } from "./node-cache-provider.js";

interface CacheManagerOptions {
  localTTL: number;
  remoteTTL: number;
  refreshThreshold: number;
  namespace: string;
  clusterMode?: boolean;
  sentinelMode?: boolean;
  sentinelMaster?: string;
  sentinelNodes?: { host: string; port: number }[];
  clusterNodes?: ClusterNode[];
  clusterOptions?: ClusterOptions;
  standaloneUrl?: string;
  standaloneOptions?: RedisOptions;
  password?: string;
  enableCircuitBreaker?: boolean;
  circuitBreakerThreshold?: number;
  circuitBreakerResetMs?: number;
  writeBehindWindowMs?: number;
  maxWriteBehindBatch?: number;
  enableAutoPipelining?: boolean;
}

interface CacheHealth {
  status: "healthy" | "degraded" | "down";
  local: { status: string; keys: number; hitRate: number; memoryUsage: number };
  remote: { status: string; latencyMs: number; mode: string; connected: boolean };
  cluster?: { status: string; nodes: number; connectedSlaves: number; slots: number };
  version: number;
  uptime: number;
}

interface CacheMetrics {
  hits: number;
  misses: number;
  localHits: number;
  remoteHits: number;
  sets: number;
  dels: number;
  errors: number;
  hitRate: number;
  avgLatencyMs: number;
  latencyP50: number;
  latencyP95: number;
  latencyP99: number;
}

interface LockOptions {
  ttlMs: number;
  retryCount?: number;
  retryDelayMs?: number;
}

interface BulkEntry<T> {
  key: string;
  value: T;
  ttl?: number;
}

interface TaggedSet<T> {
  key: string;
  value: T;
  ttl?: number;
  tags?: string[];
}

interface WriteBehindEntry {
  key: string;
  value: string;
  ttl: number;
  timestamp: number;
}

const DEFAULT_OPTIONS: Partial<CacheManagerOptions> = {
  localTTL: 300,
  remoteTTL: 600,
  refreshThreshold: 0.8,
  namespace: "default",
  enableCircuitBreaker: true,
  circuitBreakerThreshold: 5,
  circuitBreakerResetMs: 30000,
  writeBehindWindowMs: 1000,
  maxWriteBehindBatch: 50,
  enableAutoPipelining: true,
};

export class CacheManagerEnhanced extends EventEmitter {
  private local: LocalCacheProvider;
  private remote: Redis | Cluster | null = null;
  private remoteConnected = false;
  private remoteMode: "standalone" | "cluster" | "sentinel" | "none" = "none";
  private options: Required<CacheManagerOptions>;

  private circuitBreakerOpen = false;
  private circuitBreakerFailures = 0;
  private circuitBreakerLastFailure = 0;

  private metrics = {
    hits: 0, misses: 0, localHits: 0, remoteHits: 0,
    sets: 0, dels: 0, errors: 0, latencies: [] as number[],
  };

  private version = Date.now();
  private startedAt = Date.now();
  private tagIndex: Map<string, Set<string>> = new Map();

  private writeBehindQueue: WriteBehindEntry[] = [];
  private writeBehindTimer: ReturnType<typeof setTimeout> | null = null;
  private writeBehindFlushing = false;

  private refreshQueues: Map<string, Promise<unknown>> = new Map();
  private reconnectAttempts = 0;
  private maxReconnectDelay = 30000;
  private healthCheckInterval: ReturnType<typeof setInterval> | null = null;

  constructor(
    opts: Partial<CacheManagerOptions> = {},
    localProvider?: LocalCacheProvider,
  ) {
    super();
    this.options = { ...DEFAULT_OPTIONS, ...opts } as Required<CacheManagerOptions>;
    this.local = localProvider || cacheProviders.query;

    this.setMaxListeners(50);

    this.local.on("hit", (data) => {
      this.metrics.hits++;
      this.metrics.localHits++;
      this.emit("hit", { ...data, layer: "local" });
    });

    this.local.on("miss", (data) => {
      this.metrics.misses++;
      this.emit("miss", { ...data, layer: "local" });
    });

    this.local.on("set", (data) => {
      this.metrics.sets++;
      this.emit("set", { ...data, layer: "local" });
    });

    this.local.on("evicted", (data) => {
      this.emit("evicted", { ...data, layer: "local" });
    });
  }

  /** Connect to a remote cache layer (Valkey standalone, cluster, or sentinel). */
  async connectRemote(): Promise<void> {
    if (this.remote) {
      await this.disconnectRemote();
    }

    try {
      if (this.options.clusterMode && this.options.clusterNodes) {
        this.remote = new Cluster(this.options.clusterNodes, {
          redisOptions: {
            password: this.options.password || undefined,
            enableAutoPipelining: this.options.enableAutoPipelining,
          },
          scaleReads: "slave",
          enableOfflineQueue: true,
          ...this.options.clusterOptions,
        });
        this.remoteMode = "cluster";
      } else if (this.options.sentinelMode && this.options.sentinelNodes) {
        this.remote = new Redis({
          sentinels: this.options.sentinelNodes,
          name: this.options.sentinelMaster || "mymaster",
          password: this.options.password || undefined,
          enableAutoPipelining: this.options.enableAutoPipelining,
          maxRetriesPerRequest: 3,
          retryStrategy: (times) => this.computeRetryDelay(times),
          reconnectOnError: () => true,
        });
        this.remoteMode = "sentinel";
      } else {
        this.remote = new Redis(this.options.standaloneUrl || "redis://localhost:6379", {
          password: this.options.password || undefined,
          enableAutoPipelining: this.options.enableAutoPipelining,
          maxRetriesPerRequest: 3,
          retryStrategy: (times) => this.computeRetryDelay(times),
          reconnectOnError: () => true,
          ...this.options.standaloneOptions,
        });
        this.remoteMode = "standalone";
      }

      this.attachRemoteEventHandlers();
      await this.remote.connect();
      this.remoteConnected = true;
      this.reconnectAttempts = 0;
      this.emit("connect", { mode: this.remoteMode });
      this.startHealthCheck();
    } catch (err) {
      this.remoteConnected = false;
      this.emit("error", { error: err, context: "connectRemote" });
      this.scheduleReconnect();
    }
  }

  /** Disconnect from the remote cache layer. */
  async disconnectRemote(): Promise<void> {
    this.stopHealthCheck();
    if (this.writeBehindTimer) {
      clearTimeout(this.writeBehindTimer);
      this.writeBehindTimer = null;
      await this.flushWriteBehind();
    }
    if (this.remote) {
      try {
        this.remote.removeAllListeners();
        await this.remote.quit();
      } catch {
        // ignore quit errors
      }
      this.remote = null;
    }
    this.remoteConnected = false;
    this.remoteMode = "none";
    this.emit("disconnect", {});
  }

  /** Get a value from cache (L1 then L2). */
  async get<T>(key: string, fetcher?: () => Promise<T>): Promise<T | undefined> {
    const start = performance.now();

    const localResult = this.local.get<T>(key);
    if (localResult !== undefined) {
      this.metrics.hits++;
      this.metrics.localHits++;
      this.recordLatency(performance.now() - start);
      return localResult;
    }

    if (!this.isRemoteAvailable()) {
      this.metrics.misses++;
      this.recordLatency(performance.now() - start);
      if (fetcher) return this.fetchAndCache(key, fetcher);
      return undefined;
    }

    try {
      const remoteResult = await this.remoteGet<T>(key);
      if (remoteResult !== undefined) {
        this.metrics.hits++;
        this.metrics.remoteHits++;
        this.local.set(key, remoteResult, this.options.localTTL);
        this.recordLatency(performance.now() - start);
        return remoteResult;
      }
    } catch (err) {
      this.metrics.errors++;
      this.recordRemoteFailure(err);
      this.emit("error", { error: err, context: "get.remote", key });
    }

    this.metrics.misses++;
    this.recordLatency(performance.now() - start);

    if (fetcher) return this.fetchAndCache(key, fetcher);
    return undefined;
  }

  /** Set a value in cache (L1 + L2). */
  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    const localTTL = ttl || this.options.localTTL;
    const remoteTTL = ttl || this.options.remoteTTL;

    this.local.set(key, value, localTTL);
    this.emit("set", { key, layer: "local", ttl: localTTL });

    if (this.isRemoteAvailable()) {
      this.enqueueWriteBehind(key, JSON.stringify(value), remoteTTL);
    }
  }

  /** Set a value with tags for group invalidation. */
  async setTagged<T>(key: string, value: T, tags: string[], ttl?: number): Promise<void> {
    const localTTL = ttl || this.options.localTTL;
    this.local.set(key, value, localTTL, tags);

    for (const tag of tags) {
      if (!this.tagIndex.has(tag)) this.tagIndex.set(tag, new Set());
      this.tagIndex.get(tag)!.add(key);
    }

    if (this.isRemoteAvailable()) {
      const remoteTTL = ttl || this.options.remoteTTL;
      const tagKey = `tag:${tags.join("|")}:${key}`;
      this.enqueueWriteBehind(key, JSON.stringify(value), remoteTTL);
      this.enqueueWriteBehind(tagKey, JSON.stringify({ key, value, tags, ttl: remoteTTL }), remoteTTL + 3600);
    }

    this.emit("set", { key, layer: "local", tags, ttl: localTTL });
  }

  /** Delete a key from both layers. */
  async del(key: string): Promise<void> {
    this.local.del(key);
    this.metrics.dels++;

    if (this.isRemoteAvailable()) {
      try {
        await this.remoteDel(key);
      } catch (err) {
        this.metrics.errors++;
        this.emit("error", { error: err, context: "del.remote", key });
      }
    }

    this.emit("del", { key });
  }

  /** Delete keys by tag across both layers. */
  async delByTag(tag: string): Promise<number> {
    const localDeleted = this.local.delByTag(tag);

    const tagKeys = this.tagIndex.get(tag);
    if (tagKeys) {
      this.tagIndex.delete(tag);
    }

    if (this.isRemoteAvailable()) {
      try {
        const allKeys = tagKeys ? Array.from(tagKeys) : [];
        const patternKeys = await this.remoteKeys(`tag:${tag}:*`);
        const keysToDel = [...new Set([...allKeys, ...patternKeys])];
        if (keysToDel.length > 0) {
          await this.remoteDel(keysToDel);
        }
      } catch (err) {
        this.metrics.errors++;
        this.emit("error", { error: err, context: "delByTag.remote", tag });
      }
    }

    this.emit("invalidate", { tag, count: localDeleted });
    return localDeleted;
  }

  /** Invalidate by pattern across layers. */
  async invalidatePattern(pattern: string): Promise<number> {
    const localKeys = this.local.keys().filter((k) => k.includes(pattern));
    const localDeleted = localKeys.length > 0 ? this.local.del(localKeys) : 0;

    if (this.isRemoteAvailable()) {
      try {
        const remoteKeys = await this.remoteKeys(`*${pattern}*`);
        if (remoteKeys.length > 0) {
          await this.remoteDel(remoteKeys);
        }
      } catch (err) {
        this.metrics.errors++;
        this.emit("error", { error: err, context: "invalidatePattern.remote", pattern });
      }
    }

    this.emit("invalidate", { pattern, count: localDeleted });
    return localDeleted;
  }

  /** Get a value or fetch from source with deduplication. */
  async getOrFetch<T>(key: string, fetcher: () => Promise<T>, ttl?: number): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== undefined) return cached;

    const pending = this.refreshQueues.get(key);
    if (pending) return pending as Promise<T>;

    const promise = this.fetchAndCache(key, fetcher, ttl);
    this.refreshQueues.set(key, promise);
    try {
      return await promise;
    } finally {
      this.refreshQueues.delete(key);
    }
  }

  /** Async refresh-ahead: proactively refresh a key when it's near expiry. */
  async refreshAhead<T>(key: string, fetcher: () => Promise<T>, ttl?: number): Promise<T> {
    const ttlSec = ttl || this.options.localTTL;
    const remainingTtl = this.local.getTtl(key);

    if (remainingTtl !== undefined) {
      const remaining = remainingTtl - Date.now();
      const threshold = ttlSec * this.options.refreshThreshold * 1000;

      if (remaining < threshold) {
        this.emit("refresh", { key, remainingMs: remaining, thresholdMs: threshold });
        fetcher()
          .then((value) => {
            this.set(key, value, ttlSec);
            this.emit("refresh.complete", { key });
          })
          .catch((err) => {
            this.emit("error", { error: err, context: "refreshAhead", key });
          });
      }
    }

    return this.getOrFetch(key, fetcher, ttlSec);
  }

  /** Acquire a distributed lock using SET NX PX. */
  async acquireLock(resource: string, options: LockOptions): Promise<boolean> {
    if (!this.isRemoteAvailable()) return false;

    const lockKey = `lock:${resource}`;
    const lockValue = `${Date.now()}:${Math.random().toString(36).slice(2)}`;
    const retryCount = options.retryCount ?? 3;
    const retryDelayMs = options.retryDelayMs ?? 100;

    for (let attempt = 0; attempt < retryCount; attempt++) {
      try {
        const result = await (this.remote! as Redis).set(lockKey, lockValue, "PX", options.ttlMs, "NX");
        if (result === "OK") {
          this.emit("lock.acquired", { resource, lockValue, ttlMs: options.ttlMs });
          return true;
        }
      } catch {
        // retry
      }

      if (attempt < retryCount - 1) {
        await new Promise((resolve) => setTimeout(resolve, retryDelayMs * Math.pow(2, attempt)));
      }
    }

    this.emit("lock.failed", { resource });
    return false;
  }

  /** Release a distributed lock. */
  async releaseLock(resource: string, lockValue: string): Promise<boolean> {
    if (!this.isRemoteAvailable()) return false;

    const lockKey = `lock:${resource}`;
    try {
      const script = `if redis.call("get", KEYS[1]) == ARGV[1] then return redis.call("del", KEYS[1]) else return 0 end`;
      const result = await (this.remote! as Redis).eval(script, 1, lockKey, lockValue);
      if (result === 1) {
        this.emit("lock.released", { resource });
        return true;
      }
    } catch (err) {
      this.metrics.errors++;
      this.emit("error", { error: err, context: "releaseLock", resource });
    }
    return false;
  }

  /** Bulk get multiple keys at once. */
  async mget<T>(keys: string[]): Promise<Map<string, T | undefined>> {
    const result = new Map<string, T | undefined>();
    const remoteKeys: string[] = [];

    for (const key of keys) {
      const localValue = this.local.get<T>(key);
      if (localValue !== undefined) {
        result.set(key, localValue);
      } else {
        remoteKeys.push(key);
      }
    }

    if (remoteKeys.length > 0 && this.isRemoteAvailable()) {
      try {
        const remoteValues = await (this.remote! as Redis).mget(...remoteKeys);
        for (let i = 0; i < remoteKeys.length; i++) {
          const raw = remoteValues[i];
          if (raw !== null) {
            try {
              const parsed = JSON.parse(raw) as T;
              result.set(remoteKeys[i], parsed);
              this.local.set(remoteKeys[i], parsed, this.options.localTTL);
            } catch {
              result.set(remoteKeys[i], raw as unknown as T);
            }
          }
        }
      } catch (err) {
        this.metrics.errors++;
        this.emit("error", { error: err, context: "mget.remote" });
      }
    }

    for (const key of keys) {
      if (!result.has(key)) {
        result.set(key, undefined);
      }
    }

    return result;
  }

  /** Bulk set multiple keys at once. */
  async mset<T>(entries: BulkEntry<T>[]): Promise<void> {
    for (const entry of entries) {
      this.local.set(entry.key, entry.value, entry.ttl || this.options.localTTL);
    }

    if (this.isRemoteAvailable()) {
      const pipeline = (this.remote! as Redis).pipeline();
      for (const entry of entries) {
        pipeline.setex(entry.key, entry.ttl || this.options.remoteTTL, JSON.stringify(entry.value));
      }
      try {
        await pipeline.exec();
      } catch (err) {
        this.metrics.errors++;
        this.emit("error", { error: err, context: "mset.remote" });
      }
    }
  }

  /** Flush all cache layers. */
  async flush(): Promise<void> {
    this.local.flush();
    this.tagIndex.clear();
    this.metrics = { hits: 0, misses: 0, localHits: 0, remoteHits: 0, sets: 0, dels: 0, errors: 0, latencies: [] };
    this.version++;
    this.emit("flush", { version: this.version });

    if (this.isRemoteAvailable()) {
      try {
        await (this.remote! as Redis).flushall();
      } catch (err) {
        this.metrics.errors++;
        this.emit("error", { error: err, context: "flush.remote" });
      }
    }
  }

  /** Get combined health status. */
  getHealth(): CacheHealth {
    const localStats = this.local.getStats();
    const uptime = Date.now() - this.startedAt;

    const health: CacheHealth = {
      status: "healthy",
      local: {
        status: "healthy",
        keys: localStats.keys,
        hitRate: localStats.hitRate,
        memoryUsage: localStats.memoryUsage,
      },
      remote: {
        status: this.remoteConnected ? "connected" : "disconnected",
        latencyMs: this.computeAverageLatency(),
        mode: this.remoteMode,
        connected: this.remoteConnected,
      },
      version: this.version,
      uptime,
    };

    if (this.remoteMode === "cluster" && this.remote && this.remote instanceof Cluster) {
      try {
        const nodes = this.remote.nodes();
        const masters = nodes.filter((n) => n.status === "ready");
        health.cluster = {
          status: masters.length > 0 ? "healthy" : "degraded",
          nodes: nodes.length,
          connectedSlaves: nodes.length - masters.length,
          slots: 16384,
        };
      } catch {
        health.cluster = { status: "unknown", nodes: 0, connectedSlaves: 0, slots: 0 };
      }
    }

    if (!this.remoteConnected && this.remoteMode !== "none") {
      health.status = "degraded";
      health.remote.status = "down";
    }

    if (this.circuitBreakerOpen) {
      health.status = "degraded";
    }

    return health;
  }

  /** Get detailed metrics. */
  getMetrics(): CacheMetrics {
    const total = this.metrics.hits + this.metrics.misses;
    const latencies = this.metrics.latencies.slice().sort((a, b) => a - b);
    const len = latencies.length;

    return {
      hits: this.metrics.hits,
      misses: this.metrics.misses,
      localHits: this.metrics.localHits,
      remoteHits: this.metrics.remoteHits,
      sets: this.metrics.sets,
      dels: this.metrics.dels,
      errors: this.metrics.errors,
      hitRate: total > 0 ? this.metrics.hits / total : 0,
      avgLatencyMs: len > 0 ? latencies.reduce((a, b) => a + b, 0) / len : 0,
      latencyP50: len > 0 ? latencies[Math.floor(len * 0.5)] : 0,
      latencyP95: len > 0 ? latencies[Math.floor(len * 0.95)] : 0,
      latencyP99: len > 0 ? latencies[Math.floor(len * 0.99)] : 0,
    };
  }

  /** Get local-only stats. */
  getLocalStats() {
    return this.local.getStats();
  }

  /** Get all local keys. */
  keys(): string[] {
    return this.local.keys();
  }

  /** Get remaining TTL for a key. */
  getTtl(key: string): number | undefined {
    return this.local.getTtl(key);
  }

  /** Get the current cache version. */
  getVersion(): number {
    return this.version;
  }

  /** Increment cache version. */
  incrementVersion(): void {
    this.version++;
    this.emit("version.change", { version: this.version });
  }

  /** Propagate invalidation to all connected cluster nodes. */
  async propagateInvalidation(keys: string[]): Promise<void> {
    if (!this.isRemoteAvailable()) return;

    try {
      const channel = "__cache__:invalidate";
      const message = JSON.stringify({ keys, version: this.version, timestamp: Date.now() });
      await (this.remote! as Redis).publish(channel, message);
      this.emit("propagated", { keys, channel });
    } catch (err) {
      this.metrics.errors++;
      this.emit("error", { error: err, context: "propagateInvalidation" });
    }
  }

  /** Subscribe to invalidation messages from other instances. */
  async subscribeToInvalidation(handler: (data: { keys: string[]; version: number }) => void): Promise<void> {
    if (!this.isRemoteAvailable()) return;

    try {
      const sub = (this.remote! as Redis).duplicate();
      await sub.subscribe("__cache__:invalidate");
      sub.on("message", (_channel: string, message: string) => {
        try {
          const data = JSON.parse(message);
          handler(data);
          this.emit("invalidation.received", data);
        } catch {
          // ignore malformed messages
        }
      });
    } catch (err) {
      this.emit("error", { error: err, context: "subscribeToInvalidation" });
    }
  }

  /** Graceful degradation: degrade remote to local-only. */
  async degradeToLocal(): Promise<void> {
    await this.disconnectRemote();
    this.emit("degraded", { mode: "local-only" });
  }

  /** Attempt to restore remote connections after degradation. */
  async restoreRemote(): Promise<boolean> {
    try {
      await this.connectRemote();
      return this.remoteConnected;
    } catch {
      return false;
    }
  }

  private async remoteGet<T>(key: string): Promise<T | undefined> {
    const remote = this.remote!;
    const raw = await remote.get(key);
    if (raw === null) return undefined;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return raw as unknown as T;
    }
  }

  private async remoteDel(keyOrKeys: string | string[]): Promise<void> {
    const remote = this.remote!;
    if (Array.isArray(keyOrKeys)) {
      if (keyOrKeys.length > 0) await remote.del(...keyOrKeys);
    } else {
      await remote.del(keyOrKeys);
    }
  }

  private async remoteKeys(pattern: string): Promise<string[]> {
    const remote = this.remote!;
    if (remote instanceof Cluster) {
      const nodes = remote.nodes("master");
      const results = await Promise.all(nodes.map((node) => node.keys(pattern)));
      return [...new Set(results.flat())];
    }
    return remote.keys(pattern);
  }

  private async fetchAndCache<T>(key: string, fetcher: () => Promise<T>, ttl?: number): Promise<T> {
    const ttlSec = ttl || this.options.localTTL;
    try {
      const value = await fetcher();
      if (value !== undefined) {
        await this.set(key, value, ttlSec);
      }
      return value;
    } catch (err) {
      this.metrics.errors++;
      this.emit("error", { error: err, context: "fetchAndCache", key });
      throw err;
    }
  }

  private enqueueWriteBehind(key: string, value: string, ttl: number): void {
    this.writeBehindQueue.push({ key, value, ttl, timestamp: Date.now() });

    if (!this.writeBehindTimer) {
      this.writeBehindTimer = setTimeout(
        () => this.flushWriteBehind(),
        this.options.writeBehindWindowMs,
      );
    }

    if (this.writeBehindQueue.length >= this.options.maxWriteBehindBatch) {
      if (this.writeBehindTimer) {
        clearTimeout(this.writeBehindTimer);
        this.writeBehindTimer = null;
      }
      this.flushWriteBehind();
    }
  }

  private async flushWriteBehind(): Promise<void> {
    if (this.writeBehindFlushing || this.writeBehindQueue.length === 0) return;
    this.writeBehindFlushing = true;

    const batch = this.writeBehindQueue.splice(0, this.options.maxWriteBehindBatch);

    try {
      const pipeline = (this.remote! as Redis).pipeline();
      for (const entry of batch) {
        pipeline.setex(entry.key, entry.ttl, entry.value);
      }
      await pipeline.exec();
      this.emit("writebehind.flush", { count: batch.length });
    } catch (err) {
      this.writeBehindQueue.unshift(...batch);
      this.metrics.errors++;
      this.emit("error", { error: err, context: "flushWriteBehind" });
    } finally {
      this.writeBehindFlushing = false;

      if (this.writeBehindQueue.length > 0) {
        this.writeBehindTimer = setTimeout(
          () => this.flushWriteBehind(),
          this.options.writeBehindWindowMs,
        );
      }
    }
  }

  private computeRetryDelay(times: number): number {
    this.reconnectAttempts = times;
    const delay = Math.min(Math.pow(2, times) * 100, this.maxReconnectDelay);
    const jitter = delay * (0.5 + Math.random() * 0.5);
    this.emit("reconnect", { attempt: times, delay: Math.round(jitter) });
    return Math.round(jitter);
  }

  private scheduleReconnect(): void {
    const delay = Math.min(Math.pow(2, this.reconnectAttempts) * 100, this.maxReconnectDelay);
    this.reconnectAttempts++;
    setTimeout(() => {
      if (!this.remoteConnected) {
        this.connectRemote().catch(() => {});
      }
    }, delay);
  }

  private startHealthCheck(): void {
    if (this.healthCheckInterval) return;
    this.healthCheckInterval = setInterval(() => {
      if (this.remote && this.remoteConnected) {
        const start = performance.now();
        this.remote.ping()
          .then(() => {
            this.recordLatency(performance.now() - start);
            if (!this.remoteConnected) {
              this.remoteConnected = true;
              this.emit("reconnect", {});
            }
          })
          .catch(() => {
            this.remoteConnected = false;
            this.recordRemoteFailure(new Error("healthcheck failed"));
          });
      }
    }, 10000);
  }

  private stopHealthCheck(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
  }

  private attachRemoteEventHandlers(): void {
    if (!this.remote) return;
    const r = this.remote;

    r.on("connect", () => {
      this.remoteConnected = true;
      this.emit("connect", { mode: this.remoteMode });
    });

    r.on("ready", () => {
      this.remoteConnected = true;
    });

    r.on("close", () => {
      this.remoteConnected = false;
      this.emit("disconnect", {});
    });

    r.on("error", (err: Error) => {
      this.remoteConnected = false;
      this.recordRemoteFailure(err);
    });

    r.on("reconnecting", () => {
      this.emit("reconnect", { attempt: this.reconnectAttempts });
    });

    if (r instanceof Cluster) {
      r.on("+node", (node) => {
        this.emit("cluster.node.added", { node: `${node.options.host}:${node.options.port}` });
      });
      r.on("-node", (node) => {
        this.emit("cluster.node.removed", { node: `${node.options.host}:${node.options.port}` });
      });
    }
  }

  private isRemoteAvailable(): boolean {
    if (this.circuitBreakerOpen) {
      if (Date.now() - this.circuitBreakerLastFailure > this.options.circuitBreakerResetMs) {
        this.circuitBreakerOpen = false;
        this.circuitBreakerFailures = 0;
        this.emit("circuitbreaker.close", {});
      } else {
        return false;
      }
    }
    return this.remoteConnected && this.remote !== null;
  }

  private recordRemoteFailure(err: Error): void {
    this.metrics.errors++;
    this.circuitBreakerFailures++;
    this.circuitBreakerLastFailure = Date.now();

    if (this.options.enableCircuitBreaker && this.circuitBreakerFailures >= this.options.circuitBreakerThreshold) {
      this.circuitBreakerOpen = true;
      this.emit("circuitbreaker.open", {
        failures: this.circuitBreakerFailures,
        threshold: this.options.circuitBreakerThreshold,
      });
    }

    this.emit("error", { error: err, context: "remote" });
  }

  private recordLatency(ms: number): void {
    this.metrics.latencies.push(ms);
    if (this.metrics.latencies.length > 1000) {
      this.metrics.latencies = this.metrics.latencies.slice(-500);
    }
  }

  private computeAverageLatency(): number {
    const latencies = this.metrics.latencies;
    if (latencies.length === 0) return 0;
    return latencies.reduce((a, b) => a + b, 0) / latencies.length;
  }
}

export const cacheManagerEnhanced = new CacheManagerEnhanced();
