import { describe, it, expect, beforeAll, afterAll } from "@jest/globals";
import request from "supertest";
import mongoose from "mongoose";
import { OrgMember } from "../../src/lib/db/models/OrgMember.js";
import app from "../../src/app.js";
import { startDb, stopDb, authHeader } from "../helpers.js";

const userId = "000000000000000000000001";
const orgA = new mongoose.Types.ObjectId().toHexString();
const orgB = new mongoose.Types.ObjectId().toHexString();
let projectBId: string;

describe("Projects API — org-scoping", () => {
  beforeAll(async () => {
    await startDb();
    await OrgMember.create({ orgId: orgA, userId, role: "admin" });

    const col = mongoose.connection.db.collection("projects");
    await col.insertOne({ id: "proj-a", orgId: orgA, name: "Project A", client: "C1", color: "#000", tracked: 0, progress: 0, access: "Public", status: "Active", createdAt: new Date(), updatedAt: new Date() });
    const b = await col.insertOne({ id: "proj-b", orgId: orgB, name: "Project B", client: "C2", color: "#fff", tracked: 0, progress: 0, access: "Public", status: "Active", createdAt: new Date(), updatedAt: new Date() });
    projectBId = "proj-b";
  });
  afterAll(stopDb);

  it("GET / returns only scoped projects", async () => {
    const res = await request(app).get("/api/projects").set(authHeader({ userId }));
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].name).toBe("Project A");
  });

  it("POST / creates a project", async () => {
    const res = await request(app)
      .post("/api/projects")
      .set(authHeader({ userId }))
      .send({ orgId: orgA, name: "New Project", client: "C3" });
    expect(res.status).toBe(201);
    expect(res.body.data?.name).toBe("New Project");
  });

  it("PUT /:id rejects cross-org update", async () => {
    const res = await request(app)
      .put(`/api/projects/${projectBId}`)
      .set(authHeader({ userId }))
      .send({ name: "Hacked" });
    expect(res.status).toBe(403);
  });

  it("DELETE /:id rejects cross-org delete", async () => {
    const res = await request(app)
      .delete(`/api/projects/${projectBId}`)
      .set(authHeader({ userId }));
    expect(res.status).toBe(403);
  });
});
