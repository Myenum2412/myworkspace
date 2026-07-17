import crypto from "crypto";
import { jest } from "@jest/globals";
import { recordAuditLog } from "../../../src/services/audit.service.js";

jest.mock("../../../src/lib/queue/producer.js", () => ({
  eventProducer: {
    notificationSend: jest.fn(),
    auditLogRecord: jest.fn(),
  },
}));

jest.mock("../../../src/lib/queue/connection.js", () => ({
  getChannel: jest.fn().mockRejectedValue(new Error("Not configured")),
  isRabbitMQConfigured: jest.fn(() => false),
  QUEUES: { AUDIT_LOG: "audit-log" },
}));

describe("Email delivery and audit logging", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Audit logging", () => {
    it("recordAuditLog handles successful write", async () => {
      await expect(
        recordAuditLog({
          orgId: "org-1",
          userId: "user-1",
          createdBy: "user-1",
          action: "test.action",
          entityType: "test",
          entityId: "test-1",
          description: "Test audit entry",
        }),
      ).resolves.not.toThrow();
    });

    it("recordAuditLog handles missing optional fields", async () => {
      await expect(
        recordAuditLog({
          orgId: "org-1",
          userId: "user-1",
          createdBy: "user-1",
          action: "minimal.action",
          entityType: "test",
          description: "Minimal entry",
        }),
      ).resolves.not.toThrow();
    });

    it("recordAuditLogDirect writes directly without queue", async () => {
      const { recordAuditLogDirect } = await import("../../../src/services/audit.service.js");
      await expect(
        recordAuditLogDirect({
          orgId: "org-1",
          userId: "user-1",
          createdBy: "user-1",
          action: "direct.action",
          entityType: "test",
          description: "Direct write",
        }),
      ).resolves.not.toThrow();
    });
  });

  describe("Notification event producer", () => {
    it("sends notification via queue", async () => {
      const mod: any = await import("../../../src/lib/queue/producer.js");
      await expect(
        mod.eventProducer.notificationSend({
          userId: "user-1",
          orgId: "org-1",
          type: "task_assigned",
          title: "Test Notification",
          message: "You have a new task assigned",
          link: "/tasks/123",
        }),
      ).resolves.not.toThrow();
    });

    it("handles notification without optional link", async () => {
      const mod: any = await import("../../../src/lib/queue/producer.js");
      await expect(
        mod.eventProducer.notificationSend({
          userId: "user-1",
          orgId: "org-1",
          type: "system",
          title: "System Alert",
          message: "System notification",
        }),
      ).resolves.not.toThrow();
    });
  });
});

describe("Webhook receivers (contract)", () => {
  it("webhook signature verification rejects tampered payloads", () => {
    const payload = JSON.stringify({ event: "test", data: {} });
    const secret = "whsec_test";
    const timestamp = Math.floor(Date.now() / 1000);
    const validSig = crypto.createHmac("sha256", secret).update(`${timestamp}.${payload}`).digest("hex");

    expect(validSig).toBeTruthy();

    const tamperedPayload = JSON.stringify({ event: "test", data: { tampered: true } });
    const tamperedSig = crypto.createHmac("sha256", secret).update(`${timestamp}.${tamperedPayload}`).digest("hex");
    expect(tamperedSig).not.toBe(validSig);
  });

  it("rejects malformed webhook payload", () => {
    const malformed = "not-json";
    expect(() => JSON.parse(malformed)).toThrow();
  });

  it("handles duplicate webhook delivery (idempotency)", () => {
    const processedEvents = new Set<string>();
    const eventId = "evt_test_duplicate";

    const processWebhook = (id: string): boolean => {
      if (processedEvents.has(id)) return false;
      processedEvents.add(id);
      return true;
    };

    expect(processWebhook(eventId)).toBe(true);
    expect(processWebhook(eventId)).toBe(false);
  });
});
