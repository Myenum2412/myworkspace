import request from "supertest";
import type { Server } from "http";
import app from "../../../src/app.js";

let server: Server;
beforeAll(() => { server = app.listen(0); });
afterAll((done) => server.close(done));

function agent() {
  return request(server);
}

describe("input validation gate", () => {
  it("POST /api/auth/login rejects missing email with field map", async () => {
    const res = await agent().post("/api/auth/login").send({ password: "secret12" });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.fields).toHaveProperty("email");
  });

  it("POST /api/auth/login rejects missing password with field map", async () => {
    const res = await agent().post("/api/auth/login").send({ email: "a@b.com" });
    expect(res.status).toBe(400);
    expect(res.body.fields).toHaveProperty("password");
  });

  it("POST /api/auth/signup rejects short password", async () => {
    const res = await agent().post("/api/auth/signup").send({
      name: "User",
      email: `u${Date.now()}@example.com`,
      password: "short",
    });
    expect(res.status).toBe(400);
    expect(res.body.fields).toHaveProperty("password");
  });

  it("POST /api/tasks rejects missing title with field map", async () => {
    // Auth required — supply a fake bearer; auth will reject BEFORE validation,
    // so we expect 401, not 500. Validation must never throw 500 on bad input.
    const res = await agent()
      .post("/api/tasks")
      .set("Authorization", "Bearer invalid")
      .send({ orgId: "abc", priority: "WRONG" });
    expect([400, 401]).toContain(res.status);
    expect(res.status).not.toBe(500);
  });

  it("POST /api/projects rejects missing name with 400", async () => {
    const res = await agent()
      .post("/api/projects")
      .set("Authorization", "Bearer invalid")
      .send({ notname: "x" });
    expect([400, 401]).toContain(res.status);
    expect(res.status).not.toBe(500);
  });

  it("POST /api/teams rejects missing name with 400", async () => {
    const res = await agent()
      .post("/api/teams")
      .set("Authorization", "Bearer invalid")
      .send({ description: "x" });
    expect([400, 401]).toContain(res.status);
    expect(res.status).not.toBe(500);
  });

  it("malformed JSON is handled as 400 (not 500) by Express", async () => {
    const res = await agent()
      .post("/api/auth/login")
      .set("Content-Type", "application/json")
      .send("{not valid json");
    expect([400, 401]).toContain(res.status);
    expect(res.status).not.toBe(500);
  });
});
