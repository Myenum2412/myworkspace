import { describe, it, expect, beforeAll, afterAll } from "@jest/globals";
import request from "supertest";
import { User } from "../../src/lib/db/models/User.js";
import app from "../../src/app.js";
import { startDb, stopDb } from "../helpers.js";

describe("POST /api/auth/login", () => {
  beforeAll(async () => {
    await startDb();
    const bcrypt = await import("bcryptjs");
    const hash = await bcrypt.hash("password123", 4);
    await User.create({ id: "auth-u1", name: "Auth User", email: "auth@test.com", password: hash, role: "member" });
  });
  afterAll(stopDb);

  it("logs in with valid credentials", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "auth@test.com", password: "password123" });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data?.token).toBeDefined();
    expect(res.body.data?.user?.email).toBe("auth@test.com");
  });

  it("rejects wrong password", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "auth@test.com", password: "wrong" });
    expect(res.status).toBe(401);
  });

  it("rejects missing email", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ password: "x" });
    expect(res.status).toBe(400);
  });
});

describe("POST /api/auth/signup", () => {
  beforeAll(startDb);
  afterAll(stopDb);

  it("creates user and org", async () => {
    const res = await request(app)
      .post("/api/auth/signup")
      .send({ name: "New User", email: "new@test.com", password: "password123", company: "TestCo" });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data?.token).toBeDefined();
    expect(res.body.data?.orgId).toBeDefined();
  });

  it("rejects duplicate email", async () => {
    const res = await request(app)
      .post("/api/auth/signup")
      .send({ name: "Dup", email: "new@test.com", password: "password123" });
    expect(res.status).toBe(409);
  });

  it("rejects short password", async () => {
    const res = await request(app)
      .post("/api/auth/signup")
      .send({ name: "X", email: "x@x.com", password: "short" });
    expect(res.status).toBe(400);
  });
});
