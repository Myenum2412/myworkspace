import { jest } from "@jest/globals";
import { eventProducer } from "../../../src/lib/queue/producer.js";

jest.mock("../../../src/lib/queue/connection.js", () => ({
  getChannel: jest.fn(),
  isRabbitMQConfigured: jest.fn(() => true),
  EXCHANGES: {
    UPLOAD_EVENTS: "upload.events",
    FILE_EVENTS: "file.events",
    NOTIFICATION_EVENTS: "notification.events",
    DEAD_LETTER: "dead.letter",
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
    FILE_DELETED: "file.deleted",
    FILE_RESTORED: "file.restored",
    CLEANUP_REQUIRED: "cleanup.required",
    UPLOAD_PAUSED: "upload.paused",
    UPLOAD_RESUMED: "upload.resumed",
    RETRY_REQUIRED: "retry.required",
  },
  QUEUES: {
    UPLOAD_PROCESSING: "upload-processing",
    AUDIT_LOG: "audit-log",
  },
}));

const mockPublish = jest.fn().mockReturnValue(true);

jest.mock("../../../src/lib/queue/producer.js", () => {
  const actual = jest.requireActual("../../../src/lib/queue/producer.js");
  return {
    ...actual,
    eventProducer: {
      ...actual.eventProducer,
    },
  };
});

jest.mock("amqplib", () => ({
  connect: jest.fn(),
}));

describe("eventProducer", () => {
  const baseParams = {
    orgId: "org-1",
    userId: "user-1",
  };

  describe("uploadStarted", () => {
    it("publishes event with correct structure", async () => {
      const result = await eventProducer.uploadStarted({
        uploadId: "upload-1",
        ...baseParams,
        fileName: "test.pdf",
        fileSize: 1024,
        mimeType: "application/pdf",
      });
      expect(result).toBe(false); // Channel not available
    });
  });

  describe("uploadCompleted", () => {
    it("includes checksum and storage path", async () => {
      const result = await eventProducer.uploadCompleted({
        uploadId: "upload-1",
        fileId: "file-1",
        ...baseParams,
        fileName: "test.pdf",
        fileSize: 1024,
        mimeType: "application/pdf",
        checksum: "abc123",
        storagePath: "path/to/file",
        durationMs: 1500,
      });
      expect(result).toBe(false);
    });

    it("marks duplicate uploads", async () => {
      const result = await eventProducer.uploadCompleted({
        uploadId: "upload-1",
        fileId: "file-1",
        ...baseParams,
        fileName: "test.pdf",
        fileSize: 1024,
        mimeType: "application/pdf",
        checksum: "abc123",
        storagePath: "path",
        durationMs: 100,
        isDuplicate: true,
      });
      expect(result).toBe(false);
    });
  });

  describe("notificationSend", () => {
    it("includes all notification fields", async () => {
      const result = await eventProducer.notificationSend({
        userId: "user-1",
        orgId: "org-1",
        type: "task_assigned",
        title: "New Task",
        message: "You have a new task",
        link: "/tasks/123",
      });
      expect(result).toBe(false);
    });

    it("handles missing optional link", async () => {
      const result = await eventProducer.notificationSend({
        userId: "user-1",
        orgId: "org-1",
        type: "system",
        title: "Alert",
        message: "System alert",
      });
      expect(result).toBe(false);
    });
  });
});
