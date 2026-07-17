import { connectTestDb, resetDb } from "../../__helpers__/db.js";
import { AiConversation } from "../../../../src/lib/db/models/AiConversation.js";
import { AiMessage } from "../../../../src/lib/db/models/AiMessage.js";
import { AiSettings } from "../../../../src/lib/db/models/AiSettings.js";
import { AiAuditLog } from "../../../../src/lib/db/models/AiAuditLog.js";
import { AiUsageLog } from "../../../../src/lib/db/models/AiUsageLog.js";

beforeAll(async () => await connectTestDb());
beforeEach(async () => await resetDb());

describe("AI Workflow Integration", () => {
  const orgId = "org-integration";
  const userId = "user-integration";

  it("creates conversation, adds messages, and tracks usage", async () => {
    // Step 1: Create settings
    await AiSettings.create({
      orgId,
      provider: "openrouter",
      model: "tencent/hy3:free",
      temperature: 0.7,
      maxTokens: 4096,
      responseLength: "medium",
      streamingEnabled: true,
      systemPrompt: "Test system prompt",
      updatedBy: userId,
    });

    const settings = await AiSettings.findOne({ orgId });
    expect(settings).not.toBeNull();
    expect(settings!.model).toBe("tencent/hy3:free");

    // Step 2: Create conversation
    const conv = await AiConversation.create({
      orgId,
      userId,
      title: "Test Integration",
      context: "workspace",
      workspaceContext: { project: "Integration Test" },
      lastActivityAt: new Date(),
    });
    expect(conv).not.toBeNull();

    // Step 3: Add messages
    const userMsg = await AiMessage.create({
      conversationId: conv._id,
      orgId,
      userId,
      role: "user",
      content: "What is my current project status?",
    });
    expect(userMsg).not.toBeNull();

    const assistantMsg = await AiMessage.create({
      conversationId: conv._id,
      orgId,
      userId,
      role: "assistant",
      content: "Your project is on track.",
      model: "tencent/hy3:free",
      tokens: { prompt: 15, completion: 10, total: 25 },
      executionTime: 500,
    });
    expect(assistantMsg).not.toBeNull();

    // Step 4: Verify conversation state
    const updatedConv = await AiConversation.findById(conv._id);
    expect(updatedConv).not.toBeNull();

    // Step 5: Audit log
    await AiAuditLog.create({
      orgId,
      userId,
      action: "chat",
      prompt: "What is my current project status?",
      model: "tencent/hy3:free",
      tokens: { prompt: 15, completion: 10, total: 25 },
      executionTime: 500,
      status: "success",
    });

    const auditLogs = await AiAuditLog.find({ orgId });
    expect(auditLogs.length).toBe(1);
    expect(auditLogs[0].action).toBe("chat");

    // Step 6: Usage tracking
    await AiUsageLog.create({
      orgId,
      userId,
      date: new Date(),
      requests: 1,
      promptTokens: 15,
      completionTokens: 10,
      totalTokens: 25,
      estimatedCost: 0.001,
      executionTimeMs: 500,
      model: "tencent/hy3:free",
    });

    const usage = await AiUsageLog.find({ orgId });
    expect(usage.length).toBe(1);
    expect(usage[0].totalTokens).toBe(25);
  });

  it("isolates data between different workspaces", async () => {
    const orgA = "org-a";
    const orgB = "org-b";

    await AiConversation.create({ orgId: orgA, userId, title: "Org A Chat", context: "workspace", lastActivityAt: new Date() });
    await AiConversation.create({ orgId: orgB, userId, title: "Org B Chat", context: "workspace", lastActivityAt: new Date() });

    const orgAConvs = await AiConversation.find({ orgId: orgA }).lean();
    const orgBConvs = await AiConversation.find({ orgId: orgB }).lean();

    expect(orgAConvs.length).toBe(1);
    expect(orgBConvs.length).toBe(1);
    expect(orgAConvs[0].title).toBe("Org A Chat");
    expect(orgBConvs[0].title).toBe("Org B Chat");
  });

  it("isolates conversations between users", async () => {
    await AiConversation.create({ orgId, userId: "user-a", title: "User A Chat", context: "workspace", lastActivityAt: new Date() });
    await AiConversation.create({ orgId, userId: "user-b", title: "User B Chat", context: "workspace", lastActivityAt: new Date() });

    const userAConvs = await AiConversation.find({ orgId, userId: "user-a", deletedAt: null }).lean();
    const userBConvs = await AiConversation.find({ orgId, userId: "user-b", deletedAt: null }).lean();

    expect(userAConvs.length).toBe(1);
    expect(userBConvs.length).toBe(1);
  });

  it("performs soft delete and hides deleted conversations", async () => {
    const conv = await AiConversation.create({
      orgId, userId, title: "To Delete", context: "workspace", lastActivityAt: new Date(),
    });

    await AiConversation.findByIdAndUpdate(conv._id, { deletedAt: new Date() });

    const visible = await AiConversation.find({ orgId, userId, deletedAt: null }).lean();
    const all = await AiConversation.find({ orgId, userId }).lean();

    expect(visible.length).toBe(0);
    expect(all.length).toBe(1);
  });

  it("hard deletes expired conversations", async () => {
    const oldDate = new Date();
    oldDate.setDate(oldDate.getDate() - 100);

    const conv = await AiConversation.create({
      orgId, userId, title: "Old", context: "workspace", deletedAt: oldDate, lastActivityAt: oldDate,
    });

    await AiMessage.create({
      conversationId: conv._id, orgId, userId, role: "user", content: "Old message",
    });

    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 30);

    // Soft delete first
    await AiConversation.findByIdAndUpdate(conv._id, { deletedAt: oldDate });

    // Find expired and delete
    const expired = await AiConversation.find({ deletedAt: { $lte: cutoff } });
    const expiredIds = expired.map(c => c._id);

    if (expiredIds.length > 0) {
      await AiMessage.deleteMany({ conversationId: { $in: expiredIds } });
      await AiConversation.deleteMany({ _id: { $in: expiredIds } });
    }

    const remaining = await AiConversation.find({ orgId });
    expect(remaining.length).toBe(0);
  });
});
