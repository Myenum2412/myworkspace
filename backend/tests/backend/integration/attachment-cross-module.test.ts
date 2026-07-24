import mongoose from "mongoose";
import { connectTestDb, resetDb } from "../../__helpers__/db.js";
import { seedOrgWithAdmin } from "../../__helpers__/users.js";
import { FileAttachment } from "../../../src/lib/db/models/FileAttachment.js";
import { FileVersion } from "../../../src/lib/db/models/FileVersion.js";
import { FileShare } from "../../../src/lib/db/models/FileShare.js";
import { Folder } from "../../../src/lib/db/models/Folder.js";
import { uploadFile, softDeleteFile, restoreFile, getFileStream, toggleFileLock, createFileVersion, duplicateFile } from "../../../src/services/file.service.js";
import { ensureClientFolders, resolveClientFolder, autoRouteFileInClientFolder } from "../../../src/services/client-folder.service.js";
import { CLIENT_SUBFOLDERS, MODULE_FOLDER_MAP, getSubfolderForModule } from "../../../src/lib/uploads/folder-mapper.js";

beforeAll(async () => {
  await connectTestDb();
});

beforeEach(async () => {
  await resetDb();
});

// ─── Helper: upload with module context ──────────────────────────────────
async function uploadWithModule(
  admin: { orgId: string; userId: string },
  moduleName: string,
  opts: Partial<{ clientId: string; projectId: string; folderId: string; name: string; mimeType: string; size: number; category: string }> = {}
) {
  const name = opts.name || `${moduleName}-file.pdf`;
  const buffer = Buffer.from(`Test content for ${moduleName} module`);
  return uploadFile({
    orgId: admin.orgId,
    clientId: opts.clientId || undefined,
    projectId: opts.projectId || undefined,
    folderId: opts.folderId || undefined,
    uploaderId: admin.userId,
    moduleName,
    name,
    originalName: name,
    mimeType: opts.mimeType || "application/pdf",
    size: opts.size || buffer.length,
    buffer,
    category: opts.category as any,
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 1: Cross-Module Upload and Folder Mapping
// ═══════════════════════════════════════════════════════════════════════════

describe("Cross-Module Attachment E2E", () => {
  describe("1. Module-to-Subfolder Mapping", () => {
    it("should map every known module to the correct subfolder", () => {
      for (const [mod, sub] of Object.entries(MODULE_FOLDER_MAP)) {
        expect(getSubfolderForModule(mod)).toBe(sub);
      }
    });

    it("should default unknown modules to 'Other'", () => {
      expect(getSubfolderForModule("unknown_module")).toBe("Other");
      expect(getSubfolderForModule("custom")).toBe("Other");
      expect(getSubfolderForModule("")).toBe("Other");
      expect(getSubfolderForModule(undefined)).toBe("Other");
    });

    it("should be case-insensitive for module lookup", () => {
      expect(getSubfolderForModule("Invoice")).toBe("Invoices");
      expect(getSubfolderForModule("INVOICE")).toBe("Invoices");
      expect(getSubfolderForModule("Project")).toBe("Projects");
      expect(getSubfolderForModule("TASK")).toBe("Projects");
    });

    it("should have all CLIENT_SUBFOLDERS matching MODULE_FOLDER_MAP values", () => {
      const subfolderSet = new Set(CLIENT_SUBFOLDERS);
      const mappedValues = new Set(Object.values(MODULE_FOLDER_MAP));
      for (const val of mappedValues) {
        expect(subfolderSet.has(val)).toBe(true);
      }
    });
  });

  describe("2. Client Folder Structure", () => {
    it("should create root folder with correct path pattern", async () => {
      const admin = await seedOrgWithAdmin({ email: `struct-${Date.now()}@test.com` });
      const clientId = new mongoose.Types.ObjectId().toString();

      const result = await ensureClientFolders({
        orgId: admin.orgId,
        clientId,
        clientName: "Acme Corp",
        createdBy: admin.userId,
      });

      const root = await Folder.findOne({ id: result.rootFolderId }).lean();
      expect(root!.path).toBe(`/Clients/${clientId}`);
      expect(root!.name).toBe("Acme Corp");
      expect(root!.clientId).toBe(clientId);
      expect(root!.parentId).toBeNull();
    });

    it("should create all 10 subfolders under root", async () => {
      const admin = await seedOrgWithAdmin({ email: `subs-${Date.now()}@test.com` });
      const clientId = new mongoose.Types.ObjectId().toString();

      const result = await ensureClientFolders({
        orgId: admin.orgId,
        clientId,
        clientName: "Test Client",
        createdBy: admin.userId,
      });

      expect(Object.keys(result.subfolderIds).length).toBe(CLIENT_SUBFOLDERS.length);

      for (const subName of CLIENT_SUBFOLDERS) {
        const sub = await Folder.findOne({ id: result.subfolderIds[subName] }).lean();
        expect(sub).not.toBeNull();
        expect(sub!.name).toBe(subName);
        expect(sub!.parentId).toBe(result.rootFolderId);
        expect(sub!.path).toBe(`/Clients/${clientId}/${subName}`);
      }
    });

    it("should set client permissions on root and subfolders", async () => {
      const admin = await seedOrgWithAdmin({ email: `perms-${Date.now()}@test.com` });
      const clientId = new mongoose.Types.ObjectId().toString();

      const result = await ensureClientFolders({
        orgId: admin.orgId,
        clientId,
        clientName: "Perm Test",
        createdBy: admin.userId,
      });

      const root = await Folder.findOne({ id: result.rootFolderId }).lean();
      expect(root!.permissions.clientCanView).toBe(true);
      expect(root!.permissions.clientCanUpload).toBe(true);
      expect(root!.permissions.clientCanDelete).toBe(false);

      const reportsSub = await Folder.findOne({ id: result.subfolderIds["Reports"] }).lean();
      expect(reportsSub!.permissions.clientCanUpload).toBe(false);
    });
  });

  describe("3. Auto-Routing Per Module", () => {
    const modules = [
      { name: "client", expectedSub: "Attachments" },
      { name: "project", expectedSub: "Projects" },
      { name: "task", expectedSub: "Projects" },
      { name: "invoice", expectedSub: "Invoices" },
      { name: "quotation", expectedSub: "Quotations" },
      { name: "contract", expectedSub: "Contracts" },
      { name: "drawing", expectedSub: "Drawings" },
      { name: "image", expectedSub: "Images" },
      { name: "report", expectedSub: "Reports" },
      { name: "email", expectedSub: "Attachments" },
      { name: "transmittal", expectedSub: "Attachments" },
      { name: "rfi", expectedSub: "Attachments" },
      { name: "general", expectedSub: "Other" },
      { name: "other", expectedSub: "Other" },
    ];

    for (const mod of modules) {
      it(`should route ${mod.name} files to ${mod.expectedSub}`, async () => {
        const admin = await seedOrgWithAdmin({ email: `route-${mod.name}-${Date.now()}@test.com` });
        const clientId = new mongoose.Types.ObjectId().toString();

        const result = await uploadWithModule(admin, mod.name, { clientId });

        const file = await FileAttachment.findOne({ id: result.fileId }).lean();
        expect(file).not.toBeNull();

        const targetFolderId = await resolveClientFolder(admin.orgId, clientId, mod.name, admin.userId);
        expect(file!.folderId).toBe(targetFolderId);

        const folder = await Folder.findOne({ id: targetFolderId }).lean();
        expect(folder!.name).toBe(mod.expectedSub);
      });
    }
  });

  describe("4. Upload and Metadata Verification", () => {
    it("should store complete metadata on upload", async () => {
      const admin = await seedOrgWithAdmin({ email: `meta-${Date.now()}@test.com` });
      const buffer = Buffer.from("Full metadata test content");
      const beforeUpload = new Date();

      const result = await uploadFile({
        orgId: admin.orgId,
        uploaderId: admin.userId,
        name: "metadata-test.pdf",
        originalName: "metadata-test.pdf",
        mimeType: "application/pdf",
        size: buffer.length,
        buffer,
        description: "Testing full metadata",
        tags: ["test", "metadata", "qa"],
      });

      const file = await FileAttachment.findOne({ id: result.fileId }).lean();
      const afterUpload = new Date();

      expect(file).not.toBeNull();
      expect(file!.name).toBe("metadata-test.pdf");
      expect(file!.originalName).toBe("metadata-test.pdf");
      expect(file!.mimeType).toBe("application/pdf");
      expect(file!.size).toBe(buffer.length);
      expect(file!.uploaderId).toBe(admin.userId);
      expect(file!.createdBy).toBe(admin.userId);
      expect(file!.description).toBe("Testing full metadata");
      expect(file!.tags).toEqual(["test", "metadata", "qa"]);
      expect(file!.category).toBe("document");
      expect(file!.storagePath).toContain(admin.orgId);
      expect(file!.storageProvider).toBe("local");
      expect(file!.checksum).toBeDefined();
      expect(file!.checksum!.length).toBeGreaterThan(0);
      expect(file!.currentVersion).toBe(1);
      expect(file!.deletedAt).toBeNull();
      expect(file!.createdAt.getTime()).toBeGreaterThanOrEqual(beforeUpload.getTime());
      expect(file!.createdAt.getTime()).toBeLessThanOrEqual(afterUpload.getTime());
      expect(file!.updatedAt).toBeDefined();
    });

    it("should set correct category for each MIME type group", async () => {
      const admin = await seedOrgWithAdmin({ email: `catgroup-${Date.now()}@test.com` });

      const cases: [string, string][] = [
        ["image/png", "image"],
        ["image/jpeg", "image"],
        ["image/gif", "image"],
        ["video/mp4", "video"],
        ["video/webm", "video"],
        ["audio/mpeg", "audio"],
        ["audio/wav", "audio"],
        ["application/pdf", "document"],
        ["application/msword", "document"],
        ["application/vnd.openxmlformats-officedocument.wordprocessingml.document", "document"],
        ["application/vnd.ms-excel", "document"],
        ["application/zip", "archive"],
        ["application/x-rar-compressed", "archive"],
        ["text/plain", "general"],
        ["application/json", "general"],
      ];

      for (const [mime, expectedCat] of cases) {
        const ext = mime.split("/")[1] || "bin";
        const buffer = Buffer.from(`Category test ${mime}`);
        const result = await uploadFile({
          orgId: admin.orgId,
          uploaderId: admin.userId,
          name: `test-${ext}.${ext}`,
          originalName: `test-${ext}.${ext}`,
          mimeType: mime,
          size: buffer.length,
          buffer,
        });

        const file = await FileAttachment.findOne({ id: result.fileId }).lean();
        expect(file!.category).toBe(expectedCat);
      }
    });

    it("should preserve uploader identity across uploads", async () => {
      const admin = await seedOrgWithAdmin({ email: `uploader-${Date.now()}@test.com` });

      for (let i = 0; i < 3; i++) {
        const buffer = Buffer.from(`Upload ${i}`);
        const result = await uploadFile({
          orgId: admin.orgId,
          uploaderId: admin.userId,
          name: `upload-${i}.txt`,
          originalName: `upload-${i}.txt`,
          mimeType: "text/plain",
          size: buffer.length,
          buffer,
        });

        const file = await FileAttachment.findOne({ id: result.fileId }).lean();
        expect(file!.uploaderId).toBe(admin.userId);
        expect(file!.createdBy).toBe(admin.userId);
      }
    });
  });

  describe("5. Files Page Visibility and Folder Mapping", () => {
    it("should list uploaded files with correct folderId", async () => {
      const admin = await seedOrgWithAdmin({ email: `list-${Date.now()}@test.com` });
      const clientId = new mongoose.Types.ObjectId().toString();

      await uploadWithModule(admin, "invoice", { clientId, name: "inv-001.pdf" });
      await uploadWithModule(admin, "contract", { clientId, name: "contract-001.pdf" });
      await uploadWithModule(admin, "drawing", { clientId, name: "drawing-001.pdf" });

      const allFiles = await FileAttachment.find({
        orgId: admin.orgId,
        clientId,
        deletedAt: null,
      }).lean();

      expect(allFiles.length).toBe(3);

      for (const f of allFiles) {
        expect(f.folderId).toBeDefined();
        expect(f.folderId).not.toBeNull();
      }

      const folders = await Folder.find({
        orgId: admin.orgId,
        clientId,
        deletedAt: null,
      }).lean();

      expect(folders.length).toBeGreaterThanOrEqual(10);
    });

    it("should make files visible after upload with correct name/type/size/uploader/timestamp", async () => {
      const admin = await seedOrgWithAdmin({ email: `vis-${Date.now()}@test.com` });
      const buffer = Buffer.from("Visibility verification content");

      const uploadResult = await uploadFile({
        orgId: admin.orgId,
        uploaderId: admin.userId,
        name: "visibility-test.docx",
        originalName: "visibility-test.docx",
        mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        size: buffer.length,
        buffer,
      });

      const file = await FileAttachment.findOne({ id: uploadResult.fileId }).lean();
      expect(file).not.toBeNull();
      expect(file!.name).toBe("visibility-test.docx");
      expect(file!.mimeType).toBe("application/vnd.openxmlformats-officedocument.wordprocessingml.document");
      expect(file!.size).toBe(buffer.length);
      expect(file!.uploaderId).toBe(admin.userId);
      expect(file!.createdAt).toBeDefined();

      const allOrgFiles = await FileAttachment.countDocuments({
        orgId: admin.orgId,
        deletedAt: null,
      });
      expect(allOrgFiles).toBe(1);
    });

    it("should filter files by folder on Files page query", async () => {
      const admin = await seedOrgWithAdmin({ email: `filter-folder-${Date.now()}@test.com` });
      const folderA = new mongoose.Types.ObjectId().toString();
      const folderB = new mongoose.Types.ObjectId().toString();

      await uploadFile({
        orgId: admin.orgId, folderId: folderA, uploaderId: admin.userId,
        name: "inA.txt", originalName: "inA.txt", mimeType: "text/plain", size: 4, buffer: Buffer.from("inA1"),
      });
      await uploadFile({
        orgId: admin.orgId, folderId: folderA, uploaderId: admin.userId,
        name: "inA2.txt", originalName: "inA2.txt", mimeType: "text/plain", size: 4, buffer: Buffer.from("inA2"),
      });
      await uploadFile({
        orgId: admin.orgId, folderId: folderB, uploaderId: admin.userId,
        name: "inB.txt", originalName: "inB.txt", mimeType: "text/plain", size: 3, buffer: Buffer.from("inB"),
      });
      await uploadFile({
        orgId: admin.orgId, uploaderId: admin.userId,
        name: "noFolder.txt", originalName: "noFolder.txt", mimeType: "text/plain", size: 5, buffer: Buffer.from("noFld"),
      });

      const inA = await FileAttachment.countDocuments({ orgId: admin.orgId, folderId: folderA, deletedAt: null });
      const inB = await FileAttachment.countDocuments({ orgId: admin.orgId, folderId: folderB, deletedAt: null });
      const noFolder = await FileAttachment.countDocuments({ orgId: admin.orgId, folderId: null, deletedAt: null });

      expect(inA).toBe(2);
      expect(inB).toBe(1);
      expect(noFolder).toBe(1);
    });

    it("should track access time when file is viewed", async () => {
      const admin = await seedOrgWithAdmin({ email: `access-track-${Date.now()}@test.com` });
      const buffer = Buffer.from("Access tracking test");

      const result = await uploadFile({
        orgId: admin.orgId, uploaderId: admin.userId,
        name: "access.txt", originalName: "access.txt", mimeType: "text/plain",
        size: buffer.length, buffer,
      });

      const before = await FileAttachment.findOne({ id: result.fileId }).lean();
      expect(before!.lastAccessedAt).toBeNull();

      await getFileStream(result.fileId);

      const after = await FileAttachment.findOne({ id: result.fileId }).lean();
      expect(after!.lastAccessedAt).not.toBeNull();
    });

    it("should reject view for rejected files", async () => {
      const admin = await seedOrgWithAdmin({ email: `reject-view-${Date.now()}@test.com` });
      const buffer = Buffer.from("Rejected file");

      const result = await uploadFile({
        orgId: admin.orgId, uploaderId: admin.userId,
        name: "rejected.txt", originalName: "rejected.txt", mimeType: "text/plain",
        size: buffer.length, buffer,
      });

      await FileAttachment.updateOne({ id: result.fileId }, { approvalStatus: "rejected" });

      const stream = await getFileStream(result.fileId);
      expect(stream).toBeNull();
    });

    it("should reject view for pending files older than 1 hour", async () => {
      const admin = await seedOrgWithAdmin({ email: `pending-old-${Date.now()}@test.com` });
      const buffer = Buffer.from("Old pending file");

      const result = await uploadFile({
        orgId: admin.orgId, uploaderId: admin.userId,
        name: "old-pending.txt", originalName: "old-pending.txt", mimeType: "text/plain",
        size: buffer.length, buffer,
      });

      const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
      await FileAttachment.updateOne(
        { id: result.fileId },
        { approvalStatus: "pending", virusScanStatus: "pending", createdAt: twoHoursAgo }
      );

      const stream = await getFileStream(result.fileId);
      expect(stream).toBeNull();
    });

    it("should reject view for infected files", async () => {
      const admin = await seedOrgWithAdmin({ email: `infected-${Date.now()}@test.com` });
      const buffer = Buffer.from("Infected file");

      const result = await uploadFile({
        orgId: admin.orgId, uploaderId: admin.userId,
        name: "virus.txt", originalName: "virus.txt", mimeType: "text/plain",
        size: buffer.length, buffer,
      });

      await FileAttachment.updateOne({ id: result.fileId }, { virusScanStatus: "infected" });

      const stream = await getFileStream(result.fileId);
      expect(stream).toBeNull();
    });
  });

  describe("6. Staff Panel Attachment View", () => {
    it("should list files per staff member via uploaderId filter", async () => {
      const admin = await seedOrgWithAdmin({ email: `staff-list-${Date.now()}@test.com` });
      const staffA = await seedOrgWithAdmin({ email: `staffA-${Date.now()}@test.com` });

      const buffer = Buffer.from("Staff A file");
      await uploadFile({
        orgId: admin.orgId, uploaderId: staffA.userId,
        name: "staffA-doc.pdf", originalName: "staffA-doc.pdf", mimeType: "application/pdf",
        size: buffer.length, buffer,
      });

      await uploadFile({
        orgId: admin.orgId, uploaderId: admin.userId,
        name: "admin-doc.pdf", originalName: "admin-doc.pdf", mimeType: "application/pdf",
        size: buffer.length, buffer,
      });

      const staffAFiles = await FileAttachment.find({
        orgId: admin.orgId,
        uploaderId: staffA.userId,
        deletedAt: null,
      }).lean();

      expect(staffAFiles.length).toBe(1);
      expect(staffAFiles[0].name).toBe("staffA-doc.pdf");
    });

    it("should support file locking by staff", async () => {
      const admin = await seedOrgWithAdmin({ email: `lock-staff-${Date.now()}@test.com` });
      const buffer = Buffer.from("Lockable file");

      const result = await uploadFile({
        orgId: admin.orgId, uploaderId: admin.userId,
        name: "lockable.txt", originalName: "lockable.txt", mimeType: "text/plain",
        size: buffer.length, buffer,
      });

      const locked = await toggleFileLock(result.fileId, admin.userId, true);
      expect(locked).toBe(true);

      const file = await FileAttachment.findOne({ id: result.fileId }).lean();
      expect(file!.isLocked).toBe(true);
      expect(file!.lockedBy).toBe(admin.userId);

      await toggleFileLock(result.fileId, admin.userId, false);
      const unlocked = await FileAttachment.findOne({ id: result.fileId }).lean();
      expect(unlocked!.isLocked).toBe(false);
      expect(unlocked!.lockedBy).toBeNull();
    });

    it("should prevent deletion of locked files by non-owner", async () => {
      const admin = await seedOrgWithAdmin({ email: `lock-del-${Date.now()}@test.com` });
      const other = await seedOrgWithAdmin({ email: `other-del-${Date.now()}@test.com` });
      const buffer = Buffer.from("Locked file");

      const result = await uploadFile({
        orgId: admin.orgId, uploaderId: admin.userId,
        name: "locked.txt", originalName: "locked.txt", mimeType: "text/plain",
        size: buffer.length, buffer,
      });

      await toggleFileLock(result.fileId, admin.userId, true);

      await expect(
        softDeleteFile(result.fileId, other.userId)
      ).rejects.toThrow(/locked/i);
    });

    it("should support file sharing between staff", async () => {
      const admin = await seedOrgWithAdmin({ email: `share-${Date.now()}@test.com` });
      const staff = await seedOrgWithAdmin({ email: `staff-share-${Date.now()}@test.com` });
      const buffer = Buffer.from("Shareable file");

      const result = await uploadFile({
        orgId: admin.orgId, uploaderId: admin.userId,
        name: "shared-doc.pdf", originalName: "shared-doc.pdf", mimeType: "application/pdf",
        size: buffer.length, buffer,
      });

      await FileShare.create({
        id: new mongoose.Types.ObjectId().toString(),
        fileId: result.fileId,
        sharedByUserId: admin.userId,
        sharedWithUserId: staff.userId,
        orgId: admin.orgId,
        createdBy: admin.userId,
      });

      const shares = await FileShare.find({ fileId: result.fileId }).lean();
      expect(shares.length).toBe(1);
      expect(shares[0].sharedWithUserId).toBe(staff.userId);
    });

    it("should support approval workflow for staff review", async () => {
      const admin = await seedOrgWithAdmin({ email: `approval-${Date.now()}@test.com` });
      const buffer = Buffer.from("Approval workflow file");

      const result = await uploadFile({
        orgId: admin.orgId, uploaderId: admin.userId,
        name: "for-approval.pdf", originalName: "for-approval.pdf", mimeType: "application/pdf",
        size: buffer.length, buffer,
      });

      await FileAttachment.updateOne(
        { id: result.fileId },
        { approvalStatus: "pending" }
      );
      let file = await FileAttachment.findOne({ id: result.fileId }).lean();
      expect(file!.approvalStatus).toBe("pending");

      await FileAttachment.updateOne(
        { id: result.fileId },
        { approvalStatus: "approved", approvedBy: admin.userId, approvalNote: "Looks good" }
      );
      file = await FileAttachment.findOne({ id: result.fileId }).lean();
      expect(file!.approvalStatus).toBe("approved");
      expect(file!.approvedBy).toBe(admin.userId);

      const stream = await getFileStream(result.fileId);
      expect(stream).not.toBeNull();
    });
  });

  describe("7. Duplicate Detection", () => {
    it("should detect duplicate by checksum and return same fileId", async () => {
      const admin = await seedOrgWithAdmin({ email: `dup-${Date.now()}@test.com` });
      const buffer = Buffer.from("Duplicate detection test content");

      const first = await uploadFile({
        orgId: admin.orgId, uploaderId: admin.userId,
        name: "original.pdf", originalName: "original.pdf", mimeType: "application/pdf",
        size: buffer.length, buffer,
      });

      const second = await uploadFile({
        orgId: admin.orgId, uploaderId: admin.userId,
        name: "copy.pdf", originalName: "copy.pdf", mimeType: "application/pdf",
        size: buffer.length, buffer,
      });

      expect(second.kind).toBe("duplicate");
      expect(second.fileId).toBe(first.fileId);
    });

    it("should not treat different content as duplicate", async () => {
      const admin = await seedOrgWithAdmin({ email: `nodup-${Date.now()}@test.com` });

      const first = await uploadFile({
        orgId: admin.orgId, uploaderId: admin.userId,
        name: "a.txt", originalName: "a.txt", mimeType: "text/plain",
        size: 5, buffer: Buffer.from("aaaaa"),
      });

      const second = await uploadFile({
        orgId: admin.orgId, uploaderId: admin.userId,
        name: "b.txt", originalName: "b.txt", mimeType: "text/plain",
        size: 5, buffer: Buffer.from("bbbbb"),
      });

      expect(second.kind).toBe("created");
      expect(second.fileId).not.toBe(first.fileId);
    });

    it("should allow duplicate with skipDuplicates=false", async () => {
      const admin = await seedOrgWithAdmin({ email: `noskip-${Date.now()}@test.com` });
      const buffer = Buffer.from("No skip duplicate");

      const first = await uploadFile({
        orgId: admin.orgId, uploaderId: admin.userId,
        name: "a.txt", originalName: "a.txt", mimeType: "text/plain",
        size: buffer.length, buffer, skipDuplicates: false,
      });

      const second = await uploadFile({
        orgId: admin.orgId, uploaderId: admin.userId,
        name: "b.txt", originalName: "b.txt", mimeType: "text/plain",
        size: buffer.length, buffer, skipDuplicates: false,
      });

      expect(second.kind).toBe("created");
      expect(second.fileId).not.toBe(first.fileId);
    });
  });

  describe("8. File Versioning", () => {
    it("should create multiple versions and track history", async () => {
      const admin = await seedOrgWithAdmin({ email: `ver-${Date.now()}@test.com` });
      const buffer = Buffer.from("Original content");

      const result = await uploadFile({
        orgId: admin.orgId, uploaderId: admin.userId,
        name: "versioned.txt", originalName: "versioned.txt", mimeType: "text/plain",
        size: buffer.length, buffer,
      });

      const v2Result = await createFileVersion(
        result.fileId, admin.userId,
        Buffer.from("Updated content v2"), "versioned-v2.txt", "Updated version"
      );
      expect(v2Result.versionNumber).toBe(2);

      const v3Result = await createFileVersion(
        result.fileId, admin.userId,
        Buffer.from("Final content v3"), "versioned-v3.txt", "Final version"
      );
      expect(v3Result.versionNumber).toBe(3);

      const file = await FileAttachment.findOne({ id: result.fileId }).lean();
      expect(file!.currentVersion).toBe(3);

      const versions = await FileVersion.find({ fileId: result.fileId })
        .sort({ versionNumber: -1 }).lean();
      expect(versions.length).toBe(2);
      expect(versions[0].versionNumber).toBe(3);
      expect(versions[0].comment).toBe("Final version");
      expect(versions[1].versionNumber).toBe(2);
      expect(versions[1].comment).toBe("Updated version");
    });

    it("should prevent versioning locked files by non-owner", async () => {
      const admin = await seedOrgWithAdmin({ email: `lock-ver-${Date.now()}@test.com` });
      const other = await seedOrgWithAdmin({ email: `other-ver-${Date.now()}@test.com` });
      const buffer = Buffer.from("Locked for versioning");

      const result = await uploadFile({
        orgId: admin.orgId, uploaderId: admin.userId,
        name: "locked-ver.txt", originalName: "locked-ver.txt", mimeType: "text/plain",
        size: buffer.length, buffer,
      });

      await toggleFileLock(result.fileId, admin.userId, true);

      await expect(
        createFileVersion(result.fileId, other.userId, Buffer.from("attempt"), "fail.txt")
      ).rejects.toThrow(/locked/i);
    });
  });

  describe("9. Organization Isolation", () => {
    it("should completely isolate files between organizations", async () => {
      const orgA = await seedOrgWithAdmin({ email: `isoA-${Date.now()}@test.com` });
      const orgB = await seedOrgWithAdmin({ email: `isoB-${Date.now()}@test.com` });

      await uploadWithModule(orgA, "invoice", { name: "a-inv.pdf" });
      await uploadWithModule(orgA, "contract", { name: "a-contract.pdf" });
      await uploadWithModule(orgB, "invoice", { name: "b-inv.pdf" });

      const filesA = await FileAttachment.find({ orgId: orgA.orgId, deletedAt: null }).lean();
      const filesB = await FileAttachment.find({ orgId: orgB.orgId, deletedAt: null }).lean();

      expect(filesA.length).toBe(2);
      expect(filesB.length).toBe(1);
      expect(filesA.every(f => f.orgId === orgA.orgId)).toBe(true);
      expect(filesB.every(f => f.orgId === orgB.orgId)).toBe(true);
    });

    it("should isolate folders between organizations", async () => {
      const orgA = await seedOrgWithAdmin({ email: `foldA-${Date.now()}@test.com` });
      const orgB = await seedOrgWithAdmin({ email: `foldB-${Date.now()}@test.com` });
      const clientId = new mongoose.Types.ObjectId().toString();

      await ensureClientFolders({ orgId: orgA.orgId, clientId, clientName: "Client A", createdBy: orgA.userId });
      await ensureClientFolders({ orgId: orgB.orgId, clientId, clientName: "Client B", createdBy: orgB.userId });

      const foldersA = await Folder.find({ orgId: orgA.orgId, clientId }).lean();
      const foldersB = await Folder.find({ orgId: orgB.orgId, clientId }).lean();

      expect(foldersA.length).toBeGreaterThanOrEqual(10);
      expect(foldersB.length).toBeGreaterThanOrEqual(10);
      expect(foldersA.every(f => f.orgId === orgA.orgId)).toBe(true);
      expect(foldersB.every(f => f.orgId === orgB.orgId)).toBe(true);
    });
  });

  describe("10. File Soft Delete and Restore Lifecycle", () => {
    it("should soft delete then restore, preserving metadata", async () => {
      const admin = await seedOrgWithAdmin({ email: `delrest-${Date.now()}@test.com` });
      const buffer = Buffer.from("Delete and restore test");

      const result = await uploadFile({
        orgId: admin.orgId, uploaderId: admin.userId,
        name: "lifecycle.txt", originalName: "lifecycle.txt", mimeType: "text/plain",
        size: buffer.length, buffer,
        description: "Will be deleted and restored",
        tags: ["lifecycle"],
      });

      await softDeleteFile(result.fileId, admin.userId);
      const deleted = await FileAttachment.findOne({ id: result.fileId }).lean();
      expect(deleted!.deletedAt).not.toBeNull();
      expect(deleted!.deletedBy).toBe(admin.userId);
      expect(deleted!.description).toBe("Will be deleted and restored");

      const activeCount = await FileAttachment.countDocuments({ orgId: admin.orgId, deletedAt: null });
      expect(activeCount).toBe(0);

      await restoreFile(result.fileId, admin.userId);
      const restored = await FileAttachment.findOne({ id: result.fileId }).lean();
      expect(restored!.deletedAt).toBeNull();
      expect(restored!.deletedBy).toBeNull();
      expect(restored!.description).toBe("Will be deleted and restored");
      expect(restored!.tags).toEqual(["lifecycle"]);

      const restoredCount = await FileAttachment.countDocuments({ orgId: admin.orgId, deletedAt: null });
      expect(restoredCount).toBe(1);
    });

    it("should prevent restoring non-deleted files", async () => {
      const admin = await seedOrgWithAdmin({ email: `no-restore-${Date.now()}@test.com` });
      const buffer = Buffer.from("Not deleted");

      const result = await uploadFile({
        orgId: admin.orgId, uploaderId: admin.userId,
        name: "not-deleted.txt", originalName: "not-deleted.txt", mimeType: "text/plain",
        size: buffer.length, buffer,
      });

      await expect(restoreFile(result.fileId, admin.userId)).rejects.toThrow(/not in trash/i);
    });
  });

  describe("11. Bulk Operations", () => {
    it("should handle bulk delete by folder", async () => {
      const admin = await seedOrgWithAdmin({ email: `bulk-folder-${Date.now()}@test.com` });
      const folderId = new mongoose.Types.ObjectId().toString();
      const fileIds: string[] = [];

      for (let i = 0; i < 5; i++) {
        const result = await uploadFile({
          orgId: admin.orgId, folderId, uploaderId: admin.userId,
          name: `bulk-${i}.txt`, originalName: `bulk-${i}.txt`, mimeType: "text/plain",
          size: 10, buffer: Buffer.from(`bulk ${i}`),
        });
        fileIds.push(result.fileId);
      }

      await FileAttachment.updateMany(
        { id: { $in: fileIds.slice(0, 3) } },
        { deletedAt: new Date(), deletedBy: admin.userId }
      );

      const active = await FileAttachment.countDocuments({ orgId: admin.orgId, folderId, deletedAt: null });
      const deleted = await FileAttachment.countDocuments({ orgId: admin.orgId, folderId, deletedAt: { $ne: null } });

      expect(active).toBe(2);
      expect(deleted).toBe(3);
    });

    it("should handle bulk tag operations", async () => {
      const admin = await seedOrgWithAdmin({ email: `bulk-tag-${Date.now()}@test.com` });
      const fileIds: string[] = [];

      for (let i = 0; i < 4; i++) {
        const result = await uploadFile({
          orgId: admin.orgId, uploaderId: admin.userId,
          name: `tag-${i}.txt`, originalName: `tag-${i}.txt`, mimeType: "text/plain",
          size: 10, buffer: Buffer.from(`tag ${i}`),
        });
        fileIds.push(result.fileId);
      }

      await FileAttachment.updateMany(
        { id: { $in: fileIds } },
        { $addToSet: { tags: { $each: ["approved", "reviewed"] } } }
      );

      const files = await FileAttachment.find({ id: { $in: fileIds } }).lean();
      for (const f of files) {
        expect(f.tags).toContain("approved");
        expect(f.tags).toContain("reviewed");
      }
    });

    it("should handle bulk move between folders", async () => {
      const admin = await seedOrgWithAdmin({ email: `bulk-move-${Date.now()}@test.com` });
      const fromFolder = new mongoose.Types.ObjectId().toString();
      const toFolder = new mongoose.Types.ObjectId().toString();
      const fileIds: string[] = [];

      for (let i = 0; i < 3; i++) {
        const result = await uploadFile({
          orgId: admin.orgId, folderId: fromFolder, uploaderId: admin.userId,
          name: `move-${i}.txt`, originalName: `move-${i}.txt`, mimeType: "text/plain",
          size: 10, buffer: Buffer.from(`move ${i}`),
        });
        fileIds.push(result.fileId);
      }

      await FileAttachment.updateMany(
        { id: { $in: fileIds } },
        { folderId: toFolder }
      );

      const moved = await FileAttachment.countDocuments({ orgId: admin.orgId, folderId: toFolder, deletedAt: null });
      expect(moved).toBe(3);

      const remaining = await FileAttachment.countDocuments({ orgId: admin.orgId, folderId: fromFolder, deletedAt: null });
      expect(remaining).toBe(0);
    });
  });

  describe("12. Storage and Statistics", () => {
    it("should track storage quota correctly", async () => {
      const admin = await seedOrgWithAdmin({ email: `quota-${Date.now()}@test.com` });

      for (let i = 0; i < 3; i++) {
        await FileAttachment.create({
          id: new mongoose.Types.ObjectId().toString(),
          orgId: admin.orgId, uploaderId: admin.userId, createdBy: admin.userId,
          name: `q${i}.txt`, originalName: `q${i}.txt`, mimeType: "text/plain",
          size: 100 * (i + 1), storagePath: `/q${i}.txt`, storageProvider: "local",
        });
      }

      const result = await FileAttachment.aggregate([
        { $match: { orgId: admin.orgId, deletedAt: null } },
        { $group: { _id: null, totalFiles: { $sum: 1 }, totalSize: { $sum: "$size" } } },
      ]);

      expect(result[0].totalFiles).toBe(3);
      expect(result[0].totalSize).toBe(600);
    });

    it("should group files by category for dashboard", async () => {
      const admin = await seedOrgWithAdmin({ email: `dash-${Date.now()}@test.com` });

      const categories = ["image", "document", "archive", "image", "document"];
      for (const cat of categories) {
        await FileAttachment.create({
          id: new mongoose.Types.ObjectId().toString(),
          orgId: admin.orgId, uploaderId: admin.userId, createdBy: admin.userId,
          name: `${cat}-file.txt`, originalName: `${cat}-file.txt`, mimeType: "text/plain",
          size: 500, storagePath: `/${cat}.txt`, storageProvider: "local",
          category: cat as any,
        });
      }

      const result = await FileAttachment.aggregate([
        { $match: { orgId: admin.orgId, deletedAt: null } },
        { $group: { _id: "$category", count: { $sum: 1 }, totalSize: { $sum: "$size" } } },
        { $sort: { count: -1 } },
      ]);

      expect(result.find((r: any) => r._id === "image").count).toBe(2);
      expect(result.find((r: any) => r._id === "document").count).toBe(2);
      expect(result.find((r: any) => r._id === "archive").count).toBe(1);
    });
  });

  describe("13. Project-Scoped Files", () => {
    it("should isolate files by projectId", async () => {
      const admin = await seedOrgWithAdmin({ email: `proj-iso-${Date.now()}@test.com` });
      const projA = new mongoose.Types.ObjectId().toString();
      const projB = new mongoose.Types.ObjectId().toString();

      await uploadFile({
        orgId: admin.orgId, projectId: projA, uploaderId: admin.userId,
        name: "projA.txt", originalName: "projA.txt", mimeType: "text/plain",
        size: 10, buffer: Buffer.from("A"),
      });
      await uploadFile({
        orgId: admin.orgId, projectId: projA, uploaderId: admin.userId,
        name: "projA2.txt", originalName: "projA2.txt", mimeType: "text/plain",
        size: 10, buffer: Buffer.from("A2"),
      });
      await uploadFile({
        orgId: admin.orgId, projectId: projB, uploaderId: admin.userId,
        name: "projB.txt", originalName: "projB.txt", mimeType: "text/plain",
        size: 10, buffer: Buffer.from("B"),
      });

      const filesA = await FileAttachment.countDocuments({ orgId: admin.orgId, projectId: projA, deletedAt: null });
      const filesB = await FileAttachment.countDocuments({ orgId: admin.orgId, projectId: projB, deletedAt: null });

      expect(filesA).toBe(2);
      expect(filesB).toBe(1);
    });

    it("should route project files under Projects subfolder", async () => {
      const admin = await seedOrgWithAdmin({ email: `proj-route-${Date.now()}@test.com` });
      const clientId = new mongoose.Types.ObjectId().toString();

      const result = await uploadWithModule(admin, "project", {
        clientId,
        name: "project-doc.pdf",
      });

      const file = await FileAttachment.findOne({ id: result.fileId }).lean();
      expect(file).not.toBeNull();

      const targetFolderId = await resolveClientFolder(admin.orgId, clientId, "project", admin.userId);
      expect(file!.folderId).toBe(targetFolderId);

      const folder = await Folder.findOne({ id: targetFolderId }).lean();
      expect(folder!.name).toBe("Projects");
    });
  });

  describe("14. File Duplication", () => {
    it("should create a copy preserving original metadata", async () => {
      const admin = await seedOrgWithAdmin({ email: `dup-copy-${Date.now()}@test.com` });
      const buffer = Buffer.from("Original for duplication");

      const original = await uploadFile({
        orgId: admin.orgId, uploaderId: admin.userId,
        name: "original.txt", originalName: "original.txt", mimeType: "text/plain",
        size: buffer.length, buffer,
        description: "Original file", tags: ["original"],
      });

      const copyId = await duplicateFile(original.fileId, admin.userId);
      expect(copyId).not.toBe(original.fileId);

      const copy = await FileAttachment.findOne({ id: copyId }).lean();
      expect(copy!.name).toBe("Copy of original.txt");
      expect(copy!.originalName).toBe("Copy of original.txt");
      expect(copy!.mimeType).toBe("text/plain");
      expect(copy!.size).toBe(buffer.length);
      expect(copy!.category).toBe("general");
    });
  });

  describe("15. Cross-Module Attachment Flow (End-to-End)", () => {
    it("should complete full lifecycle: upload → folder mapping → list → view → delete → restore", async () => {
      const admin = await seedOrgWithAdmin({ email: `e2e-${Date.now()}@test.com` });
      const clientId = new mongoose.Types.ObjectId().toString();
      const buffer = Buffer.from("Full E2E lifecycle test content");

      // Step 1: Upload with module context
      const uploadResult = await uploadWithModule(admin, "invoice", {
        clientId,
        name: "e2e-invoice.pdf",
      });
      expect(uploadResult.kind).toBe("created");

      // Step 2: Verify folder mapping
      const file = await FileAttachment.findOne({ id: uploadResult.fileId }).lean();
      expect(file!.folderId).toBeDefined();
      const folder = await Folder.findOne({ id: file!.folderId }).lean();
      expect(folder!.name).toBe("Invoices");

      // Step 3: Verify metadata
      expect(file!.name).toBe("e2e-invoice.pdf");
      expect(file!.mimeType).toBe("application/pdf");
      expect(file!.size).toBe(buffer.length);
      expect(file!.uploaderId).toBe(admin.userId);
      expect(file!.createdAt).toBeDefined();
      expect(file!.checksum).toBeDefined();

      // Step 4: Verify file is visible in listing
      const allFiles = await FileAttachment.find({
        orgId: admin.orgId, clientId, deletedAt: null,
      }).lean();
      expect(allFiles.length).toBe(1);

      // Step 5: View file and check access tracking
      const stream = await getFileStream(uploadResult.fileId);
      expect(stream).not.toBeNull();
      expect(stream!.mimeType).toBe("application/pdf");

      const afterView = await FileAttachment.findOne({ id: uploadResult.fileId }).lean();
      expect(afterView!.lastAccessedAt).not.toBeNull();

      // Step 6: Soft delete
      await softDeleteFile(uploadResult.fileId, admin.userId);
      const deleted = await FileAttachment.findOne({ id: uploadResult.fileId }).lean();
      expect(deleted!.deletedAt).not.toBeNull();

      // Step 7: Restore
      await restoreFile(uploadResult.fileId, admin.userId);
      const restored = await FileAttachment.findOne({ id: uploadResult.fileId }).lean();
      expect(restored!.deletedAt).toBeNull();
      expect(restored!.folderId).toBe(file!.folderId);

      // Step 8: Final listing check
      const finalFiles = await FileAttachment.find({
        orgId: admin.orgId, clientId, deletedAt: null,
      }).lean();
      expect(finalFiles.length).toBe(1);
      expect(finalFiles[0].id).toBe(uploadResult.fileId);
    });

    it("should handle multi-module attachments for same client", async () => {
      const admin = await seedOrgWithAdmin({ email: `multi-${Date.now()}@test.com` });
      const clientId = new mongoose.Types.ObjectId().toString();

      const modules = ["invoice", "contract", "drawing", "report", "image"];
      const results = [];

      for (const mod of modules) {
        const r = await uploadWithModule(admin, mod, { clientId, name: `${mod}-file.pdf` });
        results.push({ module: mod, fileId: r.fileId });
      }

      const allFiles = await FileAttachment.find({
        orgId: admin.orgId, clientId, deletedAt: null,
      }).lean();
      expect(allFiles.length).toBe(modules.length);

      const folderNames = new Set<string>();
      for (const f of allFiles) {
        const folder = await Folder.findOne({ id: f.folderId }).lean();
        folderNames.add(folder!.name);
      }

      expect(folderNames.has("Invoices")).toBe(true);
      expect(folderNames.has("Contracts")).toBe(true);
      expect(folderNames.has("Drawings")).toBe(true);
      expect(folderNames.has("Reports")).toBe(true);
      expect(folderNames.has("Images")).toBe(true);
    });
  });
});
