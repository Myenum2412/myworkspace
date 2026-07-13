import { logger } from "../logger/index.js";
import { env } from "../../config/env.js";

interface MetricLabels {
  [key: string]: string;
}

interface Metric {
  name: string;
  help: string;
  type: "counter" | "gauge" | "histogram";
  labels: MetricLabels;
  value: number;
}

const HISTOGRAM_MAX_SAMPLES = 1000;

class MetricsRegistry {
  private metrics: Map<string, Metric> = new Map();
  private counters: Map<string, number> = new Map();
  private gauges: Map<string, number> = new Map();
  private histograms: Map<string, { values: number[]; sum: number; count: number }> = new Map();

  incrementCounter(name: string, labels: MetricLabels = {}, value = 1) {
    const key = `${name}:${JSON.stringify(labels)}`;
    const current = this.counters.get(key) || 0;
    this.counters.set(key, current + value);
    this.metrics.set(key, {
      name, help: `Counter ${name}`, type: "counter", labels, value: current + value,
    });
  }

  setGauge(name: string, labels: MetricLabels = {}, value: number) {
    const key = `${name}:${JSON.stringify(labels)}`;
    this.gauges.set(key, value);
    this.metrics.set(key, {
      name, help: `Gauge ${name}`, type: "gauge", labels, value,
    });
  }

  observeHistogram(name: string, labels: MetricLabels = {}, value: number) {
    const key = `${name}:${JSON.stringify(labels)}`;
    let hist = this.histograms.get(key);
    if (!hist) {
      hist = { values: [], sum: 0, count: 0 };
      this.histograms.set(key, hist);
    }

    // Reservoir sampling: keep last HISTOGRAM_MAX_SAMPLES values
    if (hist.values.length < HISTOGRAM_MAX_SAMPLES) {
      hist.values.push(value);
    } else {
      const idx = hist.count % HISTOGRAM_MAX_SAMPLES;
      hist.values[idx] = value;
    }
    hist.sum += value;
    hist.count++;

    const avg = hist.sum / hist.count;
    this.metrics.set(key, {
      name, help: `Histogram ${name}`, type: "histogram", labels, value: Math.round(avg * 100) / 100,
    });
  }

  getMetrics(): Metric[] {
    return Array.from(this.metrics.values());
  }

  getPrometheusFormat(): string {
    const lines: string[] = [];
    for (const metric of this.metrics.values()) {
      const labelStr = Object.entries(metric.labels)
        .map(([k, v]) => `${k}="${v}"`)
        .join(",");
      lines.push(`# HELP ${metric.name} ${metric.help}`);
      lines.push(`# TYPE ${metric.name} ${metric.type}`);
      if (labelStr) {
        lines.push(`${metric.name}{${labelStr}} ${metric.value}`);
      } else {
        lines.push(`${metric.name} ${metric.value}`);
      }
    }
    return lines.join("\n");
  }

  getPrometheusRoute(): string {
    return this.getPrometheusFormat();
  }
}

export const metricsRegistry = new MetricsRegistry();

// ── Upload Tracking ──
const activeUploadCounts = new Map<string, number>();

export function getActiveUploadCount(orgId: string): number {
  return activeUploadCounts.get(orgId) || 0;
}

export function setActiveUploadCount(orgId: string, count: number) {
  activeUploadCounts.set(orgId, count);
}

export function trackUploadStart(orgId: string, userId: string) {
  metricsRegistry.incrementCounter("upload_starts_total", { orgId });
  metricsRegistry.setGauge("active_uploads", { orgId }, getActiveUploadCount(orgId) + 1);
  logger.info({ orgId, userId }, "Upload started");
}

export function trackUploadChunk(orgId: string, chunkSize: number) {
  metricsRegistry.incrementCounter("upload_chunks_total", { orgId });
  metricsRegistry.observeHistogram("upload_chunk_size_bytes", { orgId }, chunkSize);
}

export function trackUploadComplete(orgId: string, fileSize: number, durationMs: number) {
  metricsRegistry.incrementCounter("upload_completions_total", { orgId });
  metricsRegistry.observeHistogram("upload_duration_ms", { orgId }, durationMs);
  metricsRegistry.observeHistogram("upload_file_size_bytes", { orgId }, fileSize);
  metricsRegistry.setGauge("active_uploads", { orgId }, Math.max(0, getActiveUploadCount(orgId) - 1));
}

export function trackUploadFailed(orgId: string, errorType: string) {
  metricsRegistry.incrementCounter("upload_failures_total", { orgId, errorType });
  metricsRegistry.setGauge("active_uploads", { orgId }, Math.max(0, getActiveUploadCount(orgId) - 1));
}

export function trackQueueDepth(queueName: string, depth: number) {
  metricsRegistry.setGauge("queue_depth", { queue: queueName }, depth);
}

export function trackStorageLatency(operation: string, durationMs: number) {
  metricsRegistry.observeHistogram("storage_latency_ms", { operation }, durationMs);
}

// ── API Tracking ──
export function trackApiRequest(method: string, path: string, statusCode: number, durationMs: number) {
  metricsRegistry.incrementCounter("api_requests_total", { method, path, status: String(statusCode) });
  metricsRegistry.observeHistogram("api_request_duration_ms", { method, path }, durationMs);
}

export function trackApiError(method: string, path: string, statusCode: number) {
  metricsRegistry.incrementCounter("api_errors_total", { method, path, status: String(statusCode) });
}

// ── Cache Tracking ──
export function trackCacheHit(layer: string, key: string) {
  metricsRegistry.incrementCounter("cache_hits_total", { layer });
}

export function trackCacheMiss(layer: string) {
  metricsRegistry.incrementCounter("cache_misses_total", { layer });
}

export function trackCacheSet(layer: string) {
  metricsRegistry.incrementCounter("cache_sets_total", { layer });
}

export function trackCacheInvalidation(type: string) {
  metricsRegistry.incrementCounter("cache_invalidations_total", { type });
}

// ── Database Tracking ──
export function trackDbQuery(operation: string, collection: string, durationMs: number) {
  metricsRegistry.observeHistogram("db_query_duration_ms", { operation, collection }, durationMs);
  metricsRegistry.incrementCounter("db_queries_total", { operation, collection });
}

// ── Socket.IO Tracking ──
export function trackSocketEvent(event: string) {
  metricsRegistry.incrementCounter("socket_events_total", { event });
}

export function trackSocketConnection() {
  metricsRegistry.incrementCounter("socket_connections_total");
}

export function trackSocketDisconnection(reason: string) {
  metricsRegistry.incrementCounter("socket_disconnections_total", { reason });
}

// ── Queue Tracking ──
export function trackQueuePublish(queue: string) {
  metricsRegistry.incrementCounter("queue_published_total", { queue });
}

export function trackQueueConsume(queue: string) {
  metricsRegistry.incrementCounter("queue_consumed_total", { queue });
}

export function trackQueueFailure(queue: string) {
  metricsRegistry.incrementCounter("queue_failures_total", { queue });
}

// ── Core Web Vitals (forwarded from frontend) ──
export function trackWebVital(name: string, value: number, rating: string) {
  metricsRegistry.observeHistogram("web_vitals", { name, rating }, value);
}

// ── Business Metrics ──
export function trackActiveUsers(orgId: string, count: number) {
  metricsRegistry.setGauge("active_users", { orgId }, count);
}

export function trackActiveProjects(orgId: string, count: number) {
  metricsRegistry.setGauge("active_projects", { orgId }, count);
}

export function trackTaskCompletion(orgId: string) {
  metricsRegistry.incrementCounter("tasks_completed_total", { orgId });
}

export function trackStorageUsed(orgId: string, bytes: number) {
  metricsRegistry.setGauge("storage_used_bytes", { orgId }, bytes);
}

// ── Process Metrics ──
export function trackProcessMetrics() {
  const mem = process.memoryUsage();
  metricsRegistry.setGauge("process_memory_heap_used_bytes", {}, mem.heapUsed);
  metricsRegistry.setGauge("process_memory_heap_total_bytes", {}, mem.heapTotal);
  metricsRegistry.setGauge("process_memory_rss_bytes", {}, mem.rss);
  metricsRegistry.setGauge("process_memory_external_bytes", {}, mem.external || 0);
  metricsRegistry.setGauge("process_uptime_seconds", {}, process.uptime());
}