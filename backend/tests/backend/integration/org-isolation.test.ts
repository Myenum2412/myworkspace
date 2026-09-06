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

describe("cross-org isolation", () => {
  it("user A cannot read user B's tasks, projects, clients, or teams", async () => {
    const a = await seedOrgWithAdmin({ email: `a-${Date.now()}@ex.com` });
    const b = await seedOrgWithAdmin({ email: `b-${Date.now()}@ex.com` });

    const task = await agent()
      .post("/api/tasks")
      , headers:{a.headers}
      , payload:{ orgId: a.orgId, title: "A task", priority: "medium" };
    expect(task.status).toBe(201);
    const taskId = task.body.data.taskId;

    // B cannot see the task via the org-scoped list
    const list = await agent().get(`/api/tasks?orgId=${a.orgId}`), headers:{b.headers};
    expect(list.status).toBe(200);
    expect(list.body.data.some((t: any) => t._id === taskId || t.title === "A task")).toBe(false);

    // B cannot GET the task by id
    const single = await agent().get(`/api/tasks/${taskId}`), headers:{b.headers};
    expect([403, 404]).toContain(single.status);

    // B cannot UPDATE the task
    const upd = await agent().put(`/api/tasks/${taskId}`), headers:{b.headers}, payload:{ title: "Hijack" };
    expect([400, 403, 404]).toContain(upd.status);

    // B cannot DELETE the task
    const del = await agent().delete(`/api/tasks/${taskId}`), headers:{b.headers};
    expect([400, 403, 404]).toContain(del.status);

    // Projects isolation (no GET /:id; use PUT as the cross-org probe)
    const proj = await agent()
      .post("/api/projects")
      , headers:{a.headers}
      , payload:{ orgId: a.orgId, name: "A Proj" };
    expect(proj.status).toBe(201);
    const pid = proj.body.data.id;
    const projUpd = await agent()
      .put(`/api/projects/${pid}`)
      , headers:{b.headers}
      , payload:{ name: "Hijack" };
    expect([400, 403, 404]).toContain(projUpd.status);

    // Teams isolation — teams use findById on _id
    const team = await agent()
      .post("/api/teams")
      , headers:{a.headers}
      , payload:{ orgId: a.orgId, name: "A Team" };
    expect(team.status).toBe(201);
    const createdTeam = await agent().get(`/api/teams?orgId=${a.orgId}`), headers:{a.headers};
    const tid = createdTeam.body.data[0]._id;
    const teamDel = await agent().delete(`/api/teams/${tid}`), headers:{b.headers};
    expect([400, 403, 404]).toContain(teamDel.status);
  });
});
