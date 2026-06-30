import mongoose from "mongoose";
import { connectTestDb, resetDb } from "../../__helpers__/db.js";
import { seedOrgWithAdmin } from "../../__helpers__/users.js";
import { FileAttachment } from "../../../src/lib/db/models/FileAttachment.js";
import { FileVersion } from "../../../src/lib/db/models/FileVersion.js";

beforeAll(async () => {
  await connectTestDb();
});
beforeEach(async () => {
  await resetDb();
});

describe("File Attachment Operations", () => {
  it("tracks lastAccessedAt on view", async () => {
    const a = await seedOrgWithAdmin({ email: `la-${Date.now()}@test.com` });
    const fileId = new mongoose.Types.ObjectId().toString();
    await FileAttachment.create({
      id: fileId, orgId: a.orgId,
      uploaderId: a.userId, createdBy: a.userId,
      name: "access.txt", originalName: "access.txt",
      mimeType: "text/plain", size: 100,
      storagePath: "/a.txt", storageProvider: "local",
    });

    await FileAttachment.updateOne({ id: fileId }, { lastAccessedAt: new Date() });
    const file = await FileAttachment.findOne({ id: fileId }).lean();
    expect(file!.lastAccessedAt).not.toBeNull();
  });

  it("supports file locking", async () => {
    const a = await seedOrgWithAdmin({ email: `lk-${Date.now()}@test.com` });
    const fileId = new mongoose.Types.ObjectId().toString();
    await FileAttachment.create({
      id: fileId, orgId: a.orgId,
      uploaderId: a.userId, createdBy: a.userId,
      name: "lock.txt", originalName: "lock.txt",
      mimeType: "text/plain", size: 100,
      storagePath: "/l.txt", storageProvider: "local",
    });

    await FileAttachment.updateOne({ id: fileId }, { isLocked: true, lockedBy: a.userId });
    const file = await FileAttachment.findOne({ id: fileId }).lean();
    expect(file!.isLocked).toBe(true);
    expect(file!.lockedBy).toBe(a.userId);
  });

  it("tracks file versions", async () => {
    const a = await seedOrgWithAdmin({ email: `fv2-${Date.now()}@test.com` });
    const fileId = new mongoose.Types.ObjectId().toString();
    await FileAttachment.create({
      id: fileId, orgId: a.orgId,
      uploaderId: a.userId, createdBy: a.userId,
      name: "ver.txt", originalName: "ver.txt",
      mimeType: "text/plain", size: 100,
      storagePath: "/v1.txt", storageProvider: "local",
      currentVersion: 1,
    });

    await FileAttachment.updateOne({ id: fileId }, {
      currentVersion: 2,
      storagePath: "/v2.txt",
      size: 200,
      updatedBy: a.userId,
    });

    const file = await FileAttachment.findOne({ id: fileId }).lean();
    expect(file!.currentVersion).toBe(2);
    expect(file!.storagePath).toBe("/v2.txt");
  });

  it("supports bulk operations (count by status)", async () => {
    const a = await seedOrgWithAdmin({ email: `bo-${Date.now()}@test.com` });
    const fileIds = Array.from({ length: 5 }, () => new mongoose.Types.ObjectId().toString());

    for (let i = 0; i < 5; i++) {
      await FileAttachment.create({
        id: fileIds[i], orgId: a.orgId,
        uploaderId: a.userId, createdBy: a.userId,
        name: `bulk${i}.txt`, originalName: `bulk${i}.txt`,
        mimeType: "text/plain", size: 100,
        storagePath: `/b${i}.txt`, storageProvider: "local",
      });
    }

    // Soft-delete 2
    await FileAttachment.updateMany(
      { id: { $in: fileIds.slice(0, 2) } },
      { deletedAt: new Date() },
    );

    const active = await FileAttachment.countDocuments({ orgId: a.orgId, deletedAt: null });
    const deleted = await FileAttachment.countDocuments({ orgId: a.orgId, deletedAt: { $ne: null } });

    expect(active).toBe(3);
    expect(deleted).toBe(2);
  });

  it("enforces unique id constraint", async () => {
    const a = await seedOrgWithAdmin({ email: `uid-${Date.now()}@test.com` });
    const fileId = new mongoose.Types.ObjectId().toString();
    await FileAttachment.create({
      id: fileId, orgId: a.orgId,
      uploaderId: a.userId, createdBy: a.userId,
      name: "first.txt", originalName: "first.txt",
      mimeType: "text/plain", size: 100,
      storagePath: "/first.txt", storageProvider: "local",
    });

    await expect(FileAttachment.create({
      id: fileId, orgId: a.orgId,
      uploaderId: a.userId, createdBy: a.userId,
      name: "second.txt", originalName: "second.txt",
      mimeType: "text/plain", size: 200,
      storagePath: "/second.txt", storageProvider: "local",
    })).rejects.toThrow();
  });

  it("supports duplicate detection via checksum", async () => {
    const a = await seedOrgWithAdmin({ email: `chk-${Date.now()}@test.com` });
    const fileId = new mongoose.Types.ObjectId().toString();
    await FileAttachment.create({
      id: fileId, orgId: a.orgId,
      uploaderId: a.userId, createdBy: a.userId,
      name: "original.txt", originalName: "original.txt",
      mimeType: "text/plain", size: 100,
      storagePath: "/orig.txt", storageProvider: "local",
      checksum: "abc123",
    });

    const dup = await FileAttachment.findOne({
      orgId: a.orgId, checksum: "abc123", deletedAt: null,
    }).lean();
    expect(dup).not.toBeNull();
    expect(dup!.id).toBe(fileId);
  });
});

describe("File Aggregation and Stats", () => {
  it("aggregates file sizes by org", async () => {
    const a = await seedOrgWithAdmin({ email: `agg-${Date.now()}@test.com` });
    for (let i = 0; i < 10; i++) {
      await FileAttachment.create({
        id: new mongoose.Types.ObjectId().toString(), orgId: a.orgId,
        uploaderId: a.userId, createdBy: a.userId,
        name: `f${i}.txt`, originalName: `f${i}.txt`,
        mimeType: "text/plain", size: 100 * (i + 1),
        storagePath: `/f${i}.txt`, storageProvider: "local",
      });
    }

    const result = await FileAttachment.aggregate([
      { $match: { orgId: a.orgId, deletedAt: null } },
      { $group: { _id: null, totalFiles: { $sum: 1 }, totalSize: { $sum: "$size" } } },
    ]);

    expect(result[0].totalFiles).toBe(10);
    expect(result[0].totalSize).toBe(5500);
  });

  it("groups by category", async () => {
    const a = await seedOrgWithAdmin({ email: `cat-${Date.now()}@test.com` });
    await FileAttachment.create({
      id: new mongoose.Types.ObjectId().toString(), orgId: a.orgId,
      uploaderId: a.userId, createdBy: a.userId,
      name: "doc.pdf", originalName: "doc.pdf",
      mimeType: "application/pdf", size: 500,
      storagePath: "/d.pdf", storageProvider: "local",
      category: "document",
    });
    await FileAttachment.create({
      id: new mongoose.Types.ObjectId().toString(), orgId: a.orgId,
      uploaderId: a.userId, createdBy: a.userId,
      name: "img.jpg", originalName: "img.jpg",
      mimeType: "image/jpeg", size: 1000,
      storagePath: "/i.jpg", storageProvider: "local",
      category: "image",
    });

    const result = await FileAttachment.aggregate([
      { $match: { orgId: a.orgId, deletedAt: null } },
      { $group: { _id: "$category", count: { $sum: 1 }, totalSize: { $sum: "$size" } } },
    ]);

    expect(result.length).toBe(2);
    const categories = result.map((r: any) => r._id).sort();
    expect(categories).toEqual(["document", "image"]);
  });
});

describe("FileVersion Model", () => {
  it("stores checksum and metadata per version", async () => {
    const a = await seedOrgWithAdmin({ email: `fv3-${Date.now()}@test.com` });
    const fileId = new mongoose.Types.ObjectId().toString();
    await FileVersion.create({
      fileId, orgId: a.orgId, versionNumber: 1,
      storagePath: "/v1.txt", size: 100,
      checksum: "sha256-abc", uploadedBy: a.userId,
      mimeType: "text/plain", originalName: "v1.txt",
      comment: "Initial version",
    });

    const version = await FileVersion.findOne({ fileId, versionNumber: 1 }).lean();
    expect(version!.checksum).toBe("sha256-abc");
    expect(version!.comment).toBe("Initial version");
    expect(version!.originalName).toBe("v1.txt");
  });
});
