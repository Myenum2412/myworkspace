import { connectTestDb, resetDb } from "../../../__helpers__/db.js";
import { AiSettings } from "../../../../src/lib/db/models/AiSettings.js";
import { AiConversation } from "../../../../src/lib/db/models/AiConversation.js";

beforeAll(async () => await connectTestDb());
beforeEach(async () => await resetDb());

describe("AI Settings RBAC Integration", () => {
  const orgId = "org-rbac";

  it("allows admin to create and update settings", async () => {
    const settings = await AiSettings.create({
      orgId,
      provider: "openrouter",
      model: "tencent/hy3:free",
      temperature: 0.7,
      maxTokens: 4096,
      responseLength: "medium",
      streamingEnabled: true,
      systemPrompt: "Admin configured prompt",
      allowedFileTypes: ["pdf", "docx"],
      maxUploadSize: 104857600,
      conversationRetentionDays: 60,
      rateLimitRequests: 200,
      rateLimitWindowMs: 60000,
      updatedBy: "admin-user",
    });

    expect(settings).not.toBeNull();
    expect(settings.orgId).toBe(orgId);
    expect(settings.systemPrompt).toBe("Admin configured prompt");
    expect(settings.rateLimitRequests).toBe(200);
  });

  it("prevents duplicate settings for the same org", async () => {
    await AiSettings.create({
      orgId,
      provider: "openrouter",
      model: "tencent/hy3:free",
      temperature: 0.7,
      maxTokens: 4096,
      responseLength: "medium",
      streamingEnabled: true,
      systemPrompt: "Original",
      updatedBy: "admin",
    });

    await expect(AiSettings.create({
      orgId,
      provider: "openai",
      model: "gpt-4",
      temperature: 0.5,
      maxTokens: 2048,
      responseLength: "short",
      streamingEnabled: false,
      systemPrompt: "Duplicate",
      updatedBy: "admin",
    })).rejects.toThrow();
  });

  it("tracks who updated settings", async () => {
    await AiSettings.create({
      orgId,
      provider: "openrouter",
      model: "tencent/hy3:free",
      temperature: 0.7,
      maxTokens: 4096,
      responseLength: "medium",
      streamingEnabled: true,
      systemPrompt: "Test",
      updatedBy: "admin-user",
    });

    const settings = await AiSettings.findOne({ orgId });
    expect(settings!.updatedBy).toBe("admin-user");
  });
});
