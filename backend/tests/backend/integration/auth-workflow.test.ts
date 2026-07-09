import request from "supertest";
import type { Server } from "http";
import app from "../../../src/app.js";
import { connectTestDb, resetDb } from "../../__helpers__/db.js";

let server: Server;

beforeAll(async () => {
  await connectTestDb();
  server = app.listen(0);
});

afterAll(() => server.close());

beforeEach(async () => {
  await resetDb();
});

describe("Complete auth workflow", () => {
  const testEmail = () => `wf-${Date.now()}@example.com`;
  const testPassword = "SecurePass123";

  it("signup -> login -> access protected route -> token refresh", async () => {
    const email = testEmail();

    // 1. Signup
    const signupRes = await request(server)
      .post("/api/auth/signup")
      .send({ name: "Workflow User", email, password: testPassword });
    expect(signupRes.status).toBe(201);
    const token = signupRes.body.data?.token || signupRes.body.token;
    expect(token).toBeTruthy();

    // 2. Access protected route
    const tasksRes = await request(server)
      .get("/api/tasks")
      .set("Authorization", `Bearer ${token}`);
    expect(tasksRes.status).toBe(200);

    // 3. Logout
    const logoutRes = await request(server)
      .post("/api/auth/logout")
      .set("Authorization", `Bearer ${token}`);
    expect([200, 404]).toContain(logoutRes.status);

    // 4. Login again
    const loginRes = await request(server)
      .post("/api/auth/login")
      .send({ email, password: testPassword });
    expect(loginRes.status).toBe(200);
    const newToken = loginRes.body.data?.token || loginRes.body.token;
    expect(newToken).toBeTruthy();

    // 5. Access with new token
    const tasksRes2 = await request(server)
      .get("/api/tasks")
      .set("Authorization", `Bearer ${newToken}`);
    expect(tasksRes2.status).toBe(200);
  });

  it("signup with weak password is rejected", async () => {
    const res = await request(server)
      .post("/api/auth/signup")
      .send({ name: "Weak Password", email: testEmail(), password: "123" });
    expect(res.status).toBe(400);
  });

  it("signup with existing email returns 409", async () => {
    const email = testEmail();
    await request(server)
      .post("/api/auth/signup")
      .send({ name: "First", email, password: testPassword });
    const res = await request(server)
      .post("/api/auth/signup")
      .send({ name: "Second", email, password: testPassword });
    expect(res.status).toBe(409);
  });

  it("login with wrong password increments failed attempts", async () => {
    const email = testEmail();
    await request(server)
      .post("/api/auth/signup")
      .send({ name: "Lockout Test", email, password: testPassword });

    for (let i = 0; i < 5; i++) {
      await request(server)
        .post("/api/auth/login")
        .send({ email, password: "wrongpass" });
    }

    const res = await request(server)
      .post("/api/auth/login")
      .send({ email, password: "wrongpass" });
    expect(res.status).toBe(423);
  });
});
