import { env } from "../../config/env.js";
import { logger } from "../logger/index.js";

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

class CacheManager {
  private store: Map<string, CacheEntry<any>>;
  private defaultTTL: number;
  private cleanupInterval: ReturnType<typeof setInterval> | null = null;

  constructor(defaultTTLMs = 30000) {
    this.store = new Map();
    this.defaultTTL = defaultTTLMs;
    this.startCleanup();
  }

  private startCleanup() {
    this.cleanupInterval = setInterval(() => {
      const now = Date.now();
      for (const [key, entry] of this.store.entries()) {
        if (entry.expiresAt < now) {
          this.store.delete(key);
        }
      }
    }, 10000);
  }

  async get<T>(key: string): Promise<T | null> {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (entry.expiresAt < Date.now()) {
      this.store.delete(key);
      return null;
    }
    return entry.value as T;
  }

  async set<T>(key: string, value: T, ttlMs?: number): Promise<void> {
    this.store.set(key, {
      value,
      expiresAt: Date.now() + (ttlMs || this.defaultTTL),
    });
  }

  async delete(key: string): Promise<void> {
    this.store.delete(key);
  }

  async clear(): Promise<void> {
    this.store.clear();
  }

  async has(key: string): Promise<boolean> {
    const entry = this.store.get(key);
    if (!entry) return false;
    if (entry.expiresAt < Date.now()) {
      this.store.delete(key);
      return false;
    }
    return true;
  }

  get size(): number {
    return this.store.size;
  }

  destroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.store.clear();
  }
}

export const cacheManager = new CacheManager(30000);

export async function getOrSet<T>(
  key: string,
  factory: () => Promise<T>,
  ttlMs?: number,
): Promise<T> {
  const cached = await cacheManager.get<T>(key);
  if (cached !== null) return cached;

  const value = await factory();
  await cacheManager.set(key, value, ttlMs);
  return value;
}

export async function invalidatePattern(pattern: string): Promise<void> {
  for (const key of cacheManager["store"].keys()) {
    if (key.includes(pattern)) {
      await cacheManager.delete(key);
    }
  }
}
