// Opt-in client timing. Set `window.__PERF_LOG__ = true` (or localStorage
// perfLog=1) in dev to print stage timings. Off in production — zero cost.
declare global {
  interface Window {
    __PERF_LOG__?: boolean;
  }
}
export function perfEnabled(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.__PERF_LOG__ === true || localStorage.getItem("perfLog") === "1";
  } catch {
    return false;
  }
}

export function perfLog(label: string, ms: number, extra?: Record<string, unknown>): void {
  if (!perfEnabled()) return;
  console.log(`[perf] ${label}: ${ms.toFixed(1)}ms`, extra ?? "");
}

/** High-res elapsed since `t0` (from performance.now()). */
export function perfNow(): number {
  return typeof performance !== "undefined" ? performance.now() : Date.now();
}
