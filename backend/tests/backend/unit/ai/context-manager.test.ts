import { ContextManager } from "../../../../src/services/ai/context-manager.service.js";

describe("ContextManager", () => {
  let manager: ContextManager;

  beforeEach(() => {
    manager = new ContextManager();
  });

  it("builds context with basic user info when org context is missing data", async () => {
    const context = await manager.buildContext({
      orgId: "nonexistent-org",
      userId: "nonexistent-user",
      context: "workspace",
    });

    expect(context.user).toBeDefined();
    expect(context.permissions).toBeDefined();
    expect(context.projects).toBeDefined();
    expect(context.tasks).toBeDefined();
    expect(context.clients).toBeDefined();
    expect(context.teams).toBeDefined();
  });

  it("passes through workspace context", async () => {
    const context = await manager.buildContext({
      orgId: "org-1",
      userId: "user-1",
      context: "workspace",
      workspaceContext: {
        currentPage: "Projects",
        project: "Test Project",
      },
    });

    expect(context.currentPage).toBe("Projects");
  });

  it("returns empty arrays for staff context when no teams exist", async () => {
    const context = await manager.buildContext({
      orgId: "org-1",
      userId: "user-1",
      context: "staff",
    });

    expect(context.teams).toEqual([]);
    expect(context.tasks).toEqual([]);
  });
});
