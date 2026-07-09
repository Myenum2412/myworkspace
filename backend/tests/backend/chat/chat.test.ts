import request from "supertest";
import type { Server } from "http";
import { v4 as uuid } from "uuid";
import app from "../../../src/app.js";
import { connectTestDb, resetDb } from "../../__helpers__/db.js";
import { seedOrgWithAdmin } from "../../__helpers__/fixtures.js";
import { Message } from "../../../src/lib/db/models/Message.js";

let server: Server;
let ctx: Awaited<ReturnType<typeof seedOrgWithAdmin>>;

beforeAll(async () => {
  await connectTestDb();
  server = app.listen(0);
});

afterAll(() => server.close());

beforeEach(async () => {
  await resetDb();
  ctx = await seedOrgWithAdmin({ email: `chat-${Date.now()}@example.com` });
});

describe("Chat REST API", () => {
  const conversationId = () => uuid();

  describe("POST /api/chat/messages", () => {
    it("sends a message and returns 201", async () => {
      const convId = conversationId();
      const res = await request(server)
        .post("/api/chat/messages")
        .set(ctx.headers)
        .send({ conversationId: convId, content: "Hello World" });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.content).toBe("Hello World");
      expect(res.body.data.conversationId).toBe(convId);
    });

    it("returns 400 when content is missing", async () => {
      const res = await request(server)
        .post("/api/chat/messages")
        .set(ctx.headers)
        .send({ conversationId: conversationId() });

      expect(res.status).toBe(400);
    });

    it("returns 400 when conversationId is missing", async () => {
      const res = await request(server)
        .post("/api/chat/messages")
        .set(ctx.headers)
        .send({ content: "Hello" });

      expect(res.status).toBe(400);
    });

    it("rejects unauthenticated requests", async () => {
      const res = await request(server)
        .post("/api/chat/messages")
        .send({ conversationId: conversationId(), content: "Hello" });

      expect(res.status).toBe(401);
    });

    it("supports messageType and replyTo", async () => {
      const convId = conversationId();
      const first = await request(server)
        .post("/api/chat/messages")
        .set(ctx.headers)
        .send({ conversationId: convId, content: "Original" });

      const res = await request(server)
        .post("/api/chat/messages")
        .set(ctx.headers)
        .send({ conversationId: convId, content: "Reply", messageType: "text", replyTo: first.body.data.id });

      expect(res.status).toBe(201);
      expect(res.body.data.replyTo).toBe(first.body.data.id);
    });
  });

  describe("GET /api/chat/messages/:conversationId", () => {
    it("returns message history", async () => {
      const convId = conversationId();
      await request(server).post("/api/chat/messages").set(ctx.headers).send({ conversationId: convId, content: "Msg 1" });
      await request(server).post("/api/chat/messages").set(ctx.headers).send({ conversationId: convId, content: "Msg 2" });

      const res = await request(server)
        .get(`/api/chat/messages/${convId}`)
        .set(ctx.headers);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(2);
    });

    it("respects limit query param", async () => {
      const convId = conversationId();
      for (let i = 0; i < 5; i++) {
        await request(server).post("/api/chat/messages").set(ctx.headers).send({ conversationId: convId, content: `Msg ${i}` });
      }

      const res = await request(server)
        .get(`/api/chat/messages/${convId}?limit=2`)
        .set(ctx.headers);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(2);
    });

    it("scopes messages to org", async () => {
      const convId = conversationId();
      await request(server).post("/api/chat/messages").set(ctx.headers).send({ conversationId: convId, content: "Org1 Msg" });

      const ctx2 = await seedOrgWithAdmin({ email: `chat2-${Date.now()}@example.com` });
      const res = await request(server)
        .get(`/api/chat/messages/${convId}`)
        .set(ctx2.headers);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(0);
    });
  });

  describe("POST /api/chat/messages/:conversationId/read", () => {
    it("marks messages as read", async () => {
      const convId = conversationId();
      await request(server).post("/api/chat/messages").set(ctx.headers).send({ conversationId: convId, content: "Unread" });

      const res = await request(server)
        .post(`/api/chat/messages/${convId}/read`)
        .set(ctx.headers);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const msgs = await Message.find({ conversationId: convId }).lean();
      expect(msgs.length).toBe(1);
    });
  });

  describe("GET /api/chat/conversations", () => {
    it("returns conversations list", async () => {
      const convId = conversationId();
      await request(server).post("/api/chat/messages").set(ctx.headers).send({ conversationId: convId, content: "Hello" });

      const res = await request(server)
        .get("/api/chat/conversations")
        .set(ctx.headers);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].conversationId).toBe(convId);
    });
  });
});

describe("Chat service unit", () => {
  beforeEach(async () => {
    await Message.deleteMany({});
  });

  it("getUnreadCount returns counts per conversation", async () => {
    const { getUnreadCount, sendMessage } = await import("../../../src/services/chat.service.js");
    const otherUserId = uuid();

    await sendMessage({ orgId: ctx.orgId, senderId: otherUserId, createdBy: otherUserId, conversationId: "conv-a", content: "Unread msg" });
    await sendMessage({ orgId: ctx.orgId, senderId: otherUserId, createdBy: otherUserId, conversationId: "conv-b", content: "Another unread" });

    const counts = await getUnreadCount(ctx.orgId, ctx.userId);
    expect(counts["conv-a"]).toBe(1);
    expect(counts["conv-b"]).toBe(1);
  });

  it("markConversationRead adds user to readBy", async () => {
    const { sendMessage, markConversationRead, getMessageHistory } = await import("../../../src/services/chat.service.js");
    const otherUserId = uuid();
    const convId = uuid();

    await sendMessage({ orgId: ctx.orgId, senderId: otherUserId, createdBy: otherUserId, conversationId: convId, content: "Mark me read" });

    await markConversationRead({ orgId: ctx.orgId, conversationId: convId, userId: ctx.userId });

    const msgs = await getMessageHistory({ orgId: ctx.orgId, conversationId: convId });
    expect(msgs.length).toBe(1);
    expect(msgs[0].readBy.some((r: any) => r.userId === ctx.userId)).toBe(true);
  });
});
