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

describe("health check", () => {
  it("GET /api/health returns 200 with ok payload", async () => {
    const res = await request(server).get("/api/health");
    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.payload).success).toBe(true);
    expect(["ok", "degraded"]).toContain(JSON.parse(res.payload).status);
    expect(JSON.parse(res.payload).checks).toBeDefined();
    expect(JSON.parse(res.payload).timestamp).toBeDefined();
  });
});
