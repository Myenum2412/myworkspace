import { Schema, model, Document } from "mongoose";
import { v4 as uuid } from "uuid";
import { logger } from "../logger/index.js";
import { FileAttachment } from "../db/models/FileAttachment.js";
import { Task } from "../db/models/Task.js";
import { Project } from "../db/models/Project.js";
import { Message } from "../db/models/Message.js";

export interface I索引Entry extends Document {
  id: string;
  orgId: string;
  sourceType: "file" | "task" | "project" | "message" | "client" | "user" | "comment";
  sourceId: string;
  title: string;
  content: string;
  summary?: string;
  tags: string[];
  metadata: Record<string, unknown>;
  embeddings?: number[];
  vectorized: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const indexEntrySchema = new Schema<I索引Entry>({
  id: { type: String, required: true, unique: true },
  orgId: { type: String, required: true, index: true },
  sourceType: { type: String, required: true, index: true },
  sourceId: { type: String, required: true },
  title: { type: String, required: true, index: "text" },
  content: { type: String, required: true, index: "text" },
  summary: String,
  tags: [{ type: String }],
  metadata: { type: Schema.Types.Mixed, default: {} },
  embeddings: [{ type: Number }],
  vectorized: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

indexEntrySchema.index({ orgId: 1, sourceType: 1 });
indexEntrySchema.index({ title: "text", content: "text", tags: "text" });

export const KnowledgeIndex = model<I索引Entry>("KnowledgeIndex", indexEntrySchema);

export class EnterpriseKnowledgeEngine {
  async indexDocument(params: {
    orgId: string; sourceType: I索引Entry["sourceType"]; sourceId: string;
    title: string; content: string; tags?: string[]; metadata?: Record<string, unknown>;
  }): Promise<void> {
    await KnowledgeIndex.findOneAndUpdate(
      { orgId: params.orgId, sourceId: params.sourceId },
      {
        $set: {
          id: uuid(),
          sourceType: params.sourceType,
          title: params.title,
          content: params.content,
          tags: params.tags || [],
          metadata: params.metadata || {},
          updatedAt: new Date(),
        },
      },
      { upsert: true },
    );
  }

  async search(
    orgId: string,
    query: string,
    options?: {
      sourceTypes?: I索引Entry["sourceType"][];
      limit?: number;
      offset?: number;
      tags?: string[];
    },
  ): Promise<{
    results: any[];
    total: number;
    searchTerms: string[];
  }> {
    const filter: Record<string, unknown> = { orgId };
    if (options?.sourceTypes?.length) {
      filter.sourceType = { $in: options.sourceTypes };
    }
    if (options?.tags?.length) {
      filter.tags = { $in: options.tags };
    }

    const searchQuery = { $text: { $search: query } };
    const limit = options?.limit || 20;
    const offset = options?.offset || 0;

    try {
      const [results, total] = await Promise.all([
        KnowledgeIndex.find({ ...filter, ...searchQuery })
          .sort({ score: { $meta: "textScore" } })
          .skip(offset)
          .limit(limit)
          .select("id sourceType sourceId title summary tags metadata createdAt")
          .lean(),
        KnowledgeIndex.countDocuments({ ...filter, ...searchQuery }),
      ]);
      return { results, total, searchTerms: query.split(/\s+/) };
    } catch {
      const regexFilter: Record<string, unknown> = { ...filter };
      const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      regexFilter.$or = [
        { title: { $regex: escaped, $options: "i" } },
        { content: { $regex: escaped, $options: "i" } },
        { tags: { $regex: escaped, $options: "i" } },
      ];
      const [results, total] = await Promise.all([
        KnowledgeIndex.find(regexFilter)
          .skip(offset)
          .limit(limit)
          .select("id sourceType sourceId title summary tags metadata createdAt")
          .lean(),
        KnowledgeIndex.countDocuments(regexFilter),
      ]);
      return { results, total, searchTerms: query.split(/\s+/) };
    }
  }

  async getRelatedDocuments(
    orgId: string,
    sourceId: string,
    sourceType: I索引Entry["sourceType"],
  ): Promise<any[]> {
    const entry = await KnowledgeIndex.findOne({ orgId, sourceId }).lean();
    if (!entry) return [];

    const tags = entry.tags || [];
    const related = await KnowledgeIndex.find({
      orgId,
      _id: { $ne: entry._id },
      $or: [
        { tags: { $in: tags } },
      ],
    })
      .limit(10)
      .select("id sourceType sourceId title summary tags")
      .lean();

    return related;
  }

  async getOrgKnowledgeSummary(orgId: string): Promise<{
    totalDocuments: number;
    byType: Record<string, number>;
    recentDocuments: any[];
    topTags: string[];
  }> {
    const [total, byTypeAgg, recent, tagsAgg] = await Promise.all([
      KnowledgeIndex.countDocuments({ orgId }),
      KnowledgeIndex.aggregate([
        { $match: { orgId } },
        { $group: { _id: "$sourceType", count: { $sum: 1 } } },
      ]),
      KnowledgeIndex.find({ orgId })
        .sort({ createdAt: -1 })
        .limit(10)
        .select("id sourceType title summary createdAt")
        .lean(),
      KnowledgeIndex.aggregate([
        { $match: { orgId } },
        { $unwind: "$tags" },
        { $group: { _id: "$tags", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 20 },
      ]),
    ]);

    const byType: Record<string, number> = {};
    for (const item of byTypeAgg) {
      byType[item._id] = item.count;
    }

    return {
      totalDocuments: total,
      byType,
      recentDocuments: recent,
      topTags: tagsAgg.map(t => t._id as string),
    };
  }

  async bulkIndexOrg(orgId: string): Promise<{ indexed: number }> {
    let indexed = 0;

    const tasks = await Task.find({ orgId }).lean();
    for (const task of tasks) {
      await this.indexDocument({
        orgId, sourceType: "task", sourceId: task.id,
        title: task.title,
        content: task.description || "",
        tags: ["task", task.status],
        metadata: { status: task.status, priority: task.priority },
      });
      indexed++;
    }

    const projects = await Project.find({ orgId }).lean();
    for (const project of projects) {
      await this.indexDocument({
        orgId, sourceType: "project", sourceId: project.id,
        title: project.name,
        content: project.description || "",
        tags: ["project"],
      });
      indexed++;
    }

    const files = await FileAttachment.find({ orgId, deletedAt: null }).lean();
    for (const file of files) {
      await this.indexDocument({
        orgId, sourceType: "file", sourceId: file.id,
        title: file.originalName || file.name,
        content: file.name || "",
        tags: ["file", file.mimeType?.split("/")[0] || "unknown"],
        metadata: { mimeType: file.mimeType, size: file.size },
      });
      indexed++;
    }

    logger.info({ orgId, indexed }, "Bulk knowledge indexing completed");
    return { indexed };
  }
}

export const knowledgeEngine = new EnterpriseKnowledgeEngine();
