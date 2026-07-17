export function calculateConsensus(responses: { agentId: string; confidence: number }[]): {
  consensusLevel: "unanimous" | "majority" | "split" | "deadlocked";
  consensusScore: number;
} {
  if (responses.length === 0) return { consensusLevel: "deadlocked", consensusScore: 0 };

  const avgConfidence = responses.reduce((s, r) => s + r.confidence, 0) / responses.length;
  const highCount = responses.filter(r => r.confidence > 0.6).length;
  const lowCount = responses.filter(r => r.confidence < 0.4).length;
  const ratio = highCount / responses.length;

  let consensusLevel: "unanimous" | "majority" | "split" | "deadlocked";
  if (ratio >= 0.9) consensusLevel = "unanimous";
  else if (ratio >= 0.6) consensusLevel = "majority";
  else if (ratio >= 0.3) consensusLevel = "split";
  else consensusLevel = "deadlocked";

  return { consensusLevel, consensusScore: avgConfidence };
}

export function rankResponses(responses: { agentId: string; content: string; confidence: number }[]):
  { agentId: string; content: string; confidence: number }[] {
  return [...responses].sort((a, b) => b.confidence - a.confidence);
}

export function extractKeyInsights(responses: { agentId: string; content: string; confidence: number }[], topK = 3): string[] {
  return responses
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, topK)
    .map(r => r.content.substring(0, 120));
}
