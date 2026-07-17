import { LrmEntity } from "../../../lib/db/models/LrmEntity.js";
import { LrmRelationship } from "../../../lib/db/models/LrmRelationship.js";
import { EntityNode, RelationshipEdge, EntityType } from "../types.js";
import { EmbeddingService } from "../memory/embedding.service.js";
import { v4 as uuid } from "uuid";
import { logger } from "../../../lib/logger/index.js";

export class GraphStore {
  private entities = new Map<string, EntityNode>();
  private edges = new Map<string, RelationshipEdge>();
  private adjacency = new Map<string, Set<string>>();
  private embeddingService: EmbeddingService;

  constructor() {
    this.embeddingService = new EmbeddingService();
  }

  async addEntity(entity: Omit<EntityNode, "id" | "createdAt" | "embedding">): Promise<string> {
    const id = uuid();
    const embedding = await this.embeddingService.generate(`${entity.type}: ${entity.name}`);
    const node: EntityNode = { ...entity, id, embedding, createdAt: new Date() };
    this.entities.set(id, node);
    
    try {
      await LrmEntity.findOneAndUpdate(
        { id },
        { $setOnInsert: { id, type: entity.type, name: entity.name, orgId: entity.orgId, metadata: entity.metadata, embedding, createdAt: new Date() } },
        { upsert: true }
      );
    } catch (err) {
      logger.warn({ err, id }, "Failed to persist entity");
    }
    return id;
  }

  async addRelationship(rel: Omit<RelationshipEdge, "id" | "createdAt">): Promise<string> {
    const id = uuid();
    const edge: RelationshipEdge = { ...rel, id, createdAt: new Date() };
    this.edges.set(id, edge);
    
    if (!this.adjacency.has(rel.sourceId)) this.adjacency.set(rel.sourceId, new Set());
    if (!this.adjacency.has(rel.targetId)) this.adjacency.set(rel.targetId, new Set());
    this.adjacency.get(rel.sourceId)!.add(rel.targetId);
    this.adjacency.get(rel.targetId)!.add(rel.sourceId);
    
    try {
      await LrmRelationship.findOneAndUpdate(
        { sourceId: rel.sourceId, targetId: rel.targetId },
        { $setOnInsert: { id, sourceId: rel.sourceId, sourceType: rel.sourceType, targetId: rel.targetId, targetType: rel.targetType, relationship: rel.relationship, strength: rel.strength, metadata: rel.metadata, orgId: rel.orgId, createdAt: new Date() } },
        { upsert: true }
      );
    } catch (err) {
      logger.warn({ err, id }, "Failed to persist relationship");
    }
    return id;
  }

  async findConnected(entityId: string, maxDepth = 2): Promise<{ entities: EntityNode[]; edges: RelationshipEdge[] }> {
    const visited = new Set<string>();
    const resultEntities: EntityNode[] = [];
    const resultEdges: RelationshipEdge[] = [];
    
    const queue: { id: string; depth: number }[] = [{ id: entityId, depth: 0 }];
    visited.add(entityId);
    
    while (queue.length > 0) {
      const { id, depth } = queue.shift()!;
      const entity = this.entities.get(id);
      if (entity && depth > 0) resultEntities.push(entity);
      if (depth >= maxDepth) continue;
      
      const neighbors = this.adjacency.get(id);
      if (neighbors) {
        for (const neighborId of neighbors) {
          if (!visited.has(neighborId)) {
            visited.add(neighborId);
            queue.push({ id: neighborId, depth: depth + 1 });
            
            for (const edge of this.edges.values()) {
              if ((edge.sourceId === id && edge.targetId === neighborId) ||
                  (edge.sourceId === neighborId && edge.targetId === id)) {
                resultEdges.push(edge);
              }
            }
          }
        }
      }
    }
    
    const rootEntity = this.entities.get(entityId);
    if (rootEntity) resultEntities.unshift(rootEntity);
    
    return { entities: resultEntities, edges: resultEdges };
  }

  async findPath(sourceId: string, targetId: string): Promise<EntityNode[]> {
    const visited = new Set<string>();
    const queue: { id: string; path: EntityNode[] }[] = [{ id: sourceId, path: [this.entities.get(sourceId)!].filter(Boolean) }];
    visited.add(sourceId);
    
    while (queue.length > 0) {
      const { id, path } = queue.shift()!;
      if (id === targetId) return path;
      
      const neighbors = this.adjacency.get(id);
      if (neighbors) {
        for (const neighborId of neighbors) {
          if (!visited.has(neighborId)) {
            visited.add(neighborId);
            const neighbor = this.entities.get(neighborId);
            queue.push({ id: neighborId, path: [...path, ...(neighbor ? [neighbor] : [])] });
          }
        }
      }
    }
    return [];
  }

  async searchEntities(query: string, orgId: string, type?: EntityType, limit = 20): Promise<EntityNode[]> {
    const results: EntityNode[] = [];
    const q = query.toLowerCase();
    
    for (const entity of this.entities.values()) {
      if (entity.orgId !== orgId) continue;
      if (type && entity.type !== type) continue;
      if (entity.name.toLowerCase().includes(q)) {
        results.push(entity);
      }
    }
    
    try {
      const dbEntities = await LrmEntity.find({
        orgId, ...(type ? { type } : {}),
        name: { $regex: q, $options: "i" },
      }).limit(limit).lean();
      
      for (const e of dbEntities) {
        if (!this.entities.has(e.id)) {
          results.push({
            id: e.id, type: e.type as EntityType, name: e.name,
            orgId: e.orgId, metadata: e.metadata as Record<string, unknown>,
            embedding: e.embedding || undefined, createdAt: e.createdAt,
          });
        }
      }
    } catch {}
    
    return results.slice(0, limit);
  }

  async getEntity(id: string): Promise<EntityNode | null> {
    return this.entities.get(id) || null;
  }

  async getRelationships(entityId: string): Promise<RelationshipEdge[]> {
    const results: RelationshipEdge[] = [];
    for (const edge of this.edges.values()) {
      if (edge.sourceId === entityId || edge.targetId === entityId) {
        results.push(edge);
      }
    }
    return results;
  }
}
