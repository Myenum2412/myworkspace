import { Response, NextFunction } from "express";
import NodeCache from "node-cache";
import { Redis, Cluster } from "ioredis";
import { cacheService } from "../lib/cache/cache-service.js";
import { getRedis, isRedisConnected } from "../lib/redis.js";
import { logger } from "../lib/logger/index.js";
import type { AuthRequest } from "./auth.js";

interface CacheEnhancedOptions {
  ttl: number;
  keyPrefix?: string;
  namespace?: string;
  varyByUser?: boolean;
  varyByOrg?: boolean;
  varyByQuery?: boolean;
  varyByHeaders?: string[];
  method?: string[];
  condition?: (req: AuthRequest, res: Response) => boolean;
  tags?: string[];
  staleWhileRevalidate?: boolean;
  staleTtl?: number;
}

interface WarmPayload {
  key: string;
  value: unknown;
  ttl?: number;
}

const l1Cache = new NodeCache({
  stdTTL: 300,
  checkperiod: 60,
  maxKeys: 10000,
  useClones: false,
});

const hitCounts = new Map<string, number>();
let totalHits = 0;
let totalMisses = 0;

function buildCacheKey(req: AuthRequest, options: CacheEnhancedOptions): string {
  const parts: string[] = [options.namespace || "cache"];
  if (options.keyPrefix) parts.push(options.keyPrefix);
  parts.push(req.method);
  parts.push(req.originalUrl || req.url);

  if (options.varyByUser && req.user?.userId) parts.push(`u:${req.user.userId}`);
  if (options.varyByOrg && req.user?.orgId) parts.push(`o:${req.user.orgId}`);

  if (options.varyByQuery) {
    const query = req.query;
    if (Object.keys(query).length > 0) {
      const sorted = Object.keys(query).sort().map((k) => `${k}=${query[k]}`);
      parts.push(`q:${sorted.join("&")}`);
    }
  }

  if (options.varyByHeaders && options.varyByHeaders.length > 0) {
    for (const header of options.varyByHeaders) {
      const val = req.headers[header.toLowerCase()];
      if (val) parts.push(`h:${header}=${val}`);
    }
  }

  return parts.join("|");
}

function getL2Client(): Redis | Cluster | null {
  try {
    const client = getRedis();
    if (client && isRedisConnected()) return client;
  } catch {
    // L2 unavailable
  }
  return null;
}

async function getFromL2<T>(key: string): Promise<T | null> {
  const client = getL2Client();
  if (!client) return null;
  try {
    const raw = await client.get(key);
    if (raw === null) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

async function setToL2(key: string, value: string, ttl: number): Promise<void> {
  const client = getL2Client();
  if (!client) return;
  try {
    await client.setex(key, ttl, value);
  } catch (err) {
    logger.warn({ err, key }, "L2 cache set failed");
  }
}

async function delFromL2(key: string): Promise<void> {
  const client = getL2Client();
  if (!client) return;
  try {
    await client.del(key);
  } catch (err) {
    logger.warn({ err, key }, "L2 cache del failed");
  }
}

async function delL2ByPattern(pattern: string): Promise<number> {
  const client = getL2Client();
  if (!client) return 0;
  try {
    const keys = await client.keys(pattern);
    if (keys.length > 0) {
      await client.del(...keys);
    }
    return keys.length;
  } catch (err) {
    logger.warn({ err, pattern }, "L2 pattern del failed");
    return 0;
  }
}

export function cacheEnhanced(options: CacheEnhancedOptions) {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    if (options.method && !options.method.includes(req.method)) return next();
    if (req.method !== "GET" && req.method !== "HEAD") return next();

    if (options.condition && !options.condition(req, res)) return next();

    const cacheKey = buildCacheKey(req, options);

    const l1Hit = l1Cache.get<string>(cacheKey);
    if (l1Hit !== undefined) {
      totalHits++;
      hitCounts.set(cacheKey, (hitCounts.get(cacheKey) || 0) + 1);
      res.setHeader("X-Cache", "HIT");
      res.setHeader("X-Cache-Layer", "L1");
      res.setHeader("X-Cache-Key", cacheKey);
      res.setHeader("Content-Type", "application/json");
      return res.status(200).send(l1Hit);
    }

    const l2Hit = await getFromL2<string>(cacheKey);
    if (l2Hit !== null) {
      totalHits++;
      l1Cache.set(cacheKey, l2Hit, options.ttl);
      res.setHeader("X-Cache", "HIT");
      res.setHeader("X-Cache-Layer", "L2");
      res.setHeader("X-Cache-Key", cacheKey);
      res.setHeader("Content-Type", "application/json");
      return res.status(200).send(l2Hit);
    }

    totalMisses++;
    res.setHeader("X-Cache", "MISS");

    if (options.staleWhileRevalidate && options.staleTtl) {
      const staleData = l1Cache.get<string>(`stale:${cacheKey}`);
      if (staleData !== undefined) {
        res.setHeader("X-Cache-Stale", "true");
        res.setHeader("Content-Type", "application/json");
        res.status(200).send(staleData);

        try {
          const originalSend = res.send.bind(res);
          res.send = () => res;
          next();
        } catch {
          // revalidation will happen on next request
        }
        return;
      }
    }

    const originalSend = res.send.bind(res);
    res.send = (body: unknown): Response => {
      if (res.statusCode >= 200 && res.statusCode < 400) {
        const bodyStr = typeof body === "string" ? body : JSON.stringify(body);
        l1Cache.set(cacheKey, bodyStr, options.ttl);
        setToL2(cacheKey, bodyStr, options.ttl).catch(() => {});

        if (options.staleWhileRevalidate && options.staleTtl) {
          l1Cache.set(`stale:${cacheKey}`, bodyStr, options.staleTtl);
        }

        if (options.tags && options.tags.length > 0) {
          for (const tag of options.tags) {
            const tagKey = `tag:${tag}:${cacheKey}`;
            l1Cache.set(tagKey, cacheKey, options.ttl + 3600);
            setToL2(tagKey, cacheKey, options.ttl + 3600).catch(() => {});
          }
          res.setHeader("X-Cache-Tags", options.tags.join(","));
        }
      }
      return originalSend(body);
    };

    next();
  };
}

export function invalidateByTag(tag: string) {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      let clearedCount = 0;

      const tagPattern = `tag:${tag}:*`;
      const l1Keys = l1Cache.keys().filter((k) => k.startsWith(`tag:${tag}:`));

      for (const tagKey of l1Keys) {
        const cachedKey = l1Cache.get<string>(tagKey);
        if (cachedKey) {
          l1Cache.del(cachedKey);
          l1Cache.del(`stale:${cachedKey}`);
          l1Cache.del(tagKey);
          clearedCount++;
        }
      }

      const l2TagKeys = await delL2ByPattern(tagPattern);
      clearedCount += l2TagKeys;

      const l2Keys = await delL2ByPattern(`*${tag}*`);
      clearedCount += l2Keys;

      cacheService.invalidateByTag(tag);

      logger.info({ tag, clearedCount }, "Cache invalidated by tag");
      res.json({ success: true, tag, cleared: clearedCount });
    } catch (err) {
      logger.error({ err, tag }, "Tag invalidation failed");
      next(err);
    }
  };
}

export function invalidateByPattern(pattern: string) {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      let clearedCount = 0;

      const l1Pattern = pattern.replace(/\*/g, "");
      const l1Keys = l1Cache.keys().filter((k) => k.includes(l1Pattern));
      for (const key of l1Keys) {
        l1Cache.del(key);
        l1Cache.del(`stale:${key}`);
      }
      clearedCount += l1Keys.length;

      const l2Count = await delL2ByPattern(`*${pattern}*`);
      clearedCount += l2Count;

      cacheService.invalidateByPattern(pattern);

      logger.info({ pattern, clearedCount }, "Cache invalidated by pattern");
      res.json({ success: true, pattern, cleared: clearedCount });
    } catch (err) {
      logger.error({ err, pattern }, "Pattern invalidation failed");
      next(err);
    }
  };
}

export function warmCache() {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const payload = req.body as WarmPayload[];
      if (!Array.isArray(payload)) {
        res.status(400).json({ success: false, error: "Expected array of {key, value, ttl?}" });
        return;
      }

      let loaded = 0;
      for (const entry of payload) {
        if (!entry.key || entry.value === undefined) continue;
        const bodyStr = typeof entry.value === "string" ? entry.value : JSON.stringify(entry.value);
        const ttl = entry.ttl || 300;

        l1Cache.set(entry.key, bodyStr, ttl);
        await setToL2(entry.key, bodyStr, ttl);
        loaded++;
      }

      logger.info({ loaded }, "Cache warmed");
      res.json({ success: true, loaded });
    } catch (err) {
      next(err);
    }
  };
}

export function cacheStats() {
  return (_req: AuthRequest, res: Response) => {
    const l1Stats = l1Cache.getStats();
    const total = totalHits + totalMisses;

    res.json({
      success: true,
      stats: {
        l1: {
          keys: l1Cache.keys().length,
          hits: l1Stats.hits,
          misses: l1Stats.misses,
          ksize: l1Stats.ksize,
          vsize: l1Stats.vsize,
        },
        l2: {
          connected: isRedisConnected(),
        },
        totals: {
          hits: totalHits,
          misses: totalMisses,
          hitRate: total > 0 ? totalHits / total : 0,
        },
      },
    });
  };
}

export function flushCache() {
  return async (_req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      l1Cache.flushAll();
      hitCounts.clear();
      totalHits = 0;
      totalMisses = 0;

      const l2Client = getL2Client();
      if (l2Client) {
        await l2Client.flushall();
      }

      cacheService.flush();
      logger.info("Cache flushed");
      res.json({ success: true, message: "All cache layers flushed" });
    } catch (err) {
      next(err);
    }
  };
}

export function purgeByTag(tag: string) {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const l1Keys = l1Cache.keys().filter((k) => k.startsWith(`tag:${tag}:`));
      let cleared = 0;

      for (const tagKey of l1Keys) {
        const cacheKey = l1Cache.get<string>(tagKey);
        if (cacheKey) {
          l1Cache.del(cacheKey);
          l1Cache.del(`stale:${cacheKey}`);
          l1Cache.del(tagKey);
          cleared++;
        }
      }

      const l2Count = await delL2ByPattern(`tag:${tag}:*`);
      cleared += l2Count;

      logger.info({ tag, cleared }, "Purged by tag");
      res.json({ success: true, purged: cleared, tag });
    } catch (err) {
      next(err);
    }
  };
}

export function purgeKey(key: string) {
  return async (_req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      l1Cache.del(key);
      l1Cache.del(`stale:${key}`);
      await delFromL2(key);
      logger.info({ key }, "Purged single key");
      res.json({ success: true, purged: true, key });
    } catch (err) {
      next(err);
    }
  };
}
