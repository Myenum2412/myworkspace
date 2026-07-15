import { AiConversation, IAiConversation } from "../../lib/db/models/AiConversation.js";
import { AiMessage, IAiMessage } from "../../lib/db/models/AiMessage.js";
import { AppError } from "../../middleware/error.js";

export class ConversationService {
  async create(data: {
    orgId: string;
    userId: string;
    title: string;
    context: "workspace" | "staff";
    workspaceContext?: Record<string, unknown>;
  }): Promise<IAiConversation> {
    return AiConversation.create({
      orgId: data.orgId,
      userId: data.userId,
      title: data.title,
      context: data.context,
      workspaceContext: data.workspaceContext || {},
      lastActivityAt: new Date(),
    });
  }

  async findById(id: string): Promise<IAiConversation | null> {
    return AiConversation.findOne({ _id: id, deletedAt: null });
  }

  async findByOrg(
    orgId: string,
    options: {
      userId?: string;
      context?: "workspace" | "staff";
      search?: string;
      page?: number;
      limit?: number;
    } = {}
  ): Promise<{ data: IAiConversation[]; total: number; page: number; totalPages: number }> {
    const { userId, context, search, page = 1, limit = 50 } = options;
    const query: Record<string, unknown> = { orgId, deletedAt: null };

    if (userId) query.userId = userId;
    if (context) query.context = context;
    if (search) {
      query.title = { $regex: search, $options: "i" };
    }

    const total = await AiConversation.countDocuments(query);
    const data = await AiConversation.find(query)
      .sort({ isPinned: -1, lastActivityAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    return {
      data: data as unknown as IAiConversation[],
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  async updateTitle(id: string, title: string): Promise<void> {
    await AiConversation.findByIdAndUpdate(id, { title });
  }

  async togglePin(id: string): Promise<void> {
    const conv = await AiConversation.findById(id);
    if (conv) {
      conv.isPinned = !conv.isPinned;
      await conv.save();
    }
  }

  async softDelete(id: string, orgId: string, userId: string): Promise<void> {
    const conv = await AiConversation.findOne({ _id: id, orgId, userId, deletedAt: null });
    if (!conv) throw new AppError(404, "Conversation not found");
    conv.deletedAt = new Date();
    await conv.save();
  }

  async hardDeleteExpired(retentionDays: number): Promise<number> {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - retentionDays);

    const expired = await AiConversation.find({ deletedAt: { $lte: cutoff } });
    const ids = expired.map(c => c._id);

    if (ids.length > 0) {
      await AiMessage.deleteMany({ conversationId: { $in: ids } });
      await AiConversation.deleteMany({ _id: { $in: ids } });
    }

    return ids.length;
  }

  async addMessage(
    conversationId: string,
    data: {
      orgId: string;
      userId: string;
      role: "user" | "assistant" | "system";
      content: string;
      responseId?: string;
      aiModel?: string;
      tokens?: { prompt: number; completion: number; total: number };
      executionTime?: number;
      files?: Array<{ name: string; type: string; size: number; url?: string }>;
    }
  ): Promise<IAiMessage> {
    return AiMessage.create({
      conversationId,
      orgId: data.orgId,
      userId: data.userId,
      role: data.role,
      content: data.content,
      responseId: data.responseId,
      aiModel: data.aiModel,
      tokens: data.tokens,
      executionTime: data.executionTime,
      files: data.files,
    });
  }

  async getHistory(conversationId: string): Promise<IAiMessage[]> {
    return AiMessage.find({ conversationId })
      .sort({ createdAt: 1 })
      .lean() as unknown as IAiMessage[];
  }

  async getMessages(
    conversationId: string,
    page = 1,
    limit = 100
  ): Promise<{ data: IAiMessage[]; total: number }> {
    const total = await AiMessage.countDocuments({ conversationId });
    const data = await AiMessage.find({ conversationId })
      .sort({ createdAt: 1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    return { data: data as unknown as IAiMessage[], total };
  }

  async updateTokenCount(conversationId: string, tokens: number): Promise<void> {
    await AiConversation.findByIdAndUpdate(conversationId, {
      $inc: { totalTokens: tokens, messageCount: 1 },
    });
  }

  async updateLastActivity(conversationId: string): Promise<void> {
    await AiConversation.findByIdAndUpdate(conversationId, {
      lastActivityAt: new Date(),
    });
  }

  async getLastUserMessage(conversationId: string): Promise<IAiMessage | null> {
    return AiMessage.findOne({ conversationId, role: "user" })
      .sort({ createdAt: -1 })
      .lean() as unknown as IAiMessage | null;
  }

  async removeLastAssistantMessage(conversationId: string): Promise<void> {
    const lastAssistant = await AiMessage.findOne({ conversationId, role: "assistant" })
      .sort({ createdAt: -1 });

    if (lastAssistant) {
      await AiConversation.findByIdAndUpdate(conversationId, {
        $inc: { totalTokens: -(lastAssistant.tokens?.total || 0), messageCount: -1 },
      });
      await AiMessage.findByIdAndDelete(lastAssistant._id);
    }
  }

  async setFeedback(messageId: string, feedback: "like" | "dislike" | null): Promise<void> {
    await AiMessage.findByIdAndUpdate(messageId, { feedback });
  }
}
