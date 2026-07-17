import { getAIProvider } from "../../ai/ai-factory.js";
import { logger } from "../../../lib/logger/index.js";

export interface ReflectionResult {
  score: number;
  issues: string[];
  suggestions: string[];
  correctedOutput?: string;
}

export class SelfReflection {
  constructor() {
  }

  async reflect(output: string, originalInput: string): Promise<ReflectionResult> {
    try {
      const provider = getAIProvider();
      const response = await provider.complete({
        messages: [
          {
            role: "system",
            content: "You are a critical reviewer. Analyze the following AI output for: accuracy, completeness, logical consistency, hallucinations, and alignment with the original query. Rate quality 0-1 and list issues.",
          },
          {
            role: "user",
            content: `Original query: ${originalInput}\n\nAI Output:\n${output}`,
          },
        ],
        config: {
          apiKey: process.env.OPENROUTER_API_KEY || "",
          model: process.env.OPENROUTER_MODEL || "tencent/hy3:free",
          temperature: 0.2,
          maxTokens: 500,
          responseLength: "medium",
          systemPrompt: "",
          streamingEnabled: false,
        },
      });

      const scoreMatch = response.content.match(/(?:score|rating|quality)[:\s]+([0-9]*\.?[0-9]+)/i);
      const score = scoreMatch ? Math.max(0, Math.min(1, parseFloat(scoreMatch[1]))) : 0.5;
      
      const issues = this.extractListItems(response.content, "issue", "concern", "problem", "error");
      const suggestions = this.extractListItems(response.content, "suggest", "recommend", "improve", "fix");

      return { score, issues, suggestions };
    } catch (err) {
      logger.warn({ err }, "Self-reflection failed");
      return { score: 0.5, issues: ["Reflection unavailable"], suggestions: [] };
    }
  }

  async correctErrors(output: string, issues: string[]): Promise<string> {
    if (issues.length === 0) return output;
    
    try {
      const provider = getAIProvider();
      const response = await provider.complete({
        messages: [
          {
            role: "system",
            content: `Correct the following issues in the AI output:\n${issues.join("\n")}\n\nProvide a corrected version.`,
          },
          { role: "user", content: output },
        ],
        config: {
          apiKey: process.env.OPENROUTER_API_KEY || "",
          model: process.env.OPENROUTER_MODEL || "tencent/hy3:free",
          temperature: 0.2,
          maxTokens: 1000,
          responseLength: "medium",
          systemPrompt: "",
          streamingEnabled: false,
        },
      });
      
      return response.content;
    } catch {
      return output;
    }
  }

  private extractListItems(text: string, ...keywords: string[]): string[] {
    const items: string[] = [];
    const lines = text.split("\n");
    
    for (const line of lines) {
      const trimmed = line.replace(/^[\s*\-•]+/, "").trim();
      if (keywords.some(k => trimmed.toLowerCase().includes(k)) && trimmed.length > 5) {
        items.push(trimmed);
      }
    }
    
    return items.slice(0, 5);
  }
}
