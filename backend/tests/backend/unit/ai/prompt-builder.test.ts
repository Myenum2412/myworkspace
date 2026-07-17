import { PromptBuilder } from "../../../../src/services/ai/prompt-builder.service.js";
import { ContextData } from "../../../../src/services/ai/context-manager.service.js";

describe("PromptBuilder", () => {
  let builder: PromptBuilder;

  beforeEach(() => {
    builder = new PromptBuilder();
  });

  const mockContext: ContextData = {
    workspace: { name: "Test Workspace", companyName: "Test Corp", plan: "enterprise" },
    user: { name: "John Doe", email: "john@test.com", role: "admin" },
    currentPage: "Projects",
    projects: [{ _id: "1", name: "Project Alpha", status: "active" }],
    tasks: [{ _id: "1", title: "Task 1", status: "in_progress", priority: "high" }],
    clients: [{ _id: "1", name: "Client A" }],
    teams: [{ _id: "1", name: "Team X" }],
    permissions: ["MANAGE_PROJECTS"],
  };

  it("builds messages with system prompt and context", () => {
    const result = builder.build({
      prompt: "What are my priorities?",
      contextData: mockContext,
      fileContents: [],
      history: [],
      systemPrompt: "You are an expert AI assistant.",
    });

    expect(result.length).toBe(2);
    expect(result[0].role).toBe("system");
    expect(result[0].content).toContain("You are an expert AI assistant.");
    expect(result[0].content).toContain("Test Workspace");
    expect(result[0].content).toContain("Project Alpha");
    expect(result[1].role).toBe("user");
    expect(result[1].content).toBe("What are my priorities?");
  });

  it("includes file contents in user message", () => {
    const result = builder.build({
      prompt: "Summarize this file",
      contextData: mockContext,
      fileContents: ["File content here"],
      history: [],
      systemPrompt: "Test",
    });

    expect(result[1].content).toContain("**Attached Files:**");
    expect(result[1].content).toContain("File content here");
  });

  it("includes conversation history", () => {
    const history = [
      { _id: "1", conversationId: "c1", orgId: "o1", userId: "u1", role: "user" as const, content: "Previous question", createdAt: new Date().toISOString() as any },
      { _id: "2", conversationId: "c1", orgId: "o1", userId: "u1", role: "assistant" as const, content: "Previous answer", createdAt: new Date().toISOString() as any },
    ] as any;

    const result = builder.build({
      prompt: "Follow up",
      contextData: mockContext,
      fileContents: [],
      history,
      systemPrompt: "Test",
    });

    expect(result.length).toBe(4);
    expect(result[1].content).toBe("Previous question");
    expect(result[2].content).toBe("Previous answer");
  });

  it("builds quick action prompts correctly", () => {
    const prompt = builder.buildQuickActionPrompt("summarize", "Long content here", mockContext);
    expect(prompt).toContain("Summarize");
    expect(prompt).toContain("Test Workspace");
    expect(prompt).toContain("John Doe");
  });
});
