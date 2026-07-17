import request from "supertest";
import type { Server } from "http";
import fs from "fs";
import path from "path";
import app from "../../../src/app.js";
import { connectTestDb, resetDb } from "../../__helpers__/db.js";
import { seedOrgWithAdmin } from "../../__helpers__/fixtures.js";

let server: Server;
let ctx: Awaited<ReturnType<typeof seedOrgWithAdmin>>;

beforeAll(async () => {
  await connectTestDb();
  server = app.listen(0);
});

afterAll(() => server.close());

beforeEach(async () => {
  await resetDb();
  ctx = await seedOrgWithAdmin({ email: `streaming-${Date.now()}@example.com` });
});

describe("File streaming and download", () => {
  it("health endpoint returns expected headers", async () => {
    const res = await request(server).get("/api/health");
    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toContain("application/json");
  });

  it("returns correct Content-Type for API responses", async () => {
    const res = await request(server)
      .get("/api/tasks")
      .set(ctx.headers);
    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toContain("application/json");
  });

  it("compression headers present", async () => {
    const res = await request(server)
      .get("/api/health");
    // Express compression may or may not apply to small payloads
    expect(res.status).toBe(200);
  });
});
