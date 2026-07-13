import { EnhancedMemoryManager, enhancedMemoryManager } from "../../../src/services/ai/memory/enhanced-memory-manager.js";
import { InMemoryVectorStore } from "../../../src/services/ai/memory/vector-store.interface.js";
import { RecursiveCharacterChunker } from "../../../src/services/ai/memory/document-ingestor.js";

describe("Enhanced Memory System", () => {
  beforeEach(() => {
    const manager = EnhancedMemoryManager.getInstance();
    manager.clearWorkingMemory("test-user");
  });

  describe("Working Memory", () => {
    it("should store and retrieve working memory", () => {
      enhancedMemoryManager.addToWorkingMemory("test-user", {
        content: "User mentioned they like dogs",
        type: "semantic",
        importance: "medium",
        source: "conversation",
        userId: "test-user",
        tags: ["preference"],
        score: 0.8,
        metadata: {},
      });

      const memories = enhancedMemoryManager.getWorkingMemory("test-user");
      expect(memories).toHaveLength(1);
      expect(memories[0].content).toBe("User mentioned they like dogs");
    });

    it("should limit working memory to 50 entries", () => {
      for (let i = 0; i < 60; i++) {
        enhancedMemoryManager.addToWorkingMemory("test-user", {
          content: `Memory ${i}`,
          type: "semantic",
          importance: "low",
          source: "test",
          userId: "test-user",
          tags: [],
          score: 0.1,
          metadata: {},
        });
      }

      const memories = enhancedMemoryManager.getWorkingMemory("test-user");
      expect(memories.length).toBeLessThanOrEqual(50);
    });

    it("should sort working memory by score", () => {
      for (let i = 0; i < 5; i++) {
        enhancedMemoryManager.addToWorkingMemory("test-user", {
          content: `Low importance ${i}`,
          type: "semantic",
          importance: "low",
          source: "test",
          userId: "test-user",
          tags: [],
          score: 0.1,
          metadata: {},
        });
      }

      enhancedMemoryManager.addToWorkingMemory("test-user", {
        content: "Critical item",
        type: "semantic",
        importance: "critical",
        source: "test",
        userId: "test-user",
        tags: [],
        score: 1.0,
        metadata: {},
      });

      const memories = enhancedMemoryManager.getWorkingMemory("test-user");
      expect(memories[0].content).toBe("Critical item");
    });
  });

  describe("Episodic Memory", () => {
    it("should calculate importance for critical content", () => {
      const importance = (enhancedMemoryManager as any).calculateImportance("CRITICAL: Payment failed for user order");
      expect(importance).toBe("critical");
    });

    it("should calculate importance for normal content", () => {
      const importance = (enhancedMemoryManager as any).calculateImportance("User asked about business hours");
      expect(importance).toBe("low");
    });

    it("should calculate importance for long content as medium", () => {
      const importance = (enhancedMemoryManager as any).calculateImportance("a".repeat(250));
      expect(importance).toBe("medium");
    });
  });

  describe("Memory Retrieval", () => {
    it("should return working memory for empty query", async () => {
      enhancedMemoryManager.addToWorkingMemory("test-user", {
        content: "Test memory",
        type: "semantic",
        importance: "medium",
        source: "test",
        userId: "test-user",
        tags: [],
        score: 0.8,
        metadata: {},
      });

      const results = await enhancedMemoryManager.retrieveRelevantMemories({
        userId: "test-user",
        query: "",
        useSemanticSearch: false,
      });

      expect(results.length).toBeGreaterThanOrEqual(1);
    });

    it("should handle clear user data gracefully", async () => {
      enhancedMemoryManager.addToWorkingMemory("test-user", {
        content: "Something to clear",
        type: "semantic",
        importance: "low",
        source: "test",
        userId: "test-user",
        tags: [],
        score: 0.1,
        metadata: {},
      });

      await enhancedMemoryManager.clearUserData("test-user");
      const memories = enhancedMemoryManager.getWorkingMemory("test-user");
      expect(memories).toHaveLength(0);
    });
  });
});

describe("Vector Store", () => {
  it("should store and search documents", async () => {
    const store = new InMemoryVectorStore();
    await store.initialize({ type: "memory", collectionName: "test", dimension: 4 });

    await store.upsert([
      { id: "1", vector: [1, 0, 0, 0], metadata: { type: "test" }, content: "First document" },
      { id: "2", vector: [0, 1, 0, 0], metadata: { type: "test" }, content: "Second document" },
    ]);

    const results = await store.search([1, 0, 0, 0], { topK: 1 });
    expect(results).toHaveLength(1);
    expect(results[0].content).toBe("First document");
  });

  it("should filter by metadata", async () => {
    const store = new InMemoryVectorStore();
    await store.initialize({ type: "memory", collectionName: "test", dimension: 2 });

    await store.upsert([
      { id: "1", vector: [1, 0], metadata: { type: "a", userId: "1" }, content: "Doc A1" },
      { id: "2", vector: [0, 1], metadata: { type: "b", userId: "1" }, content: "Doc B1" },
      { id: "3", vector: [0.9, 0.1], metadata: { type: "a", userId: "2" }, content: "Doc A2" },
    ]);

    const results = await store.search([1, 0], { topK: 10, filter: { userId: "1" } });
    expect(results.length).toBe(2);
    results.forEach((r) => expect(r.metadata.userId).toBe("1"));
  });

  it("should return stats", async () => {
    const store = new InMemoryVectorStore();
    await store.initialize({ type: "memory", collectionName: "test", dimension: 128 });
    const stats = await store.getStats();
    expect(stats.dimension).toBe(128);
    expect(typeof stats.documentCount).toBe("number");
  });
});

describe("Document Chunker", () => {
  const chunker = new RecursiveCharacterChunker();

  it("should split text into chunks", () => {
    const text = "First paragraph.\n\nSecond paragraph.\n\nThird paragraph.";
    const chunks = chunker.chunk(text, { chunkSize: 50, chunkOverlap: 0 });
    expect(chunks.length).toBeGreaterThanOrEqual(3);
  });

  it("should handle short text", () => {
    const chunks = chunker.chunk("Short text.", { chunkSize: 1000 });
    expect(chunks).toHaveLength(1);
    expect(chunks[0].content).toBe("Short text.");
  });

  it("should respect chunk size limits", () => {
    const text = "A".repeat(2000);
    const chunks = chunker.chunk(text, { chunkSize: 500, chunkOverlap: 50 });
    expect(chunks.length).toBeGreaterThanOrEqual(4);
    chunks.forEach((c) => expect(c.content.length).toBeLessThanOrEqual(520));
  });

  it("should add metadata to chunks", () => {
    const chunks = chunker.chunk("Some text for chunking");
    chunks.forEach((c) => {
      expect(c.index).toBeDefined();
      expect(typeof c.index).toBe("number");
    });
  });
});
