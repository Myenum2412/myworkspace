import { cacheProviders, LocalCacheProvider } from "./node-cache-provider.js";
import { createClient, RedisClientType } from "redis";

interface CacheManagerOptions {
  localTTL: number;
  remoteTTL: number;
  refreshThreshold: number;
  namespace: string;
}

export class CacheManager {
  private local: LocalCacheProvider;
  private remote: RedisClientType | null = null;
  private remoteConnected = false;

  constructor(
    private options: CacheManagerOptions,
    localProvider?: LocalCacheProvider
  ) {
    this.local = localProvider || cacheProviders.query;
  }

  async connectRemote(url: string, password?: string): Promise<void> {
    try {
      this.remote = createClient({
        url,
        password,
        socket: {
          reconnectStrategy: (retries) => Math.min(retries * 100, 3000),
          connectTimeout: 5000,
        },
      });
      this.remote.on("error", () => { this.remoteConnected = false; });
      this.remote.on("connect", () => { this.remoteConnected = true; });
      await this.remote.connect();
      this.remoteConnected = true;
    } catch {
      this.remoteConnected = false;
    }
  }

  async get<T>(key: string, fetcher?: () => Promise<T>): Promise<T | undefined> {
    const localResult = this.local.get<T>(key);
    if (localResult !== undefined) return localResult;

    if (this.remoteConnected && this.remote) {
      try {
        const remoteResult = await this.remote.get(key);
        if (remoteResult) {
          const parsed = JSON.parse(remoteResult) as T;
          this.local.set(key, parsed, this.options.localTTL);
          return parsed;
        }
      } catch {
        // Remote unavailable, continue
      }
    }

    if (fetcher) {
      const value = await fetcher();
      if (value !== undefined) {
        await this.set(key, value);
      }
      return value;
    }

    return undefined;
  }

  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    const localTTL = ttl || this.options.localTTL;
    const remoteTTL = ttl || this.options.remoteTTL;

    this.local.set(key, value, localTTL);

    if (this.remoteConnected && this.remote) {
      try {
        await this.remote.setEx(key, remoteTTL, JSON.stringify(value));
      } catch {
        // Remote unavailable
      }
    }
  }

  async del(key: string): Promise<void> {
    this.local.del(key);
    if (this.remoteConnected && this.remote) {
      try {
        await this.remote.del(key);
      } catch {
        // Remote unavailable
      }
    }
  }

  async delByTag(tag: string): Promise<void> {
    const deleted = this.local.delByTag(tag);
    if (this.remoteConnected && this.remote) {
      try {
        const keys = await this.remote.keys(`*${tag}*`);
        if (keys.length > 0) {
          await this.remote.del(keys);
        }
      } catch {
        // Remote unavailable
      }
    }
  }

  async getOrFetch<T>(key: string, fetcher: () => Promise<T>, ttl?: number): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== undefined) return cached;
    const value = await fetcher();
    await this.set(key, value, ttl);
    return value;
  }

  async refreshPattern(pattern: string): Promise<void> {
    const keys = this.local.keys().filter(k => k.includes(pattern));
    for (const key of keys) {
      this.local.del(key);
    }
    if (this.remoteConnected && this.remote) {
      try {
        const remoteKeys = await this.remote.keys(`*${pattern}*`);
        if (remoteKeys.length > 0) {
          await this.remote.del(remoteKeys);
        }
      } catch {
        // Remote unavailable
      }
    }
  }

  getLocalStats() {
    return this.local.getStats();
  }
}
