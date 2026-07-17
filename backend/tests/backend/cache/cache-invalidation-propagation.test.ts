import { jest } from "@jest/globals";
import { cacheManager, CacheKeys } from "../../../src/lib/cache.js";

jest.mock("../../../src/lib/redis.js", () => ({
  redisGet: jest.fn().mockResolvedValue(null),
  redisSet: jest.fn().mockResolvedValue(undefined),
  redisDel: jest.fn().mockResolvedValue(undefined),
  redisDelByPattern: jest.fn().mockResolvedValue(undefined),
  isRedisConnected: jest.fn(() => true),
  getRedis: jest.fn(() => ({
    status: "ready",
    on: jest.fn(),
    connect: jest.fn(),
  })),
}));

describe("CacheManager - cache key generation", () => {
  it("CacheKeys.taskList generates correct key", () => {
    expect(CacheKeys.taskList("org-1", 1, 20)).toBe("tasks:org-1:p1:l20");
  });

  it("CacheKeys.taskDetail generates correct key", () => {
    expect(CacheKeys.taskDetail("task-123")).toBe("task:task-123");
  });

  it("CacheKeys.teamList generates correct key", () => {
    expect(CacheKeys.teamList("org-1")).toBe("teams:org-1");
  });

  it("CacheKeys.dashboardMetrics generates correct key", () => {
    expect(CacheKeys.dashboardMetrics("org-1")).toBe("dashboard:org-1:metrics");
  });

  it("CacheKeys.userProfile generates correct key", () => {
    expect(CacheKeys.userProfile("user-1")).toBe("user:user-1:profile");
  });

  it("CacheKeys.timeEntrySummary generates correct key", () => {
    expect(CacheKeys.timeEntrySummary("org-1", "2024-01-15")).toBe("timesummary:org-1:2024-01-15");
  });
});

describe("CacheManager - write-through and invalidation", () => {
  let cm: any;

  beforeEach(() => {
    cm = cacheManager;
    cm.flush();
    jest.clearAllMocks();
  });

  it("set stores value and get retrieves it", () => {
    cm.set("test-key", { data: 123 });
    expect(cm.get("test-key")).toEqual({ data: 123 });
  });

  it("get returns undefined for missing key", () => {
    expect(cm.get("missing-key")).toBeUndefined();
  });

  it("del removes key from cache", () => {
    cm.set("k", "v");
    cm.del("k");
    expect(cm.get("k")).toBeUndefined();
  });

  it("del with array removes multiple keys", () => {
    cm.set("a", 1);
    cm.set("b", 2);
    cm.del(["a", "b"]);
    expect(cm.get("a")).toBeUndefined();
    expect(cm.get("b")).toBeUndefined();
  });

  it("delByPattern removes matching keys", () => {
    cm.set("user:1:profile", "a");
    cm.set("user:2:profile", "b");
    cm.set("org:1:settings", "c");

    cm.delByPattern("user:");
    expect(cm.get("user:1:profile")).toBeUndefined();
    expect(cm.get("user:2:profile")).toBeUndefined();
    expect(cm.get("org:1:settings")).toBe("c");
  });

  it("getOrSet fetches from factory on miss and caches result", async () => {
    const factory = jest.fn().mockResolvedValue("computed");
    const result = await cm.getOrSet("miss-key", factory);
    expect(result).toBe("computed");
    expect(factory).toHaveBeenCalledTimes(1);

    // Second call should use cache
    const cached = await cm.getOrSet("miss-key", factory);
    expect(cached).toBe("computed");
    expect(factory).toHaveBeenCalledTimes(1);
  });

  it("getOrSet uses L1 cache when available", async () => {
    cm.set("l1-hit", "from-l1");
    const factory = jest.fn().mockResolvedValue("from-factory");
    const result = await cm.getOrSet("l1-hit", factory);
    expect(result).toBe("from-l1");
    expect(factory).not.toHaveBeenCalled();
  });

  it("flush clears all cached data", () => {
    cm.set("a", 1);
    cm.set("b", 2);
    cm.flush();
    expect(cm.get("a")).toBeUndefined();
    expect(cm.get("b")).toBeUndefined();
  });

  it("getOrSet propagates factory errors", async () => {
    const failingFactory = jest.fn().mockRejectedValue(new Error("source down"));
    await expect(cm.getOrSet("error-key", failingFactory)).rejects.toThrow("source down");
  });
});

describe("CacheManager - TTL behavior", () => {
  let cm: any;

  beforeEach(() => {
    cm = cacheManager;
    cm.flush();
  });

  it("set with custom TTL expires after that TTL", async () => {
    cm.set("ttl-test", "value", 1);
    expect(cm.get("ttl-test")).toBe("value");
    await new Promise((r) => setTimeout(r, 1100));
    expect(cm.get("ttl-test")).toBeUndefined();
  });

  it("set without TTL uses default", () => {
    cm.set("default-ttl", "value");
    expect(cm.get("default-ttl")).toBe("value");
  });
});
