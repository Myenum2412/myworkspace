import { GraphStore } from "../knowledge-graph/graph-store.js";
import { EntityNode, EntityType } from "../types.js";
import { getAIProvider } from "../../ai/ai-factory.js";
import { logger } from "../../../lib/logger/index.js";

export class RecommendationService {
  private graphStore: GraphStore;

  constructor(graphStore: GraphStore) {
    this.graphStore = graphStore;
  }

  async getNextBestActions(userId: string, orgId: string): Promise<{ action: string; reason: string; priority: number }[]> {
    const userEntities = await this.graphStore.searchEntities("", orgId, "user", 10);
    const userEntity = userEntities.find(e => e.metadata.userId === userId);
    if (!userEntity) return [];

    const connected = await this.graphStore.findConnected(userEntity.id, 2);
    const actions: { action: string; reason: string; priority: number }[] = [];

    for (const entity of connected.entities) {
      switch (entity.type) {
        case "task":
          if (entity.metadata.status === "pending") {
            actions.push({
              action: `Review pending task: ${entity.name}`,
              reason: "Task requires attention",
              priority: 8,
            });
          }
          break;
        case "project":
          actions.push({
            action: `Check project progress: ${entity.name}`,
            reason: "Stay updated on project status",
            priority: 5,
          });
          break;
        case "client":
          actions.push({
            action: `Review client context: ${entity.name}`,
            reason: "Client relationship requires attention",
            priority: 6,
          });
          break;
      }
    }

    return actions.sort((a, b) => b.priority - a.priority).slice(0, 5);
  }

  async getPredictiveInsights(entityId: string, orgId: string): Promise<{ insight: string; confidence: number; type: string }[]> {
    const entity = await this.graphStore.getEntity(entityId);
    if (!entity) return [];

    const connected = await this.graphStore.findConnected(entityId, 2);
    const insights: { insight: string; confidence: number; type: string }[] = [];

    const relationshipCount = connected.edges.length;
    const entityCount = connected.entities.length;

    if (entity.type === "client" && relationshipCount > 5) {
      insights.push({
        insight: `High engagement client with ${relationshipCount} active relationships`,
        confidence: 0.8,
        type: "engagement",
      });
    }

    if (entity.type === "project" && entityCount > 3) {
      insights.push({
        insight: `Project involves ${entityCount - 1} related entities - consider coordination overhead`,
        confidence: 0.6,
        type: "complexity",
      });
    }

    try {
      const provider = getAIProvider();
      const entityInfo = `Entity: ${entity.type} "${entity.name}" with ${relationshipCount} relationships to ${entityCount} other entities.`;
      
      const response = await provider.complete({
        messages: [
          {
            role: "system",
            content: "Generate predictive insights about this entity based on its relationship patterns. Return each insight as JSON array.",
          },
          { role: "user", content: entityInfo },
        ],
        config: {
          apiKey: process.env.OPENROUTER_API_KEY || "",
          model: process.env.OPENROUTER_MODEL || "tencent/hy3:free",
          temperature: 0.3,
          maxTokens: 300,
          responseLength: "medium",
          systemPrompt: "",
          streamingEnabled: false,
        },
      });

      const jsonMatch = response.content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        if (Array.isArray(parsed)) {
          for (const item of parsed) {
            if (item.insight && item.confidence) {
              insights.push(item);
            }
          }
        }
      }
    } catch {}

    return insights;
  }
}
