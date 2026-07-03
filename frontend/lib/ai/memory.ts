export interface ConversationSummary {
  keyTopics: string[];
  userGoals: string[];
  recentContext: string;
}

export function extractKeyTopics(messages: { role: string; content: string }[]): string[] {
  const topics = new Set<string>();
  const keywords = messages.flatMap((m) => {
    const words = m.content.toLowerCase().split(/\s+/);
    return words.filter((w) => w.length > 5);
  });
  const freq = new Map<string, number>();
  for (const kw of keywords) {
    freq.set(kw, (freq.get(kw) || 0) + 1);
  }
  const sorted = [...freq.entries()].sort((a, b) => b[1] - a[1]);
  return sorted.slice(0, 5).map(([word]) => word);
}

export function generateSummary(messages: { role: string; content: string }[]): ConversationSummary {
  const keyTopics = extractKeyTopics(messages);
  const userMessages = messages.filter((m) => m.role === "user");
  const lastFewMessages = messages.slice(-4);
  const recentContext = lastFewMessages.map((m) => `${m.role}: ${m.content.slice(0, 100)}`).join("\n");
  return {
    keyTopics,
    userGoals: userMessages.length > 0 ? [userMessages[userMessages.length - 1].content.slice(0, 100)] : [],
    recentContext,
  };
}
