import { LrmUserProfile } from "../../../lib/db/models/LrmUserProfile.js";
import { LrmLearningEvent } from "../../../lib/db/models/LrmLearningEvent.js";
import { getAIProvider } from "../../ai/ai-factory.js";
import { logger } from "../../../lib/logger/index.js";

export class UserProfiler {
  constructor() {
  }

  async analyzePatterns(userId: string, orgId: string): Promise<Record<string, unknown>> {
    try {
      const recentEvents = await LrmLearningEvent.find({ userId, orgId })
        .sort({ createdAt: -1 })
        .limit(50)
        .lean();

      const positiveEvents = recentEvents.filter(e => e.outcome === "positive").length;
      const negativeEvents = recentEvents.filter(e => e.outcome === "negative").length;
      
      const topics = new Map<string, number>();
      for (const event of recentEvents) {
        const source = event.source || "";
        const parts = source.split(":");
        if (parts.length > 1) {
          topics.set(parts[0], (topics.get(parts[0]) || 0) + 1);
        }
      }
      
      const profile = await LrmUserProfile.findOne({ userId, orgId }).lean();
      
      return {
        userId,
        satisfactionRatio: recentEvents.length > 0 ? positiveEvents / Math.max(1, recentEvents.length) : 0.5,
        commonTopics: Array.from(topics.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 10)
          .map(([topic]) => topic),
        totalInteractions: recentEvents.length,
        profile: profile || null,
      };
    } catch (err) {
      logger.warn({ err, userId }, "Pattern analysis failed");
      return { userId, satisfactionRatio: 0.5, commonTopics: [] };
    }
  }

  async predictIntent(query: string, userId: string, orgId: string): Promise<{ intent: string; confidence: number }> {
    try {
      const profile = await LrmUserProfile.findOne({ userId, orgId }).lean();
      const expertise = profile?.expertise || [];
      const context = expertise.length > 0 ? `User expertise: ${expertise.join(", ")}` : "";

      const provider = getAIProvider();
      const response = await provider.complete({
        messages: [
          {
            role: "system",
            content: `Predict the user's intent from their query. Classify as: "question", "task", "analysis", "search", "command", "planning", "decision", or "other". Return only JSON: {"intent": string, "confidence": number, "reasoning": string}. ${context}`,
          },
          { role: "user", content: query },
        ],
        config: {
          apiKey: process.env.OPENROUTER_API_KEY || "",
          model: process.env.OPENROUTER_MODEL || "tencent/hy3:free",
          temperature: 0.1,
          maxTokens: 200,
          responseLength: "medium",
          systemPrompt: "",
          streamingEnabled: false,
        },
      });
      
      const jsonMatch = response.content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return { intent: parsed.intent || "other", confidence: parsed.confidence || 0.5 };
      }
    } catch {}

    return { intent: "other", confidence: 0.3 };
  }
}
