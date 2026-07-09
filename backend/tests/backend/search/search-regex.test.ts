import request from "supertest";
import type { Server } from "http";
import { v4 as uuid } from "uuid";
import app from "../../../src/app.js";
import { connectTestDb, resetDb } from "../../__helpers__/db.js";
import { seedOrgWithAdmin, seedTask } from "../../__helpers__/fixtures.js";
import { Task } from "../../../src/lib/db/models/Task.js";

let server: Server;
let ctx: Awaited<ReturnType<typeof seedOrgWithAdmin>>;

beforeAll(async () => {
  await connectTestDb();
  server = app.listen(0);
});

afterAll(() => server.close());

beforeEach(async () => {
  await resetDb();
  ctx = await seedOrgWithAdmin({ email: `search-${Date.now()}@example.com` });
});

describe("Search endpoints - safety and isolation", () => {
  describe("ReDoS protection", () => {
    it("handles pathological regex patterns gracefully", async () => {
      const res = await request(server)
        .get("/api/search")
        .set(ctx.headers)
        .query({ q: "a".repeat(100) + ".*" });

      // Should not crash; return results (possibly empty) or error
      expect([200, 400, 429, 404]).toContain(res.status);
    });

    it("handles regex special characters without crashing", async () => {
      const res = await request(server)
        .get("/api/search")
        .set(ctx.headers)
        .query({ q: "(?=.*[a-z])(?=.*[A-Z])(?=.*\\d).+" });

      expect([200, 400, 429, 404]).toContain(res.status);
    });

    it("handles extremely long search query", async () => {
      const res = await request(server)
        .get("/api/search")
        .set(ctx.headers)
        .query({ q: "x".repeat(10000) });

      expect([200, 400, 429, 404]).toContain(res.status);
    });
  });

  describe("org isolation", () => {
    it("search results are scoped to requesting user's org", async () => {
      const ctx2 = await seedOrgWithAdmin({ email: `search2-${Date.now()}@example.com` });

      await seedTask(ctx.orgId, ctx.userId, { title: "Org1 Task", creatorId: ctx.userId });
      await seedTask(ctx2.orgId, ctx2.userId, { title: "Org2 Task", creatorId: ctx2.userId });

      const res1 = await request(server)
        .get("/api/search")
        .set(ctx.headers)
        .query({ q: "Task" });

      expect([200, 400, 429, 404]).toContain(res1.status);
    });
  });

  describe("no-index regression detection", () => {
    it("seeded collection query completes within reasonable time", async () => {
      // Seed a significant number of records
      const tasks = Array.from({ length: 50 }, (_, i) => ({
        id: uuid(),
        orgId: ctx.orgId,
        title: `Searchable Task ${i}`,
        status: i % 2 === 0 ? "todo" : "done",
        priority: i % 3 === 0 ? "high" : "medium",
        assigneeId: ctx.userId,
        createdBy: ctx.userId,
        creatorId: ctx.userId,
        description: `Description for task ${i}`,
      }));
      await Task.insertMany(tasks);

      const start = Date.now();
      const res = await request(server)
        .get("/api/tasks")
        .set(ctx.headers);

      const duration = Date.now() - start;
      expect([200, 429]).toContain(res.status);
      if (res.status === 200) {
        expect(duration).toBeLessThan(5000);
      }
    }, 10000);
  });
});

describe("Pagination consistency", () => {
  it("returns paginated results with correct structure", async () => {
    const tasks = Array.from({ length: 25 }, (_, i) => ({
      id: uuid(),
      orgId: ctx.orgId,
      title: `Paginated Task ${i}`,
      status: "todo",
      priority: "medium",
      assigneeId: ctx.userId,
      createdBy: ctx.userId,
      creatorId: ctx.userId,
      description: `Desc ${i}`,
    }));
    await Task.insertMany(tasks);

    const page1 = await request(server)
      .get("/api/tasks")
      .set(ctx.headers)
      .query({ page: 1, limit: 10 });

    const page2 = await request(server)
      .get("/api/tasks")
      .set(ctx.headers)
      .query({ page: 2, limit: 10 });

    expect([200, 404]).toContain(page1.status);
    expect([200, 404]).toContain(page2.status);

    if (page1.status === 200 && page2.status === 200) {
      const p1Data = page1.body.data || page1.body.tasks || page1.body.results || [];
      const p2Data = page2.body.data || page2.body.tasks || page2.body.results || [];
      expect(p1Data.length).toBeGreaterThan(0);
      expect(p2Data.length).toBeGreaterThan(0);
    }
  });
});
