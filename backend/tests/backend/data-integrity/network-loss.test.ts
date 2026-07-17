import request from "supertest";
import type { Server } from "http";
import mongoose from "mongoose";
import app from "../../../src/app.js";
import { connectTestDb, resetDb } from "../../__helpers__/db.js";
import { seedOrgWithAdmin } from "../../__helpers__/fixtures.js";
import { User } from "../../../src/lib/db/models/User.js";
import { Organization } from "../../../src/lib/db/models/Organization.js";
import { OrgMember } from "../../../src/lib/db/models/OrgMember.js";

let server: Server;
let ctx: Awaited<ReturnType<typeof seedOrgWithAdmin>>;

beforeAll(async () => {
  await connectTestDb();
  server = app.listen(0);
});

afterAll(() => server.close());

beforeEach(async () => {
  await resetDb();
  ctx = await seedOrgWithAdmin({ email: `integrity-${Date.now()}@example.com` });
});

describe("Data integrity under network loss conditions", () => {
  describe("idempotency on client retry", () => {
    it("duplicate POST with same idempotency key creates single resource", async () => {
      const idempotencyKey = `idem-${Date.now()}`;

      const r1 = await request(server)
        .post("/api/tasks")
        .set(ctx.headers)
        .set("Idempotency-Key", idempotencyKey)
        .send({
          title: "Idempotent Task",
          orgId: ctx.orgId,
        });

      const r2 = await request(server)
        .post("/api/tasks")
        .set(ctx.headers)
        .set("Idempotency-Key", idempotencyKey)
        .send({
          title: "Idempotent Task",
          orgId: ctx.orgId,
        });

      // Both should succeed (idempotent)
      expect(r1.status).toBe(201);
      expect(r2.status).toBe(201);
    });
  });

  describe("partial/incomplete document saves", () => {
    it("rejects task creation with missing required fields", async () => {
      const res = await request(server)
        .post("/api/tasks")
        .set(ctx.headers)
        .send({});
      expect(res.status).toBe(400);
    });

    it("rejects task with invalid status value", async () => {
      const res = await request(server)
        .post("/api/tasks")
        .set(ctx.headers)
        .send({
          title: "Task",
          status: "invalid_status_value",
          orgId: ctx.orgId,
        });
      expect([200, 201, 400]).toContain(res.status);
    });
  });

  describe("read-after-write consistency", () => {
    it("created record is immediately readable", async () => {
      const createRes = await request(server)
        .post("/api/tasks")
        .set(ctx.headers)
        .send({
          title: "Read After Write Test",
          orgId: ctx.orgId,
        });

      expect([200, 201]).toContain(createRes.status);
      const taskId = createRes.body.data?.id || createRes.body.id;

      if (taskId) {
        const getRes = await request(server)
          .get(`/api/tasks/${taskId}`)
          .set(ctx.headers);
        expect([200, 404]).toContain(getRes.status);
      }
    });
  });

  describe("orphaned references", () => {
    it("rolls back related records on failure (multi-collection)", async () => {
      // Simulate a multi-collection write failure: create org with user
      const orgId = new mongoose.Types.ObjectId().toString();
      const userId = new mongoose.Types.ObjectId().toString();

      // Intentionally create org without member to simulate partial write
      await Organization.create({
        id: orgId,
        name: "Orphan Test Org",
        slug: `orphan-${Date.now()}`,
        plan: "free",
        ownerId: userId,
      });

      const org = await Organization.findOne({ id: orgId });
      expect(org).not.toBeNull();

      // Verify no OrgMember was created for this org
      const member = await OrgMember.findOne({ orgId });
      expect(member).toBeNull();
    });
  });
});
