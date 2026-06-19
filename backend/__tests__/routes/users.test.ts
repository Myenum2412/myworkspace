import { describe, it, expect, beforeAll, afterAll } from "@jest/globals";
import mongoose from "mongoose";
import request from "supertest";
import { User } from "../../src/lib/db/models/User.js";
import app from "../../src/app.js";
import { startDb, stopDb, authHeader } from "../helpers.js";

const user1Id = new mongoose.Types.ObjectId("000000000000000000000001");
const user2Id = new mongoose.Types.ObjectId("000000000000000000000002");

describe("GET /api/users/status", () => {
  beforeAll(async () => {
    await startDb();
    await User.create({ _id: user1Id, name: "Test", email: "t@t.com", password: "x", status: "online", role: "member" });
  });
  afterAll(stopDb);

  it("returns own status", async () => {
    const res = await request(app).get("/api/users/status").set(authHeader({ userId: user1Id.toString() }));
    expect(res.status).toBe(200);
    expect(res.body.data?.status).toBe("online");
  });

  it("rejects without auth", async () => {
    const res = await request(app).get("/api/users/status");
    expect(res.status).toBe(401);
  });
});

describe("PUT /api/users/status", () => {
  beforeAll(async () => {
    await startDb();
    await User.create({ _id: user2Id, name: "Test2", email: "t2@t.com", password: "x", status: "online", role: "member" });
  });
  afterAll(stopDb);

  it("updates own status", async () => {
    const res = await request(app).put("/api/users/status").set(authHeader({ userId: user2Id.toString() })).send({ status: "break" });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const updated = await User.findById(user2Id).lean();
    expect(updated?.status).toBe("break");
  });

  it("rejects missing status", async () => {
    const res = await request(app).put("/api/users/status").set(authHeader({ userId: user2Id.toString() })).send({});
    expect(res.status).toBe(400);
  });
});
