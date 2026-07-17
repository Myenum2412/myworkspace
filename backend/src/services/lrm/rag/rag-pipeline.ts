import { DocumentChunker } from "./chunker.service.js";
import { EmbeddingService } from "../memory/embedding.service.js";
import { VectorStore } from "../memory/vector-store.js";
import { LrmChunk } from "../../../lib/db/models/LrmChunk.js";
import { ChunkedDocument, SearchResult } from "../types.js";
import { getAIProvider } from "../../ai/ai-factory.js";
import { logger } from "../../../lib/logger/index.js";

export class RAGPipeline {
  private chunker: DocumentChunker;
  private embeddingService: EmbeddingService;
  private vectorStore: VectorStore;

  constructor(vectorStore: VectorStore) {
    this.chunker = new DocumentChunker();
    this.embeddingService = new EmbeddingService();
    this.vectorStore = vectorStore;
  }

  async indexDocument(content: string, source: string, orgId: string): Promise<string[]> {
    const chunks = this.chunker.chunk(content, source, orgId);
    const chunkIds: string[] = [];

    for (const chunk of chunks) {
      const embedding = await this.embeddingService.generate(chunk.content);
      
      try {
        await LrmChunk.create({
          ...chunk,
          embedding,
          createdAt: new Date(),
        });
      } catch (err) {
        logger.warn({ err, source }, "Failed to persist chunk");
      }

      await this.vectorStore.index(
        chunk.id,
        chunk.content,
        { orgId, source, chunkIndex: chunk.metadata.chunkIndex, documentId: chunk.documentId }
      );
      
      chunkIds.push(chunk.id);
    }

    logger.info({ source, chunks: chunks.length }, "Document indexed for RAG");
    return chunkIds;
  }

  async search(query: string, orgId: string, topK = 5): Promise<SearchResult[]> {
    const vectorResults = await this.vectorStore.searchHybrid(query, topK * 2, orgId);

    const results: SearchResult[] = [];
    for (const vr of vectorResults) {
      try {
        const chunk = await LrmChunk.findOne({ id: vr.id }).lean();
        if (chunk) {
          results.push({
            chunkId: chunk.id,
            content: chunk.content,
            score: vr.score || 0,
            source: chunk.metadata.source,
            metadata: chunk.metadata as Record<string, unknown>,
            citations: [`${chunk.metadata.source}#chunk${chunk.metadata.chunkIndex}`],
          });
        }
      } catch {}
    }

    return results.sort((a, b) => b.score - a.score).slice(0, topK);
  }

  async queryWithContext(
    query: string,
    orgId: string,
    systemPrompt?: string
  ): Promise<{ response: string; citations: string[]; context: string }> {
    const searchResults = await this.search(query, orgId);
    const context = searchResults.map(r => r.content).join("\n\n---\n\n");
    const citations = searchResults.flatMap(r => r.citations || []);

    try {
      const provider = getAIProvider();
      const response = await provider.complete({
        messages: [
          {
            role: "system",
            content: systemPrompt || `You are an AI assistant with access to retrieved context. Answer the user's question based on the provided context. Cite your sources when possible. If the context doesn't contain enough information, say so clearly.

Context:
${context}`,
          },
          { role: "user", content: query },
        ],
        config: {
          apiKey: process.env.OPENROUTER_API_KEY || "",
          model: process.env.OPENROUTER_MODEL || "tencent/hy3:free",
          temperature: 0.3,
          maxTokens: 1000,
          responseLength: "medium",
          systemPrompt: "",
          streamingEnabled: false,
        },
      });

      return { response: response.content, citations, context };
    } catch (err) {
      logger.warn({ err }, "RAG query failed");
      return { response: "I'm unable to retrieve contextual information at this time.", citations, context };
    }
  }

  async deleteDocumentChunks(documentId: string): Promise<void> {
    try {
      const chunks = await LrmChunk.find({ documentId }).lean();
      for (const chunk of chunks) {
        await this.vectorStore.delete(chunk.id);
      }
      await LrmChunk.deleteMany({ documentId });
    } catch (err) {
      logger.warn({ err, documentId }, "Failed to delete document chunks");
    }
  }
}
