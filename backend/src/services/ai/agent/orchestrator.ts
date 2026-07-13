import { AIProviderFactory } from "../providers/ai-provider.factory.js";
import type { AIProvider, AIMessage } from "../providers/ai-provider.interface.js";
import { PlannerAgent, type ExecutionPlan, type PlanningStep, type ReasoningStrategy } from "./planner-agent.js";
import { ToolRegistry } from "../tools/registry.js";
import { enhancedMemoryManager } from "../memory/enhanced-memory-manager.js";
import type { AgentMessage } from "../types/message.types.js";
import type { ToolDefinition } from "../types/tool.types.js";
import { logger } from "../../../lib/logger/index.js";
import { EventEmitter } from "events";

export type AgentRole = "planner" | "executor" | "critic" | "validator" | "researcher" | "memory" | "writer";

export interface AgentTask {
  id: string;
  role: AgentRole;
  instruction: string;
  input: string;
  context: string;
  tools?: ToolDefinition[];
  dependsOn: string[];
  result?: string;
  error?: string;
  durationMs?: number;
}

export interface AgentResult {
  taskId: string;
  role: AgentRole;
  output: string;
  confidence: number;
  tokenUsage: number;
  durationMs: number;
  error?: string;
}

export interface OrchestrationConfig {
  maxParallelTasks: number;
  enableSelfReflection: boolean;
  enableQualityGate: boolean;
  reflectionInterval: number;
  maxRetriesPerTask: number;
}

export class AgentOrchestrator extends EventEmitter {
  private planner: PlannerAgent;
  private provider: AIProvider;
  private toolRegistry: ToolRegistry;
  private config: OrchestrationConfig;

  constructor() {
    super();
    this.planner = new PlannerAgent();
    this.provider = AIProviderFactory.getProvider();
    this.toolRegistry = ToolRegistry.getInstance();
    this.config = {
      maxParallelTasks: 3,
      enableSelfReflection: true,
      enableQualityGate: true,
      reflectionInterval: 5,
      maxRetriesPerTask: 2,
    };
  }

  async processWithOrchestration(
    userMessage: string,
    sessionId: string,
    userId: string,
    organizationId?: string
  ): Promise<{
    response: string;
    plan: ExecutionPlan;
    results: AgentResult[];
    durationMs: number;
    reflections: string[];
  }> {
    const startTime = Date.now();
    const reflections: string[] = [];

    try {
      await this.toolRegistry.initializeBuiltInTools();
      const toolDefs = this.toolRegistry.getDefinitions();
      const toolNames = toolDefs.map((t) => t.name);

      const context = await enhancedMemoryManager.loadContext(userId, sessionId, organizationId, userMessage);

      const plan = await this.planner.createPlan(userMessage, toolNames);

      const tasks = this.createTasksFromPlan(plan, context.contextPrompt, toolDefs, userMessage);

      const results = await this.executeTasks(tasks, userId, organizationId);

      if (this.config.enableSelfReflection && plan.steps.length > this.config.reflectionInterval) {
        const reflectionPrompt = `Review the execution of this plan and identify improvements:\nGoal: ${plan.goal}\nResults: ${results.map((r) => `[${r.role}] ${r.output?.slice(0, 200)}`).join("\n")}`;
        const reflection = await this.planner.chainOfThought(reflectionPrompt);
        reflections.push(reflection);
      }

      const response = await this.synthesizeResponse(plan, results, userMessage, context.contextPrompt);

      return {
        response,
        plan,
        results,
        durationMs: Date.now() - startTime,
        reflections,
      };
    } catch (error) {
      logger.error({ error, userId, sessionId }, "Orchestration failed");
      return {
        response: "I encountered an error while processing your request. Please try again.",
        plan: { goal: userMessage, steps: [], estimatedComplexity: "simple", requiresResearch: false, requiresToolUse: false, requiresMultipleAgents: false, reasoning: "" },
        results: [],
        durationMs: Date.now() - startTime,
        reflections: ["Error during orchestration: " + (error as Error).message],
      };
    }
  }

  private createTasksFromPlan(
    plan: ExecutionPlan,
    contextPrompt: string,
    tools: ToolDefinition[],
    originalMessage: string
  ): AgentTask[] {
    const tasks: AgentTask[] = [];
    const stepToTask: Record<string, string> = {};

    for (const step of plan.steps) {
      const taskId = `task_${step.id}`;
      stepToTask[step.id] = taskId;

      const dependsOnTaskIds = step.dependsOn
        .map((depId) => stepToTask[depId])
        .filter(Boolean);

      let instruction = "";
      switch (step.agent) {
        case "planner":
          instruction = "Analyze and plan the approach for this step";
          break;
        case "executor":
          instruction = "Execute the required actions for this step using available tools";
          break;
        case "researcher":
          instruction = "Research and gather information needed for this step";
          break;
        case "critic":
          instruction = "Review the output from previous steps for quality and accuracy";
          break;
        case "validator":
          instruction = "Validate that the results meet the requirements";
          break;
        case "memory":
          instruction = "Store and retrieve relevant information for this step";
          break;
        case "writer":
          instruction = "Synthesize and format the final response";
          break;
        default:
          instruction = "Execute this step";
      }

      tasks.push({
        id: taskId,
        role: step.agent as AgentRole,
        instruction,
        input: step.description,
        context: contextPrompt,
        tools: tools,
        dependsOn: dependsOnTaskIds,
      });
    }

    if (tasks.length === 0) {
      tasks.push({
        id: "task_default",
        role: "executor",
        instruction: "Respond to the user",
        input: originalMessage,
        context: contextPrompt,
        dependsOn: [],
      });
    }

    return tasks;
  }

  private async executeTasks(
    tasks: AgentTask[],
    userId: string,
    organizationId?: string
  ): Promise<AgentResult[]> {
    const results: AgentResult[] = [];
    const completed = new Set<string>();
    const taskMap = new Map(tasks.map((t) => [t.id, t]));
    const taskResults = new Map<string, AgentResult>();

    let remaining = [...tasks];

    while (remaining.length > 0) {
      const ready = remaining.filter(
        (t) => t.dependsOn.every((depId) => completed.has(depId))
      );

      if (ready.length === 0) {
        logger.warn({ remaining: remaining.length }, "Deadlock in task execution");
        break;
      }

      const batch = ready.slice(0, this.config.maxParallelTasks);
      remaining = remaining.filter((t) => !batch.includes(t));

      const batchResults = await Promise.all(
        batch.map((task) => this.executeSingleTask(task, userId, organizationId))
      );

      for (const result of batchResults) {
        results.push(result);
        completed.add(result.taskId);
        taskResults.set(result.taskId, result);
        this.emit("task_completed", result);

        // Quality gate
        if (this.config.enableQualityGate && !result.error) {
          const evaluation = await this.planner.evaluateStepResult(
            { id: result.taskId, description: taskMap.get(result.taskId)?.input || "", status: "completed", agent: result.role, dependsOn: [] },
            result.output
          );
          if (!evaluation.passed && this.config.maxRetriesPerTask > 0) {
            logger.warn({ taskId: result.taskId, score: evaluation.score }, "Task failed quality gate");
          }
        }
      }
    }

    return results;
  }

  private async executeSingleTask(
    task: AgentTask,
    userId: string,
    organizationId?: string
  ): Promise<AgentResult> {
    const startTime = Date.now();
    let retries = 0;

    while (retries <= this.config.maxRetriesPerTask) {
      try {
        const systemPrompt = this.buildAgentPrompt(task.role, task.instruction, task.context, task.tools || []);

        const otherResults = task.dependsOn
          .map(() => "") // Results already included in context generally
          .join("\n");

        const messages: AIMessage[] = [
          { role: "system", content: systemPrompt },
          { role: "user", content: task.input },
        ];

        const response = await this.provider.generateResponse(messages, {
          temperature: 0.4,
          maxTokens: 2000,
        });

        return {
          taskId: task.id,
          role: task.role,
          output: response.content,
          confidence: 0.8,
          tokenUsage: response.tokensUsed,
          durationMs: Date.now() - startTime,
        };
      } catch (error) {
        retries++;
        logger.warn({ taskId: task.id, role: task.role, retry: retries, error: (error as Error).message }, "Task execution failed, retrying");
        if (retries > this.config.maxRetriesPerTask) {
          return {
            taskId: task.id,
            role: task.role,
            output: "",
            confidence: 0,
            tokenUsage: 0,
            durationMs: Date.now() - startTime,
            error: (error as Error).message,
          };
        }
        await this.delay(Math.pow(2, retries) * 500);
      }
    }

    return {
      taskId: task.id,
      role: task.role,
      output: "",
      confidence: 0,
      tokenUsage: 0,
      durationMs: Date.now() - startTime,
      error: "Max retries exceeded",
    };
  }

  private buildAgentPrompt(role: AgentRole, instruction: string, context: string, tools: ToolDefinition[]): string {
    const roleDescriptions: Record<AgentRole, string> = {
      planner: "You are a strategic Planner agent. Break down complex requests into actionable steps. Think ahead about dependencies and resource needs.",
      executor: "You are an Executor agent. Carry out the assigned task using available tools and information. Be thorough and precise.",
      critic: "You are a Critic agent. Review outputs for accuracy, completeness, and quality. Identify errors, omissions, and areas for improvement.",
      validator: "You are a Validator agent. Verify that results meet requirements and are factually correct. Flag any inconsistencies.",
      researcher: "You are a Research agent. Gather information, search for relevant data, and compile findings. Be thorough and cite sources.",
      memory: "You are a Memory agent. Store important information and retrieve relevant context from past interactions.",
      writer: "You are a Writer agent. Synthesize information into clear, well-structured responses. Be concise yet comprehensive.",
    };

    const parts: string[] = [
      roleDescriptions[role] || roleDescriptions.executor,
      "",
      `Your task: ${instruction}`,
    ];

    if (context) {
      parts.push("", context);
    }

    if (tools.length > 0) {
      parts.push("", "Available tools:", tools.map((t) => `- ${t.name}: ${t.description}`).join("\n"));
    }

    parts.push("", "Be concise, accurate, and helpful. If you cannot complete the task, explain why.");

    return parts.join("\n");
  }

  private async synthesizeResponse(
    plan: ExecutionPlan,
    results: AgentResult[],
    originalMessage: string,
    context: string
  ): Promise<string> {
    const writerTasks = results.filter((r) => r.role === "writer" || r.role === "executor");

    if (writerTasks.length > 0 && writerTasks[writerTasks.length - 1].output) {
      return writerTasks[writerTasks.length - 1].output;
    }

    const errors = results.filter((r) => r.error);
    if (errors.length > 0 && results.every((r) => r.error)) {
      return "I encountered some issues processing your request. The specific errors have been logged. Could you please try rephrasing your request?";
    }

    const outputs = results
      .filter((r) => r.output && !r.error)
      .map((r) => r.output);

    if (outputs.length === 0) {
      return "I processed your request but don't have a complete response. Could you provide more details?";
    }

    if (outputs.length === 1) {
      return outputs[0];
    }

    return outputs.join("\n\n");
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

export const orchestrator = new AgentOrchestrator();
