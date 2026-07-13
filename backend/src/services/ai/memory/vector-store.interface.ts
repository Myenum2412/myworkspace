export interface VectorDocument {
  id: string;
  vector: number[];
  metadata: Record<string, unknown>;
  content: string;
  score?: number;
}

export interface VectorSearchResult {
  id: string;
  content: string;
  metadata: Record<string, unknown>;
  score: number;
}

export interface VectorStoreConfig {
  type: "chroma" | "qdrant" | "milvus" | "pinecone" | "weaviate" | "pgvector" | "memory";
  url?: string;
  apiKey?: string;
  collectionName: string;
  dimension: number;
  metric?: "cosine" | "euclidean" | "dotproduct";
}

export interface VectorStore {
  name: string;
  initialize(config: VectorStoreConfig): Promise<void>;
  upsert(documents: VectorDocument[]): Promise<void>;
  search(query: number[], options?: { topK?: number; filter?: Record<string, unknown> }): Promise<VectorSearchResult[]>;
  delete(ids: string[]): Promise<void>;
  deleteCollection(): Promise<void>;
  getStats(): Promise<{ documentCount: number; dimension: number }>;
}

export class InMemoryVectorStore implements VectorStore {
  name = "memory";
  private documents: Map<string, { vector: number[]; metadata: Record<string, unknown>; content: string }> = new Map();
  private dimension = 1536;

  async initialize(config: VectorStoreConfig): Promise<void> {
    this.dimension = config.dimension || 1536;
  }

  async upsert(documents: VectorDocument[]): Promise<void> {
    for (const doc of documents) {
      this.documents.set(doc.id, { vector: doc.vector, metadata: doc.metadata, content: doc.content });
    }
  }

  async search(query: number[], options?: { topK?: number; filter?: Record<string, unknown> }): Promise<VectorSearchResult[]> {
    const topK = options?.topK || 10;
    const results: VectorSearchResult[] = [];

    for (const [id, doc] of this.documents) {
      if (options?.filter) {
        const matches = Object.entries(options.filter).every(([key, value]) =>
          doc.metadata[key] === value
        );
        if (!matches) continue;
      }

      const score = this.cosineSimilarity(query, doc.vector);
      results.push({ id, content: doc.content, metadata: doc.metadata, score });
    }

    results.sort((a, b) => b.score - a.score);
    return results.slice(0, topK);
  }

  async delete(ids: string[]): Promise<void> {
    for (const id of ids) this.documents.delete(id);
  }

  async deleteCollection(): Promise<void> {
    this.documents.clear();
  }

  async getStats(): Promise<{ documentCount: number; dimension: number }> {
    return { documentCount: this.documents.size, dimension: this.dimension };
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    let dot = 0, na = 0, nb = 0;
    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i];
      na += a[i] * a[i];
      nb += b[i] * b[i];
    }
    if (na === 0 || nb === 0) return 0;
    return dot / (Math.sqrt(na) * Math.sqrt(nb));
  }
}
