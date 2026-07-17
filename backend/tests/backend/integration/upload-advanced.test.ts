import mongoose from "mongoose";
import { connectTestDb, resetDb } from "../../__helpers__/db.js";
import { seedOrgWithAdmin } from "../../__helpers__/users.js";
import { UploadSession } from "../../../src/lib/db/models/UploadSession.js";
import { FileAttachment } from "../../../src/lib/db/models/FileAttachment.js";
import { FileVersion } from "../../../src/lib/db/models/FileVersion.js";
import { categorizeMime } from "../../../src/lib/uploads/enhanced-orchestrator.js";

beforeAll(async () => {
  await connectTestDb();
});
beforeEach(async () => {
  await resetDb();
});

describe("UploadSession Model", () => {
  it("creates and retrieves an upload session", async () => {
    const a = await seedOrgWithAdmin({ email: `us-${Date.now()}@test.com` });
    const tusId = `tus-${Date.now()}`;
    await UploadSession.create({
      tusId,
      uploadId: `up-${Date.now()}`,
      orgId: a.orgId,
      uploaderId: a.userId,
      fileName: "test.txt",
      originalName: "test.txt",
      mimeType: "text/plain",
      size: 100,
      status: "pending",
    });

    const session = await UploadSession.findOne({ tusId }).lean();
    expect(session).not.toBeNull();
    expect(session!.fileName).toBe("test.txt");
    expect(session!.status).toBe("pending");
  });

  it("finds sessions by user ID and org", async () => {
    const a = await seedOrgWithAdmin({ email: `us2-${Date.now()}@test.com` });
    const tusId = `tus-${Date.now()}`;
    await UploadSession.create({
      tusId,
      uploadId: `up-${Date.now()}`,
      orgId: a.orgId,
      uploaderId: a.userId,
      fileName: "test.txt",
      originalName: "test.txt",
      mimeType: "text/plain", size: 100,
      status: "pending",
    });

    const sessions = await UploadSession.find({ orgId: a.orgId, uploaderId: a.userId }).lean();
    expect(sessions.length).toBe(1);
  });

  it("prevents duplicate tusId via unique index", async () => {
    const a = await seedOrgWithAdmin({ email: `us3-${Date.now()}@test.com` });
    const tusId = `dup-${Date.now()}`;
    await UploadSession.create({
      tusId, uploadId: `up1-${Date.now()}`,
      orgId: a.orgId, uploaderId: a.userId,
      fileName: "a.txt", originalName: "a.txt",
      mimeType: "text/plain", size: 100,
    });
    await expect(UploadSession.create({
      tusId, uploadId: `up2-${Date.now()}`,
      orgId: a.orgId, uploaderId: a.userId,
      fileName: "b.txt", originalName: "b.txt",
      mimeType: "text/plain", size: 200,
    })).rejects.toThrow();
  });

  it("supports status transitions", async () => {
    const a = await seedOrgWithAdmin({ email: `us4-${Date.now()}@test.com` });
    const tusId = `trans-${Date.now()}`;
    await UploadSession.create({
      tusId, uploadId: `up-${Date.now()}`,
      orgId: a.orgId, uploaderId: a.userId,
      fileName: "test.txt", originalName: "test.txt",
      mimeType: "text/plain", size: 100,
      status: "pending",
    });

    await UploadSession.updateOne({ tusId }, { status: "finalized", completedAt: new Date() });
    const session = await UploadSession.findOne({ tusId }).lean();
    expect(session!.status).toBe("finalized");
    expect(session!.completedAt).not.toBeNull();
  });

  it("supports cancellation", async () => {
    const a = await seedOrgWithAdmin({ email: `us5-${Date.now()}@test.com` });
    const tusId = `cancel-${Date.now()}`;
    await UploadSession.create({
      tusId, uploadId: `up-${Date.now()}`,
      orgId: a.orgId, uploaderId: a.userId,
      fileName: "test.txt", originalName: "test.txt",
      mimeType: "text/plain", size: 100,
      status: "pending",
    });

    await UploadSession.updateOne({ tusId }, { status: "cancelled" });
    const session = await UploadSession.findOne({ tusId }).lean();
    expect(session!.status).toBe("cancelled");
  });
});

describe("FileAttachment Model", () => {
  it("creates and retrieves a file", async () => {
    const a = await seedOrgWithAdmin({ email: `fa-${Date.now()}@test.com` });
    const fileId = new mongoose.Types.ObjectId().toString();
    await FileAttachment.create({
      id: fileId, orgId: a.orgId,
      uploaderId: a.userId, createdBy: a.userId,
      name: "test.txt", originalName: "test.txt",
      mimeType: "text/plain", size: 100,
      storagePath: "/test.txt", storageProvider: "local",
    });

    const file = await FileAttachment.findOne({ id: fileId }).lean();
    expect(file).not.toBeNull();
  });

  it("enforces org isolation", async () => {
    const a = await seedOrgWithAdmin({ email: `fa2-${Date.now()}@test.com` });
    const b = await seedOrgWithAdmin({ email: `fa3-${Date.now()}@test.com` });

    await FileAttachment.create({
      id: new mongoose.Types.ObjectId().toString(), orgId: a.orgId,
      uploaderId: a.userId, createdBy: a.userId,
      name: "secret.txt", originalName: "secret.txt",
      mimeType: "text/plain", size: 100,
      storagePath: "/s.txt", storageProvider: "local",
    });

    const orgAFiles = await FileAttachment.countDocuments({ orgId: a.orgId });
    const orgBFiles = await FileAttachment.countDocuments({ orgId: b.orgId });
    expect(orgAFiles).toBe(1);
    expect(orgBFiles).toBe(0);
  });

  it("supports soft delete", async () => {
    const a = await seedOrgWithAdmin({ email: `fa4-${Date.now()}@test.com` });
    const fileId = new mongoose.Types.ObjectId().toString();
    await FileAttachment.create({
      id: fileId, orgId: a.orgId,
      uploaderId: a.userId, createdBy: a.userId,
      name: "del.txt", originalName: "del.txt",
      mimeType: "text/plain", size: 100,
      storagePath: "/del.txt", storageProvider: "local",
    });

    await FileAttachment.updateOne({ id: fileId }, { deletedAt: new Date() });
    const file = await FileAttachment.findOne({ id: fileId }).lean();
    expect(file!.deletedAt).not.toBeNull();

    const activeFiles = await FileAttachment.countDocuments({ orgId: a.orgId, deletedAt: null });
    expect(activeFiles).toBe(0);
  });

  it("restores soft-deleted files", async () => {
    const a = await seedOrgWithAdmin({ email: `fa5-${Date.now()}@test.com` });
    const fileId = new mongoose.Types.ObjectId().toString();
    await FileAttachment.create({
      id: fileId, orgId: a.orgId,
      uploaderId: a.userId, createdBy: a.userId,
      name: "rst.txt", originalName: "rst.txt",
      mimeType: "text/plain", size: 100,
      storagePath: "/rst.txt", storageProvider: "local",
      deletedAt: new Date(),
    });

    await FileAttachment.updateOne({ id: fileId }, { deletedAt: null });
    const file = await FileAttachment.findOne({ id: fileId }).lean();
    expect(file!.deletedAt).toBeNull();
  });

  it("supports metadata like tags and description", async () => {
    const a = await seedOrgWithAdmin({ email: `fa6-${Date.now()}@test.com` });
    const fileId = new mongoose.Types.ObjectId().toString();
    await FileAttachment.create({
      id: fileId, orgId: a.orgId,
      uploaderId: a.userId, createdBy: a.userId,
      name: "meta.txt", originalName: "meta.txt",
      mimeType: "text/plain", size: 100,
      storagePath: "/meta.txt", storageProvider: "local",
      description: "Important file",
      tags: ["urgent", "finance"],
    });

    const file = await FileAttachment.findOne({ id: fileId }).lean();
    expect(file!.description).toBe("Important file");
    expect(file!.tags).toEqual(["urgent", "finance"]);
  });
});

describe("FileVersion Model", () => {
  it("creates and retrieves file versions", async () => {
    const a = await seedOrgWithAdmin({ email: `fv-${Date.now()}@test.com` });
    const fileId = new mongoose.Types.ObjectId().toString();
    await FileVersion.create({
      fileId, orgId: a.orgId, versionNumber: 1,
      storagePath: "/v1.txt", size: 100,
      checksum: "abc", uploadedBy: a.userId,
      mimeType: "text/plain", originalName: "v1.txt",
    });
    await FileVersion.create({
      fileId, orgId: a.orgId, versionNumber: 2,
      storagePath: "/v2.txt", size: 200,
      checksum: "def", uploadedBy: a.userId,
      mimeType: "text/plain", originalName: "v2.txt",
    });

    const versions = await FileVersion.find({ fileId }).sort({ versionNumber: -1 }).lean();
    expect(versions.length).toBe(2);
    expect(versions[0].versionNumber).toBe(2);
  });
});

describe("categorizeMime", () => {
  it("categorizes image files", () => {
    expect(categorizeMime("image/jpeg")).toBe("image");
    expect(categorizeMime("image/png")).toBe("image");
    expect(categorizeMime("image/gif")).toBe("image");
  });

  it("categorizes video files", () => {
    expect(categorizeMime("video/mp4")).toBe("video");
    expect(categorizeMime("video/quicktime")).toBe("video");
  });

  it("categorizes audio files", () => {
    expect(categorizeMime("audio/mpeg")).toBe("audio");
    expect(categorizeMime("audio/wav")).toBe("audio");
  });

  it("categorizes document files", () => {
    expect(categorizeMime("application/pdf")).toBe("document");
    expect(categorizeMime("application/msword")).toBe("document");
    expect(categorizeMime("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")).toBe("document");
  });

  it("categorizes archive files", () => {
    expect(categorizeMime("application/zip")).toBe("archive");
    expect(categorizeMime("application/x-rar-compressed")).toBe("archive");
    expect(categorizeMime("application/gzip")).toBe("archive");
  });

  it("defaults to general for unknown types", () => {
    expect(categorizeMime("application/octet-stream")).toBe("general");
    expect(categorizeMime("text/plain")).toBe("document");
  });
});

describe("File Pagination and Listing", () => {
  it("paginates files correctly", async () => {
    const a = await seedOrgWithAdmin({ email: `pg-${Date.now()}@test.com` });
    for (let i = 0; i < 25; i++) {
      await FileAttachment.create({
        id: new mongoose.Types.ObjectId().toString(), orgId: a.orgId,
        uploaderId: a.userId, createdBy: a.userId,
        name: `f${i}.txt`, originalName: `f${i}.txt`,
        mimeType: "text/plain", size: 100,
        storagePath: `/f${i}.txt`, storageProvider: "local",
      });
    }

    const total = await FileAttachment.countDocuments({ orgId: a.orgId, deletedAt: null });
    const page = await FileAttachment.find({ orgId: a.orgId, deletedAt: null })
      .sort({ createdAt: -1 })
      .skip(0).limit(10)
      .lean();

    expect(total).toBe(25);
    expect(page.length).toBe(10);
  });

  it("filters by folder", async () => {
    const a = await seedOrgWithAdmin({ email: `fl-${Date.now()}@test.com` });
    const folderId = new mongoose.Types.ObjectId().toString();
    await FileAttachment.create({
      id: new mongoose.Types.ObjectId().toString(), orgId: a.orgId, folderId,
      uploaderId: a.userId, createdBy: a.userId,
      name: "in-folder.txt", originalName: "in-folder.txt",
      mimeType: "text/plain", size: 100,
      storagePath: "/f.txt", storageProvider: "local",
    });
    await FileAttachment.create({
      id: new mongoose.Types.ObjectId().toString(), orgId: a.orgId,
      uploaderId: a.userId, createdBy: a.userId,
      name: "root.txt", originalName: "root.txt",
      mimeType: "text/plain", size: 100,
      storagePath: "/r.txt", storageProvider: "local",
    });

    const inFolder = await FileAttachment.countDocuments({ orgId: a.orgId, folderId, deletedAt: null });
    expect(inFolder).toBe(1);
  });

  it("filters by project", async () => {
    const a = await seedOrgWithAdmin({ email: `pj-${Date.now()}@test.com` });
    const projectId = new mongoose.Types.ObjectId().toString();
    await FileAttachment.create({
      id: new mongoose.Types.ObjectId().toString(), orgId: a.orgId, projectId,
      uploaderId: a.userId, createdBy: a.userId,
      name: "project.txt", originalName: "project.txt",
      mimeType: "text/plain", size: 100,
      storagePath: "/p.txt", storageProvider: "local",
    });

    const count = await FileAttachment.countDocuments({ orgId: a.orgId, projectId, deletedAt: null });
    expect(count).toBe(1);
  });
});
