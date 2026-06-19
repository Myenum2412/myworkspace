import { describe, it, expect, beforeAll, afterAll } from "@jest/globals";
import request from "supertest";
import mongoose from "mongoose";
import { Task } from "../../src/lib/db/models/Task.js";
import { OrgMember } from "../../src/lib/db/models/OrgMember.js";
import app from "../../src/app.js";
import { startDb, stopDb, authHeader } from "../helpers.js";

const orgA = new mongoose.Types.ObjectId().toString();
const orgB = new mongoose.Types.ObjectId().toString();
const userId = "000000000000000000000001";

describe("Tasks API — org-scoping", () => {
  beforeAll(async () => {
    await startDb();
    await OrgMember.create({ orgId: orgA, userId, role: "admin" });
    await Task.create({ orgId: orgA, creatorId: userId, title: "Task A1", status: "todo" });
    await Task.create({ orgId: orgA, creatorId: userId, title: "Task A2", status: "done" });
    await Task.create({ orgId: orgB, creatorId: userId, title: "Task B1", status: "in_progress" });
  });
  afterAll(stopDb);

  it("GET / returns only scoped tasks when orgId provided", async () => {
    const res = await request(app).get(`/api/tasks?orgId=${orgA}`).set(authHeader({ userId }));
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(2);
  });

  it("GET / returns only scoped tasks when resolved from org membership", async () => {
    const res = await request(app).get("/api/tasks").set(authHeader({ userId }));
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(2);
  });

  it("POST / creates task in the provided org", async () => {
    const res = await request(app)
      .post("/api/tasks")
      .set(authHeader({ userId }))
      .send({ orgId: orgA, title: "New Task" });
    expect(res.status).toBe(201);
    expect(res.body.data?.taskId).toBeDefined();
  });

  it("PUT /:id rejects cross-org update", async () => {
    const taskB = await Task.findOne({ orgId: orgB }).lean();
    const res = await request(app)
      .put(`/api/tasks/${taskB!._id}`)
      .set(authHeader({ userId }))
      .send({ title: "Hacked" });
    expect(res.status).toBe(403);
  });

  it("DELETE /:id rejects cross-org delete", async () => {
    const taskB = await Task.findOne({ orgId: orgB }).lean();
    const res = await request(app)
      .delete(`/api/tasks/${taskB!._id}`)
      .set(authHeader({ userId }));
    expect(res.status).toBe(403);
  });

  it("PATCH /:id/status rejects cross-org update", async () => {
    const taskB = await Task.findOne({ orgId: orgB }).lean();
    const res = await request(app)
      .patch(`/api/tasks/${taskB!._id}/status`)
      .set(authHeader({ userId }))
      .send({ status: "done" });
    expect(res.status).toBe(403);
  });
});
