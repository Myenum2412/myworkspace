export class TokenCounter {
  private readonly TOKEN_PER_CHAR_ESTIMATE = 0.25;

  estimateTokenCount(text: string): number {
    if (!text) return 0;
    return Math.ceil(text.length * this.TOKEN_PER_CHAR_ESTIMATE);
  }

  estimateMessageTokens(messages: Array<{ role: string; content: string }>): number {
    let total = 0;
    for (const msg of messages) {
      total += this.estimateTokenCount(msg.content);
      total += 4;
    }
    return total;
  }

  countPromptTokens(messages: Array<{ role: string; content: string }>): number {
    return this.estimateMessageTokens(messages);
  }

  countCompletionTokens(text: string): number {
    return this.estimateTokenCount(text);
  }

  truncateToMaxTokens(text: string, maxTokens: number): string {
    const estimatedTokens = this.estimateTokenCount(text);
    if (estimatedTokens <= maxTokens) return text;

    const maxChars = Math.floor(maxTokens / this.TOKEN_PER_CHAR_ESTIMATE);
    return text.slice(0, maxChars) + "\n\n[Content truncated...]";
  }

  isWithinLimit(text: string, maxTokens: number): boolean {
    return this.estimateTokenCount(text) <= maxTokens;
  }
}
