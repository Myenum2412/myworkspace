import { connectTestDb, resetDb } from "../../../__helpers__/db.js";
import { AIAuditLogger } from "../../../../src/services/ai/audit-logger.service.js";
import { AiAuditLog } from "../../../../src/lib/db/models/AiAuditLog.js";
import { AiUsageLog } from "../../../../src/lib/db/models/AiUsageLog.js";

let logger: AIAuditLogger;

beforeAll(async () => await connectTestDb());
beforeEach(async () => {
  await resetDb();
  logger = new AIAuditLogger();
});

describe("AIAuditLogger", () => {
  it("logs an audit entry", async () => {
    await logger.log({
      orgId: "org-1",
      userId: "user-1",
      action: "chat",
      prompt: "Hello AI",
      model: "tencent/hy3:free",
      tokens: { prompt: 10, completion: 20, total: 30 },
      executionTime: 500,
      status: "success",
    });

    const log = await AiAuditLog.findOne({ orgId: "org-1" }).lean();
    expect(log).not.toBeNull();
    expect(log!.action).toBe("chat");
    expect(log!.prompt).toBe("Hello AI");
    expect(log!.status).toBe("success");
    expect(log!.tokens!.total).toBe(30);
  });

  it("logs failure entries", async () => {
    await logger.log({
      orgId: "org-1",
      userId: "user-1",
      action: "chat",
      prompt: "Test",
      status: "failure",
      error: "API key not configured",
    });

    const log = await AiAuditLog.findOne({ status: "failure" }).lean();
    expect(log).not.toBeNull();
    expect(log!.error).toBe("API key not configured");
  });

  it("updates usage log on successful requests", async () => {
    await logger.log({
      orgId: "org-1",
      userId: "user-1",
      action: "chat",
      prompt: "Test",
      model: "tencent/hy3:free",
      tokens: { prompt: 100, completion: 50, total: 150 },
      executionTime: 1000,
      status: "success",
    });

    const usage = await AiUsageLog.findOne({ orgId: "org-1" }).lean();
    expect(usage).not.toBeNull();
    expect(usage!.requests).toBe(1);
    expect(usage!.promptTokens).toBe(100);
    expect(usage!.completionTokens).toBe(50);
    expect(usage!.totalTokens).toBe(150);
    expect(usage!.estimatedCost).toBeGreaterThan(0);
  });

  it("retrieves audit logs with pagination", async () => {
    for (let i = 0; i < 5; i++) {
      await logger.log({
        orgId: "org-1",
        userId: "user-1",
        action: "chat",
        prompt: `Prompt ${i}`,
        status: "success",
      });
    }

    const result = await logger.getAuditLogs("org-1", { page: 1, limit: 3 });
    expect(result.total).toBe(5);
    expect(result.data.length).toBe(3);
    expect(result.totalPages).toBe(2);
  });

  it("filters audit logs by status", async () => {
    await logger.log({ orgId: "org-1", userId: "user-1", action: "chat", prompt: "Success", status: "success" });
    await logger.log({ orgId: "org-1", userId: "user-1", action: "chat", prompt: "Failure", status: "failure", error: "err" });

    const successes = await logger.getAuditLogs("org-1", { status: "success" });
    expect(successes.total).toBe(1);

    const failures = await logger.getAuditLogs("org-1", { status: "failure" });
    expect(failures.total).toBe(1);
  });

  it("returns usage stats summary", async () => {
    await logger.log({
      orgId: "org-1", userId: "user-1", action: "chat", prompt: "Test",
      model: "tencent/hy3:free", tokens: { prompt: 100, completion: 50, total: 150 },
      executionTime: 1000, status: "success",
    });

    const stats = await logger.getUsageStats("org-1");
    expect(stats.summary.totalRequests).toBe(1);
    expect(stats.summary.uniqueUsers).toBe(1);
    expect(stats.summary.totalTokens).toBe(150);
    expect(stats.summary.totalCost).toBeGreaterThan(0);
    expect(stats.dailyStats).toBeDefined();
  });
});
