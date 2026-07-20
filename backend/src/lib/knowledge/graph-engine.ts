import { Schema, model, Document } from "mongoose";
import { v4 as uuid } from "uuid";
import { Task } from "../db/models/Task.js";
import { Project } from "../db/models/Project.js";
import { User } from "../db/models/User.js";
import { FileAttachment } from "../db/models/FileAttachment.js";
import { KnowledgeIndex } from "./knowledge-engine.js";

export type RelationshipType =
  | "assigned_to" | "created_by" | "part_of" | "related_to" | "depends_on"
  | "blocks" | "references" | "attached_to" | "mentions" | "similar_to"
  | "derived_from" | "supersedes" | "duplicates";

export interface IKnowledgeGraphEdge extends Document {
  id: string;
  orgId: string;
  sourceType: string;
  sourceId: string;
  targetType: string;
  targetId: string;
  relationship: RelationshipType;
  weight: number;
  metadata: Record<string, unknown>;
  createdAt: Date;
}

export interface IKnowledgeGraphNode {
  id: string;
  type: string;
  label: string;
  summary?: string;
  metadata: Record<string, unknown>;
  neighbors: { node: IKnowledgeGraphNode; relationship: RelationshipType; weight: number }[];
}

export interface IDocumentIntelligence extends Document {
  id: string;
  orgId: string;
  sourceId: string;
  sourceType: string;
  classification: string;
  entities: { name: string; type: string; confidence: number }[];
  summary: string;
  keywords: string[];
  language: string;
  sentiment: number;
  readabilityScore: number;
  processedAt: Date;
}

const graphEdgeSchema = new Schema<IKnowledgeGraphEdge>({
  id: { type: String, required: true, unique: true },
  orgId: { type: String, required: true, index: true },
  sourceType: { type: String, required: true },
  sourceId: { type: String, required: true },
  targetType: { type: String, required: true },
  targetId: { type: String, required: true },
  relationship: { type: String, required: true, index: true },
  weight: { type: Number, default: 1 },
  metadata: { type: Schema.Types.Mixed, default: {} },
  createdAt: { type: Date, default: Date.now },
});

graphEdgeSchema.index({ orgId: 1, sourceId: 1 });
graphEdgeSchema.index({ orgId: 1, targetId: 1 });
graphEdgeSchema.index({ orgId: 1, sourceType: 1, targetType: 1, relationship: 1 });

const documentIntelligenceSchema = new Schema<IDocumentIntelligence>({
  id: { type: String, required: true, unique: true },
  orgId: { type: String, required: true, index: true },
  sourceId: { type: String, required: true },
  sourceType: { type: String, required: true },
  classification: { type: String, default: "unknown" },
  entities: [{ name: String, type: String, confidence: Number }],
  summary: { type: String, default: "" },
  keywords: [{ type: String }],
  language: { type: String, default: "en" },
  sentiment: { type: Number, default: 0 },
  readabilityScore: { type: Number, default: 0 },
  processedAt: { type: Date, default: Date.now },
});

export const KnowledgeGraphEdge = model<IKnowledgeGraphEdge>("KnowledgeGraphEdge", graphEdgeSchema);
export const DocumentIntelligence = model<IDocumentIntelligence>("DocumentIntelligence", documentIntelligenceSchema);

export class GraphEngine {
  async createEdge(params: {
    orgId: string; sourceType: string; sourceId: string;
    targetType: string; targetId: string;
    relationship: RelationshipType; weight?: number;
  }): Promise<IKnowledgeGraphEdge> {
    const existing = await KnowledgeGraphEdge.findOne({
      orgId: params.orgId, sourceId: params.sourceId,
      targetId: params.targetId, relationship: params.relationship,
    }).lean();
    if (existing) return existing as any;

    return KnowledgeGraphEdge.create({
      id: uuid(), ...params,
      weight: params.weight || 1,
      metadata: {},
    });
  }

  async getNode(orgId: string, entityId: string, entityType: string): Promise<IKnowledgeGraphNode | null> {
    let label = entityId;
    let summary: string | undefined;

    switch (entityType) {
      case "task": {
        const t = await Task.findOne({ id: entityId }).lean();
        if (t) { label = t.title; summary = t.description; }
        break;
      }
      case "project": {
        const p = await Project.findOne({ id: entityId }).lean();
        if (p) { label = p.name; summary = p.description; }
        break;
      }
      case "user": {
        const u = await User.findOne({ id: entityId }).lean();
        if (u) label = u.name || u.email || entityId;
        break;
      }
      case "file": {
        const f = await FileAttachment.findOne({ id: entityId }).lean();
        if (f) label = f.name || f.originalName || entityId;
        break;
      }
    }

    const edges = await KnowledgeGraphEdge.find({
      orgId, $or: [{ sourceId: entityId }, { targetId: entityId }],
    }).lean();

    const neighbors: IKnowledgeGraphNode["neighbors"] = [];
    for (const edge of edges) {
      const isSource = edge.sourceId === entityId;
      const neighborId = isSource ? edge.targetId : edge.sourceId;
      const neighborType = isSource ? edge.targetType : edge.sourceType;
      const ki = await KnowledgeIndex.findOne({ orgId, sourceId: neighborId }).select("title summary").lean();
      neighbors.push({
        node: {
          id: neighborId,
          type: neighborType,
          label: ki?.title || neighborId,
          summary: ki?.summary,
          metadata: {},
          neighbors: [],
        },
        relationship: edge.relationship as RelationshipType,
        weight: edge.weight,
      });
    }

    return { id: entityId, type: entityType, label, summary, metadata: {}, neighbors };
  }

  async getSubgraph(
    orgId: string,
    entityId: string,
    depth = 2,
  ): Promise<{ nodes: IKnowledgeGraphNode[]; edges: any[] }> {
    const visited = new Set<string>();
    const nodes: IKnowledgeGraphNode[] = [];
    const edges: any[] = [];
    const queue = [{ id: entityId, type: "", depth: 0 }];

    while (queue.length > 0) {
      const current = queue.shift()!;
      const key = `${current.type}:${current.id}`;
      if (visited.has(key) || current.depth > depth) continue;
      visited.add(key);

      const node = await this.getNode(orgId, current.id, current.type || "task");
      if (!node) continue;
      nodes.push(node);

      for (const n of node.neighbors) {
        const nKey = `${n.node.type}:${n.node.id}`;
        edges.push({ source: current.id, target: n.node.id, relationship: n.relationship, weight: n.weight });
        if (!visited.has(nKey)) {
          queue.push({ id: n.node.id, type: n.node.type, depth: current.depth + 1 });
        }
      }
    }

    return { nodes, edges };
  }

  async buildProjectGraph(orgId: string, projectId: string): Promise<void> {
    const tasks = await Task.find({ orgId, project: projectId }).lean();
    const project = await Project.findOne({ id: projectId }).lean();
    if (!project) return;

    await this.createEdge({ orgId, sourceType: "project", sourceId: projectId, targetType: "project", targetId: projectId, relationship: "part_of", weight: 0 });

    for (const task of tasks) {
      await this.createEdge({
        orgId, sourceType: "task", sourceId: task.id,
        targetType: "project", targetId: projectId,
        relationship: "part_of",
      });

      if (task.assigneeId) {
        await this.createEdge({
          orgId, sourceType: "task", sourceId: task.id,
          targetType: "user", targetId: task.assigneeId,
          relationship: "assigned_to",
        });
      }

      if (task.creatorId) {
        await this.createEdge({
          orgId, sourceType: "task", sourceId: task.id,
          targetType: "user", targetId: task.creatorId,
          relationship: "created_by",
        });
      }
    }
  }

  async getGraphSummary(orgId: string): Promise<{
    totalEdges: number;
    byRelationship: Record<string, number>;
    byType: Record<string, number>;
    topConnected: { id: string; type: string; connections: number }[];
  }> {
    const [total, relAgg, typeAgg, topAgg] = await Promise.all([
      KnowledgeGraphEdge.countDocuments({ orgId }),
      KnowledgeGraphEdge.aggregate([
        { $match: { orgId } },
        { $group: { _id: "$relationship", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      KnowledgeGraphEdge.aggregate([
        { $match: { orgId } },
        { $group: { _id: "$sourceType", count: { $sum: 1 } } },
      ]),
      KnowledgeGraphEdge.aggregate([
        { $match: { orgId } },
        { $group: { _id: { id: "$sourceId", type: "$sourceType" }, connections: { $sum: 1 } } },
        { $sort: { connections: -1 } },
        { $limit: 20 },
      ]),
    ]);

    const byRelationship: Record<string, number> = {};
    for (const r of relAgg) byRelationship[r._id] = r.count;
    const byType: Record<string, number> = {};
    for (const t of typeAgg) byType[t._id] = t.count;

    return {
      totalEdges: total,
      byRelationship,
      byType,
      topConnected: topAgg.map(t => ({ id: t._id.id, type: t._id.type, connections: t.connections })),
    };
  }
}

export class DocumentIntelligenceEngine {
  async analyzeDocument(
    orgId: string,
    sourceId: string,
    sourceType: string,
    content: string,
  ): Promise<IDocumentIntelligence> {
    const wordCount = content.split(/\s+/).length;
    const sentenceCount = (content.match(/[.!?]+/g) || []).length;
    const readabilityScore = sentenceCount > 0
      ? Math.round(Math.max(0, Math.min(100, 206.835 - 1.015 * (wordCount / sentenceCount) - 84.6 * (this.countSyllables(content) / wordCount))))
      : 0;

    const stopWords = new Set(["the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for", "of", "with", "by", "is", "are", "was", "were"]);
    const words = content.toLowerCase().match(/\b\w{3,}\b/g) || [];
    const freq: Record<string, number> = {};
    for (const w of words) {
      if (!stopWords.has(w)) freq[w] = (freq[w] || 0) + 1;
    }
    const keywords = Object.entries(freq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([k]) => k);

    const entityPatterns: Record<string, RegExp> = {
      email: /[\w.-]+@[\w.-]+\.\w+/g,
      url: /https?:\/\/[^\s]+/g,
      date: /\d{4}[-/]\d{1,2}[-/]\d{1,2}/g,
      number: /\b\d+\.?\d*\b/g,
    };

    const entities: { name: string; type: string; confidence: number }[] = [];
    for (const [type, pattern] of Object.entries(entityPatterns)) {
      const matches = content.match(pattern);
      if (matches) {
        const unique = [...new Set(matches)];
        for (const m of unique.slice(0, 10)) {
          entities.push({ name: m, type, confidence: 0.9 });
        }
      }
    }

    const positiveWords = content.match(/\b(great|excellent|good|amazing|successful|innovative|productive|efficient)\b/gi);
    const negativeWords = content.match(/\b(bad|poor|terrible|failed|broken|issue|problem|delay|blocker)\b/gi);
    const sentiment = Math.max(-1, Math.min(1,
      ((positiveWords?.length || 0) - (negativeWords?.length || 0)) / Math.max(1, wordCount) * 10
    ));

    const classification = await this.classifyDocument(content, keywords);

    const doc = await DocumentIntelligence.findOneAndUpdate(
      { orgId, sourceId },
      {
        $set: {
          id: uuid(), orgId, sourceId, sourceType,
          classification, entities, summary: content.substring(0, 300),
          keywords, language: "en", sentiment, readabilityScore,
          processedAt: new Date(),
        },
      },
      { upsert: true, new: true },
    );

    return doc;
  }

  private countSyllables(text: string): number {
    const words = text.toLowerCase().split(/\s+/);
    let total = 0;
    for (const word of words) {
      const vowels = word.match(/[aeiouy]+/g);
      total += vowels ? vowels.length : 1;
    }
    return total;
  }

  private async classifyDocument(content: string, keywords: string[]): Promise<string> {
    const lower = content.toLowerCase();
    const kw = keywords.join(" ").toLowerCase();

    if (/\b(bug|error|crash|fix|issue|defect)\b/.test(lower)) return "bug_report";
    if (/\b(feature|enhancement|request|suggestion|improve)\b/.test(lower)) return "feature_request";
    if (/\b(doc|manual|guide|readme|wiki|instruction)\b/.test(lower)) return "documentation";
    if (/\b(spec|requirement|design|architecture|plan)\b/.test(lower)) return "specification";
    if (/\b(meeting|minutes|agenda|notes|discussion)\b/.test(lower)) return "meeting_notes";
    if (/\b(report|analysis|summary|review|audit)\b/.test(lower)) return "report";
    if (/\b(contract|agreement|legal|policy|compliance)\b/.test(lower)) return "legal";
    if (/\b(tutorial|how.to|guide|walkthrough|example)\b/.test(lower)) return "tutorial";

    return "general";
  }

  async getDocumentIntelligence(
    orgId: string,
    sourceId: string,
  ): Promise<IDocumentIntelligence | null> {
    return DocumentIntelligence.findOne({ orgId, sourceId }).lean() as any;
  }

  async getOrgClassificationBreakdown(orgId: string): Promise<{
    byClassification: Record<string, number>;
    avgSentiment: number;
    avgReadability: number;
    totalAnalyzed: number;
  }> {
    const [stats, agg] = await Promise.all([
      DocumentIntelligence.aggregate([
        { $match: { orgId } },
        {
          $group: {
            _id: null,
            avgSentiment: { $avg: "$sentiment" },
            avgReadability: { $avg: "$readabilityScore" },
            total: { $sum: 1 },
          },
        },
      ]),
      DocumentIntelligence.aggregate([
        { $match: { orgId } },
        { $group: { _id: "$classification", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
    ]);

    const byClassification: Record<string, number> = {};
    for (const a of agg) byClassification[a._id] = a.count;

    return {
      byClassification,
      avgSentiment: stats[0] ? Math.round(stats[0].avgSentiment * 100) / 100 : 0,
      avgReadability: stats[0] ? Math.round(stats[0].avgReadability) : 0,
      totalAnalyzed: stats[0]?.total || 0,
    };
  }
}

export const graphEngine = new GraphEngine();
export const documentIntelligence = new DocumentIntelligenceEngine();
