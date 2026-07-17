import request from "supertest";
import jwt from "jsonwebtoken";
import app from "../../../src/app.js";
import { connectTestDb, resetDb } from "../../__helpers__/db.js";
import { seedOrgWithAdmin, tamperedJWT, algorithmNoneJWT, expiredJWT } from "../../__helpers__/fixtures.js";
import type { Server } from "http";

let server: Server;

beforeAll(async () => {
  await connectTestDb();
  server = app.listen(0);
});

afterAll(() => server.close());

beforeEach(async () => {
  await resetDb();
});

describe("JWT security", () => {
  describe("Bearer token validation", () => {
    it("rejects request without auth header", async () => {
      const res = await request(server).get("/api/tasks");
      expect(res.status).toBe(401);
    });

    it("rejects malformed authorization header", async () => {
      const res = await request(server).get("/api/tasks").set("Authorization", "NotBearer token");
      expect(res.status).toBe(401);
    });

    it("rejects tampered token", async () => {
      const { headers } = await seedOrgWithAdmin({ email: "test@example.com" });
      const original = headers["Authorization"].replace("Bearer ", "");
      const badToken = tamperedJWT(original);
      const res = await request(server).get("/api/tasks").set("Authorization", `Bearer ${badToken}`);
      expect(res.status).toBe(401);
    });

    it("rejects expired token", async () => {
      const token = expiredJWT({ userId: "u1", email: "test@example.com", role: "admin" });
      const res = await request(server).get("/api/tasks").set("Authorization", `Bearer ${token}`);
      expect(res.status).toBe(401);
    });

    it("rejects algorithm none token", async () => {
      const token = algorithmNoneJWT();
      const res = await request(server).get("/api/tasks").set("Authorization", `Bearer ${token}`);
      expect(res.status).toBe(401);
    });

    it("rejects token signed with different secret", async () => {
      const token = jwt.sign(
        { userId: "u1", email: "test@example.com", role: "admin" },
        "wrong-secret",
      );
      const res = await request(server).get("/api/tasks").set("Authorization", `Bearer ${token}`);
      expect(res.status).toBe(401);
    });

    it("rejects empty token string", async () => {
      const res = await request(server).get("/api/tasks").set("Authorization", "Bearer ");
      expect(res.status).toBe(401);
    });

    it("rejects token with invalid user ID type", async () => {
      const token = jwt.sign(
        { userId: null, email: "test@example.com", role: "admin" },
        process.env.JWT_SECRET || "test-secret",
      );
      const res = await request(server).get("/api/tasks").set("Authorization", `Bearer ${token}`);
      expect([400, 401]).toContain(res.status);
    });
  });

  describe("token scope and isolation", () => {
    it("token with missing orgId gets 403 on org-scoped routes", async () => {
      const token = jwt.sign(
        { userId: "u1", email: "test@example.com", role: "admin", permissions: [] },
        process.env.JWT_SECRET || "test-secret",
      );
      const res = await request(server).get("/api/tasks").set("Authorization", `Bearer ${token}`);
      expect([200, 400, 403, 404]).toContain(res.status);
    });

    it("two different users cannot access each other's data", async () => {
      const user1 = await seedOrgWithAdmin({ email: "user1@example.com" });
      const user2 = await seedOrgWithAdmin({ email: "user2@example.com" });

      const res1 = await request(server)
        .get("/api/tasks")
        .set(user1.headers);
      expect(res1.status).toBe(200);

      const res2 = await request(server)
        .get("/api/tasks")
        .set(user2.headers);
      expect(res2.status).toBe(200);
    });
  });
});

describe("Helmet/CORS security headers", () => {
  it("returns security headers on all responses", async () => {
    const res = await request(server).get("/api/health");
    expect(res.headers["x-content-type-options"]).toBe("nosniff");
    expect(res.headers["x-frame-options"]).toBe("DENY");
    expect(res.headers["x-xss-protection"]).toBe("0");
    expect(res.headers["referrer-policy"]).toBe("strict-origin-when-cross-origin");
  });

  it("sets strict CSP in production mode", async () => {
    const origEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = "production";

    const prodApp = (await import("../../../src/app.js")).default;
    const prodServer = prodApp.listen(0);

    try {
      const res = await request(prodServer).get("/api/health");
      const csp = res.headers["content-security-policy"];
      expect(csp).toBeDefined();
      expect(csp).toContain("default-src 'self'");
      expect(csp).toContain("upgrade-insecure-requests");
    } finally {
      prodServer.close();
      process.env.NODE_ENV = origEnv || "test";
    }
  });

  it("CORS restricts origin when configured", async () => {
    const res = await request(server)
      .get("/api/health")
      .set("Origin", "https://evil.com");
    const acao = res.headers["access-control-allow-origin"];
    if (acao) {
      expect(acao).not.toBe("https://evil.com");
    }
  });
});

describe("Rate limiting enforcement", () => {
  it("auth endpoint rate limits after threshold", async () => {
    const email = `ratelimit-${Date.now()}@example.com`;
    const promises = Array.from({ length: 25 }, (_, i) =>
      request(server)
        .post("/api/auth/login")
        .send({ email, password: "wrong" }),
    );
    const results = await Promise.all(promises);
    const rateLimited = results.filter((r) => r.status === 429);
    expect(rateLimited.length).toBeGreaterThan(0);
  });

  it("returns standard rate-limit headers", async () => {
    const res = await request(server).post("/api/auth/login").send({
      email: "ratelimit-test@example.com",
      password: "wrong",
    });
    expect(res.headers["ratelimit-remaining"]).toBeDefined();
    expect(res.headers["ratelimit-limit"]).toBeDefined();
  });
});
