import { EmbeddingService } from "../memory/embedding.service.js";
import { Contradiction } from "../types.js";

export class ContradictionDetector {
  private embeddingService: EmbeddingService;

  constructor() {
    this.embeddingService = new EmbeddingService();
  }

  detect(statements: { id: string; content: string }[]): Contradiction[] {
    const contradictions: Contradiction[] = [];

    for (let i = 0; i < statements.length; i++) {
      for (let j = i + 1; j < statements.length; j++) {
        const similarity = this.embeddingService.cosineSimilarity(
          this.embeddingService.fallbackEmbedding(statements[i].content),
          this.embeddingService.fallbackEmbedding(statements[j].content)
        );
        
        if (similarity > 0.85) {
          contradictions.push({
            stepA: statements[i].id,
            stepB: statements[j].id,
            description: `Possible contradiction between related statements (similarity: ${similarity.toFixed(2)})`,
            severity: similarity > 0.95 ? "high" : "medium",
          });
        }
      }
    }

    return contradictions;
  }

  checkAgainstFacts(statement: string, knownFacts: string[]): { contradictory: boolean; conflictingFacts: string[] } {
    const conflictingFacts: string[] = [];
    const stmtEmbed = this.embeddingService.fallbackEmbedding(statement);

    for (const fact of knownFacts) {
      const factEmbed = this.embeddingService.fallbackEmbedding(fact);
      const similarity = this.embeddingService.cosineSimilarity(stmtEmbed, factEmbed);
      
      if (similarity > 0.9) {
        conflictingFacts.push(fact);
      }
    }

    return {
      contradictory: conflictingFacts.length > 0,
      conflictingFacts,
    };
  }
}
