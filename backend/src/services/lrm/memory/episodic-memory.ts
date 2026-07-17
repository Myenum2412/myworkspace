import { LrmMemory } from "../../../lib/db/models/LrmMemory.js";
import { MemoryEntry } from "../types.js";
import { EmbeddingService } from "./embedding.service.js";
import { v4 as uuid } from "uuid";
import { logger } from "../../../lib/logger/index.js";

interface Episode {
  id: string;
  orgId: string;
  userId: string;
  title: string;
  summary: string;
  events: { timestamp: Date; action: string; context: string }[];
  embedding?: number[];
  importance: number;
  startTime: Date;
  endTime: Date;
  tags: string[];
}

export class EpisodicMemory {
  private embeddingService: EmbeddingService;

  constructor() {
    this.embeddingService = new EmbeddingService();
  }

  async recordEpisode(episode: Omit<Episode, "id">): Promise<string> {
    const id = uuid();
    const summaryText = `${episode.title}: ${episode.summary} ${episode.events.map(e => e.action).join(" ")}`;
    const embedding = await this.embeddingService.generate(summaryText);

    try {
      await LrmMemory.create({
        id, orgId: episode.orgId, userId: episode.userId,
        tier: "episodic", content: summaryText,
        embedding,
        metadata: {
          title: episode.title,
          events: episode.events,
          startTime: episode.startTime,
          endTime: episode.endTime,
          tags: episode.tags,
          type: "episode",
        },
        importance: episode.importance,
        accessCount: 0, lastAccessedAt: new Date(),
        createdAt: new Date(), expiresAt: null,
      });
    } catch (err) {
      logger.warn({ err, id }, "Failed to persist episodic memory");
    }
    return id;
  }

  async recallEpisodes(orgId: string, userId: string, query?: string, limit = 10): Promise<Episode[]> {
    const filter: Record<string, unknown> = { orgId, userId, tier: "episodic" };
    if (query) {
      filter.content = { $regex: query, $options: "i" };
    }
    try {
      const docs = await LrmMemory.find(filter)
        .sort({ importance: -1, createdAt: -1 })
        .limit(limit).lean();
      return docs.map(d => {
        const meta = d.metadata as Record<string, unknown>;
        return {
          id: d.id, orgId: d.orgId, userId: d.userId || "",
          title: (meta.title as string) || "",
          summary: d.content,
          events: (meta.events as Episode["events"]) || [],
          importance: d.importance,
          startTime: new Date(meta.startTime as string) || d.createdAt,
          endTime: new Date(meta.endTime as string) || d.createdAt,
          tags: (meta.tags as string[]) || [],
        };
      });
    } catch { return []; }
  }

  async recallRecentEpisode(orgId: string, userId: string): Promise<Episode | null> {
    const episodes = await this.recallEpisodes(orgId, userId, undefined, 1);
    return episodes[0] || null;
  }
}
