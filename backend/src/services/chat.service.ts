import { Message, IMessage } from "../lib/db/models/Message.js";
import { socketIOManager } from "../lib/socketio/index.js";
import { v4 as uuid } from "uuid";

export interface SendMessageParams {
  orgId: string;
  senderId: string;
  createdBy: string;
  conversationId: string;
  content: string;
  messageType?: "text" | "system" | "file";
  replyTo?: string;
  teamId?: string;
}

export async function sendMessage(params: SendMessageParams): Promise<IMessage> {
  const message = await Message.create({
    orgId: params.orgId,
    senderId: params.senderId,
    createdBy: params.createdBy,
    conversationId: params.conversationId,
    content: params.content,
    messageType: params.messageType ?? "text",
    replyTo: params.replyTo,
    teamId: params.teamId,
  });

  const populated = await Message.findById(message._id).lean();

  socketIOManager.emitToOrg(params.orgId, "chat:message", populated);

  return message;
}

export interface GetHistoryParams {
  orgId: string;
  conversationId: string;
  limit?: number;
  before?: string;
}

export async function getMessageHistory(params: GetHistoryParams) {
  const limit = Math.min(params.limit ?? 50, 100);
  const query: Record<string, unknown> = {
    orgId: params.orgId,
    conversationId: params.conversationId,
  };

  if (params.before) {
    query.createdAt = { $lt: new Date(params.before) };
  }

  const messages = await Message.find(query)
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();

  return messages.reverse();
}

export interface MarkReadParams {
  orgId: string;
  conversationId: string;
  userId: string;
}

export async function markConversationRead(params: MarkReadParams) {
  const now = new Date();
  await Message.updateMany(
    {
      orgId: params.orgId,
      conversationId: params.conversationId,
      senderId: { $ne: params.userId },
      "readBy.userId": { $ne: params.userId },
    },
    {
      $push: { readBy: { userId: params.userId, readAt: now } },
    },
  );

  socketIOManager.emitToOrg(params.orgId, "chat:read", {
    conversationId: params.conversationId,
    userId: params.userId,
    readAt: now.toISOString(),
  });
}

export async function getUnreadCount(orgId: string, userId: string) {
  const result = await Message.aggregate([
    { $match: { orgId, senderId: { $ne: userId } } },
    { $addFields: { isUnread: { $not: { $in: [userId, "$readBy.userId"] } } } },
    { $match: { isUnread: true } },
    { $group: { _id: "$conversationId", count: { $sum: 1 } } },
  ]);
  return result.reduce<Record<string, number>>((acc, r) => {
    acc[r._id] = r.count;
    return acc;
  }, {});
}

export async function getConversations(orgId: string, userId: string) {
  const conversations = await Message.aggregate([
    { $match: { orgId } },
    { $sort: { createdAt: -1 } },
    {
      $group: {
        _id: "$conversationId",
        lastMessage: { $first: "$$ROOT" },
        messageCount: { $sum: 1 },
      },
    },
    { $sort: { "lastMessage.createdAt": -1 } },
    { $limit: 50 },
  ]);

  const unreadCounts = await getUnreadCount(orgId, userId);

  return conversations.map((c) => ({
    conversationId: c._id,
    lastMessage: c.lastMessage,
    messageCount: c.messageCount,
    unreadCount: unreadCounts[c._id] ?? 0,
  }));
}
