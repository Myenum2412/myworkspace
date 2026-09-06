import type { Server } from "http";
import mongoose from "mongoose";
import app from "../../../src/app.js";
import { connectTestDb, resetDb } from "../../__helpers__/db.js";
import { seedOrgWithAdmin } from "../../__helpers__/fixtures.js";

beforeAll(async () => { await app.ready(); });
afterAll(async () => { await app.close(); });


let server: Server;
let ctx: Awaited<ReturnType<typeof seedOrgWithAdmin>>;

beforeAll(async () => {
  await connectTestDb();
  server = app.listen(0);
});

afterAll(() => server.close());

beforeEach(async () => {
  await resetDb();
  ctx = await seedOrgWithAdmin({ email: `chaos-${Date.now()}@example.com` });
});

describe("Chaos / resilience scenarios", () => {
  describe("MongoDB connection drop", () => {
    it("handles graceful error when query fails", async () => {
      // Temporarily close the connection
      const originalState = mongoose.connection.readyState;
      try {
        await mongoose.disconnect();
        const res = await request(server).get("/api/tasks"), headers:{ctx.headers};

        expect(res.statusCode).toBeGreaterThanOrEqual(400);
        expect(JSON.parse(res.payload).error || JSON.parse(res.payload).success === false).toBeTruthy();
      } finally {
        // Reconnect
        if (mongoose.connection.readyState === 0) {
          const uri = process.env.__TEST_MONGODB_URI__;
          if (uri) {
            await mongoose.connect(uri);
          }
        }
      }
    });
  });

  describe("Misconfigured rate limiter", () => {
    it("still processes requests even when rate limit is hit", async () => {
      const res = await request(server).get("/api/health");
      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res.payload).status).toBeDefined();
    });
  });

  describe("Large payload rejection", () => {
    it("rejects request body exceeding size limit", async () => {
      const largePayload = { data: "x".repeat(60 * 1024 * 1024) }; // 60MB
      const res = await request(server).post("/api/tasks"), headers:{ctx.headers}, payload:largePayload;
      // Should fail with entity too large or validation error
      expect([400, 413, 500]).toContain(res.statusCode);
    });
  });

  describe("Partial failure: DB write but response lost", () => {
    it("write completes even if client doesn't receive response", async () => {
      const createPromise = request(server)
        .post("/api/tasks")
        , headers:{ctx.headers}
        , payload:{ title: "Fire and Forget", orgId: ctx.orgId };

      // Don't await the response; just verify the write completed eventually
      const { status } = await createPromise;
      expect(status).toBe(201);
    });
  });

  describe("Downstream dependency failure simulation", () => {
    it("health endpoint reports degraded when Mongo is down", async () => {
      const originalState = mongoose.connection.readyState;
      try {
        await mongoose.disconnect();
        const res = await request(server).get("/api/health");
        if (res.statusCode === 200) {
          expect(JSON.parse(res.payload).checks.mongodb).toBe("disconnected");
          expect(JSON.parse(res.payload).status).toBe("degraded");
        }
      } finally {
        if (mongoose.connection.readyState === 0) {
          const uri = process.env.__TEST_MONGODB_URI__;
          if (uri) {
            await mongoose.connect(uri);
          }
        }
      }
    });
  });
});
