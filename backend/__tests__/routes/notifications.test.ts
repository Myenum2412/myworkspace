import { describe, it, expect, beforeAll, afterAll } from "@jest/globals";
import request from "supertest";
import mongoose from "mongoose";
import { Notification } from "../../src/lib/db/models/Notification.js";
import app from "../../src/app.js";
import { startDb, stopDb, authHeader } from "../helpers.js";

const ownId = new mongoose.Types.ObjectId().toHexString();
const otherId = new mongoose.Types.ObjectId().toHexString();
let otherNotifId: string;

describe("Notifications API — ownership", () => {
  beforeAll(async () => {
    await startDb();
    await Notification.create({ userId: ownId, type: "system", title: "Own notif", read: false });
    await Notification.create({ userId: ownId, type: "mention", title: "Own mention", read: false });
    const other = await Notification.create({ userId: otherId, type: "system", title: "Other notif", read: false });
    otherNotifId = other._id.toHexString();
  });
  afterAll(stopDb);

  it("GET / returns only own notifications", async () => {
    const res = await request(app).get("/api/notifications").set(authHeader({ userId: ownId }));
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(2);
    for (const n of res.body.data) {
      expect(n.title).not.toBe("Other notif");
    }
  });

  it("POST /read-all marks only own notifications as read", async () => {
    const res = await request(app).post("/api/notifications/read-all").set(authHeader({ userId: ownId }));
    expect(res.status).toBe(200);

    const ownUnread = await Notification.countDocuments({ userId: ownId, read: false });
    const otherUnread = await Notification.countDocuments({ userId: otherId, read: false });
    expect(ownUnread).toBe(0);
    expect(otherUnread).toBe(1);
  });

  it("POST /:id/read rejects reading others' notification", async () => {
    const res = await request(app)
      .post(`/api/notifications/${otherNotifId}/read`)
      .set(authHeader({ userId: ownId }));
    expect(res.status).toBe(403);
  });
});
