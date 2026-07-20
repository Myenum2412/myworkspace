import request from "supertest";
import type { Server } from "http";
import app from "../../../src/app.js";
import { connectTestDb, resetDb } from "../../__helpers__/db.js";
import { seedOrgWithAdmin } from "../../__helpers__/users.js";

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

describe("RBAC enforcement", () => {
  it("non-admin user cannot reach /api/admin/users", async () => {
    // Regular role is "workspace" (non-admin) via the admin-email gate
    const other = await seedOrgWithAdmin({ email: `rb-${Date.now()}@ex.seeded` });
    // seedOrgWithAdmin always creates role "members" in its own org; the
    // admin.ts routes additionally require ADMIN_EMAIL match for orgmenu areas.
    // For /api/admin/users we test authorizePermission("MANAGE_USERS"): a regular
    // user has no permissions and is rejected.
    const regular = await seedOrgWithAdmin({ email: `rr-${Date.now()}@ex.seeded` });
    const res = await agent().get("/api/admin/users").set(regular.headers);
    expect([401, 403]).toContain(res.status);
  });
});
