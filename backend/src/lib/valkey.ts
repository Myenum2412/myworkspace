import { Redis as IORedis } from "ioredis";
import { env } from "../config/env.js";
import { logger } from "./logger/index.js";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let client: any = null;
let connected = false;

export function getValkey() {
  if (!client) {
    client = new IORedis(env.VALKEY_URL, {
      maxRetriesPerRequest: 3,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      retryStrategy(times: number): number | null {
        if (times > 5) return null;
        return Math.min(times * 200, 2000);
      },
      lazyConnect: true,
    });

    client.on("connect", () => {
      logger.info("Valkey connected");
      connected = true;
    });

    client.on("error", (err: Error) => {
      logger.warn({ err }, "Valkey error");
      connected = false;
    });

    client.on("close", () => {
      connected = false;
    });

    client.connect().catch(() => {});
  }
  return client;
}

export function isValkeyConnected(): boolean {
  return connected && client?.status === "ready";
}

export async function valkeyGet<T>(key: string): Promise<T | null> {
  if (!isValkeyConnected()) return null;
  try {
    const raw = await client!.get(key);
    if (raw === null) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export async function valkeySet(key: string, value: unknown, ttlSec = 300): Promise<void> {
  if (!isValkeyConnected()) return;
  try {
    await client!.setex(key, ttlSec, JSON.stringify(value));
  } catch {
    // silently fail
  }
}

export async function valkeyDel(key: string): Promise<void> {
  if (!isValkeyConnected()) return;
  try {
    await client!.del(key);
  } catch {
    // silently fail
  }
}

export async function valkeyDelByPattern(pattern: string): Promise<void> {
  if (!isValkeyConnected()) return;
  try {
    let cursor = "0";
    const batchSize = 100;
    do {
      const [nextCursor, keys] = await client!.scan(cursor, "MATCH", pattern, "COUNT", batchSize);
      cursor = nextCursor;
      if (keys.length > 0) {
        await client!.del(...keys);
      }
    } while (cursor !== "0");
  } catch {
    // silently fail
  }
}
