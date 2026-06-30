import path from "path";
import fs from "fs";
import { Server as TusServer, FileStore, Metadata } from "tus-node-server";
import { v4 as uuid } from "uuid";
import { env } from "../../config/env.js";
import { UploadSession } from "../db/models/UploadSession.js";
import { UploadApproval } from "../db/models/UploadApproval.js";
import { FileAttachment } from "../db/models/FileAttachment.js";
import { computeChecksum } from "../storage/providers.js";
import { finalizeUpload } from "../uploads/enhanced-orchestrator.js";
import { socketIOManager } from "../socketio/index.js";
import { eventProducer } from "../queue/producer.js";
import { domainEvents } from "../events/index.js";
import { uploadLogger } from "../logger/index.js";
import { metricsRegistry, trackUploadStart, trackUploadComplete, trackUploadFailed } from "../monitoring/index.js";

const TUS_DIR = path.resolve(process.cwd(), "data", "tus-uploads");
const SESSION_TTL_MS = Number(process.env.TUS_TTL_MS || 24 * 60 * 60 * 1000);

let server: TusServer | null = null;

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function parseMetadata(raw: string): Record<string, string> {
  try {
    return Metadata.parse(raw) as Record<string, string>;
  } catch {
    return {};
  }
}

export function getEnhancedTusServer(): TusServer {
  if (server) return server;

  ensureDir(TUS_DIR);

  const store = new FileStore({ directory: TUS_DIR });
  const tus = new TusServer({
    path: env.TUS_PREFIX || "/files-tus",
    relativeLocation: false,
  });
  tus.datastore = store;

  tus.on("EVENT_FILE_CREATED", async (event: { file: { id: string } }) => {
    const startTime = Date.now();
    try {
      const config = await store.getOffset(event.file.id);
      const rawMeta = (config?.upload_metadata) || "";
      const meta = parseMetadata(rawMeta);

      if (meta.orgId && meta.uploaderId) {
        const uploadId = uuid();
        const needsApproval = meta.needsApproval === "true";
        const initialStatus = needsApproval ? "pending_approval" : "pending";

        const session = await UploadSession.findOneAndUpdate(
          { tusId: event.file.id },
          {
            tusId: event.file.id,
            uploadId,
            orgId: meta.orgId,
            workspaceId: meta.workspaceId || null,
            projectId: meta.projectId || null,
            clientId: meta.clientId || null,
            staffId: meta.staffId || null,
            departmentId: meta.departmentId || null,
            folderId: meta.folderId || null,
            uploaderId: meta.uploaderId,
            fileName: meta.fileName || "unnamed",
            originalName: meta.originalName || meta.fileName || "unnamed",
            mimeType: meta.mimeType || "application/octet-stream",
            size: Number(config?.size) || 0,
            checksum: meta.checksum || "",
            status: initialStatus,
            needsApproval,
            metadata: meta,
          },
          { upsert: true, new: true },
        );

        if (needsApproval) {
          await UploadApproval.create({
            uploadId,
            tusId: event.file.id,
            orgId: meta.orgId,
            uploaderId: meta.uploaderId,
            uploaderRole: meta.uploaderRole || "staff",
            approvedBy: null,
            status: "pending",
            fileName: meta.fileName || "unnamed",
            fileSize: Number(config?.size) || 0,
            mimeType: meta.mimeType || "application/octet-stream",
            folderId: meta.folderId || null,
            projectId: meta.projectId || null,
            workspaceId: meta.workspaceId || null,
            clientId: meta.clientId || null,
          });

          socketIOManager.emitToOrg(meta.orgId, "upload:pending_approval", {
            uploadId,
            tusId: event.file.id,
            fileName: meta.fileName || "unnamed",
            fileSize: Number(config?.size) || 0,
            mimeType: meta.mimeType || "application/octet-stream",
            folderId: meta.folderId,
            uploaderId: meta.uploaderId,
          });
        }

        trackUploadStart(meta.orgId, meta.uploaderId);

        await eventProducer.uploadStarted({
          uploadId,
          orgId: meta.orgId,
          userId: meta.uploaderId,
          fileName: meta.fileName || "unnamed",
          fileSize: Number(config?.size) || 0,
          mimeType: meta.mimeType || "application/octet-stream",
          checksum: meta.checksum,
          folderId: meta.folderId,
          projectId: meta.projectId,
          clientId: meta.clientId,
        });

        domainEvents.emit("upload:started", {
          uploadId,
          orgId: meta.orgId,
          userId: meta.uploaderId,
          fileName: meta.fileName || "unnamed",
          fileSize: Number(config?.size) || 0,
          mimeType: meta.mimeType || "application/octet-stream",
        });

        socketIOManager.emitToOrg(meta.orgId, "upload:started", {
          uploadId,
          fileName: meta.fileName || "unnamed",
          fileSize: Number(config?.size) || 0,
          mimeType: meta.mimeType || "application/octet-stream",
          folderId: meta.folderId,
          uploaderId: meta.uploaderId,
        });

        uploadLogger.info({ tusId: event.file.id, uploadId, orgId: meta.orgId }, "Upload session created");
      }
    } catch (err: any) {
      uploadLogger.error({ err, tusId: event.file.id }, "Failed to create upload session");
    }
  });

  tus.on("EVENT_UPLOAD_COMPLETE", async (event: { file: { id: string; upload_length: string; upload_metadata: string } }) => {
    const { id: tusId, upload_length } = event.file;
    const startTime = Date.now();

    try {
      const session = await UploadSession.findOne({ tusId });
      if (!session) {
        uploadLogger.warn({ tusId }, "No UploadSession found");
        return;
      }
      if (session.status !== "pending" && session.status !== "pending_approval") {
        uploadLogger.info({ tusId, status: session.status }, "Upload already processed");
        return;
      }

      const tempPath = path.join(TUS_DIR, tusId);
      const infoPath = `${tempPath}.info`;

      if (!fs.existsSync(tempPath)) {
        uploadLogger.error({ tusId }, "Temp file missing");
        trackUploadFailed(session.orgId, "temp_file_missing");
        return;
      }

      const buffer = fs.readFileSync(tempPath);
      const declaredLen = Number(upload_length) || session.size;

      if (buffer.length !== declaredLen) {
        uploadLogger.warn({ tusId, got: buffer.length, expected: declaredLen }, "Size mismatch");
      }

      if (session.checksum) {
        const computed = await computeChecksum(buffer);
        if (computed !== session.checksum) {
          uploadLogger.error({ tusId }, "Checksum mismatch");
          trackUploadFailed(session.orgId, "checksum_mismatch");
          socketIOManager.emitToOrg(session.orgId, "upload:failed", {
            uploadId: session.uploadId,
            tusId,
            error: "Checksum mismatch",
            fileName: session.fileName,
          });
          return;
        }
      }

      if (session.needsApproval && session.status === "pending_approval") {
        uploadLogger.info({ tusId }, "Upload pending approval, skipping finalize - temp file retained");

        socketIOManager.emitToOrg(session.orgId, "upload:pending_approval", {
          uploadId: session.uploadId,
          tusId,
          fileName: session.fileName,
          fileSize: buffer.length,
          mimeType: session.mimeType,
          folderId: session.folderId,
          uploaderId: session.uploaderId,
        });

        return;
      }

      const result = await finalizeUpload({
        orgId: session.orgId,
        workspaceId: session.workspaceId,
        projectId: session.projectId,
        clientId: session.clientId,
        staffId: session.staffId,
        departmentId: session.departmentId,
        folderId: session.folderId,
        uploaderId: session.uploaderId,
        name: session.fileName,
        originalName: session.originalName || session.fileName,
        mimeType: session.mimeType,
        size: buffer.length,
        buffer,
        checksum: session.checksum,
        uploadId: session.uploadId,
      });

      const durationMs = Date.now() - startTime;

      if (result.kind === "created") {
        await UploadSession.updateOne(
          { tusId },
          {
            status: "finalized",
            fileId: result.fileId,
            completedAt: new Date(),
            durationMs,
          },
        );

        trackUploadComplete(session.orgId, buffer.length, durationMs);

        await eventProducer.uploadCompleted({
          uploadId: session.uploadId,
          fileId: result.fileId,
          orgId: session.orgId,
          userId: session.uploaderId,
          fileName: session.fileName,
          fileSize: buffer.length,
          mimeType: session.mimeType,
          checksum: session.checksum,
          storagePath: result.storagePath || "",
          durationMs,
        });

        domainEvents.emit("upload:completed", {
          uploadId: session.uploadId,
          fileId: result.fileId,
          orgId: session.orgId,
          userId: session.uploaderId,
          fileName: session.fileName,
          fileSize: buffer.length,
          storagePath: result.storagePath || "",
        });

        socketIOManager.emitToOrg(session.orgId, "upload:completed", {
          uploadId: session.uploadId,
          fileId: result.fileId,
          fileName: session.fileName,
          fileSize: buffer.length,
          mimeType: session.mimeType,
          folderId: session.folderId,
          projectId: session.projectId,
          workspaceId: session.workspaceId,
          uploaderId: session.uploaderId,
          durationMs,
          category: result.category,
        });

        uploadLogger.info({ tusId, fileId: result.fileId, durationMs }, "Upload finalized");
      } else {
        await UploadSession.updateOne(
          { tusId },
          { status: "duplicate", fileId: result.fileId, completedAt: new Date() },
        );

        socketIOManager.emitToOrg(session.orgId, "upload:completed", {
          uploadId: session.uploadId,
          fileId: result.fileId,
          fileName: session.fileName,
          duplicate: true,
        });
      }

      for (const p of [tempPath, infoPath]) {
        if (fs.existsSync(p)) fs.unlinkSync(p);
      }
    } catch (err: any) {
      uploadLogger.error({ err, tusId }, "Finalize failed");
      try {
        const session = await UploadSession.findOne({ tusId });
        if (session) {
          trackUploadFailed(session.orgId, "finalize_error");
          await eventProducer.uploadFailed({
            uploadId: session.uploadId,
            orgId: session.orgId,
            userId: session.uploaderId,
            fileName: session.fileName,
            errorType: "finalize_error",
            errorMessage: err.message,
            retryCount: 0,
          });
          socketIOManager.emitToOrg(session.orgId, "upload:failed", {
            uploadId: session.uploadId,
            tusId,
            error: err.message,
            fileName: session.fileName,
          });
        }
      } catch {}
    }
  });

  server = tus;
  return tus;
}

export function cleanupStaleSessions() {
  const cutoff = new Date(Date.now() - SESSION_TTL_MS);
  UploadSession.updateMany(
    { status: "pending", createdAt: { $lt: cutoff } },
    { status: "expired" },
  ).then((result) => {
    if (result.modifiedCount > 0) {
      uploadLogger.info({ count: result.modifiedCount }, "Stale upload sessions expired");
    }
  }).catch((err) => {
    uploadLogger.error({ err }, "Failed to expire stale sessions");
  });
}
