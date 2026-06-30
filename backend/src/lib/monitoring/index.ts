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

class MetricsRegistry {
  private metrics: Map<string, Metric> = new Map();
  private counters: Map<string, number> = new Map();
  private gauges: Map<string, number> = new Map();
  private histograms: Map<string, number[]> = new Map();

  incrementCounter(name: string, labels: MetricLabels = {}, value = 1) {
    const key = `${name}:${JSON.stringify(labels)}`;
    const current = this.counters.get(key) || 0;
    this.counters.set(key, current + value);
    this.metrics.set(key, { name, help: `Counter ${name}`, type: "counter", labels, value: current + value });
  }

  setGauge(name: string, labels: MetricLabels = {}, value: number) {
    const key = `${name}:${JSON.stringify(labels)}`;
    this.gauges.set(key, value);
    this.metrics.set(key, { name, help: `Gauge ${name}`, type: "gauge", labels, value });
  }

  observeHistogram(name: string, labels: MetricLabels = {}, value: number) {
    const key = `${name}:${JSON.stringify(labels)}`;
    const values = this.histograms.get(key) || [];
    values.push(value);
    this.histograms.set(key, values);
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    this.metrics.set(key, { name, help: `Histogram ${name}`, type: "histogram", labels, value: avg });
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
}

export const metricsRegistry = new MetricsRegistry();

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

const activeUploadCounts = new Map<string, number>();

export function getActiveUploadCount(orgId: string): number {
  return activeUploadCounts.get(orgId) || 0;
}

export function setActiveUploadCount(orgId: string, count: number) {
  activeUploadCounts.set(orgId, count);
}
