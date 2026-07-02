import request from "supertest";
import type { Server } from "http";
import app from "../../../src/app.js";

let server: Server;
beforeAll(() => { server = app.listen(0); });
afterAll((done) => {
  server.close(done);
});

describe("health check", () => {
  it("GET /api/health returns 200 with ok payload", async () => {
    const res = await request(server).get("/api/health");
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toBeTruthy();
  });
});
