import { ReasoningTrace, ReasoningStep, Contradiction, CouncilVerdict } from "../types.js";
import { EmbeddingService } from "../memory/embedding.service.js";
import { getAIProvider } from "../../ai/ai-factory.js";
import { v4 as uuid } from "uuid";
import { logger } from "../../../lib/logger/index.js";

export class ReasoningEngine {
  private embeddingService: EmbeddingService;

  constructor() {
    this.embeddingService = new EmbeddingService();
  }

  async reason(input: string, context?: Record<string, unknown>): Promise<ReasoningTrace> {
    const steps: ReasoningStep[] = [];
    
    // Step 1: Premise extraction
    const premiseStep = await this.extractPremises(input);
    steps.push(premiseStep);
    
    // Step 2: Generate inferences
    const inferenceStep = await this.generateInferences(input, steps);
    steps.push(inferenceStep);
    
    // Step 3: Check for contradictions
    const contradictions = this.detectContradictions(steps);
    
    // Step 4: Generate hypothesis
    const hypothesisStep = await this.generateHypothesis(input, steps, contradictions);
    steps.push(hypothesisStep);
    
    // Step 5: Verification
    const verificationStep = await this.verifyHypothesis(input, hypothesisStep, steps);
    steps.push(verificationStep);
    
    // Step 6: Correction if needed
    if (verificationStep.confidence < 0.5) {
      const correctionStep = await this.correctReasoning(input, steps, contradictions);
      steps.push(correctionStep);
    }
    
    // Calculate overall confidence
    const confidence = steps.reduce((s, step) => s + step.confidence, 0) / steps.length;
    
    return {
      steps,
      confidence,
      contradictions,
      finalOutput: steps[steps.length - 1].content,
    };
  }

  async reasonWithCouncil(input: string, verdict: CouncilVerdict): Promise<ReasoningTrace> {
    const steps: ReasoningStep[] = [];
    
    steps.push({
      id: uuid(), type: "premise",
      content: `Problem: ${input}`,
      confidence: 1.0, evidence: [verdict.summary],
    });
    
    steps.push({
      id: uuid(), type: "inference",
      content: `Council consensus: ${verdict.consensusLevel} (confidence: ${(verdict.confidence * 100).toFixed(0)}%)`,
      confidence: verdict.confidence,
      evidence: verdict.keyInsights,
    });
    
    const contradictions = this.detectContradictions(steps);
    
    steps.push({
      id: uuid(), type: "verification",
      content: verdict.chairmanVerdict,
      confidence: verdict.confidence,
      evidence: verdict.recommendations,
      parentStepId: steps[1].id,
    });
    
    return { steps, confidence: verdict.confidence, contradictions, finalOutput: verdict.chairmanVerdict };
  }

  async validateChain(verdict: CouncilVerdict): Promise<{ valid: boolean; issues: string[] }> {
    const issues: string[] = [];
    
    if (verdict.confidence < 0.3) {
      issues.push("Low confidence score indicates unreliable analysis");
    }
    if (verdict.consensusLevel === "deadlocked") {
      issues.push("Council is deadlocked - no clear consensus");
    }
    if (verdict.dissentingOpinions.length > verdict.keyInsights.length) {
      issues.push("More dissenting opinions than supporting insights");
    }
    
    return { valid: issues.length === 0, issues };
  }

  private async extractPremises(input: string): Promise<ReasoningStep> {
    return {
      id: uuid(), type: "premise",
      content: `Analyzing input: "${input.substring(0, 200)}"`,
      confidence: 0.9,
    };
  }

  private async generateInferences(input: string, steps: ReasoningStep[]): Promise<ReasoningStep> {
    try {
      const provider = getAIProvider();
      const response = await provider.complete({
        messages: [
          {
            role: "system",
            content: "Analyze the following and provide key inferences. Consider implications, assumptions, and logical consequences. Be concise.",
          },
          { role: "user", content: input },
        ],
        config: {
          apiKey: process.env.OPENROUTER_API_KEY || "",
          model: process.env.OPENROUTER_MODEL || "tencent/hy3:free",
          temperature: 0.3,
          maxTokens: 500,
          responseLength: "medium",
          systemPrompt: "",
          streamingEnabled: false,
        },
      });
      
      const confidence = response.content.length > 50 ? 0.7 : 0.3;
      return {
        id: uuid(), type: "inference",
        content: response.content,
        confidence,
        parentStepId: steps[0]?.id,
      };
    } catch {
      return {
        id: uuid(), type: "inference",
        content: "Unable to generate inferences at this time.",
        confidence: 0.2,
        parentStepId: steps[0]?.id,
      };
    }
  }

  private detectContradictions(steps: ReasoningStep[]): Contradiction[] {
    const contradictions: Contradiction[] = [];
    
    for (let i = 0; i < steps.length; i++) {
      for (let j = i + 1; j < steps.length; j++) {
        const similarity = this.embeddingService.cosineSimilarity(
          this.simpleEmbed(steps[i].content),
          this.simpleEmbed(steps[j].content)
        );
        
        if (similarity > 0.8 && steps[i].confidence < 0.3 && steps[j].confidence > 0.7) {
          contradictions.push({
            stepA: steps[i].id, stepB: steps[j].id,
            description: `Step ${i + 1} (low confidence) contradicts Step ${j + 1} (high confidence)`,
            severity: "medium",
            resolution: `Higher confidence step (${j + 1}) should take precedence`,
          });
        }
      }
    }
    
    return contradictions;
  }

  private async generateHypothesis(
    input: string,
    steps: ReasoningStep[],
    contradictions: Contradiction[]
  ): Promise<ReasoningStep> {
    const hasContradictions = contradictions.length > 0;
    
    try {
      const provider = getAIProvider();
      const response = await provider.complete({
        messages: [
          {
            role: "system",
            content: `Generate a hypothesis based on the analysis so far.${hasContradictions ? " Note: Some contradictions were detected in the reasoning." : ""}`,
          },
          { role: "user", content: input },
        ],
        config: {
          apiKey: process.env.OPENROUTER_API_KEY || "",
          model: process.env.OPENROUTER_MODEL || "tencent/hy3:free",
          temperature: 0.4,
          maxTokens: 500,
          responseLength: "medium",
          systemPrompt: "",
          streamingEnabled: false,
        },
      });
      
      return {
        id: uuid(), type: "hypothesis",
        content: response.content,
        confidence: 0.6,
        evidence: steps.map(s => s.content.substring(0, 100)),
        parentStepId: steps[steps.length - 1]?.id,
      };
    } catch {
      return {
        id: uuid(), type: "hypothesis",
        content: "Hypothesis generation unavailable.",
        confidence: 0.3,
        parentStepId: steps[steps.length - 1]?.id,
      };
    }
  }

  private async verifyHypothesis(input: string, hypothesis: ReasoningStep, steps: ReasoningStep[]): Promise<ReasoningStep> {
    try {
      const provider = getAIProvider();
      const response = await provider.complete({
        messages: [
          {
            role: "system",
            content: "Verify the following hypothesis. Is it logically sound? Does it address the original input? Rate confidence 0-1.",
          },
          { role: "user", content: `Original: ${input}\n\nHypothesis: ${hypothesis.content}` },
        ],
        config: {
          apiKey: process.env.OPENROUTER_API_KEY || "",
          model: process.env.OPENROUTER_MODEL || "tencent/hy3:free",
          temperature: 0.2,
          maxTokens: 300,
          responseLength: "medium",
          systemPrompt: "",
          streamingEnabled: false,
        },
      });
      
      const confidenceMatch = response.content.match(/(?:confidence|rating)[:\s]+([0-9]*\.?[0-9]+)/i);
      const confidence = confidenceMatch ? Math.max(0, Math.min(1, parseFloat(confidenceMatch[1]))) : 0.5;
      
      return {
        id: uuid(), type: "verification",
        content: response.content,
        confidence,
        evidence: steps.map(s => s.id),
        parentStepId: hypothesis.id,
      };
    } catch {
      return {
        id: uuid(), type: "verification",
        content: "Verification unavailable.",
        confidence: 0.3,
        parentStepId: hypothesis.id,
      };
    }
  }

  private async correctReasoning(input: string, steps: ReasoningStep[], contradictions: Contradiction[]): Promise<ReasoningStep> {
    const contradictionDesc = contradictions.map(c => c.description).join("; ");
    
    try {
      const provider = getAIProvider();
      const response = await provider.complete({
        messages: [
          {
            role: "system",
            content: `The previous reasoning has been flagged for correction. Issues: ${contradictionDesc || "Low confidence"}. Provide a corrected analysis.`,
          },
          { role: "user", content: input },
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
      
      return {
        id: uuid(), type: "correction",
        content: response.content,
        confidence: 0.7,
        evidence: [contradictionDesc],
        parentStepId: steps[steps.length - 1]?.id,
      };
    } catch {
      return {
        id: uuid(), type: "correction",
        content: "Correction unavailable.",
        confidence: 0.3,
      };
    }
  }

  private simpleEmbed(text: string): number[] {
    const dim = 64;
    const embedding = new Array(dim).fill(0);
    const words = text.toLowerCase().split(/\s+/).filter(Boolean);
    for (let i = 0; i < words.length && i < dim; i++) {
      let hash = 0;
      for (const ch of words[i]) {
        hash = ((hash << 5) - hash) + ch.charCodeAt(0);
        hash |= 0;
      }
      embedding[i] = (hash % 10000) / 10000;
    }
    return embedding;
  }
}
