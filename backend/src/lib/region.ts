import { Request } from "express";
import { logger } from "./logger/index.js";

export interface RegionConfig {
  name: string;
  isActive: boolean;
  isPrimary: boolean;
  endpoints: string[];
  storageEndpoint: string;
  cacheEndpoint: string;
  queueEndpoint: string;
}

const regions = new Map<string, RegionConfig>();
const currentRegion = process.env.REGION || process.env.AWS_REGION || "us-east-1";
const primaryRegion = process.env.PRIMARY_REGION || "us-east-1";
const isPrimary = currentRegion === primaryRegion;

export function getRegionConfig(regionName: string): RegionConfig | undefined {
  return regions.get(regionName);
}

export function registerRegion(config: RegionConfig): void {
  regions.set(config.name, config);
  logger.info({ region: config.name, primary: config.isPrimary }, "Region registered");
}

export function getCurrentRegion(): string {
  return currentRegion;
}

export function isPrimaryRegion(): boolean {
  return isPrimary;
}

export function getPrimaryRegion(): string {
  return primaryRegion;
}

export function getAllRegions(): RegionConfig[] {
  return Array.from(regions.values());
}

export function getClosestRegion(clientIp: string): string {
  const ipPrefix = clientIp.split(".")[0];
  const regionMap: Record<string, string> = {
    "13": "us-east-1", "52": "us-east-1",
    "3": "eu-west-1", "63": "eu-west-1",
    "54": "ap-southeast-1",
  };
  return regionMap[ipPrefix] || currentRegion;
}

export function regionRouter(req: Request): string {
  const preferred = req.headers["x-region"] as string;
  if (preferred && regions.has(preferred)) return preferred;
  return getClosestRegion(req.ip || "unknown");
}

export const REGION_HEADER = "x-region";
export const REGION_ROUTE_HEADER = "x-region-route";

export async function checkCrossRegionSync(): Promise<{
  status: "healthy" | "degraded" | "down";
  regions: Record<string, { reachable: boolean; latencyMs: number }>;
}> {
  const results: Record<string, { reachable: boolean; latencyMs: number }> = {};
  for (const [name, config] of regions) {
    if (name === currentRegion) continue;
    const start = Date.now();
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);
      await fetch(`${config.endpoints[0]}/api/health`, { signal: controller.signal });
      clearTimeout(timeout);
      results[name] = { reachable: true, latencyMs: Date.now() - start };
    } catch {
      results[name] = { reachable: false, latencyMs: Date.now() - start };
    }
  }
  const status = Object.values(results).every(r => r.reachable) ? "healthy"
    : Object.values(results).some(r => r.reachable) ? "degraded" : "down";
  return { status, regions: results };
}
