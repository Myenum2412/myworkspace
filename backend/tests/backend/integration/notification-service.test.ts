import mongoose from "mongoose";
import { connectTestDb, resetDb } from "../../__helpers__/db.js";
import { createNotification, listNotifications, getUnreadCount, markAllRead, markRead } from "../../../src/services/notification.service.js";
import { Notification } from "../../../src/lib/db/models/Notification.js";
import { AppError } from "../../../src/middleware/error.js";

beforeAll(async () => await connectTestDb());
beforeEach(async () => await resetDb());

const USER_ID = "user-abc";
const ORG_ID = "org-123";
const OTHER_USER = "user-xyz";

describe("NotificationService", () => {
  describe("createNotification", () => {
    it("creates a notification and returns the correct payload", async () => {
      const payload = await createNotification({
        userId: USER_ID,
        orgId: ORG_ID,
        createdBy: "user-creator",
        type: "task_assigned",
        title: "New task assigned",
        message: "You have been assigned to fix the login bug",
        link: "/tasks/abc123",
      });

      expect(payload).toMatchObject({
        userId: USER_ID,
        type: "task_assigned",
        title: "New task assigned",
        message: "You have been assigned to fix the login bug",
        link: "/tasks/abc123",
        read: false,
      });
      expect(payload.id).toBeDefined();
      expect(payload.createdAt).toBeDefined();
    });

    it("throws AppError when required fields are missing", async () => {
      await expect(createNotification({ userId: "", orgId: ORG_ID, type: "", title: "" } as any)).rejects.toThrow(AppError);
    });
  });

  describe("listNotifications", () => {
    it("returns created notifications for a user", async () => {
      await createNotification({ userId: USER_ID, orgId: ORG_ID, createdBy: "u1", type: "system", title: "First" });
      await createNotification({ userId: USER_ID, orgId: ORG_ID, createdBy: "u1", type: "system", title: "Second" });

      const list = await listNotifications(USER_ID);

      expect(list).toHaveLength(2);
      expect(list[0].title).toBe("Second");
      expect(list[1].title).toBe("First");
    });

    it("does not return other users' notifications", async () => {
      await createNotification({ userId: USER_ID, orgId: ORG_ID, createdBy: "u1", type: "system", title: "Mine" });
      await createNotification({ userId: OTHER_USER, orgId: ORG_ID, createdBy: "u2", type: "system", title: "Theirs" });

      const list = await listNotifications(USER_ID);

      expect(list).toHaveLength(1);
      expect(list[0].title).toBe("Mine");
    });
  });

  describe("getUnreadCount", () => {
    it("returns correct unread count", async () => {
      await createNotification({ userId: USER_ID, orgId: ORG_ID, createdBy: "u1", type: "system", title: "Unread 1" });
      await createNotification({ userId: USER_ID, orgId: ORG_ID, createdBy: "u1", type: "system", title: "Unread 2" });

      const count = await getUnreadCount(USER_ID);
      expect(count).toBe(2);
    });

    it("returns zero when all are read", async () => {
      const n = await createNotification({ userId: USER_ID, orgId: ORG_ID, createdBy: "u1", type: "system", title: "Read me" });
      await Notification.findByIdAndUpdate(n.id, { read: true });

      const count = await getUnreadCount(USER_ID);
      expect(count).toBe(0);
    });
  });

  describe("markAllRead", () => {
    it("marks all notifications as read for a user", async () => {
      await createNotification({ userId: USER_ID, orgId: ORG_ID, createdBy: "u1", type: "system", title: "A" });
      await createNotification({ userId: USER_ID, orgId: ORG_ID, createdBy: "u1", type: "system", title: "B" });

      await markAllRead(USER_ID);

      const count = await getUnreadCount(USER_ID);
      expect(count).toBe(0);
    });

    it("does not affect other users' notifications", async () => {
      await createNotification({ userId: USER_ID, orgId: ORG_ID, createdBy: "u1", type: "system", title: "Mine" });
      await createNotification({ userId: OTHER_USER, orgId: ORG_ID, createdBy: "u2", type: "system", title: "Theirs" });

      await markAllRead(USER_ID);

      const mine = await getUnreadCount(USER_ID);
      const theirs = await getUnreadCount(OTHER_USER);
      expect(mine).toBe(0);
      expect(theirs).toBe(1);
    });
  });

  describe("markRead", () => {
    it("marks a single notification as read", async () => {
      const n = await createNotification({ userId: USER_ID, orgId: ORG_ID, createdBy: "u1", type: "system", title: "Single" });

      await markRead(n.id, USER_ID);

      const count = await getUnreadCount(USER_ID);
      expect(count).toBe(0);
    });

    it("throws AppError when notification does not exist", async () => {
      await expect(markRead(new mongoose.Types.ObjectId().toHexString(), USER_ID)).rejects.toThrow(AppError);
    });

    it("throws AppError when userId does not match", async () => {
      const n = await createNotification({ userId: USER_ID, orgId: ORG_ID, createdBy: "u1", type: "system", title: "Not yours" });

      await expect(markRead(n.id, OTHER_USER)).rejects.toThrow(AppError);
    });
  });
});
