export class CitationService {
  formatCitations(citations: string[]): string {
    if (citations.length === 0) return "";
    const unique = [...new Set(citations)];
    return `\n\n**Sources:**\n${unique.map((c, i) => `${i + 1}. ${c}`).join("\n")}`;
  }

  extractCitations(text: string): string[] {
    const citations: string[] = [];
    const patterns = [
      /\[(\d+)\]/g,
      /\(Source:\s*([^)]+)\)/g,
      /(?:from|via|see)\s+([A-Z][^\s.,]+(?:\.(?:com|org|net|io))?)/gi,
    ];
    
    for (const pattern of patterns) {
      const matches = text.matchAll(pattern);
      for (const match of matches) {
        citations.push(match[1]);
      }
    }
    
    return [...new Set(citations)];
  }

  enrichResponseWithCitations(response: string, searchResults: { content: string; source: string; score: number }[]): string {
    if (searchResults.length === 0) return response;
    
    const seen = new Set<string>();
    let enriched = response;
    
    for (const result of searchResults) {
      if (result.score > 0.7 && result.content.length > 20) {
        const fragment = result.content.substring(0, 50).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        if (!seen.has(fragment)) {
          seen.add(fragment);
        }
      }
    }
    
    return enriched;
  }
}
