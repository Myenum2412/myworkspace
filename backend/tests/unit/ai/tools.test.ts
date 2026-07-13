import { ToolRegistry } from "../../../src/services/ai/tools/registry.js";
import { BaseTool } from "../../../src/services/ai/tools/base-tool.js";
import { ToolApproval } from "../../../src/services/ai/tools/approval.js";
import type { ToolMetadata } from "../../../src/services/ai/types/tool.types.js";

describe("Tool Registry", () => {
  let registry: ToolRegistry;

  beforeEach(() => {
    registry = ToolRegistry.getInstance();
    registry.reset();
  });

  describe("Registration", () => {
    it("should register a tool", async () => {
      await registry.initializeBuiltInTools();
      expect(registry.getToolCount()).toBeGreaterThan(0);
    });

    it("should not allow duplicate registration", async () => {
      await registry.initializeBuiltInTools();
      const count = registry.getToolCount();
      await registry.initializeBuiltInTools();
      expect(registry.getToolCount()).toBe(count);
    });

    it("should retrieve tool definitions", async () => {
      await registry.initializeBuiltInTools();
      const defs = registry.getDefinitions();
      expect(defs.length).toBeGreaterThan(0);
      defs.forEach((def) => {
        expect(def.name).toBeDefined();
        expect(def.description).toBeDefined();
        expect(def.parameters).toBeDefined();
      });
    });
  });

  describe("Tool Execution", () => {
    it("should return error for unknown tool", async () => {
      const result = await registry.execute("nonexistent_tool", {});
      expect(result.success).toBe(false);
      expect(result.error).toContain("Unknown tool");
    });

    it("should return available toolsets", async () => {
      await registry.initializeBuiltInTools();
      const toolsets = registry.getToolsetNames();
      expect(Array.isArray(toolsets)).toBe(true);
      expect(toolsets.length).toBeGreaterThan(0);
    });
  });

  describe("Availability Cache", () => {
    it("should clear availability cache", async () => {
      await registry.initializeBuiltInTools();
      registry.clearAvailabilityCache();
      expect(registry.getToolCount()).toBeGreaterThan(0);
    });

    it("should reset entirely", () => {
      registry.reset();
      expect(registry.getToolCount()).toBe(0);
    });
  });
});

describe("Approval System", () => {
  describe("Dangerous Operation Detection", () => {
    it("should flag rm -rf as dangerous", () => {
      const result = ToolApproval.checkDangerousOperation("execute_command", { command: "rm -rf /" });
      expect(result.requiresApproval).toBe(true);
      expect(result.level).toBe("high");
    });

    it("should flag DROP TABLE as dangerous", () => {
      const result = ToolApproval.checkDangerousOperation("query_database", { query: "DROP TABLE users" });
      expect(result.requiresApproval).toBe(true);
    });

    it("should flag chmod 777 as medium", () => {
      const result = ToolApproval.checkDangerousOperation("file_operation", { path: "/etc", mode: "chmod 777" });
      expect(result.level).toBe("medium");
    });

    it("should allow safe operations", () => {
      const result = ToolApproval.checkDangerousOperation("search", { query: "tasks" });
      expect(result.requiresApproval).toBe(false);
      expect(result.level).toBe("none");
    });

    it("should be case insensitive", () => {
      const result = ToolApproval.checkDangerousOperation("run", { script: "RM -RF /" });
      expect(result.requiresApproval).toBe(true);
    });
  });
});

describe("Tool Instantiation", () => {
  it("BaseTool should throw on unimplemented methods", () => {
    const tool = new (class extends BaseTool {
      static metadata: ToolMetadata = { name: "test", description: "test", toolset: "test" };
    })();

    expect(() => tool.getDefinition()).toThrow("Tool must implement getDefinition()");
  });

  it("BaseTool checkAvailability should check env vars", () => {
    const tool = new (class extends BaseTool {
      static metadata: ToolMetadata = { name: "test", description: "test", toolset: "test", requiresEnv: ["NONEXISTENT_VAR"] };
      getDefinition() { return { name: "test", description: "test", parameters: {} }; }
      async execute() { return this.success("ok"); }
    })();

    expect(tool.checkAvailability()).toBe(false); // NONEXISTENT_VAR should be missing
  });

  it("BaseTool should provide helper methods", () => {
    const tool = new (class extends BaseTool {
      static metadata: ToolMetadata = { name: "test", description: "test", toolset: "test" };
      getDefinition() { return { name: "test", description: "test", parameters: {} }; }
      async execute() {
        return this.success("done", { count: 1 }, 100);
      }
    })();

    const result = tool.success("done", { count: 1 }, 100);
    expect(result.success).toBe(true);
    expect(result.output).toBe("done");
  });

  it("BaseTool error helper should produce error result", () => {
    const tool = new (class extends BaseTool {
      static metadata: ToolMetadata = { name: "test", description: "test", toolset: "test" };
      getDefinition() { return { name: "test", description: "test", parameters: {} }; }
      async execute() { return this.error("Something failed"); }
    })();

    const result = tool.error("Something failed");
    expect(result.success).toBe(false);
    expect(result.error).toBe("Something failed");
  });
});
