import { GraphStore } from "./graph-store.js";
import { EntityType, EntityNode, RelationshipEdge } from "../types.js";
import { getAIProvider } from "../../ai/ai-factory.js";
import { logger } from "../../../lib/logger/index.js";

export class KnowledgeGraphService {
  private graphStore: GraphStore;

  constructor(graphStore: GraphStore) {
    this.graphStore = graphStore;
  }

  async extractEntitiesFromText(text: string, orgId: string): Promise<{ entities: EntityNode[]; relationships: RelationshipEdge[] }> {
    try {
      const provider = getAIProvider();
      const response = await provider.complete({
        messages: [
          {
            role: "system",
            content: "Extract entities and their relationships from the text. Return as a JSON object with 'entities' (array of {name, type}) and 'relationships' (array of {source, target, relationship}). Entity types: user, project, task, file, client, team, organization, conversation, document.",
          },
          { role: "user", content: text },
        ],
        config: {
          apiKey: process.env.OPENROUTER_API_KEY || "",
          model: process.env.OPENROUTER_MODEL || "tencent/hy3:free",
          temperature: 0.1,
          maxTokens: 1000,
          responseLength: "medium",
          systemPrompt: "",
          streamingEnabled: false,
        },
      });
      
      return this.parseExtractionResponse(response.content, orgId);
    } catch (err) {
      logger.warn({ err }, "AI entity extraction failed, using fallback");
      return this.fallbackExtraction(text, orgId);
    }
  }

  private parseExtractionResponse(content: string, orgId: string): { entities: EntityNode[]; relationships: RelationshipEdge[] } {
    const entities: EntityNode[] = [];
    const relationships: RelationshipEdge[] = [];
    
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) return { entities, relationships };
      
      const parsed = JSON.parse(jsonMatch[0]);
      const entityMap = new Map<string, string>();
      
      if (Array.isArray(parsed.entities)) {
        for (const e of parsed.entities) {
          if (e.name && e.type) {
            const id = `extracted-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
            entityMap.set(e.name, id);
            entities.push({
              id, type: e.type as EntityType, name: e.name,
              orgId, metadata: { source: "extraction" }, createdAt: new Date(),
            });
          }
        }
      }
      
      if (Array.isArray(parsed.relationships)) {
        for (const r of parsed.relationships) {
          const sourceId = entityMap.get(r.source) || r.source;
          const targetId = entityMap.get(r.target) || r.target;
          if (sourceId && targetId && r.relationship) {
            relationships.push({
              id: `rel-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
              sourceId, sourceType: "document",
              targetId, targetType: "document",
              relationship: r.relationship, strength: 0.5,
              metadata: {}, orgId, createdAt: new Date(),
            });
          }
        }
      }
    } catch {
      logger.warn("Failed to parse entity extraction response");
    }
    
    return { entities, relationships };
  }

  private fallbackExtraction(text: string, orgId: string): { entities: EntityNode[]; relationships: RelationshipEdge[] } {
    const entities: EntityNode[] = [];
    const relationships: RelationshipEdge[] = [];
    
    const patterns: { regex: RegExp; type: EntityType }[] = [
      { regex: /project:?\s*["']?([^"',.\n]+)/gi, type: "project" },
      { regex: /task:?\s*["']?([^"',.\n]+)/gi, type: "task" },
      { regex: /client:?\s*["']?([^"',.\n]+)/gi, type: "client" },
      { regex: /team:?\s*["']?([^"',.\n]+)/gi, type: "team" },
      { regex: /file:?\s*["']?([^"',.\n]+)/gi, type: "file" },
    ];
    
    const seen = new Set<string>();
    for (const { regex, type } of patterns) {
      const matches = text.matchAll(regex);
      for (const match of matches) {
        const name = match[1].trim();
        if (name && !seen.has(name)) {
          seen.add(name);
          entities.push({
            id: `extracted-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            type, name, orgId, metadata: { source: "fallback-extraction" }, createdAt: new Date(),
          });
        }
      }
    }
    
    return { entities, relationships };
  }

  async autoDiscoverRelationships(orgId: string): Promise<number> {
    try {
      const existingEntities = await this.graphStore.searchEntities("", orgId);
      let relationshipCount = 0;
      
      for (let i = 0; i < existingEntities.length; i++) {
        for (let j = i + 1; j < existingEntities.length; j++) {
          const a = existingEntities[i];
          const b = existingEntities[j];
          const discovered = this.inferRelationship(a, b);
          if (discovered) {
            await this.graphStore.addRelationship(discovered);
            relationshipCount++;
          }
        }
      }
      
      logger.info({ orgId, relationshipCount }, "Auto-discovered relationships");
      return relationshipCount;
    } catch (err) {
      logger.warn({ err, orgId }, "Relationship auto-discovery failed");
      return 0;
    }
  }

  private inferRelationship(a: EntityNode, b: EntityNode): Omit<RelationshipEdge, "id" | "createdAt"> | null {
    const typePairs: Record<string, string> = {
      "user:project": "works_on",
      "user:task": "assigned_to",
      "user:client": "manages",
      "user:team": "belongs_to",
      "project:task": "contains",
      "project:client": "belongs_to",
      "project:file": "has_document",
      "task:file": "attached_to",
      "client:file": "owns",
      "team:project": "assigned_to",
    };
    
    const key = `${a.type}:${b.type}`;
    const reverseKey = `${b.type}:${a.type}`;
    const rel = typePairs[key] || typePairs[reverseKey];
    
    if (rel) {
      const [source, target] = typePairs[key] ? [a, b] : [b, a];
      return {
        sourceId: source.id, sourceType: source.type,
        targetId: target.id, targetType: target.type,
        relationship: rel, strength: 0.5,
        metadata: { discovered: true },
        orgId: a.orgId,
      };
    }
    
    return null;
  }
}
