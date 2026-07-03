import request from "supertest";
import type { Server } from "http";
import app from "../../src/app.js";
import { connectTestDb, resetDb } from "../__helpers__/db.js";

let server: Server;
beforeAll(async () => {
  await connectTestDb();
  server = app.listen(0);
});
afterAll((done) => {
  server.close(done);
});
beforeEach(async () => {
  await resetDb();
});

function agent() {
  return request(server);
}

describe("rate limiting extended", () => {
  it("auth endpoint rate limited at 20/15min returns 429 on excess", async () => {
    let lastStatus = 200;
    for (let i = 0; i < 22; i++) {
      const res = await agent().post("/api/auth/login").send({ email: `rl-${i}-${Date.now()}@ex.com`, password: "p" });
      lastStatus = res.status;
      if (res.status === 429) break;
    }
    expect(lastStatus).toBe(429);
  });

  it("api rate limited at 600/15min allows normal requests", async () => {
    for (let i = 0; i < 5; i++) {
      const res = await agent().get("/api/health");
      expect(res.status).toBe(200);
    }
  });

  it("health endpoint is not rate limited", async () => {
    for (let i = 0; i < 10; i++) {
      const res = await agent().get("/api/health");
      expect(res.status).toBe(200);
    }
  });
});
