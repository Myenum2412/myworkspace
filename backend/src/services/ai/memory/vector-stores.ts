import type { VectorStore, VectorDocument, VectorSearchResult, VectorStoreConfig } from "./vector-store.interface.js";
import { InMemoryVectorStore } from "./vector-store.interface.js";
import { logger } from "../../../lib/logger/index.js";

export class ChromaVectorStore implements VectorStore {
  name = "chroma";
  private baseUrl = "";
  private collectionName = "";
  private dimension = 1536;

  async initialize(config: VectorStoreConfig): Promise<void> {
    this.baseUrl = config.url || "http://localhost:8000";
    this.collectionName = config.collectionName;
    this.dimension = config.dimension || 1536;
    await this.ensureCollection();
  }

  async upsert(documents: VectorDocument[]): Promise<void> {
    const response = await fetch(`${this.baseUrl}/api/v1/collections/${this.collectionName}/upsert`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ids: documents.map((d) => d.id),
        embeddings: documents.map((d) => d.vector),
        metadatas: documents.map((d) => d.metadata),
        documents: documents.map((d) => d.content),
      }),
    });
    if (!response.ok) {
      throw new Error(`ChromaDB upsert failed: ${await response.text()}`);
    }
  }

  async search(query: number[], options?: { topK?: number; filter?: Record<string, unknown> }): Promise<VectorSearchResult[]> {
    const response = await fetch(`${this.baseUrl}/api/v1/collections/${this.collectionName}/query`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query_embeddings: [query],
        n_results: options?.topK || 10,
        where: options?.filter || {},
      }),
    });
    if (!response.ok) {
      throw new Error(`ChromaDB query failed: ${await response.text()}`);
    }
    const data = await response.json();
    return (data.ids?.[0] || []).map((id: string, i: number) => ({
      id,
      content: (data.documents?.[0]?.[i] || ""),
      metadata: (data.metadatas?.[0]?.[i] || {}),
      score: (data.distances?.[0]?.[i] !== undefined ? 1 - data.distances[0][i] : 0),
    }));
  }

  async delete(ids: string[]): Promise<void> {
    await fetch(`${this.baseUrl}/api/v1/collections/${this.collectionName}/delete`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids }),
    });
  }

  async deleteCollection(): Promise<void> {
    await fetch(`${this.baseUrl}/api/v1/collections/${this.collectionName}`, { method: "DELETE" });
  }

  async getStats(): Promise<{ documentCount: number; dimension: number }> {
    try {
      const response = await fetch(`${this.baseUrl}/api/v1/collections/${this.collectionName}`);
      const data = await response.json();
      return { documentCount: data.count || 0, dimension: this.dimension };
    } catch {
      return { documentCount: 0, dimension: this.dimension };
    }
  }

  private async ensureCollection(): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/api/v1/collections`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: this.collectionName, metadata: { "hnsw:space": "cosine" } }),
      });
      if (!response.ok && response.status !== 409) {
        logger.warn({ status: response.status }, "ChromaDB collection creation non-critical");
      }
    } catch (error) {
      logger.warn({ error }, "ChromaDB not available, will use fallback");
    }
  }
}

export class QdrantVectorStore implements VectorStore {
  name = "qdrant";
  private baseUrl = "";
  private apiKey = "";
  private collectionName = "";
  private dimension = 1536;

  async initialize(config: VectorStoreConfig): Promise<void> {
    this.baseUrl = config.url || "http://localhost:6333";
    this.apiKey = config.apiKey || "";
    this.collectionName = config.collectionName;
    this.dimension = config.dimension || 1536;
    await this.ensureCollection();
  }

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (this.apiKey) headers["api-key"] = this.apiKey;
    return headers;
  }

  async upsert(documents: VectorDocument[]): Promise<void> {
    const points = documents.map((doc) => ({
      id: doc.id,
      vector: doc.vector,
      payload: { content: doc.content, ...doc.metadata },
    }));

    const response = await fetch(`${this.baseUrl}/collections/${this.collectionName}/points?wait=true`, {
      method: "PUT",
      headers: this.getHeaders(),
      body: JSON.stringify({ points }),
    });
    if (!response.ok) {
      throw new Error(`Qdrant upsert failed: ${await response.text()}`);
    }
  }

  async search(query: number[], options?: { topK?: number; filter?: Record<string, unknown> }): Promise<VectorSearchResult[]> {
    const body: Record<string, unknown> = {
      vector: query,
      limit: options?.topK || 10,
      with_payload: true,
    };
    if (options?.filter) {
      body.filter = this.buildFilter(options.filter);
    }

    const response = await fetch(`${this.baseUrl}/collections/${this.collectionName}/points/search`, {
      method: "POST",
      headers: this.getHeaders(),
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      throw new Error(`Qdrant search failed: ${await response.text()}`);
    }
    const data = await response.json();
    return (data.result || []).map((r: any) => ({
      id: r.id,
      content: r.payload?.content || "",
      metadata: r.payload || {},
      score: r.score || 0,
    }));
  }

  async delete(ids: string[]): Promise<void> {
    await fetch(`${this.baseUrl}/collections/${this.collectionName}/points/delete`, {
      method: "POST",
      headers: this.getHeaders(),
      body: JSON.stringify({ points: ids }),
    });
  }

  async deleteCollection(): Promise<void> {
    await fetch(`${this.baseUrl}/collections/${this.collectionName}`, { method: "DELETE" });
  }

  async getStats(): Promise<{ documentCount: number; dimension: number }> {
    try {
      const response = await fetch(`${this.baseUrl}/collections/${this.collectionName}`, { headers: this.getHeaders() });
      const data = await response.json();
      return { documentCount: data.result?.points_count || 0, dimension: this.dimension };
    } catch {
      return { documentCount: 0, dimension: this.dimension };
    }
  }

  private async ensureCollection(): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/collections/${this.collectionName}`, {
        method: "PUT",
        headers: this.getHeaders(),
        body: JSON.stringify({
          vectors: { size: this.dimension, distance: "Cosine" },
        }),
      });
      if (!response.ok && response.status !== 409) {
        logger.warn({ status: response.status }, "Qdrant collection creation non-critical");
      }
    } catch (error) {
      logger.warn({ error }, "Qdrant not available, will use fallback");
    }
  }

  private buildFilter(filter: Record<string, unknown>): Record<string, unknown> {
    const must: Array<Record<string, unknown>> = [];
    for (const [key, value] of Object.entries(filter)) {
      must.push({ key, match: { value } });
    }
    return { must };
  }
}

export class PineconeVectorStore implements VectorStore {
  name = "pinecone";
  private baseUrl = "";
  private apiKey = "";
  private dimension = 1536;

  async initialize(config: VectorStoreConfig): Promise<void> {
    this.baseUrl = config.url || "";
    this.apiKey = config.apiKey || "";
    this.dimension = config.dimension || 1536;
  }

  private getHeaders(): Record<string, string> {
    return {
      "Content-Type": "application/json",
      "Api-Key": this.apiKey,
    };
  }

  async upsert(documents: VectorDocument[]): Promise<void> {
    const vectors = documents.map((doc) => ({
      id: doc.id,
      values: doc.vector,
      metadata: { content: doc.content, ...doc.metadata },
    }));

    const response = await fetch(`${this.baseUrl}/vectors/upsert`, {
      method: "POST",
      headers: this.getHeaders(),
      body: JSON.stringify({ vectors }),
    });
    if (!response.ok) throw new Error(`Pinecone upsert failed: ${await response.text()}`);
  }

  async search(query: number[], options?: { topK?: number; filter?: Record<string, unknown> }): Promise<VectorSearchResult[]> {
    const body: Record<string, unknown> = {
      vector: query,
      topK: options?.topK || 10,
      includeMetadata: true,
    };
    if (options?.filter) body.filter = options.filter;

    const response = await fetch(`${this.baseUrl}/query`, {
      method: "POST",
      headers: this.getHeaders(),
      body: JSON.stringify(body),
    });
    if (!response.ok) throw new Error(`Pinecone search failed: ${await response.text()}`);
    const data = await response.json();
    return (data.matches || []).map((m: any) => ({
      id: m.id,
      content: m.metadata?.content || "",
      metadata: m.metadata || {},
      score: m.score || 0,
    }));
  }

  async delete(ids: string[]): Promise<void> {
    await fetch(`${this.baseUrl}/vectors/delete`, {
      method: "POST",
      headers: this.getHeaders(),
      body: JSON.stringify({ ids }),
    });
  }

  async deleteCollection(): Promise<void> {
    await fetch(`${this.baseUrl}/index`, { method: "DELETE" });
  }

  async getStats(): Promise<{ documentCount: number; dimension: number }> {
    try {
      const response = await fetch(`${this.baseUrl}/describe_index_stats`, { headers: this.getHeaders() });
      const data = await response.json();
      return { documentCount: data.totalVectorCount || 0, dimension: this.dimension };
    } catch {
      return { documentCount: 0, dimension: this.dimension };
    }
  }
}

export function createVectorStore(type: string): VectorStore {
  switch (type.toLowerCase()) {
    case "chroma":
    case "chromadb":
      return new ChromaVectorStore();
    case "qdrant":
      return new QdrantVectorStore();
    case "pinecone":
      return new PineconeVectorStore();
    case "milvus":
      logger.warn("Milvus support uses Qdrant-compatible API - ensure Milvus HTTP gateway is enabled");
      return new QdrantVectorStore();
    case "weaviate":
      logger.warn("Weaviate support uses Qdrant-compatible API");
      return new QdrantVectorStore();
    case "pgvector":
      logger.warn("pgvector support uses Qdrant-compatible API - ensure pgvector gateway");
      return new QdrantVectorStore();
    case "memory":
    default:
      return new InMemoryVectorStore();
  }
}
