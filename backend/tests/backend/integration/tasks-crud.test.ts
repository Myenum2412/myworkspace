import type { Server } from "http";
import app from "../../../src/app.js";
import { connectTestDb, resetDb } from "../../__helpers__/db.js";
import { seedOrgWithAdmin } from "../../__helpers__/users.js";

beforeAll(async () => { await app.ready(); });
afterAll(async () => { await app.close(); });


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
    const res = await agent()
      .post("/api/tasks")
      , headers:{headers}
      , payload:{ orgId, title: "Hello task", priority: "high" };
    expect(res.statusCode).toBe(201);
    expect(JSON.parse(res.payload).data.taskId).toBeTruthy();
  });

  it("GET /api/tasks returns only caller's org rows", async () => {
    const { headers, orgId } = await seedOrgWithAdmin({ email: `t1-${Date.now()}@ex.com` });
    const other = await seedOrgWithAdmin({ email: `t2-${Date.now()}@ex.com` });
    await agent()
      .post("/api/tasks")
      , headers:{headers}
      , payload:{ orgId, title: "My task", priority: "medium" };
    await agent()
      .post("/api/tasks")
      , headers:{other.headers}
      , payload:{ orgId: other.orgId, title: "Their task", priority: "medium" };

    const res = await agent().get(`/api/tasks?orgId=${orgId}`), headers:{headers};
    expect(res.statusCode).toBe(200);
    const titles = JSON.parse(res.payload).data.map((t: any) => t.title);
    expect(titles).toContain("My task");
    expect(titles).not.toContain("Their task");
    expect(JSON.parse(res.payload).pagination.total).toBe(1);
  });

  it("PUT /api/tasks updates the task", async () => {
    const { headers, orgId } = await seedOrgWithAdmin({ email: `tu-${Date.now()}@ex.com` });
    const created = await agent()
      .post("/api/tasks")
      , headers:{headers}
      , payload:{ orgId, title: "Before", priority: "low" };
    const id = created.body.data.taskId;
    // Valid transition: assigned → pending (for individual tasks)
    const res = await agent()
      .put(`/api/tasks/${id}`)
      , headers:{headers}
      , payload:{ title: "After", status: "assigned" };
    expect(res.statusCode).toBe(200);
    const fetch = await agent().get(`/api/tasks?orgId=${orgId}`), headers:{headers};
    expect(fetch.body.data.find((t: any) => t.title === "After")).toBeTruthy();
    expect(fetch.body.data.find((t: any) => t.status === "assigned")).toBeTruthy();
  });

  it("DELETE /api/tasks removes the row", async () => {
    const { headers, orgId } = await seedOrgWithAdmin({ email: `td-${Date.now()}@ex.com` });
    const created = await agent()
      .post("/api/tasks")
      , headers:{headers}
      , payload:{ orgId, title: "Removable", priority: "medium" };
    const id = created.body.data.taskId;
    const del = await agent().delete(`/api/tasks/${id}`), headers:{headers};
    expect(del.status).toBe(200);
    const fetch = await agent().get(`/api/tasks?orgId=${orgId}`), headers:{headers};
    expect(fetch.body.data.some((t: any) => t.title === "Removable")).toBe(false);
  });
});
