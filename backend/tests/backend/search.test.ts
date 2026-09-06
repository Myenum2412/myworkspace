import type { Server } from "http";
import app from "../../src/app.js";
import { connectTestDb, resetDb } from "../__helpers__/db.js";
import { seedOrgWithAdmin } from "../__helpers__/users.js";

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

describe("enhanced search", () => {
  it("GET /api/search returns results grouped by entity type", async () => {
    const { headers, orgId } = await seedOrgWithAdmin({
      email: `search-group-${Date.now()}@ex.com`,
    });
    await agent().post("/api/projects"), headers:{headers}, payload:{ orgId, name: "Alpha Project" };
    await agent().post("/api/teams"), headers:{headers}, payload:{ orgId, name: "Alpha Team" };

    const res = await agent().get(`/api/search?orgId=${orgId}&q=Alpha`), headers:{headers};
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.payload).success).toBe(true);
    expect(JSON.parse(res.payload).data.projects).toBeDefined();
    expect(JSON.parse(res.payload).data.teams).toBeDefined();
    expect(JSON.parse(res.payload).data.files).toBeDefined();
    expect(JSON.parse(res.payload).data.tasks).toBeDefined();
  });

  it("GET /api/search is scoped to orgId", async () => {
    const a = await seedOrgWithAdmin({ email: `search-scope-a-${Date.now()}@ex.com` });
    const b = await seedOrgWithAdmin({ email: `search-scope-b-${Date.now()}@ex.com` });
    await agent().post("/api/projects"), headers:{a.headers}, payload:{ orgId: a.orgId, name: "Project A" };
    await agent().post("/api/projects"), headers:{b.headers}, payload:{ orgId: b.orgId, name: "Project A" };

    const res = await agent().get(`/api/search?orgId=${a.orgId}&q=Project`), headers:{a.headers};
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.payload).data.projects.some((p: any) => p.name === "Project A")).toBe(true);
  });

  it("GET /api/search with missing orgId returns 400", async () => {
    const { headers } = await seedOrgWithAdmin({ email: `search-noorg-${Date.now()}@ex.com` });
    const res = await agent().get("/api/search?q=test"), headers:{headers};
    expect(res.statusCode).toBe(400);
  });

  it("GET /api/search with empty query returns 400", async () => {
    const { headers, orgId } = await seedOrgWithAdmin({ email: `search-noq-${Date.now()}@ex.com` });
    const res = await agent().get(`/api/search?orgId=${orgId}`), headers:{headers};
    expect(res.statusCode).toBe(400);
  });
});
