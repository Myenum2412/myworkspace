"use client";

type MetricName = "LCP" | "FCP" | "TTI" | "INP" | "TBT" | "CLS" | "TTFB" | "bootstrap" | "login" | "dashboard-render";

interface MetricRecord {
  name: MetricName;
  value: number;
  rating: "good" | "needs-improvement" | "poor";
  timestamp: number;
  tags?: Record<string, string>;
}

const metrics: MetricRecord[] = [];
const MAX_METRICS = 200;

function rateMetric(name: MetricName, value: number): "good" | "needs-improvement" | "poor" {
  switch (name) {
    case "LCP": return value <= 2500 ? "good" : value <= 4000 ? "needs-improvement" : "poor";
    case "FCP": return value <= 1800 ? "good" : value <= 3000 ? "needs-improvement" : "poor";
    case "INP": return value <= 200 ? "good" : value <= 500 ? "needs-improvement" : "poor";
    case "CLS": return value <= 0.1 ? "good" : value <= 0.25 ? "needs-improvement" : "poor";
    case "TTFB": return value <= 800 ? "good" : value <= 1800 ? "needs-improvement" : "poor";
    case "TBT": return value <= 200 ? "good" : value <= 600 ? "needs-improvement" : "poor";
    default: return "good";
  }
}

export function recordMetric(
  name: MetricName,
  value: number,
  tags?: Record<string, string>,
): void {
  const record: MetricRecord = {
    name,
    value,
    rating: rateMetric(name, value),
    timestamp: Date.now(),
    tags,
  };
  metrics.push(record);
  if (metrics.length > MAX_METRICS) metrics.shift();

  if (process.env.NODE_ENV === "development") {
    console.log(`[PERF] ${name}: ${value}ms (${record.rating})`, tags || "");
  }
}

export function getMetrics(): MetricRecord[] {
  return [...metrics];
}

export function getMetricsSummary(): Record<string, { avg: number; min: number; max: number; count: number }> {
  const summary: Record<string, number[]> = {};
  for (const m of metrics) {
    if (!summary[m.name]) summary[m.name] = [];
    summary[m.name].push(m.value);
  }
  return Object.fromEntries(
    Object.entries(summary).map(([name, values]) => [
      name,
      {
        avg: Math.round(values.reduce((a, b) => a + b, 0) / values.length),
        min: Math.min(...values),
        max: Math.max(...values),
        count: values.length,
      },
    ]),
  );
}

export function initPerformanceObserver(): void {
  if (typeof window === "undefined") return;
  if (typeof PerformanceObserver === "undefined") return;

  try {
    const lcpObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      if (entries.length > 0) {
        recordMetric("LCP", entries[entries.length - 1].startTime);
      }
    });
    lcpObserver.observe({ type: "largest-contentful-paint", buffered: true });
  } catch {}

  try {
    const fcpObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      if (entries.length > 0) {
        recordMetric("FCP", entries[0].startTime);
      }
    });
    fcpObserver.observe({ type: "paint", buffered: true });
  } catch {}

  try {
    const clsObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const layoutShift = entry as any;
        if (!layoutShift.hadRecentInput) {
          recordMetric("CLS", layoutShift.value || 0);
        }
      }
    });
    clsObserver.observe({ type: "layout-shift", buffered: true });
  } catch {}

  try {
    const tbtObserver = new PerformanceObserver((list) => {
      let total = 0;
      for (const entry of list.getEntries()) {
        const task = entry as any;
        total += task.duration || 0;
      }
      if (total > 0) recordMetric("TBT", total);
    });
    tbtObserver.observe({ type: "longtask", buffered: true });
  } catch {}

  try {
    const navEntry = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
    if (navEntry) {
      recordMetric("TTFB", navEntry.responseStart - navEntry.requestStart);
    }
  } catch {}
}

export function recordBootstrapTime(duration: number): void {
  recordMetric("bootstrap", duration);
}

export function recordLoginTime(duration: number): void {
  recordMetric("login", duration);
}

export function measureAsync<T>(name: MetricName, fn: () => Promise<T>, tags?: Record<string, string>): Promise<T> {
  const start = performance.now();
  return fn().finally(() => {
    recordMetric(name, performance.now() - start, tags);
  });
}
