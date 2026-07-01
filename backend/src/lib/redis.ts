import { Redis as IORedis } from "ioredis";
import { env } from "../config/env.js";
import { logger } from "./logger/index.js";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let client: any = null;
let connected = false;

export function getRedis() {
  if (!client) {
    client = new IORedis(env.REDIS_URL, {
      maxRetriesPerRequest: 3,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      retryStrategy(times: number): number | null {
        if (times > 5) return null;
        return Math.min(times * 200, 2000);
      },
      lazyConnect: true,
    });

    client.on("connect", () => {
      logger.info("Redis connected");
      connected = true;
    });

    client.on("error", (err: Error) => {
      logger.warn({ err }, "Redis error");
      connected = false;
    });

    client.on("close", () => {
      connected = false;
    });
  }
  return client;
}

export function isRedisConnected(): boolean {
  return connected && client?.status === "ready";
}

export async function redisGet<T>(key: string): Promise<T | null> {
  if (!isRedisConnected()) return null;
  try {
    const raw = await client!.get(key);
    if (raw === null) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export async function redisSet(key: string, value: unknown, ttlSec = 300): Promise<void> {
  if (!isRedisConnected()) return;
  try {
    await client!.setex(key, ttlSec, JSON.stringify(value));
  } catch {
    // silently fail
  }
}

export async function redisDel(key: string): Promise<void> {
  if (!isRedisConnected()) return;
  try {
    await client!.del(key);
  } catch {
    // silently fail
  }
}

export async function redisDelByPattern(pattern: string): Promise<void> {
  if (!isRedisConnected()) return;
  try {
    const keys = await client!.keys(pattern);
    if (keys.length > 0) {
      await client!.del(...keys);
    }
  } catch {
    // silently fail
  }
}
