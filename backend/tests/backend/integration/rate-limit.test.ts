import request from "supertest";
import type { Server } from "http";
import app from "../../../src/app.js";
import { connectTestDb, resetDb } from "../../__helpers__/db.js";

let server: Server;
beforeAll(async () => {
  await connectTestDb();
  server = app.listen(0);
});
afterAll((done) => server.close(done));
beforeEach(async () => {
  await resetDb();
});

function agent() {
  return request(server);
}

describe("rate limiting", () => {
  it("exceeding auth limiter returns 429 with Retry-After", async () => {
    const rateLimitMod = await import("../../../src/middleware/rate-limit.js");
    expect(rateLimitMod.authLimiter).toBeTruthy();

    // The limiter counts requests per IP (supertest uses ::1 / 127.0.0.1).
    // Issue 21 identical login requests; the 21st must be 429.
    let lastStatus = 200;
    let retryAfterHeader: string | undefined;
    for (let i = 0; i < 22; i++) {
      const res = await agent().post("/api/auth/login").send({ email: `x${i}@example.com`, password: "p" });
      lastStatus = res.status;
      if (res.status === 429) {
        retryAfterHeader = res.headers["retry-after"] || res.headers["Retry-After"];
        break;
      }
    }
    expect(lastStatus).toBe(429);
    expect(retryAfterHeader).toBeDefined();
  });
});
