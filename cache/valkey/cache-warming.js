import { Redis, Cluster } from "ioredis";
import { readFileSync, existsSync, readdirSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const env = {
  VALKEY_PASSWORD: process.env.VALKEY_PASSWORD || "",
  WARMUP_DATA_DIR: process.env.WARMUP_DATA_DIR || resolve(__dirname, "data"),
  WARMUP_PROFILE: process.env.WARMUP_PROFILE || "default",
  WARMUP_INCREMENTAL: process.env.WARMUP_INCREMENTAL !== "false",
  VALKEY_CLUSTER_MODE: process.env.VALKEY_CLUSTER_MODE === "true",
  VALKEY_NODES: (process.env.VALKEY_NODES || "valkey-cluster-0:6379,valkey-cluster-1:6379,valkey-cluster-2:6379").split(","),
  VALKEY_STANDALONE_URL: process.env.VALKEY_STANDALONE_URL || "redis://localhost:6379",
  VALKEY_SENTINEL_MODE: process.env.VALKEY_SENTINEL_MODE === "true",
  VALKEY_SENTINEL_MASTER: process.env.VALKEY_SENTINEL_MASTER || "mymaster",
  VALKEY_SENTINEL_NODES: (process.env.VALKEY_SENTINEL_NODES || "sentinel-0:26379,sentinel-1:26379,sentinel-2:26379").split(","),
};

const TTL_CONFIG = {
  "config": 3600,
  "features": 3600,
  "plans": 7200,
  "rate-limits": 900,
  "permissions": 3600,
  "rbac": 3600,
  "session": 1800,
  "api": 300,
  "dashboard": 120,
  "default": 600,
};

const DEFAULT_WARMUP_PROFILES = {
  "default": ["config", "features", "plans", "rate-limits", "permissions"],
  "full": ["config", "features", "plans", "rate-limits", "permissions", "rbac", "session", "api", "dashboard"],
  "minimal": ["config", "features"],
  "config-only": ["config"],
  "security": ["rate-limits", "permissions", "rbac"],
};

interface WarmupEntry {
  key: string;
  value: string;
  ttl: number;
  category: string;
}

function getTTL(category: string): number {
  return TTL_CONFIG[category as keyof typeof TTL_CONFIG] || TTL_CONFIG.default;
}

function loadFromEnv(category: string): WarmupEntry[] {
  const prefix = "WARMUP_";
  const entries: WarmupEntry[] = [];
  for (const [key, rawValue] of Object.entries(process.env)) {
    if (key.startsWith(`${prefix}${category.toUpperCase()}_`)) {
      const cacheKey = `${category}:${key.slice(prefix.length + category.length + 1).toLowerCase().replace(/_/g, "-")}`;
      try {
        const parsed = JSON.parse(rawValue);
        entries.push({
          key: cacheKey,
          value: typeof parsed === "string" ? parsed : JSON.stringify(parsed),
          ttl: getTTL(category),
          category,
        });
      } catch {
        entries.push({
          key: cacheKey,
          value: rawValue,
          ttl: getTTL(category),
          category,
        });
      }
    }
  }
  return entries;
}

function loadFromJSON(category: string): WarmupEntry[] {
  const filePath = resolve(env.WARMUP_DATA_DIR, `${category}.json`);
  if (!existsSync(filePath)) return [];

  const raw = readFileSync(filePath, "utf-8");
  const data = JSON.parse(raw);

  if (Array.isArray(data)) {
    return data.map((item: Record<string, unknown>, idx: number) => ({
      key: item.key as string || `${category}:item:${idx}`,
      value: typeof item.value === "string" ? item.value : JSON.stringify(item.value ?? item),
      ttl: (item.ttl as number) || getTTL(category),
      category,
    }));
  }

  return Object.entries(data).map(([key, value]) => ({
    key: `${category}:${key}`,
    value: typeof value === "string" ? value : JSON.stringify(value),
    ttl: getTTL(category),
    category,
  }));
}

function loadData(categories: string[]): WarmupEntry[] {
  const entries: WarmupEntry[] = [];

  for (const category of categories) {
    const fromEnv = loadFromEnv(category);
    const fromJSON = loadFromJSON(category);

    if (fromEnv.length === 0 && fromJSON.length === 0) {
      const predefined = PREDEFINED_DATA[category as keyof typeof PREDEFINED_DATA];
      if (predefined) {
        entries.push(...predefined.map((value, idx) => ({
          key: `${category}:${idx === 0 ? category : `item:${idx}`}`,
          value: JSON.stringify(value),
          ttl: getTTL(category),
          category,
        })));
      }
    }

    entries.push(...fromEnv, ...fromJSON);
  }

  return entries;
}

const PREDEFINED_DATA: Record<string, unknown[]> = {
  "config": [
    { app: { name: "myworkspace", version: "1.0.0", debug: false } },
  ],
  "features": [
    { billing: true, sso: false, advancedReporting: true, webhooks: true },
  ],
  "plans": [
    { id: "free", name: "Free", storage: 10e9, features: ["basic", "tasks"], rateLimit: 100 },
    { id: "growth", name: "Growth", storage: 200e9, features: ["basic", "tasks", "automation", "reports"], rateLimit: 1000 },
    { id: "enterprise", name: "Enterprise", storage: 1e12, features: ["all"], rateLimit: 10000 },
  ],
  "rate-limits": [
    { auth: { window: 900, max: 20 }, api: { window: 900, max: 600 }, upload: { window: 900, max: 50 }, search: { window: 60, max: 100 } },
  ],
  "permissions": [
    { admin: ["*"], manager: ["read", "write", "delete"], member: ["read", "write"], client: ["read"] },
  ],
  "rbac": [
    { roles: { admin: { parent: null, permissions: ["*"] }, manager: { parent: "member", permissions: ["manage_team", "manage_projects"] }, member: { parent: null, permissions: ["read_tasks", "write_tasks", "read_projects"] }, client: { parent: null, permissions: ["read_tasks"] } } },
  ],
};

async function connectValkey(): Promise<Redis | Cluster> {
  if (env.VALKEY_CLUSTER_MODE) {
    const nodes = env.VALKEY_NODES.map((n) => {
      const [host, portStr] = n.split(":");
      return { host, port: parseInt(portStr || "6379", 10) };
    });
    return new Cluster(nodes, {
      redisOptions: { password: env.VALKEY_PASSWORD || undefined, enableAutoPipelining: true },
      scaleReads: "slave",
      enableOfflineQueue: true,
    });
  }

  if (env.VALKEY_SENTINEL_MODE) {
    const sentinels = env.VALKEY_SENTINEL_NODES.map((n) => {
      const [host, portStr] = n.split(":");
      return { host, port: parseInt(portStr || "26379", 10) };
    });
    return new Redis({
      sentinels,
      name: env.VALKEY_SENTINEL_MASTER,
      password: env.VALKEY_PASSWORD || undefined,
      enableAutoPipelining: true,
    });
  }

  return new Redis(env.VALKEY_STANDALONE_URL, {
    password: env.VALKEY_PASSWORD || undefined,
    enableAutoPipelining: true,
    maxRetriesPerRequest: 3,
  });
}

function createProgressBar(current: number, total: number, width = 40): string {
  const filled = Math.round((current / total) * width);
  const empty = width - filled;
  const pct = ((current / total) * 100).toFixed(1);
  return `[${"=".repeat(filled)}${" ".repeat(empty)}] ${pct}% (${current}/${total})`;
}

async function warmUp(): Promise<void> {
  const startTime = Date.now();
  console.log(`=== Cache Warming Started ===`);
  console.log(`Profile: ${env.WARMUP_PROFILE}`);
  console.log(`Incremental: ${env.WARMUP_INCREMENTAL}`);
  console.log(`Cluster Mode: ${env.VALKEY_CLUSTER_MODE}`);
  console.log(`Sentinel Mode: ${env.VALKEY_SENTINEL_MODE}`);
  console.log("");

  const profileKeys = DEFAULT_WARMUP_PROFILES[env.WARMUP_PROFILE as keyof typeof DEFAULT_WARMUP_PROFILES]
    || env.WARMUP_PROFILE.split(",");
  console.log(`Categories: ${profileKeys.join(", ")}`);

  const entries = loadData(profileKeys);
  if (entries.length === 0) {
    console.log("No data to warm. Exiting.");
    return;
  }

  console.log(`Total entries to warm: ${entries.length}`);
  console.log("");

  const client = await connectValkey();
  const results = { loaded: 0, skipped: 0, errors: 0, byCategory: {} as Record<string, { loaded: number; errors: number }> };

  const batchSize = 100;

  for (let i = 0; i < entries.length; i += batchSize) {
    const batch = entries.slice(i, i + batchSize);
    const pipeline = (client as Redis).pipeline();

    for (const entry of batch) {
      if (env.WARMUP_INCREMENTAL) {
        pipeline.set(entry.key, entry.value, "EX", entry.ttl, "NX");
      } else {
        pipeline.set(entry.key, entry.value, "EX", entry.ttl);
      }
    }

    try {
      const pipelineResults = await pipeline.exec() as [Error | null, string | null][];

      for (let j = 0; j < batch.length; j++) {
        const [err, result] = pipelineResults[j] || [new Error("no result"), null];
        const entry = batch[j];

        if (!results.byCategory[entry.category]) {
          results.byCategory[entry.category] = { loaded: 0, errors: 0 };
        }

        if (err) {
          results.errors++;
          results.byCategory[entry.category].errors++;
          console.error(`  [ERROR] ${entry.key}: ${err.message}`);
        } else if (env.WARMUP_INCREMENTAL && result === null) {
          results.skipped++;
          console.log(`  [SKIP]  ${entry.key} (already exists)`);
        } else {
          results.loaded++;
          results.byCategory[entry.category].loaded++;
        }
      }
    } catch (batchErr) {
      console.error(`Batch error at offset ${i}:`, batchErr);
      results.errors += batch.length;
      for (const entry of batch) {
        if (!results.byCategory[entry.category]) {
          results.byCategory[entry.category] = { loaded: 0, errors: 0 };
        }
        results.byCategory[entry.category].errors++;
      }
    }

    process.stdout.write(`\rProgress: ${createProgressBar(Math.min(i + batchSize, entries.length), entries.length)}`);
  }

  process.stdout.write("\n\n");

  const duration = Date.now() - startTime;

  console.log("=== Cache Warming Summary ===");
  console.log(`Duration: ${(duration / 1000).toFixed(2)}s`);
  console.log(`Total entries: ${entries.length}`);
  console.log(`Loaded: ${results.loaded}`);
  console.log(`Skipped: ${results.skipped}`);
  console.log(`Errors: ${results.errors}`);
  console.log("");

  console.log("By Category:");
  for (const [category, stats] of Object.entries(results.byCategory)) {
    console.log(`  ${category}: loaded=${stats.loaded}, errors=${stats.errors}`);
  }

  if (results.errors > 0) {
    console.warn(`\nWARNING: ${results.errors} entries failed to load.`);
  }

  await client.quit();
  console.log("Cache warming complete.");
}

warmUp().catch((err) => {
  console.error("Fatal error during cache warming:", err);
  process.exit(1);
});
