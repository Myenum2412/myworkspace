import { CouncilOrchestrator } from "./council/council-orchestrator.js";
import { VectorStore } from "./memory/vector-store.js";
import { ShortTermMemory } from "./memory/short-term-memory.js";
import { LongTermMemory } from "./memory/long-term-memory.js";
import { EpisodicMemory } from "./memory/episodic-memory.js";
import { MemoryRanker } from "./memory/memory-ranker.js";
import { EmbeddingService } from "./memory/embedding.service.js";
import { RAGPipeline } from "./rag/rag-pipeline.js";
import { DocumentChunker } from "./rag/chunker.service.js";
import { CitationService } from "./rag/citation.service.js";
import { KnowledgeGraphService } from "./knowledge-graph/graph.service.js";
import { GraphStore } from "./knowledge-graph/graph-store.js";
import { ReasoningEngine } from "./reasoning/reasoning-engine.js";
import { SelfReflection } from "./reasoning/self-reflection.js";
import { LearningPipeline } from "./learning/learning-pipeline.js";
import { UserProfiler } from "./learning/user-profiler.js";
import { RelationshipIntelligence } from "./relationship-intelligence/relationship.service.js";
import { RecommendationService } from "./relationship-intelligence/recommendation.service.js";
import { LRMQuery, CouncilVerdict, EntityType } from "./types.js";
import { getAIProvider } from "../ai/ai-factory.js";
import { LrmMemory } from "../../lib/db/models/LrmMemory.js";
import { logger } from "../../lib/logger/index.js";

export class LRMService {
  public council: CouncilOrchestrator;
  public vectorStore: VectorStore;
  public stm: ShortTermMemory;
  public ltm: LongTermMemory;
  public episodicMemory: EpisodicMemory;
  public memoryRanker: MemoryRanker;
  public embeddingService: EmbeddingService;
  public rag: RAGPipeline;
  public chunker: DocumentChunker;
  public citations: CitationService;
  public kgService: KnowledgeGraphService;
  public graphStore: GraphStore;
  public reasoning: ReasoningEngine;
  public reflection: SelfReflection;
  public learning: LearningPipeline;
  public profiler: UserProfiler;
  public relationshipIntelligence: RelationshipIntelligence;
  public recommendations: RecommendationService;
  constructor() {
    this.vectorStore = new VectorStore();
    this.graphStore = new GraphStore();
    this.stm = new ShortTermMemory();
    this.ltm = new LongTermMemory(this.vectorStore);
    this.episodicMemory = new EpisodicMemory();
    this.memoryRanker = new MemoryRanker();
    this.embeddingService = new EmbeddingService();
    this.rag = new RAGPipeline(this.vectorStore);
    this.chunker = new DocumentChunker();
    this.citations = new CitationService();
    this.kgService = new KnowledgeGraphService(this.graphStore);
    this.reasoning = new ReasoningEngine();
    this.reflection = new SelfReflection();
    this.learning = new LearningPipeline();
    this.profiler = new UserProfiler();
    this.relationshipIntelligence = new RelationshipIntelligence(this.graphStore, this.kgService);
    this.recommendations = new RecommendationService(this.graphStore);
    this.council = new CouncilOrchestrator();
  }

  async query(query: LRMQuery): Promise<{
    response: string;
    sources: string[];
    confidence: number;
    trace?: Record<string, unknown>;
  }> {
    const startTime = Date.now();
    const useRag = query.options?.useRag !== false;
    const useCouncil = query.options?.useCouncil !== false;
    const useMemory = query.options?.useMemory !== false;

    let retrievedContext = "";
    let councilVerdict: CouncilVerdict | null = null;
    let reasoningTrace = null;

    // Phase 1: Retrieve relevant context (RAG + Memory)
    if (useMemory) {
      const relevantMemories = await this.stm.recall(query.orgId, query.userId, undefined, 5);
      const recentSession = await this.episodicMemory.recallRecentEpisode(query.orgId, query.userId);
      if (recentSession) {
        retrievedContext += `\nRecent session context: ${recentSession.summary}\n`;
      }
      const ranked = this.memoryRanker.rank(relevantMemories, query.query);
      for (const mem of ranked.slice(0, 3)) {
        retrievedContext += `\nRelated memory: ${mem.content.substring(0, 300)}\n`;
      }
    }

    if (useRag) {
      try {
        const ragResults = await this.rag.search(query.query, query.orgId, 3);
        if (ragResults.length > 0) {
          retrievedContext += "\nRetrieved knowledge:\n";
          for (const r of ragResults) {
            retrievedContext += `- ${r.content.substring(0, 300)}\n`;
          }
        }
      } catch (err) {
        logger.warn({ err }, "RAG search failed");
      }
    }

    // Phase 2: Council deliberation for complex queries
    if (useCouncil && this.isComplexQuery(query.query)) {
      try {
        councilVerdict = await this.council.deliberate({
          mode: "quick",
          problem: query.query,
          context: { userId: query.userId, orgId: query.orgId, ...query.context },
          userId: query.userId,
          orgId: query.orgId,
        });
      } catch (err) {
        logger.warn({ err }, "Council deliberation failed");
      }
    }

    // Phase 3: Reasoning
    try {
      if (councilVerdict) {
        reasoningTrace = await this.reasoning.reasonWithCouncil(query.query, councilVerdict);
      } else {
        reasoningTrace = await this.reasoning.reason(query.query, { retrievedContext });
      }
    } catch (err) {
      logger.warn({ err }, "Reasoning failed");
    }

    // Phase 4: Generate response
    const response = await this.generateResponse(query, retrievedContext, councilVerdict, reasoningTrace);

    // Phase 5: Self-reflection
    let finalResponse = response;
    try {
      const reflection = await this.reflection.reflect(response, query.query);
      if (reflection.score < 0.4 && reflection.issues.length > 0) {
        finalResponse = await this.reflection.correctErrors(response, reflection.issues);
      }
    } catch {}

    // Phase 6: Store in memory
    try {
      await this.stm.store({
        orgId: query.orgId, userId: query.userId,
        tier: "short-term", content: `Q: ${query.query}\nA: ${finalResponse.substring(0, 500)}`,
        metadata: { type: "query_response", executionMs: Date.now() - startTime },
        importance: 0.5,
      });
    } catch {}

    const confidence = reasoningTrace?.confidence || 0.5;

    return {
      response: finalResponse,
      sources: councilVerdict ? councilVerdict.keyInsights : [],
      confidence,
      trace: reasoningTrace ? {
        steps: reasoningTrace.steps.length,
        contradictions: reasoningTrace.contradictions.length,
        confidence: reasoningTrace.confidence,
      } : undefined,
    };
  }

  async indexFile(fileId: string, content: string, source: string, orgId: string): Promise<void> {
    await this.rag.indexDocument(content, source, orgId);
    try {
      const extracted = await this.kgService.extractEntitiesFromText(content, orgId);
      for (const entity of extracted.entities) {
        await this.graphStore.addEntity(entity);
      }
      for (const rel of extracted.relationships) {
        await this.graphStore.addRelationship(rel);
      }
    } catch (err) {
      logger.warn({ err, fileId }, "Entity extraction from file failed");
    }
  }

  async discoverAndLink(orgId: string): Promise<{ entities: number; relationships: number }> {
    const relCount = await this.kgService.autoDiscoverRelationships(orgId);
    return { entities: this.graphStore["entities"].size, relationships: relCount };
  }

  async consolidateMemories(orgId: string, userId: string): Promise<void> {
    await this.stm.consolidate(orgId, userId);
    await this.ltm.prune(orgId);
  }

  private isComplexQuery(query: string): boolean {
    const complexIndicators = [
      "compare", "analyze", "evaluate", "recommend", "should", "why",
      "what if", "scenario", "risk", "tradeoff", "strategy", "plan",
      "debate", "pros and cons", "alternative",
    ];
    const lowerQuery = query.toLowerCase();
    return complexIndicators.some(i => lowerQuery.includes(i)) || query.split(" ").length > 20;
  }

  private async generateResponse(
    query: LRMQuery, context: string,
    verdict: CouncilVerdict | null, trace: any
  ): Promise<string> {
    try {
      const provider = getAIProvider();
      const systemPrompt = `You are the MyWorkspace AI Learning Relationship Manager. You have access to organizational knowledge, memory, and multi-agent deliberation. Provide accurate, contextual responses.

${context ? `## Context\n${context}\n` : ""}
${verdict ? `## Council Analysis\nConsensus: ${verdict.consensusLevel}\nConfidence: ${(verdict.confidence * 100).toFixed(0)}%\nKey Insights: ${verdict.keyInsights.join("\n")}\n` : ""}
${trace ? `## Reasoning\nConfidence: ${(trace.confidence * 100).toFixed(0)}%\n` : ""}`;

      const response = await provider.complete({
        messages: [
          { role: "system", content: systemPrompt },
          ...(query.context?.conversationId ? await this.getConversationContext(query.context.conversationId) : []),
          { role: "user", content: query.query },
        ],
        config: {
          apiKey: process.env.OPENROUTER_API_KEY || "",
          model: process.env.OPENROUTER_MODEL || "tencent/hy3:free",
          temperature: query.options?.temperature || 0.3,
          maxTokens: 1500,
          responseLength: "medium",
          systemPrompt: "",
          streamingEnabled: false,
        },
      });

      return response.content;
    } catch (err) {
      logger.warn({ err }, "Response generation failed");
      return "I'm unable to generate a response at this time. Please try again.";
    }
  }

  private async getConversationContext(conversationId: string): Promise<{ role: "system" | "user" | "assistant"; content: string }[]> {
    try {
      const { AiMessage } = await import("../../lib/db/models/AiMessage.js");
      const messages = await AiMessage.find({ conversationId })
        .sort({ createdAt: -1 })
        .limit(10)
        .lean();
      return messages.reverse().map(m => ({
        role: m.role,
        content: m.content,
      }));
    } catch {
      return [];
    }
  }
}
