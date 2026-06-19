import { describe, it, expect, beforeAll, afterAll } from "@jest/globals";
import request from "supertest";
import mongoose from "mongoose";
import { Organization } from "../../src/lib/db/models/Organization.js";
import { OrgMember } from "../../src/lib/db/models/OrgMember.js";
import app from "../../src/app.js";
import { startDb, stopDb, authHeader } from "../helpers.js";

const userId = "000000000000000000000001";
const orgA = new mongoose.Types.ObjectId();
const orgB = new mongoose.Types.ObjectId();

describe("Organizations API — scoping", () => {
  beforeAll(async () => {
    await startDb();
    await Organization.create({ _id: orgA, name: "Org A", slug: "org-a", plan: "starter" });
    await Organization.create({ _id: orgB, name: "Org B", slug: "org-b", plan: "pro" });
    await OrgMember.create({ orgId: orgA._id, userId, role: "admin" });
  });
  afterAll(stopDb);

  it("GET / returns only orgs the user belongs to", async () => {
    const res = await request(app).get("/api/organizations").set(authHeader({ userId }));
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].name).toBe("Org A");
  });

  it("GET /:id/members rejects non-member access", async () => {
    const res = await request(app)
      .get(`/api/organizations/${orgB._id}/members`)
      .set(authHeader({ userId }));
    expect(res.status).toBe(403);
  });

  it("GET /:id/members allows member access", async () => {
    const res = await request(app)
      .get(`/api/organizations/${orgA._id}/members`)
      .set(authHeader({ userId }));
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
  });
});
