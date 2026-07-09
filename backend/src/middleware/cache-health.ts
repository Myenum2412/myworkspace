import { Response, NextFunction } from "express";
import { execSync, exec as execCallback } from "child_process";
import { promisify } from "util";
import NodeCache from "node-cache";
import { Redis, Cluster } from "ioredis";
import { getRedis, isRedisConnected } from "../lib/redis.js";
import { logger } from "../lib/logger/index.js";
import { cacheService } from "../lib/cache/cache-service.js";
import type { AuthRequest } from "./auth.js";

const exec = promisify(execCallback);

interface LayerHealth {
  status: "healthy" | "degraded" | "down";
  latencyMs: number;
  details?: Record<string, unknown>;
  error?: string;
}

interface CacheHealthResponse {
  success: boolean;
  status: "healthy" | "degraded" | "down";
  timestamp: string;
  durationMs: number;
  layers: {
    nodecache: LayerHealth;
    valkey: LayerHealth;
    valkeyCluster?: LayerHealth;
    valkeySentinel?: LayerHealth;
    varnish?: LayerHealth;
  };
  summary: {
    totalKeys: number;
    hitRate: number;
    memoryEstimate: string;
  };
}

const healthCache = new NodeCache({
  stdTTL: 5,
  checkperiod: 2,
  maxKeys: 10,
  useClones: false,
});

const HEALTH_CACHE_KEY = "cache:health:result";

async function checkNodeCache(): Promise<LayerHealth> {
  const start = performance.now();
  try {
    const stats = cacheService.getStats();
    const elapsed = performance.now() - start;
    return {
      status: "healthy",
      latencyMs: Math.round(elapsed * 100) / 100,
      details: {
        keys: stats.keys,
        hits: stats.hits,
        misses: stats.misses,
        hitRate: stats.hitRate,
        version: (stats.layers as any)?.version ?? 0,
        memUsage: stats.memUsage,
      },
    };
  } catch (err) {
    const elapsed = performance.now() - start;
    return {
      status: "down",
      latencyMs: Math.round(elapsed * 100) / 100,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

async function checkValkey(): Promise<LayerHealth> {
  const start = performance.now();
  const details: Record<string, unknown> = {};

  try {
    const client = getRedis();
    if (!client || !isRedisConnected()) {
      const elapsed = performance.now() - start;
      return {
        status: "down",
        latencyMs: Math.round(elapsed * 100) / 100,
        error: "Valkey not connected",
      };
    }

    const pingResult = await client.ping();
    const pingElapsed = performance.now() - start;
    details.ping = pingResult;

    const infoRaw = await client.info("server");
    const infoLines = (infoRaw as string).split("\r\n");
    for (const line of infoLines) {
      if (line.startsWith("valkey_version:")) details.version = line.split(":")[1];
      if (line.startsWith("uptime_in_seconds:")) details.uptime = parseInt(line.split(":")[1], 10);
    }

    const memRaw = await client.info("memory");
    const memLines = (memRaw as string).split("\r\n");
    for (const line of memLines) {
      if (line.startsWith("used_memory_human:")) details.usedMemory = line.split(":")[1];
      if (line.startsWith("used_memory_peak_human:")) details.peakMemory = line.split(":")[1];
    }

    const statsRaw = await client.info("stats");
    const statsLines = (statsRaw as string).split("\r\n");
    for (const line of statsLines) {
      if (line.startsWith("keyspace_hits:")) details.totalHits = parseInt(line.split(":")[1], 10);
      if (line.startsWith("keyspace_misses:")) details.totalMisses = parseInt(line.split(":")[1], 10);
    }

    const dbRaw = await client.info("keyspace");
    details.databases = {};
    const dbLines = (dbRaw as string).split("\r\n");
    for (const line of dbLines) {
      if (line.startsWith("db")) {
        const [dbName, dbStats] = line.split(":");
        (details.databases as Record<string, string>)[dbName] = dbStats;
      }
    }

    return {
      status: "healthy",
      latencyMs: Math.round(pingElapsed * 100) / 100,
      details,
    };
  } catch (err) {
    const elapsed = performance.now() - start;
    return {
      status: "down",
      latencyMs: Math.round(elapsed * 100) / 100,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

async function checkValkeyCluster(): Promise<LayerHealth | null> {
  const clusterUrl = process.env.VALKEY_CLUSTER_URL || "";
  if (!clusterUrl) return null;

  const start = performance.now();
  try {
    const nodes = clusterUrl.split(",").map((n) => {
      const [host, portStr] = n.trim().split(":");
      return { host, port: parseInt(portStr || "6379", 10) };
    });

    const cluster = new Cluster(nodes, {
      redisOptions: { password: process.env.VALKEY_PASSWORD || undefined, enableAutoPipelining: false, maxRetriesPerRequest: 1 },
      enableOfflineQueue: false,
      lazyConnect: true,
      clusterRetryStrategy: () => null,
    });

    await cluster.connect();

    const elapsed = performance.now() - start;
    const clusterInfoRaw = await cluster.cluster("INFO");
    const clusterNodesRaw = await cluster.cluster("NODES");

    const details: Record<string, unknown> = {};
    const infoText = Array.isArray(clusterInfoRaw) ? clusterInfoRaw.join("\n") : String(clusterInfoRaw);
    for (const line of infoText.split("\r\n")) {
      if (line.includes(":")) {
        const [key, value] = line.split(":");
        details[key.trim()] = value?.trim();
      }
    }

    const nodesText = Array.isArray(clusterNodesRaw) ? clusterNodesRaw.join("\n") : String(clusterNodesRaw);
    const nodeLines = nodesText.split("\n").filter((l) => l.trim());
    details.totalNodes = nodeLines.length;
    details.masters = nodeLines.filter((l) => l.includes("master")).length;
    details.slaves = nodeLines.filter((l) => l.includes("slave")).length;
    details.fail = nodeLines.filter((l) => l.includes("fail")).length;

    await cluster.quit().catch(() => {});

    const status = (details.fail as number) > 0 ? "degraded" : "healthy";

    return {
      status,
      latencyMs: Math.round(elapsed * 100) / 100,
      details,
    };
  } catch (err) {
    const elapsed = performance.now() - start;
    return {
      status: "down",
      latencyMs: Math.round(elapsed * 100) / 100,
      error: err instanceof Error ? err.message : "Cluster check failed",
    };
  }
}

async function checkValkeySentinel(): Promise<LayerHealth | null> {
  const sentinelUrl = process.env.VALKEY_SENTINEL_URL || "";
  if (!sentinelUrl) return null;

  const start = performance.now();
  try {
    const sentinelNodes = sentinelUrl.split(",").map((n) => {
      const [host, portStr] = n.trim().split(":");
      return { host, port: parseInt(portStr || "26379", 10) };
    });

    const sentinel = new Redis({
      sentinels: sentinelNodes,
      name: process.env.VALKEY_SENTINEL_MASTER || "mymaster",
      password: process.env.VALKEY_PASSWORD || undefined,
      maxRetriesPerRequest: 1,
      lazyConnect: true,
      retryStrategy: () => null,
    });

    await sentinel.connect();

    const elapsed = performance.now() - start;

    const masters = await sentinel.call("SENTINEL", "MASTERS") as string[][];
    const details: Record<string, unknown> = {};

    if (masters && masters.length > 0) {
      const masterInfo = masters[0];
      for (let i = 0; i < masterInfo.length; i += 2) {
        details[masterInfo[i]] = masterInfo[i + 1];
      }
    }

    const replicas = await sentinel.call("SENTINEL", "REPLICAS", process.env.VALKEY_SENTINEL_MASTER || "mymaster") as string[][];
    details.replicaCount = replicas ? replicas.length : 0;

    const sentinelInfo = await sentinel.call("SENTINEL", "SENTINELS", process.env.VALKEY_SENTINEL_MASTER || "mymaster") as string[][];
    details.sentinelCount = sentinelInfo ? sentinelInfo.length : 0;

    await sentinel.quit().catch(() => {});

    const masterStatus = String(details.master_link_status || "ok");
    const status = masterStatus === "ok" ? "healthy" : "degraded";

    return {
      status,
      latencyMs: Math.round(elapsed * 100) / 100,
      details,
    };
  } catch (err) {
    const elapsed = performance.now() - start;
    return {
      status: "down",
      latencyMs: Math.round(elapsed * 100) / 100,
      error: err instanceof Error ? err.message : "Sentinel check failed",
    };
  }
}

async function checkVarnish(): Promise<LayerHealth | null> {
  const varnishadm = process.env.VARNISHADM_PATH || "varnishadm";
  const varnishPort = process.env.VARNISH_PORT || "6082";

  const start = performance.now();
  try {
    const { stdout } = await exec(`${varnishadm} -T localhost:${varnishPort} ping`, {
      timeout: 3000,
    });
    const elapsed = performance.now() - start;

    const status = stdout.includes("PONG") ? "healthy" : "degraded";

    const details: Record<string, unknown> = {};
    if (status === "healthy") {
      const { stdout: banList } = await exec(`${varnishadm} -T localhost:${varnishPort} ban.list`, {
        timeout: 3000,
      }).catch(() => ({ stdout: "" }));
      details.bans = banList.split("\n").filter((l) => l.trim()).length;

      const { stdout: storage } = await exec(`${varnishadm} -T localhost:${varnishPort} storage.list`, {
        timeout: 3000,
      }).catch(() => ({ stdout: "" }));
      details.storage = storage.trim();
    }

    return {
      status,
      latencyMs: Math.round(elapsed * 100) / 100,
      details,
    };
  } catch (err) {
    const elapsed = performance.now() - start;
    const errorMsg = err instanceof Error ? err.message : "Unknown error";

    if (errorMsg.includes("not found") || errorMsg.includes("ENOENT")) {
      return null;
    }

    return {
      status: "down",
      latencyMs: Math.round(elapsed * 100) / 100,
      error: errorMsg,
    };
  }
}

export function cacheHealth() {
  return async (_req: AuthRequest, res: Response, _next: NextFunction) => {
    const cached = healthCache.get<CacheHealthResponse>(HEALTH_CACHE_KEY);
    if (cached) {
      res.json(cached);
      return;
    }

    const overallStart = performance.now();

    const [nodecacheResult, valkeyResult, clusterResult, sentinelResult, varnishResult] = await Promise.all([
      checkNodeCache(),
      checkValkey(),
      checkValkeyCluster(),
      checkValkeySentinel(),
      checkVarnish(),
    ]);

    const overallDuration = performance.now() - overallStart;

    const layers: CacheHealthResponse["layers"] = {
      nodecache: nodecacheResult,
      valkey: valkeyResult,
    };

    if (clusterResult) layers.valkeyCluster = clusterResult;
    if (sentinelResult) layers.valkeySentinel = sentinelResult;
    if (varnishResult) layers.varnish = varnishResult;

    const layerStatuses = [nodecacheResult.status, valkeyResult.status];
    if (clusterResult) layerStatuses.push(clusterResult.status);
    if (sentinelResult) layerStatuses.push(sentinelResult.status);
    if (varnishResult) layerStatuses.push(varnishResult.status);

    let overallStatus: CacheHealthResponse["status"] = "healthy";
    if (layerStatuses.some((s) => s === "down")) overallStatus = "down";
    else if (layerStatuses.some((s) => s === "degraded")) overallStatus = "degraded";

    const totalKeys = nodecacheResult.details?.keys as number || 0;
    const hitRate = nodecacheResult.details?.hitRate as number || 0;

    const response: CacheHealthResponse = {
      success: true,
      status: overallStatus,
      timestamp: new Date().toISOString(),
      durationMs: Math.round(overallDuration * 100) / 100,
      layers,
      summary: {
        totalKeys,
        hitRate: Math.round(hitRate * 10000) / 100,
        memoryEstimate: valkeyResult.details?.usedMemory as string || "unknown",
      },
    };

    healthCache.set(HEALTH_CACHE_KEY, response);

    const statusCode = overallStatus === "down" ? 503 : overallStatus === "degraded" ? 200 : 200;
    res.status(statusCode).json(response);
  };
}
