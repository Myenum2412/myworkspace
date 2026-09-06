// @ts-nocheck
import type { FastifyInstance } from "fastify";
import { type AuthRequest, authenticate } from "../middleware/auth.js";
import { AppError } from "../middleware/error.js";
import {
  getConversations,
  getMessageHistory,
  markConversationRead,
  sendMessage,
} from "../services/chat.service.js";
import { processEvent } from "../services/notification-engine.service.js";

export default async function plugin(fastify: FastifyInstance) {
fastify.get("/messages", authenticate, async (req: AuthRequest, reply: any) => {
  const { conversationId, content, messageType, replyTo, teamId } = req.body;
  if (!conversationId || !content) {
    throw new AppError(400, "conversationId and content are required");
  }
  if (!req.user?.orgId || !req.user?.userId) throw new AppError(401, "Unauthorized");
  const message = await sendMessage({
    orgId: req.user.orgId,
    senderId: req.user.userId,
    createdBy: req.user.userId,
    conversationId,
    content,
    messageType,
    replyTo,
    teamId,
  });

  processEvent({
    userId: req.user.userId,
    orgId: req.user.orgId,
    createdBy: req.user.userId,
    type: "chat_message",
    category: "messages",
    title: `New message in conversation`,
    metadata: { conversationId, messageId: message.id, content },
  }).catch(() => {});

  const mentionPattern = /@(\w+)/g;
  let mentionMatch: RegExpExecArray | null;
  while ((mentionMatch = mentionPattern.exec(content)) !== null) {
    const mentionedUsername = mentionMatch[1];
    processEvent({
      userId: req.user.userId,
      orgId: req.user.orgId,
      createdBy: req.user.userId,
      type: "mention",
      category: "messages",
      title: `${req.user.userId} mentioned you`,
      metadata: { mentionedUsername, conversationId, messageId: message.id, content },
    }).catch(() => {});
  }

  reply.send(201).json({ success: true, data: message });
});

fastify.get("/messages/:conversationId", authenticate, async (req: AuthRequest, reply: any) => {
  const { conversationId } = req.params;
  const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;
  const before = req.query.before as string | undefined;

  if (!req.user?.orgId) throw new AppError(401, "Unauthorized");
  const messages = await getMessageHistory({
    orgId: req.user.orgId,
    conversationId,
    limit,
    before,
  });
  reply.send({ success: true, data: messages });
});

fastify.get(
  "/messages/:conversationId/read",
  authenticate,
  async (req: AuthRequest, reply: any) => {
    const { conversationId } = req.params;
    if (!req.user?.orgId || !req.user?.userId) throw new AppError(401, "Unauthorized");
    await markConversationRead({
      orgId: req.user.orgId,
      conversationId,
      userId: req.user.userId,
    });
    reply.send({ success: true });
  },
);

fastify.get("/conversations", authenticate, async (req: AuthRequest, reply: any) => {
  if (!req.user?.orgId || !req.user?.userId) throw new AppError(401, "Unauthorized");
  const conversations = await getConversations(req.user.orgId, req.user.userId);
  reply.send({ success: true, data: conversations });
});
}
