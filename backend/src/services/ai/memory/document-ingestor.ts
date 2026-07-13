import { embeddingService } from "./embedding-service.js";
import { createVectorStore, type VectorStoreInstance } from "./vector-stores.js";
import type { VectorDocument } from "./vector-store.interface.js";
import { logger } from "../../../lib/logger/index.js";

export interface ChunkingStrategy {
  chunk(text: string, options?: ChunkOptions): ChunkResult[];
}

export interface ChunkOptions {
  chunkSize?: number;
  chunkOverlap?: number;
  separators?: string[];
}

export interface ChunkResult {
  content: string;
  metadata: Record<string, unknown>;
  index: number;
}

export class RecursiveCharacterChunker implements ChunkingStrategy {
  chunk(text: string, options: ChunkOptions = {}): ChunkResult[] {
    const { chunkSize = 1000, chunkOverlap = 200, separators = ["\n\n", "\n", ".", " ", ""] } = options;
    const chunks: ChunkResult[] = [];
    const texts = [text];

    for (const separator of separators) {
      if (separator === "") {
        // Character-level splitting
        for (let i = 0; i < texts.length; i++) {
          if (texts[i].length > chunkSize) {
            const parts = this.splitByCharacters(texts[i], chunkSize, chunkOverlap);
            texts.splice(i, 1, ...parts);
          }
        }
        break;
      }

      let changed = false;
      for (let i = 0; i < texts.length; i++) {
        if (texts[i].length > chunkSize) {
          const parts = texts[i].split(separator);
          texts.splice(i, 1, ...parts);
          changed = true;
        }
      }
      if (!changed) break;
    }

    let index = 0;
    for (const t of texts) {
      if (t.trim()) {
        chunks.push({ content: t.trim(), metadata: {}, index: index++ });
      }
    }

    return chunks;
  }

  private splitByCharacters(text: string, chunkSize: number, overlap: number): string[] {
    const chunks: string[] = [];
    let start = 0;
    while (start < text.length) {
      const end = Math.min(start + chunkSize, text.length);
      chunks.push(text.slice(start, end));
      start += chunkSize - overlap;
    }
    return chunks;
  }
}

export interface Document {
  id: string;
  content: string;
  metadata: {
    source?: string;
    type?: string;
    title?: string;
    createdAt?: Date;
    updatedAt?: Date;
    tags?: string[];
    [key: string]: unknown;
  };
}

export interface IngestOptions {
  chunkSize?: number;
  chunkOverlap?: number;
  generateEmbeddings?: boolean;
  storeOriginal?: boolean;
  namespace?: string;
}

export class DocumentIngestor {
  private chunker: ChunkingStrategy;
  private vectorStore: VectorStoreInstance;
  private initialized = false;

  constructor(vectorStoreType?: string) {
    this.chunker = new RecursiveCharacterChunker();
    const storeType = vectorStoreType || process.env.VECTOR_STORE_TYPE || "memory";
    this.vectorStore = createVectorStore(storeType);
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;
    const dimension = await embeddingService.getEmbeddingDimension();
    await this.vectorStore.initialize({
      type: (process.env.VECTOR_STORE_TYPE || "memory") as any,
      url: process.env.VECTOR_STORE_URL,
      apiKey: process.env.VECTOR_STORE_API_KEY,
      collectionName: process.env.VECTOR_STORE_COLLECTION || "myworkspace_docs",
      dimension,
    });
    this.initialized = true;
  }

  async ingestDocument(document: Document, options: IngestOptions = {}): Promise<{ chunks: number; vectors: number }> {
    await this.initialize();

    const chunks = this.chunker.chunk(document.content, {
      chunkSize: options.chunkSize,
      chunkOverlap: options.chunkOverlap,
    });

    const namespace = options.namespace || "default";
    const vectorDocs: VectorDocument[] = [];

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const metadata = {
        ...document.metadata,
        ...chunk.metadata,
        source: document.metadata.source || "unknown",
        type: document.metadata.type || "text",
        namespace,
        chunkIndex: i,
        totalChunks: chunks.length,
        documentId: document.id,
        ingestedAt: new Date().toISOString(),
      };

      let vector: number[] = [];
      if (options.generateEmbeddings !== false) {
        try {
          vector = await embeddingService.embed(chunk.content);
        } catch (error) {
          logger.warn({ error, chunkIndex: i }, "Embedding generation failed for chunk");
          vector = new Array(1536).fill(0);
        }
      }

      vectorDocs.push({
        id: `${document.id}_chunk_${i}`,
        vector,
        metadata,
        content: chunk.content,
      });
    }

    await this.vectorStore.upsert(vectorDocs);

    logger.info({
      documentId: document.id,
      chunks: chunks.length,
      vectors: vectorDocs.length,
      namespace,
    }, "Document ingested successfully");

    return { chunks: chunks.length, vectors: vectorDocs.length };
  }

  async ingestBatch(documents: Document[], options: IngestOptions = {}): Promise<{ totalChunks: number; totalVectors: number }> {
    let totalChunks = 0;
    let totalVectors = 0;

    for (const doc of documents) {
      const result = await this.ingestDocument(doc, options);
      totalChunks += result.chunks;
      totalVectors += result.vectors;
    }

    return { totalChunks, totalVectors };
  }

  async search(
    query: string,
    options?: { topK?: number; filter?: Record<string, unknown>; namespace?: string }
  ): Promise<Array<{ content: string; metadata: Record<string, unknown>; score: number; source: string }>> {
    await this.initialize();

    const queryVector = await embeddingService.embed(query);
    const filter: Record<string, unknown> = { ...options?.filter };
    if (options?.namespace) {
      filter.namespace = options.namespace;
    }

    const results = await this.vectorStore.search(queryVector, {
      topK: options?.topK || 10,
      filter: Object.keys(filter).length > 0 ? filter : undefined,
    });

    return results.map((r) => ({
      content: r.content,
      metadata: r.metadata,
      score: r.score,
      source: (r.metadata.source as string) || "unknown",
    }));
  }

  async hybridSearch(
    query: string,
    keywordQuery?: string,
    options?: { topK?: number; filter?: Record<string, unknown> }
  ): Promise<Array<{ content: string; metadata: Record<string, unknown>; score: number; source: string }>> {
    const semanticResults = await this.search(query, options);
    return semanticResults;
  }

  async deleteDocument(documentId: string): Promise<void> {
    await this.initialize();
    const prefix = `${documentId}_chunk_`;
    try {
      const stats = await this.vectorStore.getStats();
      if (stats.documentCount > 0) {
        logger.info({ documentId, action: "delete_marked" }, "Document deletion requested");
      }
    } catch {
      // Best effort
    }
  }

  getVectorStore() {
    return this.vectorStore;
  }

  getChunker() {
    return this.chunker;
  }
}

export const documentIngestor = new DocumentIngestor();
