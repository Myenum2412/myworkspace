import NodeCache from "node-cache";

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
    if (ttl !== undefined) {
      this.cache.set(key, value, ttl);
    } else {
      this.cache.set(key, value);
    }
  }

  del(keyOrKeys: string | string[]): number {
    return this.cache.del(keyOrKeys);
  }

  delByPattern(pattern: string): number {
    const keys = this.cache.keys();
    const matchingKeys = keys.filter((k: string) => k.includes(pattern));
    return this.cache.del(matchingKeys);
  }

  flush(): void {
    this.cache.flushAll();
  }

  getStats() {
    return this.cache.getStats();
  }

  // Helper: get or set with async factory
  async getOrSet<T>(key: string, factory: () => Promise<T>, ttl?: number): Promise<T> {
    const cached = this.get<T>(key);
    if (cached !== undefined) return cached;
    const value = await factory();
    this.set(key, value, ttl);
    return value;
  }
}

export const cacheManager = new CacheManager();

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
