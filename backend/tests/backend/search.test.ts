import request from "supertest";
import type { Server } from "http";
import app from "../../src/app.js";
import { connectTestDb, resetDb } from "../__helpers__/db.js";
import { seedOrgWithAdmin } from "../__helpers__/users.js";

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
    const { headers, orgId } = await seedOrgWithAdmin({ email: `search-group-${Date.now()}@ex.com` });
    await agent().post("/api/projects").set(headers).send({ orgId, name: "Alpha Project" });
    await agent().post("/api/teams").set(headers).send({ orgId, name: "Alpha Team" });

    const res = await agent().get(`/api/search?orgId=${orgId}&q=Alpha`).set(headers);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.projects).toBeDefined();
    expect(res.body.data.teams).toBeDefined();
    expect(res.body.data.files).toBeDefined();
    expect(res.body.data.tasks).toBeDefined();
  });

  it("GET /api/search is scoped to orgId", async () => {
    const a = await seedOrgWithAdmin({ email: `search-scope-a-${Date.now()}@ex.com` });
    const b = await seedOrgWithAdmin({ email: `search-scope-b-${Date.now()}@ex.com` });
    await agent().post("/api/projects").set(a.headers).send({ orgId: a.orgId, name: "Project A" });
    await agent().post("/api/projects").set(b.headers).send({ orgId: b.orgId, name: "Project A" });

    const res = await agent().get(`/api/search?orgId=${a.orgId}&q=Project`).set(a.headers);
    expect(res.status).toBe(200);
    expect(res.body.data.projects.some((p: any) => p.name === "Project A")).toBe(true);
  });

  it("GET /api/search with missing orgId returns 400", async () => {
    const { headers } = await seedOrgWithAdmin({ email: `search-noorg-${Date.now()}@ex.com` });
    const res = await agent().get("/api/search?q=test").set(headers);
    expect(res.status).toBe(400);
  });

  it("GET /api/search with empty query returns 400", async () => {
    const { headers, orgId } = await seedOrgWithAdmin({ email: `search-noq-${Date.now()}@ex.com` });
    const res = await agent().get(`/api/search?orgId=${orgId}`).set(headers);
    expect(res.status).toBe(400);
  });
});
