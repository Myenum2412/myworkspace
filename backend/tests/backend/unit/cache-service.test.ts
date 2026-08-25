import { jest } from "@jest/globals";
import { cacheService } from "../../../src/lib/cache/cache-service.js";

beforeEach(() => {
  cacheService.flush();
});

describe("CacheService", () => {
  describe("set / get", () => {
    it("stores and retrieves a value", async () => {
      cacheService.set("key1", "value1");
      expect(await cacheService.get("key1")).toBe("value1");
    });

    it("returns undefined for missing key", async () => {
      expect(await cacheService.get("nonexistent")).toBeUndefined();
    });

    it("stores objects", async () => {
      const obj = { a: 1, b: [2, 3] };
      cacheService.set("obj", obj);
      expect(await cacheService.get("obj")).toEqual(obj);
    });

    it("stores with custom TTL", async () => {
      cacheService.set("short", "value", { ttl: 1 });
      await new Promise((r) => setTimeout(r, 1100));
      expect(await cacheService.get("short")).toBeUndefined();
    });

    it("overwrites existing key", async () => {
      cacheService.set("k", "old");
      cacheService.set("k", "new");
      expect(await cacheService.get("k")).toBe("new");
    });
  });

  describe("getOrFetch", () => {
    it("returns cached value without calling fetcher", async () => {
      cacheService.set("k", "cached");
      const fetcher = jest.fn().mockResolvedValue("fresh");
      const result = await cacheService.getOrFetch("k", fetcher);
      expect(result).toBe("cached");
      expect(fetcher).not.toHaveBeenCalled();
    });

    it("calls fetcher on cache miss and caches result", async () => {
      const fetcher = jest.fn().mockResolvedValue("computed");
      const result = await cacheService.getOrFetch("miss", fetcher);
      expect(result).toBe("computed");
      expect(fetcher).toHaveBeenCalledTimes(1);
      expect(await cacheService.get("miss")).toBe("computed");
    });

    it("deduplicates concurrent fetchers for same key", async () => {
      let callCount = 0;
      const slowFetcher = jest.fn().mockImplementation(async () => {
        callCount++;
        await new Promise((r) => setTimeout(r, 50));
        return "slow-value";
      });

      const [r1, r2, r3] = await Promise.all([
        cacheService.getOrFetch("dedup", slowFetcher),
        cacheService.getOrFetch("dedup", slowFetcher),
        cacheService.getOrFetch("dedup", slowFetcher),
      ]);

      expect(r1).toBe("slow-value");
      expect(r2).toBe("slow-value");
      expect(r3).toBe("slow-value");
      expect(callCount).toBe(1);
    });

    it("throws when fetcher throws", async () => {
      const failingFetcher = jest.fn().mockRejectedValue(new Error("fetch failed"));
      await expect(cacheService.getOrFetch("fail", failingFetcher)).rejects.toThrow("fetch failed");
    });

    it("does not cache thrown errors", async () => {
      const failingFetcher = jest.fn().mockRejectedValue(new Error("fail"));
      await expect(cacheService.getOrFetch("e", failingFetcher)).rejects.toThrow();
      const okFetcher = jest.fn().mockResolvedValue("ok");
      await expect(cacheService.getOrFetch("e", okFetcher)).resolves.toBe("ok");
      expect(okFetcher).toHaveBeenCalledTimes(1);
    });
  });

  describe("invalidation", () => {
    it("invalidates a single key", async () => {
      cacheService.set("k", "v");
      cacheService.invalidate("k");
      expect(await cacheService.get("k")).toBeUndefined();
    });

    it("invalidates by tag", async () => {
      cacheService.set("a", 1, { tags: ["tag1"] });
      cacheService.set("b", 2, { tags: ["tag1", "tag2"] });
      cacheService.set("c", 3, { tags: ["tag2"] });

      const deleted = cacheService.invalidateByTag("tag1");
      expect(deleted).toBe(2);
      expect(await cacheService.get("a")).toBeUndefined();
      expect(await cacheService.get("b")).toBeUndefined();
      expect(await cacheService.get("c")).toBe(3);
    });

    it("returns 0 when invalidating non-existent tag", () => {
      expect(cacheService.invalidateByTag("nonexistent")).toBe(0);
    });

    it("invalidates by pattern", async () => {
      cacheService.set("user:1:profile", "a");
      cacheService.set("user:2:profile", "b");
      cacheService.set("org:1:settings", "c");

      const deleted = cacheService.invalidateByPattern("user:*:profile");
      expect(deleted).toBe(2);
      expect(await cacheService.get("user:1:profile")).toBeUndefined();
      expect(await cacheService.get("org:1:settings")).toBe("c");
    });

    it("invalidates by namespace", async () => {
      cacheService.set("org:1:users", "a");
      cacheService.set("org:1:settings", "b");
      cacheService.set("org:2:users", "c");

      const deleted = cacheService.invalidateNamespace("org:1:");
      expect(deleted).toBe(2);
      expect(await cacheService.get("org:1:users")).toBeUndefined();
      expect(await cacheService.get("org:2:users")).toBe("c");
    });
  });

  describe("flush", () => {
    it("clears all cached data", () => {
      cacheService.set("a", 1);
      cacheService.set("b", 2);
      cacheService.flush();
      expect(cacheService.keys()).toHaveLength(0);
    });

    it("resets stats", async () => {
      await cacheService.get("miss");
      cacheService.flush();
      const stats = cacheService.getStats();
      expect(stats.hits).toBe(0);
      expect(stats.misses).toBe(0);
    });

    it("increments version on flush", () => {
      const v1 = cacheService.getStats().version;
      cacheService.flush();
      const v2 = cacheService.getStats().version;
      expect(v2).toBeGreaterThan(v1);
    });
  });

  describe("getStats", () => {
    it("tracks hits and misses", async () => {
      cacheService.set("k", "v");
      await cacheService.get("k"); // hit
      await cacheService.get("miss"); // miss
      const stats = cacheService.getStats();
      expect(stats.hits).toBe(1);
      expect(stats.misses).toBe(1);
      expect(stats.hitRate).toBeCloseTo(0.5);
    });

    it("tracks keys count", () => {
      expect(cacheService.getStats().keys).toBe(0);
      cacheService.set("a", 1);
      cacheService.set("b", 2);
      expect(cacheService.getStats().keys).toBe(2);
    });
  });
});
