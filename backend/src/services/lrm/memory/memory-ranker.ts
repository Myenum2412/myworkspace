import { MemoryEntry } from "../types.js";
import { logger } from "../../../lib/logger/index.js";

interface RankingSignal {
  recency: number;
  frequency: number;
  relevance: number;
  userFeedback: number;
  relationshipStrength: number;
}

export class MemoryRanker {
  rank(entries: MemoryEntry[], query?: string): MemoryEntry[] {
    return entries
      .map(e => ({
        entry: e,
        score: this.computeScore(e, query),
      }))
      .sort((a, b) => b.score - a.score)
      .map(({ entry }) => entry);
  }

  private computeScore(entry: MemoryEntry, query?: string): number {
    const signals = this.extractSignals(entry);
    
    const weights = {
      recency: 0.25,
      frequency: 0.20,
      importance: 0.30,
      relevance: query ? 0.25 : 0,
    };
    
    const totalWeight = Object.values(weights).reduce((s, w) => s + w, 0) || 1;
    const recencyScore = signals.recency;
    const frequencyScore = signals.frequency;
    const importanceScore = entry.importance;
    const relevanceScore = query ? signals.relevance : 0;

    return (
      (recencyScore * weights.recency) +
      (frequencyScore * weights.frequency) +
      (importanceScore * weights.importance) +
      (relevanceScore * weights.relevance)
    ) / totalWeight;
  }

  private extractSignals(entry: MemoryEntry): RankingSignal {
    const hoursSinceAccess = (Date.now() - entry.lastAccessedAt.getTime()) / 3600000;
    const recency = Math.max(0, 1 - hoursSinceAccess / 720);
    const frequency = Math.min(1, entry.accessCount / 50);
    
    return {
      recency,
      frequency,
      relevance: 0,
      userFeedback: 0,
      relationshipStrength: 0,
    };
  }

  computeImportanceBoost(currentImportance: number, feedback: "positive" | "negative" | "neutral"): number {
    switch (feedback) {
      case "positive": return Math.min(1, currentImportance + 0.1);
      case "negative": return Math.max(0, currentImportance - 0.05);
      case "neutral": return currentImportance;
    }
  }
}
