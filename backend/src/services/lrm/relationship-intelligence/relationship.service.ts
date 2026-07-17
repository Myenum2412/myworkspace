import { GraphStore } from "../knowledge-graph/graph-store.js";
import { KnowledgeGraphService } from "../knowledge-graph/graph.service.js";
import { EmbeddingService } from "../memory/embedding.service.js";
import { EntityNode, RelationshipEdge, EntityType } from "../types.js";
import { AIFactory } from "../../ai/ai-factory.js";
import { logger } from "../../../lib/logger/index.js";
import { LrmEntity } from "../../../lib/db/models/LrmEntity.js";
import { LrmRelationship } from "../../../lib/db/models/LrmRelationship.js";

export class RelationshipIntelligence {
  private graphStore: GraphStore;
  private kgService: KnowledgeGraphService;
  private embeddingService: EmbeddingService;
  private aiFactory: AIFactory;

  constructor(graphStore: GraphStore, kgService: KnowledgeGraphService) {
    this.graphStore = graphStore;
    this.kgService = kgService;
    this.embeddingService = new EmbeddingService();
    this.aiFactory = new AIFactory();
  }

  async discoverConnections(entityId: string, orgId: string): Promise<{
    direct: RelationshipEdge[];
    indirect: { path: EntityNode[]; edges: RelationshipEdge[] }[];
    recommendations: string[];
  }> {
    const connected = await this.graphStore.findConnected(entityId, 2);
    const direct = await this.graphStore.getRelationships(entityId);

    const indirect: { path: EntityNode[]; edges: RelationshipEdge[] }[] = [];
    if (connected.entities.length > 1) {
      const rootEntity = connected.entities[0];
      for (let i = 1; i < Math.min(connected.entities.length, 5); i++) {
        const path = await this.graphStore.findPath(entityId, connected.entities[i].id);
        if (path.length > 1) {
          indirect.push({ path, edges: [direct[0]] });
        }
      }
    }

    const recommendations = await this.generateRecommendations(entityId, orgId, connected.entities);

    return { direct, indirect, recommendations };
  }

  async discoverEntityFromRecord(
    type: EntityType, name: string, orgId: string,
    metadata: Record<string, unknown> = {}
  ): Promise<EntityNode> {
    const existing = await this.graphStore.searchEntities(name, orgId, type, 1);
    if (existing.length > 0) return existing[0];

    const node = await this.graphStore.addEntity({ type, name, orgId, metadata });
    const found = await this.graphStore.getEntity(node);
    return found!;
  }

  async createRelationshipFromActivity(
    sourceType: EntityType, sourceId: string,
    targetType: EntityType, targetName: string,
    relationship: string, orgId: string
  ): Promise<RelationshipEdge | null> {
    const target = await this.discoverEntityFromRecord(targetType, targetName, orgId);
    const source = await this.graphStore.getEntity(sourceId);
    if (!source) return null;

    const rel: Omit<RelationshipEdge, "id" | "createdAt"> = {
      sourceId: source.id, sourceType,
      targetId: target.id, targetType,
      relationship, strength: 0.6,
      metadata: { source: "activity" }, orgId,
    };

    const relId = await this.graphStore.addRelationship(rel);
    const edges = await this.graphStore.getRelationships(source.id);
    return edges.find(e => e.id === relId) || null;
  }

  async findSimilarEntities(entityId: string, orgId: string, topK = 5): Promise<EntityNode[]> {
    const entity = await this.graphStore.getEntity(entityId);
    if (!entity) return [];

    const allEntities = await this.graphStore.searchEntities("", orgId);
    const queryEmbed = entity.embedding || this.embeddingService.fallbackEmbedding(entity.name);

    return allEntities
      .filter(e => e.id !== entityId)
      .map(e => ({
        entity: e,
        score: this.embeddingService.cosineSimilarity(
          queryEmbed,
          e.embedding || this.embeddingService.fallbackEmbedding(e.name)
        ),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, topK)
      .map(({ entity }) => entity);
  }

  async getEntityTimeline(entityId: string, orgId: string): Promise<{
    entity: EntityNode | null;
    relationships: RelationshipEdge[];
    timeline: { date: Date; event: string; relatedEntity: string }[];
  }> {
    const entity = await this.graphStore.getEntity(entityId);
    const relationships = await this.graphStore.getRelationships(entityId);
    
    const timeline = relationships.map(r => {
      const relatedId = r.sourceId === entityId ? r.targetId : r.sourceId;
      return {
        date: r.createdAt,
        event: `${r.relationship} relationship established`,
        relatedEntity: relatedId,
      };
    }).sort((a, b) => b.date.getTime() - a.date.getTime());

    return { entity, relationships, timeline };
  }

  async findPathBetween(sourceType: EntityType, sourceName: string, targetType: EntityType, targetName: string, orgId: string): Promise<EntityNode[]> {
    const sources = await this.graphStore.searchEntities(sourceName, orgId, sourceType, 1);
    const targets = await this.graphStore.searchEntities(targetName, orgId, targetType, 1);
    
    if (sources.length === 0 || targets.length === 0) return [];
    return this.graphStore.findPath(sources[0].id, targets[0].id);
  }

  private async generateRecommendations(entityId: string, orgId: string, connectedEntities: EntityNode[]): Promise<string[]> {
    const entity = await this.graphStore.getEntity(entityId);
    if (!entity) return [];

    const recommendations: string[] = [];
    const connectedIds = new Set(connectedEntities.map(e => e.id));

    const recentRelationships = await LrmRelationship.find({ orgId })
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();

    for (const rel of recentRelationships) {
      if (!connectedIds.has(rel.sourceId) && !connectedIds.has(rel.targetId)) {
        try {
          const source = await LrmEntity.findOne({ id: rel.sourceId }).lean();
          const target = await LrmEntity.findOne({ id: rel.targetId }).lean();
          if (source && target) {
            recommendations.push(`Related ${source.type} "${source.name}" ↔ ${target.type} "${target.name}" (${rel.relationship})`);
          }
        } catch {}
      }
    }

    return recommendations.slice(0, 5);
  }
}
