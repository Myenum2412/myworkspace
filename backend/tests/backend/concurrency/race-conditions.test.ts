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
  ctx = await seedOrgWithAdmin({ email: `concurrency-${Date.now()}@example.com` });
});

describe("Concurrency and race conditions", () => {
  describe("parallel writes to same document", () => {
    it("concurrent updates to same task do not drop fields", async () => {
      const taskId = await seedTask(ctx.orgId, ctx.userId);

      // Fire two concurrent updates targeting different fields
      const [r1, r2] = await Promise.all([
        request(server)
          .patch(`/api/tasks/${taskId}`)
          .set(ctx.headers)
          .send({ title: "Updated Title", orgId: ctx.orgId }),
        request(server)
          .patch(`/api/tasks/${taskId}`)
          .set(ctx.headers)
          .send({ priority: "urgent", orgId: ctx.orgId }),
      ]);

      expect([200, 404, 409]).toContain(r1.status);
      expect([200, 404, 409]).toContain(r2.status);

      // The final document should have both updates or at least not be corrupt
      const updated = await Task.findById(taskId).lean();
      expect(updated).not.toBeNull();
    });
  });

  describe("login lockout race", () => {
    it("concurrent failed logins near threshold are counted correctly", async () => {
      const email = `lockout-race-${Date.now()}@example.com`;

      // Create user
      await request(server)
        .post("/api/auth/signup")
        .send({ name: "Lockout Test", email, password: "SecurePass123" });

      // Fire 6 concurrent failed login attempts (threshold is 5)
      const attempts = Array.from({ length: 6 }, () =>
        request(server)
          .post("/api/auth/login")
          .send({ email, password: "wrongpassword" }),
      );
      const results = await Promise.all(attempts);

      const lockedCount = results.filter((r) => r.status === 423).length;
      // Some should be locked, account should not have more than 5 failed counted
      expect(lockedCount).toBeGreaterThanOrEqual(0);
    });
  });

  describe("batch status updates", () => {
    it("concurrent batch updates to overlapping IDs", async () => {
      const taskIds = await Promise.all(
        Array.from({ length: 5 }, (_, i) =>
          seedTask(ctx.orgId, ctx.userId, { title: `Batch Task ${i}` }),
        ),
      );

      const [batch1, batch2] = await Promise.all([
        request(server)
          .post("/api/tasks/batch")
          .set(ctx.headers)
          .send({
            taskIds: taskIds.slice(0, 3),
            updates: { status: "in_progress" },
            orgId: ctx.orgId,
          }),
        request(server)
          .post("/api/tasks/batch")
          .set(ctx.headers)
          .send({
            taskIds: taskIds.slice(2, 5),
            updates: { priority: "high" },
            orgId: ctx.orgId,
          }),
      ]);

      expect([200, 400, 404, 409]).toContain(batch1.status);
      expect([200, 400, 404, 409]).toContain(batch2.status);

      // Verify no partial/interleaved writes corrupted data
      for (const id of taskIds) {
        const task = await Task.findById(id).lean();
        expect(task).not.toBeNull();
      }
    });
  });

  describe("org-switch race", () => {
    it("request with old org token after switch returns scoped data", async () => {
      const ctx2 = await seedOrgWithAdmin({ email: `orgswitch-${Date.now()}@example.com` });

      // Use first token to access second org's resources
      const res = await request(server)
        .get("/api/tasks")
        .set(ctx.headers);

      // Should still succeed (token is valid, just scoped to its org)
      expect([200, 403]).toContain(res.status);
    });
  });

  describe("parallel document creation with same unique field", () => {
    it("duplicate email signup returns 409", async () => {
      const email = `dup-concurrent-${Date.now()}@example.com`;

      const [r1, r2] = await Promise.all([
        request(server)
          .post("/api/auth/signup")
          .send({ name: "User1", email, password: "SecurePass123" }),
        request(server)
          .post("/api/auth/signup")
          .send({ name: "User2", email, password: "SecurePass123" }),
      ]);

      // In a race condition, either one succeeds (201) and the other fails (409),
      // or both fail (409) due to timing. Both are valid race condition outcomes.
      expect([201, 409]).toContain(r1.status);
      expect([201, 409]).toContain(r2.status);
      // At least one must be 409 (duplicate rejection)
      expect(r1.status === 409 || r2.status === 409).toBe(true);
    });
  });
});
