import { getAIProvider } from "../../ai/ai-factory.js";
import type { AICompletionRequest } from "../../ai/types.js";
import { ALL_AGENTS, lookupAgent, CouncilAgent } from "./agents.js";
import { CouncilConfig, CouncilVerdict, CouncilRoundResponse, AgentId } from "../types.js";
import { LrmCouncilSession } from "../../../lib/db/models/LrmCouncilSession.js";
import { logger } from "../../../lib/logger/index.js";
import { env } from "../../../config/env.js";
import { v4 as uuid } from "uuid";

const DEFAULT_PROVIDER = "openrouter";
const DEFAULT_MODEL = env.OPENROUTER_MODEL || "tencent/hy3:free";

export class CouncilOrchestrator {
  async deliberate(config: CouncilConfig): Promise<CouncilVerdict> {
    const startTime = Date.now();
    const sessionId = uuid();
    const members = this.selectMembers(config);

    logger.info({ problem: config.problem, members: members.length, mode: config.mode }, "Council deliberation started");

    const rounds: { round: number; responses: { agentId: string; content: string; confidence: number }[] }[] = [];

    const round1Responses = await this.runRound(members, config.problem, 1, config);
    rounds.push({ round: 1, responses: round1Responses });

    let round2Responses: { agentId: string; content: string; confidence: number }[] = [];
    if (config.mode !== "quick") {
      round2Responses = await this.runRound(members, config.problem, 2, config, round1Responses);
      rounds.push({ round: 2, responses: round2Responses });
    }

    const verdict = await this.synthesizeVerdict(config.problem, round1Responses, round2Responses, config);
    const executionTimeMs = Date.now() - startTime;

    try {
      await LrmCouncilSession.create({
        id: sessionId, orgId: config.orgId || "", userId: config.userId || "",
        problem: config.problem, mode: config.mode,
        members: members.map(m => m.id),
        rounds, verdict: {
          summary: verdict.summary,
          consensusLevel: verdict.consensusLevel,
          confidence: verdict.confidence,
          chairmanVerdict: verdict.chairmanVerdict,
        },
        executionTimeMs, createdAt: new Date(),
      });
    } catch (err) {
      logger.warn({ err }, "Failed to persist council session");
    }

    return { ...verdict, executionTimeMs };
  }

  private selectMembers(config: CouncilConfig): CouncilAgent[] {
    if (config.members && config.members.length > 0) {
      return config.members.map(id => lookupAgent(id)).filter((a): a is CouncilAgent => a !== undefined);
    }
    if (config.mode === "quick") {
      return [lookupAgent("feynman"), lookupAgent("kahneman"), lookupAgent("munger")].filter((a): a is CouncilAgent => a !== undefined);
    }
    if (config.mode === "duo") {
      return [lookupAgent("socrates"), lookupAgent("feynman")].filter((a): a is CouncilAgent => a !== undefined);
    }
    return ALL_AGENTS;
  }

  private async runRound(
    members: typeof ALL_AGENTS,
    problem: string,
    round: number,
    config: CouncilConfig,
    previousResponses?: { agentId: string; content: string; confidence: number }[]
  ): Promise<{ agentId: string; content: string; confidence: number }[]> {
    const responses: { agentId: string; content: string; confidence: number }[] = [];

    const batchSize = 3;
    for (let i = 0; i < members.length; i += batchSize) {
      const batch = members.slice(i, i + batchSize);
      const batchResponses = await Promise.allSettled(
        batch.map(member => this.queryAgent(member, problem, round, config, previousResponses))
      );
      for (const result of batchResponses) {
        if (result.status === "fulfilled") {
          responses.push(result.value);
        }
      }
    }

    return responses;
  }

  private async queryAgent(
    agent: typeof ALL_AGENTS[0],
    problem: string,
    round: number,
    config: CouncilConfig,
    previousResponses?: { agentId: string; content: string; confidence: number }[]
  ): Promise<{ agentId: string; content: string; confidence: number }> {
    const prompt = this.buildAgentPrompt(agent, problem, round, previousResponses);

    try {
      const provider = getAIProvider(DEFAULT_PROVIDER);
      const request: AICompletionRequest = {
        messages: [
          { role: "system", content: agent.systemPrompt },
          { role: "user", content: prompt },
        ],
        config: {
          apiKey: env.OPENROUTER_API_KEY || "",
          model: DEFAULT_MODEL,
          temperature: 0.7,
          maxTokens: round === 3 ? 500 : 300,
          responseLength: "medium",
          systemPrompt: agent.systemPrompt,
          streamingEnabled: false,
        },
      };

      const response = await provider.complete(request);

      const confidence = this.extractConfidence(response.content);
      return {
        agentId: agent.id,
        content: response.content,
        confidence,
      };
    } catch (err) {
      logger.warn({ agent: agent.id, err }, "Agent query failed");
      return {
        agentId: agent.id,
        content: `${agent.figure} is unavailable for analysis.`,
        confidence: 0,
      };
    }
  }

  private buildAgentPrompt(
    agent: typeof ALL_AGENTS[0],
    problem: string,
    round: number,
    previousResponses?: { agentId: string; content: string; confidence: number }[]
  ): string {
    let prompt = `You are participating in the Council of High Intelligence.\n\n`;
    prompt += `Problem: ${problem}\n\n`;

    if (round === 1) {
      prompt += `Round 1 - Initial Analysis:\n`;
      prompt += `Provide your ${
        round === 1 ? "initial analysis" : "analysis"
      } of this problem from your unique perspective as ${agent.figure}, the ${agent.domain}.\n`;
      prompt += `Focus on what you see that others might miss.\n`;
      prompt += `Keep your response under 300 words.\n`;
      prompt += `End with a confidence score (0-1) for your analysis.\n`;
    } else if (round === 2 && previousResponses) {
      prompt += `Round 2 - Cross-Examination:\n`;
      prompt += `Review the following council responses and provide your critique, agreements, and disagreements:\n\n`;
      for (const resp of previousResponses) {
        prompt += `--- ${resp.agentId} ---\n${resp.content}\n\n`;
      }
      prompt += `\nAs ${agent.figure}, what do you challenge, support, or add?\n`;
      prompt += `Keep your response under 250 words.\n`;
    } else {
      prompt += `Round 3 - Synthesis:\n`;
      prompt += `Based on the council's deliberations, provide your final position.\n`;
      prompt += `State your agreement level (unanimous/majority/split/deadlocked) and key recommendations.\n`;
    }

    return prompt;
  }

  private extractConfidence(content: string): number {
    const match = content.match(/confidence[:\s]+([0-9]*\.?[0-9]+)/i);
    if (match) {
      const val = parseFloat(match[1]);
      if (val >= 0 && val <= 1) return val;
    }
    return 0.5;
  }

  private async synthesizeVerdict(
    problem: string,
    round1: { agentId: string; content: string; confidence: number }[],
    round2: { agentId: string; content: string; confidence: number }[],
    config: CouncilConfig
  ): Promise<Omit<CouncilVerdict, "executionTimeMs">> {
    const summary = await this.generateSummary(problem, round1, round2);
    const avgConfidence = [...round1, ...round2].reduce((s, r) => s + r.confidence, 0) / Math.max(1, round1.length + round2.length);
    const consensusLevel = avgConfidence > 0.7 ? "majority" : avgConfidence > 0.4 ? "split" : "deadlocked";

    const highConfidence = [...round1, ...round2].filter(r => r.confidence > 0.6);
    const lowConfidence = [...round1, ...round2].filter(r => r.confidence <= 0.4);

    return {
      problem,
      summary: summary.substring(0, 500),
      consensusLevel,
      confidence: avgConfidence,
      keyInsights: highConfidence.slice(0, 5).map(r => r.content.substring(0, 100)),
      disagreements: lowConfidence.slice(0, 3).map(r => `${r.agentId}: ${r.content.substring(0, 100)}`),
      recommendations: highConfidence.slice(0, 3).map(r => r.content.substring(0, 100)),
      dissentingOpinions: lowConfidence.slice(0, 3).map(r => ({ agentId: r.agentId as AgentId, position: r.content.substring(0, 100) })),
      chairmanVerdict: summary.substring(0, 300),
    };
  }

  private async generateSummary(
    problem: string,
    round1: { agentId: string; content: string; confidence: number }[],
    round2: { agentId: string; content: string; confidence: number }[]
  ): Promise<string> {
    try {
      const provider = getAIProvider(DEFAULT_PROVIDER);
      const allResponses = [...round1, ...round2]
        .map(r => `${r.agentId}: ${r.content}`)
        .join("\n\n");

      const request: AICompletionRequest = {
        messages: [
          {
            role: "system",
            content: "You are the Council Chairman. Synthesize the council's deliberation into a clear verdict. Identify consensus, disagreements, and provide actionable recommendations.",
          },
          {
            role: "user",
            content: `Problem: ${problem}\n\nCouncil Deliberations:\n${allResponses}\n\nProvide a synthesized verdict.`,
          },
        ],
        config: {
          apiKey: env.OPENROUTER_API_KEY || "",
          model: DEFAULT_MODEL,
          temperature: 0.5,
          maxTokens: 800,
          responseLength: "medium",
          systemPrompt: "You are the Council Chairman. Synthesize the council's deliberation into a clear verdict.",
          streamingEnabled: false,
        },
      };

      const response = await provider.complete(request);
      return response.content;
    } catch {
      const avgConfidence = [...round1, ...round2].reduce((s, r) => s + r.confidence, 0) / Math.max(1, round1.length + round2.length);
      return `Council deliberation complete. Average confidence: ${(avgConfidence * 100).toFixed(0)}%. Review individual responses for details.`;
    }
  }
}
