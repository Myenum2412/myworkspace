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

describe("automation CRUD", () => {
  it("POST /api/automation/workflows creates a workflow", async () => {
    const { headers } = await seedOrgWithAdmin({ email: `auto-create-${Date.now()}@ex.com` });
    const res = await agent().post("/api/automation/workflows").set(headers).send({ name: "Test Workflow" });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.name).toBe("Test Workflow");
  });

  it("GET /api/automation/workflows lists workflows scoped to org", async () => {
    const a = await seedOrgWithAdmin({ email: `auto-list-a-${Date.now()}@ex.com` });
    const b = await seedOrgWithAdmin({ email: `auto-list-b-${Date.now()}@ex.com` });

    await agent().post("/api/automation/workflows").set(a.headers).send({ name: "Org A Workflow" });
    await agent().post("/api/automation/workflows").set(b.headers).send({ name: "Org B Workflow" });

    const res = await agent().get("/api/automation/workflows").set(a.headers);
    expect(res.status).toBe(200);
    const names = res.body.data.map((w: any) => w.name);
    expect(names).toContain("Org A Workflow");
    expect(names).not.toContain("Org B Workflow");
  });

  it("POST /api/automation/leads with duplicate email returns 409", async () => {
    const { headers } = await seedOrgWithAdmin({ email: `lead-dup-${Date.now()}@ex.com` });
    const email = `dup-lead-${Date.now()}@ex.com`;

    await agent().post("/api/automation/leads").set(headers).send({ name: "First", email });
    const res = await agent().post("/api/automation/leads").set(headers).send({ name: "Second", email });
    expect(res.status).toBe(409);
  });

  it("PATCH /api/automation/leads/:id setting status to converted auto-sets convertedAt", async () => {
    const { headers } = await seedOrgWithAdmin({ email: `lead-conv-${Date.now()}@ex.com` });
    const email = `convert-lead-${Date.now()}@ex.com`;
    const created = await agent().post("/api/automation/leads").set(headers).send({ name: "Convertible", email });
    const leadId = created.body.data.id;

    const res = await agent().patch(`/api/automation/leads/${leadId}`).set(headers).send({ status: "converted" });
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe("converted");
    expect(res.body.data.convertedAt).toBeTruthy();
  });

  it("POST /api/automation/followups creates and PATCH completes a follow-up", async () => {
    const { headers } = await seedOrgWithAdmin({ email: `fup-${Date.now()}@ex.com` });
    const email = `lead-fup-${Date.now()}@ex.com`;
    const lead = await agent().post("/api/automation/leads").set(headers).send({ name: "Follow-Up Lead", email });
    const leadId = lead.body.data.id;

    const created = await agent().post("/api/automation/followups").set(headers).send({
      leadId,
      type: "task",
      subject: "Call back",
      message: "Follow up on proposal",
    });
    expect(created.status).toBe(201);
    expect(created.body.data.subject).toBe("Call back");

    const fupId = created.body.data.id;
    const completed = await agent().patch(`/api/automation/followups/${fupId}`).set(headers).send({ status: "completed" });
    expect(completed.status).toBe(200);
    expect(completed.body.data.status).toBe("completed");
    expect(completed.body.data.completedAt).toBeTruthy();
  });
});
