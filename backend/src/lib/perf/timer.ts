/**
 * Opt-in request-scoped performance timer.
 *
 * Gated entirely behind `env.PERF_LOG`. When off (production default) the
 * class is a set of no-ops so it adds zero overhead — call sites stay clean
 * and we keep the instrumentation for future regressions without a deploy-time
 * decision.
 *
 * Usage inside a route:
 *   const t = PerfTimer.start();
 *   t.start("mongo");
 *   await Task.create(...);
 *   t.end("mongo");
 *   // before res.json:
 *   t.attach(res);
 *   res.json(t.enrich({ success: true, data }));
 */

export interface PerfSnapshot {
  total: number;
  stages: Record<string, number>;
  bytes: number;
}

/** High-resolution clock shared by all timers. Split out so non-Timer code in
 *  middleware/routes can timestamp without allocating a full timer. */
export function now(): number {
  return typeof performance !== "undefined" ? performance.now() : Date.now();
}

export class PerfTimer {
  private stages = new Map<string, number>();
  private current = new Map<string, number>();
  private constructor(private readonly t0: number) {}

  /** No-op timer used when PERF_LOG is disabled. */
  static disabled(): PerfTimer {
    return new PerfTimer(0);
  }

  /** Real timer; pass `log=true` to enable stage logging. */
  static start(log = false): PerfTimer {
    return log ? new PerfTimer(PerfTimer.now()) : PerfTimer.disabled();
  }

  private static now(): number {
    return now();
  }

  start(stage: string): void {
    this.current.set(stage, PerfTimer.now());
  }

  /** Returns elapsed ms for the stage. */
  end(stage: string): number {
    const begin = this.current.get(stage);
    if (begin === undefined) return 0;
    const ms = PerfTimer.now() - begin;
    this.current.delete(stage);
    this.stages.set(stage, Math.round(ms * 100) / 100);
    return ms;
  }

  async measure<T>(stage: string, fn: () => Promise<T>): Promise<T> {
    this.start(stage);
    try {
      return await fn();
    } finally {
      this.end(stage);
    }
  }

  /** Total ms since timer start. */
  elapsed(): number {
    return Math.round((PerfTimer.now() - this.t0) * 100) / 100;
  }

  snapshot(bytes = 0): PerfSnapshot {
    return { total: this.elapsed(), stages: Object.fromEntries(this.stages), bytes };
  }

  /** Attach perf snapshot to the response object so middleware can log total. */
  attach(res: { locals: Record<string, unknown> }): void {
    res.locals.perf = this.snapshot();
  }

  /** Merge perf snapshot into a JSON response payload under `_perf`. */
  enrich<T extends Record<string, unknown>>(body: T): T {
    return { ...body, _perf: this.snapshot() };
  }
}
