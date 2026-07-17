import { connectTestDb, resetDb } from "../../../__helpers__/db.js";
import { ConversationService } from "../../../../src/services/ai/conversation.service.js";
import { AiConversation } from "../../../../src/lib/db/models/AiConversation.js";
import { AiMessage } from "../../../../src/lib/db/models/AiMessage.js";

let service: ConversationService;

beforeAll(async () => await connectTestDb());
beforeEach(async () => {
  await resetDb();
  service = new ConversationService();
});

describe("ConversationService", () => {
  const orgId = "org-test";
  const userId = "user-test";

  describe("create", () => {
    it("creates a conversation with default values", async () => {
      const conv = await service.create({
        orgId,
        userId,
        title: "Test Conversation",
        context: "workspace",
        workspaceContext: { project: "Test Project" },
      });

      expect(conv).toBeDefined();
      expect(conv.orgId).toBe(orgId);
      expect(conv.userId).toBe(userId);
      expect(conv.title).toBe("Test Conversation");
      expect(conv.context).toBe("workspace");
      expect(conv.isPinned).toBe(false);
      expect(conv.messageCount).toBe(0);
      expect(conv.lastActivityAt).toBeDefined();
    });
  });

  describe("findById", () => {
    it("returns null for non-existent conversation", async () => {
      const result = await service.findById("000000000000000000000000");
      expect(result).toBeNull();
    });

    it("returns a conversation by id", async () => {
      const conv = await service.create({ orgId, userId, title: "Test", context: "workspace" });
      const found = await service.findById(conv._id.toString());
      expect(found).not.toBeNull();
      expect(found!._id.toString()).toBe(conv._id.toString());
    });
  });

  describe("findByOrg", () => {
    it("returns conversations for an org", async () => {
      await service.create({ orgId, userId: "user-1", title: "Conv 1", context: "workspace" });
      await service.create({ orgId, userId: "user-2", title: "Conv 2", context: "staff" });
      await service.create({ orgId: "other-org", userId: "user-1", title: "Other", context: "workspace" });

      const result = await service.findByOrg(orgId);
      expect(result.data.length).toBe(2);
      expect(result.total).toBe(2);
    });

    it("filters by userId", async () => {
      await service.create({ orgId, userId: "user-1", title: "Conv 1", context: "workspace" });
      await service.create({ orgId, userId: "user-2", title: "Conv 2", context: "staff" });

      const result = await service.findByOrg(orgId, { userId: "user-1" });
      expect(result.data.length).toBe(1);
    });

    it("filters by context", async () => {
      await service.create({ orgId, userId, title: "WS", context: "workspace" });
      await service.create({ orgId, userId, title: "SF", context: "staff" });

      const result = await service.findByOrg(orgId, { context: "staff" });
      expect(result.data.length).toBe(1);
      expect(result.data[0].context).toBe("staff");
    });

    it("searches by title", async () => {
      await service.create({ orgId, userId, title: "Project Planning", context: "workspace" });
      await service.create({ orgId, userId, title: "Daily Report", context: "staff" });

      const result = await service.findByOrg(orgId, { search: "project" });
      expect(result.data.length).toBe(1);
      expect(result.data[0].title).toBe("Project Planning");
    });
  });

  describe("updateTitle", () => {
    it("updates the title", async () => {
      const conv = await service.create({ orgId, userId, title: "Old Title", context: "workspace" });
      await service.updateTitle(conv._id.toString(), "New Title");

      const updated = await service.findById(conv._id.toString());
      expect(updated!.title).toBe("New Title");
    });
  });

  describe("togglePin", () => {
    it("toggles pin status", async () => {
      const conv = await service.create({ orgId, userId, title: "Test", context: "workspace" });
      expect(conv.isPinned).toBe(false);

      await service.togglePin(conv._id.toString());
      const pinned = await service.findById(conv._id.toString());
      expect(pinned!.isPinned).toBe(true);

      await service.togglePin(conv._id.toString());
      const unpinned = await service.findById(conv._id.toString());
      expect(unpinned!.isPinned).toBe(false);
    });
  });

  describe("softDelete", () => {
    it("soft deletes a conversation", async () => {
      const conv = await service.create({ orgId, userId, title: "Test", context: "workspace" });
      await service.softDelete(conv._id.toString(), orgId, userId);

      const deleted = await service.findById(conv._id.toString());
      expect(deleted).toBeNull();
    });

    it("throws for non-existent conversation", async () => {
      await expect(service.softDelete("000000000000000000000000", orgId, userId)).rejects.toThrow("Conversation not found");
    });
  });

  describe("messages", () => {
    it("adds and retrieves messages", async () => {
      const conv = await service.create({ orgId, userId, title: "Test", context: "workspace" });
      const convId = conv._id.toString();

      await service.addMessage(convId, { orgId, userId, role: "user", content: "Hello" });
      await service.addMessage(convId, { orgId, userId, role: "assistant", content: "Hi there!" });

      const { data: messages, total } = await service.getMessages(convId);
      expect(total).toBe(2);
      expect(messages[0].role).toBe("user");
      expect(messages[0].content).toBe("Hello");
      expect(messages[1].role).toBe("assistant");
      expect(messages[1].content).toBe("Hi there!");
    });

    it("returns last user message", async () => {
      const conv = await service.create({ orgId, userId, title: "Test", context: "workspace" });
      const convId = conv._id.toString();

      await service.addMessage(convId, { orgId, userId, role: "user", content: "First" });
      await service.addMessage(convId, { orgId, userId, role: "assistant", content: "Response 1" });
      await service.addMessage(convId, { orgId, userId, role: "user", content: "Second" });

      const last = await service.getLastUserMessage(convId);
      expect(last).not.toBeNull();
      expect(last!.content).toBe("Second");
    });

    it("removes last assistant message", async () => {
      const conv = await service.create({ orgId, userId, title: "Test", context: "workspace" });
      const convId = conv._id.toString();

      await service.addMessage(convId, { orgId, userId, role: "user", content: "Hello" });
      await service.addMessage(convId, { orgId, userId, role: "assistant", content: "Response" });

      await service.removeLastAssistantMessage(convId);
      const { data: msgs } = await service.getMessages(convId);
      expect(msgs.length).toBe(1);
      expect(msgs[0].role).toBe("user");
    });

    it("sets feedback on a message", async () => {
      const conv = await service.create({ orgId, userId, title: "Test", context: "workspace" });
      const msg = await service.addMessage(conv._id.toString(), {
        orgId, userId, role: "assistant", content: "Response",
      });

      await service.setFeedback(msg._id.toString(), "like");
      const updated = await AiMessage.findById(msg._id);
      expect(updated!.feedback).toBe("like");

      await service.setFeedback(msg._id.toString(), "dislike");
      const updated2 = await AiMessage.findById(msg._id);
      expect(updated2!.feedback).toBe("dislike");
    });
  });
});
