import { ContextManager } from "../../../../src/services/ai/context-manager.service.js";
import { connectTestDb, resetDb } from "../../../__helpers__/db.js";
import { Organization } from "../../../../src/lib/db/models/Organization.js";
import { OrgMember } from "../../../../src/lib/db/models/OrgMember.js";
import { User } from "../../../../src/lib/db/models/User.js";

describe("ContextManager", () => {
  let manager: ContextManager;

  beforeAll(async () => await connectTestDb());
  beforeEach(async () => {
    await resetDb();
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
