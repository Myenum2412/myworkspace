import { connectTestDb, resetDb } from "../../__helpers__/db.js";
import { ActivityLog } from "../../../src/lib/db/models/ActivityLog.js";
import { recordAuditLogDirect } from "../../../src/services/audit.service.js";

beforeAll(async () => await connectTestDb());
beforeEach(async () => await resetDb());

describe("recordAuditLog", () => {
  it("creates an entry in the ActivityLog collection", async () => {
    const entry = {
      orgId: "org-123",
      userId: "user-456",
      createdBy: "user-456",
      action: "task.created",
      entityType: "task",
      entityId: "task-789",
      description: "User created a new task",
      metadata: JSON.stringify({ source: "web", priority: "high" }),
    };

    await recordAuditLogDirect(entry);

    const log = await ActivityLog.findOne({ action: "task.created" }).lean();
    expect(log).not.toBeNull();
    expect(log!.orgId).toBe("org-123");
    expect(log!.userId).toBe("user-456");
    expect(log!.createdBy).toBe("user-456");
    expect(log!.entityType).toBe("task");
    expect(log!.entityId).toBe("task-789");
    expect(log!.description).toBe("User created a new task");
    expect(log!.metadata).toBe(JSON.stringify({ source: "web", priority: "high" }));
    expect(log!.createdAt).toBeDefined();
  });

  it("handles missing optional fields", async () => {
    const entry = {
      orgId: "org-abc",
      userId: "user-def",
      createdBy: "user-def",
      action: "project.deleted",
      entityType: "project",
      description: "User deleted a project",
    };

    await recordAuditLogDirect(entry);

    const log = await ActivityLog.findOne({ action: "project.deleted" }).lean();
    expect(log).not.toBeNull();
    expect(log!.orgId).toBe("org-abc");
    expect(log!.userId).toBe("user-def");
    expect(log!.createdBy).toBe("user-def");
    expect(log!.entityType).toBe("project");
    expect(log!.description).toBe("User deleted a project");
    expect(log!.entityId).toBeUndefined();
    expect(log!.metadata).toBeUndefined();
    expect(log!.createdAt).toBeDefined();
  });
});
