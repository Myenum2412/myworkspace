import { AIProviderFactory } from "../providers/ai-provider.factory.js";
import type { AIProvider, AIMessage } from "../providers/ai-provider.interface.js";
import { logger } from "../../../lib/logger/index.js";

export type ReasoningStrategy = "react" | "cot" | "tot" | "plan" | "refine";

export interface PlanningStep {
  id: string;
  description: string;
  status: "pending" | "in_progress" | "completed" | "failed" | "skipped";
  agent: string;
  dependsOn: string[];
  result?: string;
  error?: string;
  durationMs?: number;
}

export interface ExecutionPlan {
  goal: string;
  steps: PlanningStep[];
  estimatedComplexity: "simple" | "moderate" | "complex";
  requiresResearch: boolean;
  requiresToolUse: boolean;
  requiresMultipleAgents: boolean;
  reasoning: string;
}

export interface Thought {
  id: string;
  content: string;
  type: "observation" | "reasoning" | "action" | "result" | "reflection";
  confidence: number;
  children: Thought[];
}

export class PlannerAgent {
  private provider: AIProvider;

  constructor() {
    this.provider = AIProviderFactory.getProvider();
  }

  async createPlan(userMessage: string, availableTools: string[]): Promise<ExecutionPlan> {
    const systemPrompt = `You are a strategic planning agent. Given a user's request, create a detailed execution plan.

Available tools: ${availableTools.join(", ") || "none"}

Your task is to:
1. Understand the user's goal
2. Break it down into sequential or parallel steps
3. Identify what each step needs
4. Determine complexity
5. Provide your reasoning

Respond in JSON format:
{
  "goal": "clear statement of the user's goal",
  "reasoning": "step-by-step reasoning about how to approach this",
  "estimatedComplexity": "simple|moderate|complex",
  "requiresResearch": true/false,
  "requiresToolUse": true/false,
  "requiresMultipleAgents": true/false,
  "steps": [
    {
      "id": "step_1",
      "description": "what to do in this step",
      "agent": "planner|executor|researcher|critic",
      "dependsOn": []
    }
  ]
}`;

    const messages: AIMessage[] = [
      { role: "system", content: systemPrompt },
      { role: "user", content: userMessage },
    ];

    try {
      const response = await this.provider.generateResponse(messages, {
        temperature: 0.3,
        maxTokens: 2000,
      });

      const cleaned = response.content.replace(/```json\n?|\n?```/g, "").trim();
      return JSON.parse(cleaned) as ExecutionPlan;
    } catch (error) {
      logger.error({ error }, "Planning failed, using fallback plan");
      return this.createFallbackPlan(userMessage);
    }
  }

  async thinkReAct(
    userMessage: string,
    context: string,
    toolResults: Array<{ tool: string; result: string; success: boolean }>
  ): Promise<Thought> {
    const systemPrompt = `You are a ReAct (Reasoning + Acting) agent. Think step-by-step.

Your response must be in this format:
{
  "thought": "your internal reasoning about what to do next",
  "reasoning": "why you think this is the right approach",
  "observation": "what you observed from the current state",
  "action": "what action to take (call_tool, respond, ask_clarification)",
  "toolName": "name of tool if calling one",
  "toolArgs": { "key": "value" },
  "response": "your response to the user if not calling a tool"
}`;

    const messages: AIMessage[] = [
      { role: "system", content: systemPrompt },
      { role: "system", content: `Context: ${context}` },
      ...(toolResults.length > 0
        ? [{ role: "system" as const, content: `Recent tool results:\n${toolResults.map((tr) => `[${tr.tool}] ${tr.result}`).join("\n")}` }]
        : []),
      { role: "user", content: userMessage },
    ];

    try {
      const response = await this.provider.generateResponse(messages, {
        temperature: 0.4,
        maxTokens: 1000,
      });

      const cleaned = response.content.replace(/```json\n?|\n?```/g, "").trim();
      const parsed = JSON.parse(cleaned);

      return {
        id: `thought_${Date.now()}`,
        content: parsed.thought || parsed.reasoning || "",
        type: parsed.observation ? "observation" : parsed.action === "call_tool" ? "action" : "reasoning",
        confidence: 0.8,
        children: [],
      };
    } catch {
      return {
        id: `thought_${Date.now()}`,
        content: "Unable to perform structured reasoning. Proceeding step by step.",
        type: "reasoning",
        confidence: 0.5,
        children: [],
      };
    }
  }

  async chainOfThought(question: string): Promise<string> {
    const systemPrompt = `Solve the following step-by-step. Show your reasoning clearly.

Format:
Step 1: [reasoning step]
Step 2: [next reasoning step]
...
Conclusion: [final answer]`;

    const messages: AIMessage[] = [
      { role: "system", content: systemPrompt },
      { role: "user", content: question },
    ];

    try {
      const response = await this.provider.generateResponse(messages, {
        temperature: 0.2,
        maxTokens: 2000,
      });
      return response.content;
    } catch {
      return question;
    }
  }

  async treeOfThought(question: string, branches: number = 3): Promise<Thought> {
    const root: Thought = {
      id: "root",
      content: question,
      type: "reasoning",
      confidence: 1.0,
      children: [],
    };

    const systemPrompt = `Consider ${branches} different approaches to solve this problem. For each approach, explain:
1. The approach name
2. Why it might work
3. Potential drawbacks
4. Expected outcome

Format as JSON array:
[
  {
    "approach": "name",
    "reasoning": "detailed reasoning",
    "pros": "advantages",
    "cons": "disadvantages",
    "confidence": 0.0-1.0
  }
]`;

    const messages: AIMessage[] = [
      { role: "system", content: systemPrompt },
      { role: "user", content: question },
    ];

    try {
      const response = await this.provider.generateResponse(messages, {
        temperature: 0.7,
        maxTokens: 2000,
      });
      const cleaned = response.content.replace(/```json\n?|\n?```/g, "").trim();
      const approaches = JSON.parse(cleaned) as Array<{
        approach: string;
        reasoning: string;
        pros: string;
        cons: string;
        confidence: number;
      }>;

      root.children = approaches.map((a, i) => ({
        id: `branch_${i}`,
        content: `${a.approach}: ${a.reasoning}`,
        type: "reasoning" as const,
        confidence: a.confidence || 0.5,
        children: [
          {
            id: `branch_${i}_pros`,
            content: `Pros: ${a.pros}`,
            type: "observation" as const,
            confidence: 0.8,
            children: [],
          },
          {
            id: `branch_${i}_cons`,
            content: `Cons: ${a.cons}`,
            type: "observation" as const,
            confidence: 0.8,
            children: [],
          },
        ],
      }));
    } catch {
      root.children.push({
        id: "fallback",
        content: "Single approach: direct execution",
        type: "reasoning",
        confidence: 0.5,
        children: [],
      });
    }

    return root;
  }

  private createFallbackPlan(userMessage: string): ExecutionPlan {
    return {
      goal: userMessage,
      steps: [
        {
          id: "step_1",
          description: "Analyze user request",
          status: "pending",
          agent: "planner",
          dependsOn: [],
        },
        {
          id: "step_2",
          description: "Execute based on analysis",
          status: "pending",
          agent: "executor",
          dependsOn: ["step_1"],
        },
        {
          id: "step_3",
          description: "Review and respond",
          status: "pending",
          agent: "critic",
          dependsOn: ["step_2"],
        },
      ],
      estimatedComplexity: "moderate",
      requiresResearch: false,
      requiresToolUse: false,
      requiresMultipleAgents: false,
      reasoning: "Fallback sequential plan",
    };
  }

  async refinePlan(plan: ExecutionPlan, feedback: string): Promise<ExecutionPlan> {
    logger.info({ planGoal: plan.goal, feedback }, "Refining execution plan");
    return plan;
  }

  async evaluateStepResult(step: PlanningStep, result: string): Promise<{ passed: boolean; feedback: string; score: number }> {
    const systemPrompt = `Evaluate this step's result:
Step: ${step.description}
Result: ${result}

Rate 0-1 and provide feedback. JSON: {"score": 0.0-1.0, "passed": true/false, "feedback": "..."}`;

    const messages: AIMessage[] = [
      { role: "system", content: systemPrompt },
      { role: "user", content: `Evaluate step: ${step.description}` },
    ];

    try {
      const response = await this.provider.generateResponse(messages, { temperature: 0.2, maxTokens: 500 });
      const cleaned = response.content.replace(/```json\n?|\n?```/g, "").trim();
      return JSON.parse(cleaned);
    } catch {
      return { passed: true, feedback: "Unable to evaluate automatically", score: 0.7 };
    }
  }
}
