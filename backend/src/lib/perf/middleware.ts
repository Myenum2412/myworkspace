import { Request, Response, NextFunction } from "express";
import { env } from "../../config/env.js";
import { PerfTimer, now } from "./timer.js";

declare module "express-serve-static-core" {
  interface Request {
    perf: PerfTimer;
  }
}

/**
 * Mounts a PerfTimer on `req`. When `PERF_LOG=1` it logs, after each request,
 * the total route time + every recorded stage + JSON response size, e.g.:
 *
 *   [PERF] POST /api/tasks 201  total=47ms  mongoWrite=18ms  socketEmit=1ms  json=312b
 *
 * When PERF_LOG is off the timer is a zero-cost no-op.
 */
export function perfMiddleware(_req: Request, res: Response, next: NextFunction): void {
  const enabled = env.PERF_LOG === "1";
  _req.perf = PerfTimer.start(enabled);

  const start = now();

  res.on("finish", () => {
    if (!enabled) return;
    const perf = res.locals.perf as { total: number; stages: Record<string, number>; bytes: number } | undefined;
    const stages = perf
      ? Object.entries({ ...perf.stages, total: perf.total })
          .map(([k, v]) => `${k}=${v}ms`)
          .join("  ")
      : `total=${Math.round(now() - start)}ms`;
    const bytes = perf?.bytes ?? "?";
    console.log(`[PERF] ${_req.method} ${_req.originalUrl} ${res.statusCode}  ${stages}  json=${bytes}b`);
  });

  next();
}
