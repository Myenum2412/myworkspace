import mongoose from "mongoose";
import { connectTestDb, resetDb } from "../../__helpers__/db.js";
import { seedOrgWithAdmin } from "../../__helpers__/users.js";
import { FileAttachment } from "../../../src/lib/db/models/FileAttachment.js";
import { FileVersion } from "../../../src/lib/db/models/FileVersion.js";
import { Folder } from "../../../src/lib/db/models/Folder.js";
import { uploadFile, softDeleteFile, restoreFile, getFileStream } from "../../../src/services/file.service.js";
import { ensureClientFolders, resolveClientFolder, autoRouteFileInClientFolder } from "../../../src/services/client-folder.service.js";
import { CLIENT_SUBFOLDERS, MODULE_FOLDER_MAP, getSubfolderForModule } from "../../../src/lib/uploads/folder-mapper.js";

beforeAll(async () => {
  await connectTestDb();
});

beforeEach(async () => {
  await resetDb();
});

describe("Attachment Feature - End-to-End Tests", () => {
  describe("File Upload and Metadata", () => {
    it("should upload a file with correct metadata", async () => {
      const admin = await seedOrgWithAdmin({ email: `upload-${Date.now()}@test.com` });
      const buffer = Buffer.from("Test file content");
      const result = await uploadFile({
        orgId: admin.orgId,
        uploaderId: admin.userId,
        name: "test-document.pdf",
        originalName: "test-document.pdf",
        mimeType: "application/pdf",
        size: buffer.length,
        buffer,
        description: "Test upload",
        tags: ["test", "document"],
      });

      expect(result.kind).toBe("created");
      expect(result.fileId).toBeDefined();

      const file = await FileAttachment.findOne({ id: result.fileId }).lean();
      expect(file).not.toBeNull();
      expect(file!.name).toBe("test-document.pdf");
      expect(file!.originalName).toBe("test-document.pdf");
      expect(file!.mimeType).toBe("application/pdf");
      expect(file!.size).toBe(buffer.length);
      expect(file!.uploaderId).toBe(admin.userId);
      expect(file!.description).toBe("Test upload");
      expect(file!.tags).toEqual(["test", "document"]);
      expect(file!.createdAt).toBeDefined();
      expect(file!.updatedAt).toBeDefined();
    });

    it("should track uploader information correctly", async () => {
      const admin = await seedOrgWithAdmin({ email: `uploader-${Date.now()}@test.com` });
      const buffer = Buffer.from("Uploader test");
      const result = await uploadFile({
        orgId: admin.orgId,
        uploaderId: admin.userId,
        name: "uploader-test.txt",
        originalName: "uploader-test.txt",
        mimeType: "text/plain",
        size: buffer.length,
        buffer,
      });

      const file = await FileAttachment.findOne({ id: result.fileId }).lean();
      expect(file!.uploaderId).toBe(admin.userId);
      expect(file!.createdBy).toBe(admin.userId);
    });

    it("should set correct file category based on MIME type", async () => {
      const admin = await seedOrgWithAdmin({ email: `cat-${Date.now()}@test.com` });

      const testCases = [
        { mimeType: "image/jpeg", expectedCategory: "image" },
        { mimeType: "video/mp4", expectedCategory: "video" },
        { mimeType: "audio/mpeg", expectedCategory: "audio" },
        { mimeType: "application/pdf", expectedCategory: "document" },
        { mimeType: "application/zip", expectedCategory: "archive" },
      ];

      for (const tc of testCases) {
        const buffer = Buffer.from(`Category test for ${tc.mimeType}`);
        const result = await uploadFile({
          orgId: admin.orgId,
          uploaderId: admin.userId,
          name: `test${tc.mimeType.split('/')[1]}`,
          originalName: `test${tc.mimeType.split('/')[1]}`,
          mimeType: tc.mimeType,
          size: buffer.length,
          buffer,
        });

        const file = await FileAttachment.findOne({ id: result.fileId }).lean();
        expect(file!.category).toBe(tc.expectedCategory);
      }
    });
  });

  describe("Folder Mapping and Auto-Routing", () => {
    it("should create client folders structure correctly", async () => {
      const admin = await seedOrgWithAdmin({ email: `folder-${Date.now()}@test.com` });
      const clientId = new mongoose.Types.ObjectId().toString();

      const result = await ensureClientFolders({
        orgId: admin.orgId,
        clientId,
        clientName: "Test Client",
        createdBy: admin.userId,
      });

      expect(result.rootFolderId).toBeDefined();
      expect(result.subfolderIds).toBeDefined();

      const rootFolder = await Folder.findOne({ id: result.rootFolderId }).lean();
      expect(rootFolder).not.toBeNull();
      expect(rootFolder!.clientId).toBe(clientId);
      expect(rootFolder!.name).toBe("Test Client");

      for (const subName of CLIENT_SUBFOLDERS) {
        expect(result.subfolderIds[subName]).toBeDefined();
        const subFolder = await Folder.findOne({ id: result.subfolderIds[subName] }).lean();
        expect(subFolder).not.toBeNull();
        expect(subFolder!.parentId).toBe(result.rootFolderId);
        expect(subFolder!.name).toBe(subName);
      }
    });

    it("should auto-route files to correct client folders based on module", async () => {
      const admin = await seedOrgWithAdmin({ email: `route-${Date.now()}@test.com` });
      const clientId = new mongoose.Types.ObjectId().toString();
      const buffer = Buffer.from("Auto-route test");

      const result = await uploadFile({
        orgId: admin.orgId,
        clientId,
        uploaderId: admin.userId,
        moduleName: "invoice",
        name: "invoice.pdf",
        originalName: "invoice.pdf",
        mimeType: "application/pdf",
        size: buffer.length,
        buffer,
      });

      const file = await FileAttachment.findOne({ id: result.fileId }).lean();
      expect(file).not.toBeNull();

      const targetFolderId = await resolveClientFolder(admin.orgId, clientId, "invoice", admin.userId);
      expect(file!.folderId).toBe(targetFolderId);
    });

    it("should map modules to correct subfolders", async () => {
      expect(getSubfolderForModule("client")).toBe("Attachments");
      expect(getSubfolderForModule("project")).toBe("Projects");
      expect(getSubfolderForModule("task")).toBe("Projects");
      expect(getSubfolderForModule("invoice")).toBe("Invoices");
      expect(getSubfolderForModule("quotation")).toBe("Quotations");
      expect(getSubfolderForModule("contract")).toBe("Contracts");
      expect(getSubfolderForModule("drawing")).toBe("Drawings");
      expect(getSubfolderForModule("image")).toBe("Images");
      expect(getSubfolderForModule("report")).toBe("Reports");
      expect(getSubfolderForModule("email")).toBe("Attachments");
      expect(getSubfolderForModule("transmittal")).toBe("Attachments");
      expect(getSubfolderForModule("rfi")).toBe("Attachments");
      expect(getSubfolderForModule("general")).toBe("Other");
      expect(getSubfolderForModule("other")).toBe("Other");
      expect(getSubfolderForModule()).toBe("Other");
      expect(getSubfolderForModule("unknown")).toBe("Other");
    });

    it("should handle duplicate client folder creation idempotently", async () => {
      const admin = await seedOrgWithAdmin({ email: `idemp-${Date.now()}@test.com` });
      const clientId = new mongoose.Types.ObjectId().toString();

      const first = await ensureClientFolders({
        orgId: admin.orgId,
        clientId,
        clientName: "Test Client",
        createdBy: admin.userId,
      });

      const second = await ensureClientFolders({
        orgId: admin.orgId,
        clientId,
        clientName: "Test Client",
        createdBy: admin.userId,
      });

      expect(first.rootFolderId).toBe(second.rootFolderId);
      expect(Object.keys(first.subfolderIds)).toEqual(Object.keys(second.subfolderIds));
    });

    it("should create project subfolders under Projects folder", async () => {
      const admin = await seedOrgWithAdmin({ email: `proj-${Date.now()}@test.com` });
      const clientId = new mongoose.Types.ObjectId().toString();

      const projectFolderId = await resolveClientFolder(
        admin.orgId,
        clientId,
        "project",
        admin.userId,
        "Test Project"
      );

      expect(projectFolderId).toBeDefined();

      const projectFolder = await Folder.findOne({ id: projectFolderId }).lean();
      expect(projectFolder).not.toBeNull();
      expect(projectFolder!.name).toBe("Test Project");
      expect(projectFolder!.clientId).toBe(clientId);
    });
  });

  describe("File Visibility and Access", () => {
    it("should make uploaded file visible in file listing", async () => {
      const admin = await seedOrgWithAdmin({ email: `vis-${Date.now()}@test.com` });
      const buffer = Buffer.from("Visibility test");

      const result = await uploadFile({
        orgId: admin.orgId,
        uploaderId: admin.userId,
        name: "visible.txt",
        originalName: "visible.txt",
        mimeType: "text/plain",
        size: buffer.length,
        buffer,
      });

      const files = await FileAttachment.find({
        orgId: admin.orgId,
        deletedAt: null,
      }).lean();

      expect(files.length).toBe(1);
      expect(files[0].id).toBe(result.fileId);
    });

    it("should track file access time on view", async () => {
      const admin = await seedOrgWithAdmin({ email: `access-${Date.now()}@test.com` });
      const buffer = Buffer.from("Access tracking test");

      const result = await uploadFile({
        orgId: admin.orgId,
        uploaderId: admin.userId,
        name: "access-test.txt",
        originalName: "access-test.txt",
        mimeType: "text/plain",
        size: buffer.length,
        buffer,
      });

      const fileBefore = await FileAttachment.findOne({ id: result.fileId }).lean();
      expect(fileBefore!.lastAccessedAt).toBeNull();

      await getFileStream(result.fileId);

      const fileAfter = await FileAttachment.findOne({ id: result.fileId }).lean();
      expect(fileAfter!.lastAccessedAt).not.toBeNull();
    });

    it("should filter files by folder", async () => {
      const admin = await seedOrgWithAdmin({ email: `filter-${Date.now()}@test.com` });
      const folderId = new mongoose.Types.ObjectId().toString();
      const buffer = Buffer.from("Folder filter test");

      await uploadFile({
        orgId: admin.orgId,
        folderId,
        uploaderId: admin.userId,
        name: "in-folder.txt",
        originalName: "in-folder.txt",
        mimeType: "text/plain",
        size: buffer.length,
        buffer,
      });

      await uploadFile({
        orgId: admin.orgId,
        uploaderId: admin.userId,
        name: "no-folder.txt",
        originalName: "no-folder.txt",
        mimeType: "text/plain",
        size: buffer.length,
        buffer,
      });

      const inFolder = await FileAttachment.countDocuments({
        orgId: admin.orgId,
        folderId,
        deletedAt: null,
      });

      const noFolder = await FileAttachment.countDocuments({
        orgId: admin.orgId,
        folderId: null,
        deletedAt: null,
      });

      expect(inFolder).toBe(1);
      expect(noFolder).toBe(1);
    });

    it("should filter files by project", async () => {
      const admin = await seedOrgWithAdmin({ email: `projfilter-${Date.now()}@test.com` });
      const projectId = new mongoose.Types.ObjectId().toString();
      const buffer = Buffer.from("Project filter test");

      await uploadFile({
        orgId: admin.orgId,
        projectId,
        uploaderId: admin.userId,
        name: "project-file.txt",
        originalName: "project-file.txt",
        mimeType: "text/plain",
        size: buffer.length,
        buffer,
      });

      const count = await FileAttachment.countDocuments({
        orgId: admin.orgId,
        projectId,
        deletedAt: null,
      });

      expect(count).toBe(1);
    });
  });

  describe("File Soft Delete and Restore", () => {
    it("should soft delete a file", async () => {
      const admin = await seedOrgWithAdmin({ email: `del-${Date.now()}@test.com` });
      const buffer = Buffer.from("Delete test");

      const result = await uploadFile({
        orgId: admin.orgId,
        uploaderId: admin.userId,
        name: "delete-me.txt",
        originalName: "delete-me.txt",
        mimeType: "text/plain",
        size: buffer.length,
        buffer,
      });

      await softDeleteFile(result.fileId, admin.userId);

      const file = await FileAttachment.findOne({ id: result.fileId }).lean();
      expect(file!.deletedAt).not.toBeNull();

      const activeFiles = await FileAttachment.countDocuments({
        orgId: admin.orgId,
        deletedAt: null,
      });
      expect(activeFiles).toBe(0);
    });

    it("should restore a soft-deleted file", async () => {
      const admin = await seedOrgWithAdmin({ email: `restore-${Date.now()}@test.com` });
      const buffer = Buffer.from("Restore test");

      const result = await uploadFile({
        orgId: admin.orgId,
        uploaderId: admin.userId,
        name: "restore-me.txt",
        originalName: "restore-me.txt",
        mimeType: "text/plain",
        size: buffer.length,
        buffer,
      });

      await softDeleteFile(result.fileId, admin.userId);
      await restoreFile(result.fileId, admin.userId);

      const file = await FileAttachment.findOne({ id: result.fileId }).lean();
      expect(file!.deletedAt).toBeNull();
    });
  });

  describe("File Versioning", () => {
    it("should create file versions", async () => {
      const admin = await seedOrgWithAdmin({ email: `ver-${Date.now()}@test.com` });
      const fileId = new mongoose.Types.ObjectId().toString();

      await FileAttachment.create({
        id: fileId,
        orgId: admin.orgId,
        uploaderId: admin.userId,
        createdBy: admin.userId,
        name: "versioned.txt",
        originalName: "versioned.txt",
        mimeType: "text/plain",
        size: 100,
        storagePath: "/v1.txt",
        storageProvider: "local",
        currentVersion: 1,
      });

      await FileVersion.create({
        fileId,
        orgId: admin.orgId,
        versionNumber: 1,
        storagePath: "/v1.txt",
        size: 100,
        checksum: "abc123",
        uploadedBy: admin.userId,
        mimeType: "text/plain",
        originalName: "v1.txt",
        comment: "Initial version",
      });

      await FileVersion.create({
        fileId,
        orgId: admin.orgId,
        versionNumber: 2,
        storagePath: "/v2.txt",
        size: 150,
        checksum: "def456",
        uploadedBy: admin.userId,
        mimeType: "text/plain",
        originalName: "v2.txt",
        comment: "Updated version",
      });

      const versions = await FileVersion.find({ fileId }).sort({ versionNumber: -1 }).lean();
      expect(versions.length).toBe(2);
      expect(versions[0].versionNumber).toBe(2);
      expect(versions[0].comment).toBe("Updated version");
    });
  });

  describe("Staff Panel Attachment View", () => {
    it("should track file locking for staff", async () => {
      const admin = await seedOrgWithAdmin({ email: `staff-${Date.now()}@test.com` });
      const buffer = Buffer.from("Staff lock test");

      const result = await uploadFile({
        orgId: admin.orgId,
        uploaderId: admin.userId,
        name: "staff-file.txt",
        originalName: "staff-file.txt",
        mimeType: "text/plain",
        size: buffer.length,
        buffer,
      });

      await FileAttachment.updateOne(
        { id: result.fileId },
        { isLocked: true, lockedBy: admin.userId }
      );

      const file = await FileAttachment.findOne({ id: result.fileId }).lean();
      expect(file!.isLocked).toBe(true);
      expect(file!.lockedBy).toBe(admin.userId);
    });

    it("should track approval status for staff review", async () => {
      const admin = await seedOrgWithAdmin({ email: `approval-${Date.now()}@test.com` });
      const buffer = Buffer.from("Approval test");

      const result = await uploadFile({
        orgId: admin.orgId,
        uploaderId: admin.userId,
        name: "approval-file.txt",
        originalName: "approval-file.txt",
        mimeType: "text/plain",
        size: buffer.length,
        buffer,
      });

      await FileAttachment.updateOne(
        { id: result.fileId },
        { approvalStatus: "pending" }
      );

      const filePending = await FileAttachment.findOne({ id: result.fileId }).lean();
      expect(filePending!.approvalStatus).toBe("pending");

      await FileAttachment.updateOne(
        { id: result.fileId },
        { approvalStatus: "approved", approvedBy: admin.userId, approvalNote: "Approved" }
      );

      const fileApproved = await FileAttachment.findOne({ id: result.fileId }).lean();
      expect(fileApproved!.approvalStatus).toBe("approved");
      expect(fileApproved!.approvedBy).toBe(admin.userId);
    });
  });

  describe("File Metadata Validation", () => {
    it("should store correct checksum", async () => {
      const admin = await seedOrgWithAdmin({ email: `checksum-${Date.now()}@test.com` });
      const buffer = Buffer.from("Checksum test content");

      const result = await uploadFile({
        orgId: admin.orgId,
        uploaderId: admin.userId,
        name: "checksum-test.txt",
        originalName: "checksum-test.txt",
        mimeType: "text/plain",
        size: buffer.length,
        buffer,
      });

      const file = await FileAttachment.findOne({ id: result.fileId }).lean();
      expect(file!.checksum).toBeDefined();
      expect(file!.checksum.length).toBeGreaterThan(0);
    });

    it("should detect duplicate files via checksum", async () => {
      const admin = await seedOrgWithAdmin({ email: `dup-${Date.now()}@test.com` });
      const buffer = Buffer.from("Duplicate test content");

      const first = await uploadFile({
        orgId: admin.orgId,
        uploaderId: admin.userId,
        name: "original.txt",
        originalName: "original.txt",
        mimeType: "text/plain",
        size: buffer.length,
        buffer,
      });

      const second = await uploadFile({
        orgId: admin.orgId,
        uploaderId: admin.userId,
        name: "duplicate.txt",
        originalName: "duplicate.txt",
        mimeType: "text/plain",
        size: buffer.length,
        buffer,
      });

      expect(second.kind).toBe("duplicate");
      expect(second.fileId).toBe(first.fileId);
    });

    it("should store storage path correctly", async () => {
      const admin = await seedOrgWithAdmin({ email: `storage-${Date.now()}@test.com` });
      const buffer = Buffer.from("Storage path test");

      const result = await uploadFile({
        orgId: admin.orgId,
        uploaderId: admin.userId,
        name: "storage-test.txt",
        originalName: "storage-test.txt",
        mimeType: "text/plain",
        size: buffer.length,
        buffer,
      });

      const file = await FileAttachment.findOne({ id: result.fileId }).lean();
      expect(file!.storagePath).toBeDefined();
      expect(file!.storagePath).toContain(admin.orgId);
      expect(file!.storageProvider).toBe("local");
    });
  });

  describe("Organization Isolation", () => {
    it("should isolate files between organizations", async () => {
      const orgA = await seedOrgWithAdmin({ email: `orgA-${Date.now()}@test.com` });
      const orgB = await seedOrgWithAdmin({ email: `orgB-${Date.now()}@test.com` });

      const bufferA = Buffer.from("Org A file");
      const bufferB = Buffer.from("Org B file");

      await uploadFile({
        orgId: orgA.orgId,
        uploaderId: orgA.userId,
        name: "orgA-file.txt",
        originalName: "orgA-file.txt",
        mimeType: "text/plain",
        size: bufferA.length,
        buffer: bufferA,
      });

      await uploadFile({
        orgId: orgB.orgId,
        uploaderId: orgB.userId,
        name: "orgB-file.txt",
        originalName: "orgB-file.txt",
        mimeType: "text/plain",
        size: bufferB.length,
        buffer: bufferB,
      });

      const filesA = await FileAttachment.find({ orgId: orgA.orgId, deletedAt: null }).lean();
      const filesB = await FileAttachment.find({ orgId: orgB.orgId, deletedAt: null }).lean();

      expect(filesA.length).toBe(1);
      expect(filesB.length).toBe(1);
      expect(filesA[0].name).toBe("orgA-file.txt");
      expect(filesB[0].name).toBe("orgB-file.txt");
    });
  });

  describe("File Statistics and Aggregation", () => {
    it("should aggregate file sizes by organization", async () => {
      const admin = await seedOrgWithAdmin({ email: `stats-${Date.now()}@test.com` });

      for (let i = 0; i < 5; i++) {
        await FileAttachment.create({
          id: new mongoose.Types.ObjectId().toString(),
          orgId: admin.orgId,
          uploaderId: admin.userId,
          createdBy: admin.userId,
          name: `file${i}.txt`,
          originalName: `file${i}.txt`,
          mimeType: "text/plain",
          size: 100 * (i + 1),
          storagePath: `/file${i}.txt`,
          storageProvider: "local",
        });
      }

      const result = await FileAttachment.aggregate([
        { $match: { orgId: admin.orgId, deletedAt: null } },
        { $group: { _id: null, totalFiles: { $sum: 1 }, totalSize: { $sum: "$size" } } },
      ]);

      expect(result[0].totalFiles).toBe(5);
      expect(result[0].totalSize).toBe(1500);
    });

    it("should group files by category", async () => {
      const admin = await seedOrgWithAdmin({ email: `grp-${Date.now()}@test.com` });

      await FileAttachment.create({
        id: new mongoose.Types.ObjectId().toString(),
        orgId: admin.orgId,
        uploaderId: admin.userId,
        createdBy: admin.userId,
        name: "doc.pdf",
        originalName: "doc.pdf",
        mimeType: "application/pdf",
        size: 500,
        storagePath: "/doc.pdf",
        storageProvider: "local",
        category: "document",
      });

      await FileAttachment.create({
        id: new mongoose.Types.ObjectId().toString(),
        orgId: admin.orgId,
        uploaderId: admin.userId,
        createdBy: admin.userId,
        name: "image.jpg",
        originalName: "image.jpg",
        mimeType: "image/jpeg",
        size: 1000,
        storagePath: "/image.jpg",
        storageProvider: "local",
        category: "image",
      });

      const result = await FileAttachment.aggregate([
        { $match: { orgId: admin.orgId, deletedAt: null } },
        { $group: { _id: "$category", count: { $sum: 1 }, totalSize: { $sum: "$size" } } },
      ]);

      expect(result.length).toBe(2);
      const categories = result.map((r: any) => r._id).sort();
      expect(categories).toEqual(["document", "image"]);
    });
  });

  describe("Bulk Operations", () => {
    it("should handle bulk soft delete", async () => {
      const admin = await seedOrgWithAdmin({ email: `bulk-${Date.now()}@test.com` });
      const fileIds: string[] = [];

      for (let i = 0; i < 5; i++) {
        const result = await uploadFile({
          orgId: admin.orgId,
          uploaderId: admin.userId,
          name: `bulk${i}.txt`,
          originalName: `bulk${i}.txt`,
          mimeType: "text/plain",
          size: 100,
          buffer: Buffer.from(`Bulk test ${i}`),
        });
        fileIds.push(result.fileId);
      }

      await FileAttachment.updateMany(
        { id: { $in: fileIds.slice(0, 3) } },
        { deletedAt: new Date() }
      );

      const active = await FileAttachment.countDocuments({ orgId: admin.orgId, deletedAt: null });
      const deleted = await FileAttachment.countDocuments({ orgId: admin.orgId, deletedAt: { $ne: null } });

      expect(active).toBe(2);
      expect(deleted).toBe(3);
    });

    it("should handle bulk tag operations", async () => {
      const admin = await seedOrgWithAdmin({ email: `tag-${Date.now()}@test.com` });
      const fileIds: string[] = [];

      for (let i = 0; i < 3; i++) {
        const result = await uploadFile({
          orgId: admin.orgId,
          uploaderId: admin.userId,
          name: `tagged${i}.txt`,
          originalName: `tagged${i}.txt`,
          mimeType: "text/plain",
          size: 100,
          buffer: Buffer.from(`Tag test ${i}`),
        });
        fileIds.push(result.fileId);
      }

      await FileAttachment.updateMany(
        { id: { $in: fileIds } },
        { $addToSet: { tags: { $each: ["important", "reviewed"] } } }
      );

      const files = await FileAttachment.find({ id: { $in: fileIds } }).lean();
      for (const file of files) {
        expect(file.tags).toContain("important");
        expect(file.tags).toContain("reviewed");
      }
    });
  });
});
