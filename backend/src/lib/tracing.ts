import { env } from "../config/env.js";
import { logger } from "./logger/index.js";

let initialized = false;

export function initializeTelemetry() {
  if (initialized) return;
  initialized = true;

  const otelEndpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT || "";
  if (!otelEndpoint) {
    logger.info("OpenTelemetry endpoint not configured, skipping telemetry initialization");
    return;
  }

  try {
    const opentelemetry = require("@opentelemetry/api");
    const { OTLPTraceExporter } = require("@opentelemetry/exporter-trace-otlp-http");
    const { OTLPMetricExporter } = require("@opentelemetry/exporter-metrics-otlp-http");
    const { Resource } = require("@opentelemetry/resources");
    const { SEMRESATTRS_SERVICE_NAME, SEMRESATTRS_SERVICE_VERSION } = require("@opentelemetry/semantic-conventions");
    const { NodeTracerProvider } = require("@opentelemetry/sdk-trace-node");
    const { BatchSpanProcessor } = require("@opentelemetry/sdk-trace-base");
    const { MeterProvider, PeriodicExportingMetricReader } = require("@opentelemetry/sdk-metrics");
    const { HttpInstrumentation } = require("@opentelemetry/instrumentation-http");
    const { ExpressInstrumentation } = require("@opentelemetry/instrumentation-express");
    const { MongoDBInstrumentation } = require("@opentelemetry/instrumentation-mongodb");
    const { registerInstrumentations } = require("@opentelemetry/instrumentation");

    const resource = Resource.default().merge(
      new Resource({
        [SEMRESATTRS_SERVICE_NAME]: "myworkspace-backend",
        [SEMRESATTRS_SERVICE_VERSION]: "1.0.0",
        "deployment.environment": env.NODE_ENV,
      }),
    );

    const traceExporter = new OTLPTraceExporter({
      url: `${otelEndpoint}/v1/traces`,
      timeoutMillis: 10000,
    });

    const tracerProvider = new NodeTracerProvider({
      resource,
      spanProcessors: [
        new BatchSpanProcessor(traceExporter, {
          maxQueueSize: 1000,
          scheduledDelayMillis: 5000,
          exportTimeoutMillis: 30000,
        }),
      ],
    });

    tracerProvider.register();

    const metricExporter = new OTLPMetricExporter({
      url: `${otelEndpoint}/v1/metrics`,
      timeoutMillis: 10000,
    });

    const reader = new PeriodicExportingMetricReader({
      exporter: metricExporter,
      exportIntervalMillis: 15000,
    });

    const meterProvider = new MeterProvider({ resource });
    meterProvider.addMetricReader(reader);
    opentelemetry.metrics.setGlobalMeterProvider(meterProvider);

    registerInstrumentations({
      tracerProvider,
      instrumentations: [
        new HttpInstrumentation(),
        new ExpressInstrumentation(),
        new MongoDBInstrumentation(),
      ],
    });

    logger.info("OpenTelemetry telemetry initialized");
  } catch (err) {
    logger.warn({ err }, "Failed to initialize OpenTelemetry");
  }
}

export function getTracer() {
  try {
    const opentelemetry = require("@opentelemetry/api");
    return opentelemetry.trace.getTracer("myworkspace-backend");
  } catch {
    return null;
  }
}

export function startSpan(name: string, options?: Record<string, unknown>) {
  const tracer = getTracer();
  if (!tracer) return null;
  return tracer.startSpan(name, options);
}

export function setSpanAttribute(key: string, value: unknown) {
  try {
    const opentelemetry = require("@opentelemetry/api");
    const span = opentelemetry.trace.getActiveSpan();
    if (span) span.setAttribute(key, value);
  } catch {
    // OTEL not available
  }
}
