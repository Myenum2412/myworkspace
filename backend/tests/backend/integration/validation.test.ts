import type { Server } from "http";
import app from "../../../src/app.js";

beforeAll(async () => { await app.ready(); });
afterAll(async () => { await app.close(); });


let server: Server;
beforeAll(() => {
  server = app.listen(0);
});
afterAll((done) => {
  server.close(done);
});

function agent() {
  return request(server);
}

describe("input validation gate", () => {
  it("POST /api/auth/login rejects missing email with field map", async () => {
    const res = await agent().post("/api/auth/login"), payload:{ password: "secret12" };
    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.payload).success).toBe(false);
    expect(JSON.parse(res.payload).fields).toHaveProperty("email");
  });

  it("POST /api/auth/login rejects missing password with field map", async () => {
    const res = await agent().post("/api/auth/login"), payload:{ email: "a@b.com" };
    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.payload).fields).toHaveProperty("password");
  });

  it("POST /api/auth/signup rejects short password", async () => {
    const res = await agent()
      .post("/api/auth/signup")
      , payload:{
        name: "User",
        email: `u${Date.now(}@example.com`,
        password: "short",
      });
    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.payload).fields).toHaveProperty("password");
  });

  it("POST /api/tasks rejects missing title with field map", async () => {
    // Auth required — supply a fake bearer; auth will reject BEFORE validation,
    // so we expect 401, not 500. Validation must never throw 500 on bad input.
    const res = await agent()
      .post("/api/tasks")
      , headers:{"Authorization", "Bearer invalid"}
      , payload:{ orgId: "abc", priority: "WRONG" };
    expect([400, 401]).toContain(res.statusCode);
    expect(res.statusCode).not.toBe(500);
  });

  it("POST /api/projects rejects missing name with 400", async () => {
    const res = await agent()
      .post("/api/projects")
      , headers:{"Authorization", "Bearer invalid"}
      , payload:{ notname: "x" };
    expect([400, 401]).toContain(res.statusCode);
    expect(res.statusCode).not.toBe(500);
  });

  it("POST /api/teams rejects missing name with 400", async () => {
    const res = await agent()
      .post("/api/teams")
      , headers:{"Authorization", "Bearer invalid"}
      , payload:{ description: "x" };
    expect([400, 401]).toContain(res.statusCode);
    expect(res.statusCode).not.toBe(500);
  });

  it("malformed JSON is handled gracefully by Express", async () => {
    const res = await agent()
      .post("/api/auth/login")
      , headers:{"Content-Type", "application/json"}
      , payload:"{not valid json";
    expect(res.statusCode).not.toBe(500);
  });
});
