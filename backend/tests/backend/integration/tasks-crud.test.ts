import request from "supertest";
import type { Server } from "http";
import app from "../../../src/app.js";
import { connectTestDb, resetDb } from "../../__helpers__/db.js";
import { seedOrgWithAdmin } from "../../__helpers__/users.js";

let server: Server;
beforeAll(async () => {
  await connectTestDb();
  server = app.listen(0);
});
afterAll(() => server.close());
beforeEach(async () => {
  await resetDb();
});

function agent() {
  return request(server);
}

describe("tasks CRUD (with Mongo)", () => {
  it("POST /api/tasks persists a task in caller's org", async () => {
    const { headers, orgId } = await seedOrgWithAdmin({ email: `t${Date.now()}@ex.com` });
    const res = await agent().post("/api/tasks").set(headers).send({ orgId, title: "Hello task", priority: "high" });
    expect(res.status).toBe(201);
    expect(res.body.data.taskId).toBeTruthy();
  });

  it("GET /api/tasks returns only caller's org rows", async () => {
    const { headers, orgId } = await seedOrgWithAdmin({ email: `t1-${Date.now()}@ex.com` });
    const other = await seedOrgWithAdmin({ email: `t2-${Date.now()}@ex.com` });
    await agent().post("/api/tasks").set(headers).send({ orgId, title: "My task", priority: "medium" });
    await agent().post("/api/tasks").set(other.headers).send({ orgId: other.orgId, title: "Their task", priority: "medium" });

    const res = await agent().get(`/api/tasks?orgId=${orgId}`).set(headers);
    expect(res.status).toBe(200);
    const titles = res.body.data.map((t: any) => t.title);
    expect(titles).toContain("My task");
    expect(titles).not.toContain("Their task");
    expect(res.body.pagination.total).toBe(1);
  });

  it("PUT /api/tasks updates the task", async () => {
    const { headers, orgId } = await seedOrgWithAdmin({ email: `tu-${Date.now()}@ex.com` });
    const created = await agent().post("/api/tasks").set(headers).send({ orgId, title: "Before", priority: "low" });
    const id = created.body.data.taskId;
    const res = await agent().put(`/api/tasks/${id}`).set(headers).send({ title: "After", status: "done" });
    expect(res.status).toBe(200);
    const fetch = await agent().get(`/api/tasks?orgId=${orgId}`).set(headers);
    expect(fetch.body.data.find((t: any) => t.title === "After")).toBeTruthy();
    expect(fetch.body.data.find((t: any) => t.status === "done")).toBeTruthy();
  });

  it("DELETE /api/tasks removes the row", async () => {
    const { headers, orgId } = await seedOrgWithAdmin({ email: `td-${Date.now()}@ex.com` });
    const created = await agent().post("/api/tasks").set(headers).send({ orgId, title: "Removable", priority: "medium" });
    const id = created.body.data.taskId;
    const del = await agent().delete(`/api/tasks/${id}`).set(headers);
    expect(del.status).toBe(200);
    const fetch = await agent().get(`/api/tasks?orgId=${orgId}`).set(headers);
    expect(fetch.body.data.some((t: any) => t.title === "Removable")).toBe(false);
  });
});
