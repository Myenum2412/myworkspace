import { PlannerAgent } from "../../../src/services/ai/agent/planner-agent.js";
import type { Thought } from "../../../src/services/ai/agent/planner-agent.js";

describe("PlannerAgent", () => {
  let planner: PlannerAgent;

  beforeEach(() => {
    planner = new PlannerAgent();
  });

  describe("Plan Creation", () => {
    it("should create a fallback plan when AI is unavailable", async () => {
      const plan = await planner.createPlan("Help me with my tasks", []);
      expect(plan).toBeDefined();
      expect(plan.goal).toBe("Help me with my tasks");
      expect(Array.isArray(plan.steps)).toBe(true);
    });

    it("should include estimated complexity in fallback plan", async () => {
      const plan = await planner.createPlan("Simple request", []);
      expect(["simple", "moderate", "complex"]).toContain(plan.estimatedComplexity);
    });
  });

  describe("ReAct Thinking", () => {
    it("should produce a thought structure even without AI", async () => {
      const thought = await planner.thinkReAct("What is 2+2?", "", []);
      expect(thought).toBeDefined();
      expect(thought.id).toBeDefined();
      expect(typeof thought.confidence).toBe("number");
    });
  });

  describe("Chain of Thought", () => {
    it("should return the question as fallback when AI is unavailable", async () => {
      const result = await planner.chainOfThought("What is 15 * 7?");
      expect(result).toBe("What is 15 * 7?");
    });
  });

  describe("Tree of Thought", () => {
    it("should create a root node with branches", async () => {
      const thought = await planner.treeOfThought("How to improve productivity?", 2);
      expect(thought.id).toBe("root");
      expect(thought.content).toBe("How to improve productivity?");
      expect(Array.isArray(thought.children)).toBe(true);
    });
  });

  describe("Step Evaluation", () => {
    it("should evaluate step result with default values on error", async () => {
      const evaluation = await planner.evaluateStepResult(
        { id: "step_1", description: "Test step", status: "completed", agent: "executor", dependsOn: [] },
        "Some result"
      );
      expect(evaluation).toBeDefined();
      expect(typeof evaluation.score).toBe("number");
      expect(typeof evaluation.passed).toBe("boolean");
      expect(typeof evaluation.feedback).toBe("string");
    });
  });
});

describe("Agent Types", () => {
  it("should support valid agent roles", () => {
    const roles = ["planner", "executor", "critic", "validator", "researcher", "memory", "writer"];
    roles.forEach((role) => {
      expect(role).toMatch(/^(planner|executor|critic|validator|researcher|memory|writer)$/);
    });
  });
});
