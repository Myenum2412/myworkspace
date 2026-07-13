import { DocumentIngestor, documentIngestor } from "../../../src/services/ai/memory/document-ingestor.js";
import { embeddingService } from "../../../src/services/ai/memory/embedding-service.js";

describe("Document Ingestor Integration", () => {
  it("should create ingestor with default settings", () => {
    const ingestor = new DocumentIngestor("memory");
    expect(ingestor).toBeDefined();
    expect(ingestor.getChunker()).toBeDefined();
    expect(ingestor.getVectorStore()).toBeDefined();
  });

  it("should ingest a simple document", async () => {
    const ingestor = new DocumentIngestor("memory");
    const result = await ingestor.ingestDocument({
      id: "test-doc-1",
      content: "This is a test document for ingestion.",
      metadata: {
        source: "test",
        type: "text",
        title: "Test Document",
      },
    }, { generateEmbeddings: false });

    expect(result.chunks).toBe(1);
    expect(result.vectors).toBe(1);
  });

  it("should ingest documents in batch", async () => {
    const ingestor = new DocumentIngestor("memory");
    const result = await ingestor.ingestBatch([
      { id: "batch-1", content: "First batch document.", metadata: { source: "test" } },
      { id: "batch-2", content: "Second batch document.", metadata: { source: "test" } },
    ], { generateEmbeddings: false });

    expect(result.totalChunks).toBe(2);
    expect(result.totalVectors).toBe(2);
  });

  it("should chunk long documents", async () => {
    const ingestor = new DocumentIngestor("memory");
    const longContent = Array(100).fill("This is a paragraph of text that should be long enough to possibly trigger chunking.").join("\n\n");

    const result = await ingestor.ingestDocument({
      id: "long-doc",
      content: longContent,
      metadata: { source: "test" },
    }, { chunkSize: 500, chunkOverlap: 50, generateEmbeddings: false });

    expect(result.chunks).toBeGreaterThan(1);
  });
});

describe("Embedding Service", () => {
  it("should be defined as singleton", () => {
    expect(embeddingService).toBeDefined();
  });

  it("should return dimension from test embedding", async () => {
    const dim = await embeddingService.getEmbeddingDimension();
    expect(typeof dim).toBe("number");
    expect(dim).toBeGreaterThan(0);
  });
});
