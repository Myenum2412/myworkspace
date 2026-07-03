import { Response, NextFunction } from "express";
import { cacheService } from "../lib/cache/cache-service.js";
import type { AuthRequest } from "./auth.js";

interface CacheMiddlewareOptions {
  ttl: number;
  keyPrefix?: string;
  varyByUser?: boolean;
  varyByOrg?: boolean;
  varyByQuery?: boolean;
  method?: string[];
}

function buildCacheKey(req: AuthRequest, options: CacheMiddlewareOptions): string {
  const parts: string[] = [options.keyPrefix || ""];
  parts.push(req.method);
  parts.push(req.originalUrl || req.url);
  if (options.varyByUser && req.user?.userId) parts.push(`u:${req.user.userId}`);
  if (options.varyByOrg && req.user?.orgId) parts.push(`o:${req.user.orgId}`);
  if (options.varyByQuery) {
    const query = req.query;
    if (Object.keys(query).length > 0) {
      parts.push(`q:${JSON.stringify(query, Object.keys(query).sort())}`);
    }
  }
  return parts.join("|");
}

export function cache(options: CacheMiddlewareOptions) {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    if (options.method && !options.method.includes(req.method)) {
      return next();
    }

    if (req.method !== "GET" && req.method !== "HEAD") {
      return next();
    }

    const key = buildCacheKey(req, options);
    const cached = cacheService.get<string>(key);

    if (cached !== undefined) {
      res.setHeader("X-Cache", "HIT");
      res.setHeader("X-Cache-Key", key);
      res.setHeader("Content-Type", "application/json");
      return res.status(200).send(cached);
    }

    const originalSend = res.send.bind(res);
    res.send = (body: unknown): Response => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        const bodyStr = typeof body === "string" ? body : JSON.stringify(body);
        cacheService.set(key, bodyStr, { ttl: options.ttl });
        res.setHeader("X-Cache", "MISS");
      }
      return originalSend(body);
    };

    next();
  };
}

export function clearCache(pattern?: string) {
  return (_req: AuthRequest, _res: Response, next: NextFunction) => {
    if (pattern) {
      cacheService.invalidateByPattern(pattern);
    }
    next();
  };
}
