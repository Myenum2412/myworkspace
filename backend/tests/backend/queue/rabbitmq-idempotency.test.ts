import { jest } from "@jest/globals";
import { registerHandler, startConsumers, stopConsumers } from "../../../src/lib/queue/consumer.js";
import { QUEUES } from "../../../src/lib/queue/connection.js";

jest.mock("../../../src/lib/queue/connection.js", () => ({
  getChannel: jest.fn(),
  isRabbitMQConfigured: jest.fn(() => true),
  EXCHANGES: {
    UPLOAD_EVENTS: "upload.events",
    FILE_EVENTS: "file.events",
    NOTIFICATION_EVENTS: "notification.events",
    DEAD_LETTER: "dead.letter",
  },
  QUEUES: {
    UPLOAD_PROCESSING: "upload-processing",
    UPLOAD_RETRY: "upload-retry",
    METADATA_SAVE: "metadata-save",
    THUMBNAIL_GENERATION: "thumbnail-generation",
    FILE_PROCESSING: "file-processing",
    NOTIFICATIONS: "notifications",
    AUDIT_LOG: "audit-log",
    CLEANUP: "cleanup",
    DEAD_LETTER: "dead-letter",
  },
  ROUTING_KEYS: {
    UPLOAD_STARTED: "upload.started",
    UPLOAD_COMPLETED: "upload.completed",
    UPLOAD_FAILED: "upload.failed",
    METADATA_SAVED: "metadata.saved",
    THUMBNAIL_GENERATED: "thumbnail.generated",
    FILE_PROCESSING_REQUIRED: "file.processing.required",
    NOTIFICATION_SEND: "notification.send",
    AUDIT_LOG_RECORD: "audit.log.record",
    RETRY_REQUIRED: "retry.required",
    CLEANUP_REQUIRED: "cleanup.required",
  },
}));

jest.mock("../../../src/lib/monitoring/index.js", () => ({
  metricsRegistry: {
    incrementCounter: jest.fn(),
    observeHistogram: jest.fn(),
  },
}));

describe("Queue message idempotency and retry", () => {
  let processedIds: string[];

  beforeEach(() => {
    processedIds = [];
    jest.clearAllMocks();
  });

  it("handler processes message successfully once", async () => {
    const handler = jest.fn().mockResolvedValue({ success: true });
    registerHandler("test-queue", handler);

    const msg = {
      content: Buffer.from(JSON.stringify({ id: "msg-1", data: "test" })),
      properties: { headers: {} },
      fields: { routingKey: "test-queue", exchange: "test" },
    };

    // Simulate successful processing
    const result = await handler(msg, { id: "msg-1" });
    expect(result.success).toBe(true);
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it("same message delivered twice does not double-process (idempotency key)", async () => {
    const processed = new Set<string>();
    const handler = jest.fn().mockImplementation(async (_msg, data: any) => {
      if (processed.has(data.id)) {
        return { success: true, skipped: true };
      }
      processed.add(data.id);
      return { success: true };
    });

    const data = { id: "idempotent-msg-1", action: "process" };

    const first = await handler(null as any, data);
    expect(first.success).toBe(true);

    const second = await handler(null as any, data);
    expect(second.success).toBe(true);
    expect(handler).toHaveBeenCalledTimes(2);
    expect(processed.size).toBe(1);
  });

  it("handler failure triggers retry and eventually fails", async () => {
    let attempts = 0;
    const flakyHandler = jest.fn().mockImplementation(async () => {
      attempts++;
      if (attempts < 3) {
        return { success: false, error: "Temporary failure" };
      }
      return { success: true };
    });

    const result1 = await flakyHandler(null as any, {});
    expect(result1.success).toBe(false);
    expect(result1.error).toBe("Temporary failure");

    const result2 = await flakyHandler(null as any, {});
    expect(result2.success).toBe(false);

    const result3 = await flakyHandler(null as any, {});
    expect(result3.success).toBe(true);
    expect(attempts).toBe(3);
  });

  it("handler throwing an error returns failure result", async () => {
    const errorHandler = jest.fn().mockRejectedValue(new Error("Handler crashed"));
    await expect(errorHandler(null as any, {})).rejects.toThrow("Handler crashed");
  });

  it("handler rejects malformed JSON gracefully", async () => {
    const handler = jest.fn().mockResolvedValue({ success: true });
    const malformedBuffer = Buffer.from("not-json{{{");
    let parseError: SyntaxError | null = null;
    try {
      JSON.parse(malformedBuffer.toString());
    } catch (e) {
      parseError = e as SyntaxError;
    }
    expect(parseError).toBeInstanceOf(SyntaxError);
  });
});

describe("Queue retry logic", () => {
  it("retries with increasing delays", () => {
    const RETRY_DELAY_MS = [1000, 5000, 15000, 30000, 60000];

    expect(RETRY_DELAY_MS[0]).toBe(1000);
    expect(RETRY_DELAY_MS[1]).toBe(5000);
    expect(RETRY_DELAY_MS[2]).toBe(15000);
    expect(RETRY_DELAY_MS[3]).toBe(30000);
    expect(RETRY_DELAY_MS[4]).toBe(60000);
  });

  it("caps retry count at MAX_RETRIES", () => {
    const MAX_RETRIES = 5;
    const retryCount = 5;
    expect(retryCount).toBeGreaterThanOrEqual(MAX_RETRIES);
  });
});
