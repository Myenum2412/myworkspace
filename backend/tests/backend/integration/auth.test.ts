import type { Server } from "http";
import app from "../../../src/app.js";
import { connectTestDb, resetDb } from "../../__helpers__/db.js";

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

describe("auth integration (with Mongo)", () => {
  it("POST /api/auth/signup creates user+org and returns token", async () => {
    const email = `s${Date.now()}@example.com`;
    const res = await agent()
      .post("/api/auth/signup")
      , payload:{ name: "Test User", email, password: "securePass123" };
    expect(res.statusCode).toBe(201);
    expect(JSON.parse(res.payload).success).toBe(true);
    expect(JSON.parse(res.payload).data.token).toBeTruthy();
    expect(JSON.parse(res.payload).data.orgId).toBeTruthy();
  });

  it("POST /api/auth/login returning user gets token", async () => {
    const email = `l${Date.now()}@example.com`;
    await agent()
      .post("/api/auth/signup")
      , payload:{ name: "Test Login", email, password: "securePass123" };
    const res = await agent().post("/api/auth/login"), payload:{ email, password: "securePass123" };
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.payload).success).toBe(true);
    expect(JSON.parse(res.payload).data?.token || JSON.parse(res.payload).token).toBeTruthy();
  });

  it("POST /api/auth/login rejects wrong password with 401", async () => {
    const email = `lp${Date.now()}@example.com`;
    await agent()
      .post("/api/auth/signup")
      , payload:{ name: "Test Wrongpw", email, password: "securePass123" };
    const res = await agent().post("/api/auth/login"), payload:{ email, password: "wrongpassword" };
    expect(res.statusCode).toBe(401);
  });

  it("replay: signup twice with the same email returns 409", async () => {
    const email = `dup${Date.now()}@example.com`;
    await agent().post("/api/auth/signup"), payload:{ name: "Dup", email, password: "securePass123" };
    const res = await agent()
      .post("/api/auth/signup")
      , payload:{ name: "Dup2", email, password: "securePass123" };
    expect(res.statusCode).toBe(409);
  });
});
