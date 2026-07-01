import path from "path";
import fs from "fs";
import { createReadStream, createWriteStream } from "fs";
import { Server as TusServer, FileStore, Metadata } from "tus-node-server";
import { env } from "../../config/env.js";
import { UploadSession } from "../db/models/UploadSession.js";
import { computeChecksum } from "../storage/providers.js";
import { finalizeUpload } from "../uploads/upload-orchestrator.js";
import { socketIOManager } from "../socketio/index.js";
import { validateFileMagicBytes } from "../../services/validation.service.js";
import { logger } from "../logger/index.js";

const TUS_DIR = path.resolve(process.cwd(), "data", "tus-uploads");

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

async function streamFileToStorage(tempPath: string, storagePath: string): Promise<void> {
  const { getStorageProvider } = await import("../storage/providers.js");
  const provider = getStorageProvider();

  return new Promise<void>((resolve, reject) => {
    const readStream = createReadStream(tempPath);
    const chunks: Buffer[] = [];

    readStream.on("data", (chunk: Buffer | string) => {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    });

    readStream.on("end", async () => {
      try {
        const buffer = Buffer.concat(chunks);
        await provider.save(buffer, storagePath);
        resolve();
      } catch (err) {
        reject(err);
      }
    });

    readStream.on("error", (err) => {
      reject(err);
    });
  });
}

async function streamComputeChecksum(tempPath: string): Promise<string> {
  const { createHash } = await import("crypto");
  return new Promise<string>((resolve, reject) => {
    const hash = createHash("sha256");
    const readStream = createReadStream(tempPath);
    readStream.on("data", (chunk: Buffer | string) => hash.update(chunk));
    readStream.on("end", () => resolve(hash.digest("hex")));
    readStream.on("error", reject);
  });
}

async function streamGetBuffer(tempPath: string): Promise<Buffer> {
  return new Promise<Buffer>((resolve, reject) => {
    const chunks: Buffer[] = [];
    const readStream = createReadStream(tempPath);
    readStream.on("data", (chunk: Buffer | string) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
    readStream.on("end", () => resolve(Buffer.concat(chunks)));
    readStream.on("error", reject);
  });
}

export function getTusServer(): TusServer {
  if (server) return server;

  ensureDir(TUS_DIR);

  const store = new FileStore({ directory: TUS_DIR });
  const tus = new TusServer({
    path: env.TUS_PREFIX || "/files-tus",
    relativeLocation: false,
  });
  tus.datastore = store;

  tus.on("EVENT_FILE_CREATED", async (event: { file: { id: string } }) => {
    try {
      const config = await store.getOffset(event.file.id);
      const rawMeta = (config?.upload_metadata) || "";
      const meta = parseMetadata(rawMeta);
      if (meta.orgId && meta.uploaderId) {
        await UploadSession.findOneAndUpdate(
          { tusId: event.file.id },
          {
            tusId: event.file.id,
            orgId: meta.orgId,
            clientId: meta.clientId || null,
            folderId: meta.folderId || null,
            uploaderId: meta.uploaderId,
            fileName: meta.fileName || "unnamed",
            mimeType: meta.mimeType || "application/octet-stream",
            size: Number(config?.size) || 0,
            checksum: meta.checksum || "",
            status: "pending",
            metadata: meta,
          },
          { upsert: true, new: true },
        );
      } else {
        logger.warn({ tusId: event.file.id }, "UploadSession skipped: missing orgId/uploaderId in metadata");
      }
    } catch (err: any) {
      logger.warn({ err, tusId: event.file.id }, "Failed to create UploadSession");
    }
  });

  tus.on("EVENT_UPLOAD_COMPLETE", async (event: { file: { id: string; upload_length: string; upload_metadata: string } }) => {
    const { id: tusId, upload_length } = event.file;
    try {
      const session = await UploadSession.findOne({ tusId });
      if (!session) {
        logger.warn({ tusId }, "No UploadSession found, skipping finalize");
        return;
      }
      if (session.status !== "pending") {
        return;
      }

      const tempPath = path.join(TUS_DIR, tusId);
      const infoPath = `${tempPath}.info`;
      if (!fs.existsSync(tempPath)) {
        logger.error({ tusId }, "Temp file missing for TUS finalize");
        return;
      }

      const stat = fs.statSync(tempPath);
      const declaredLen = Number(upload_length) || session.size;
      if (stat.size !== declaredLen) {
        logger.warn({ tusId, got: stat.size, expected: declaredLen }, "TUS size mismatch");
      }

      let storedChecksum = session.checksum;
      if (!storedChecksum) {
        storedChecksum = await streamComputeChecksum(tempPath);
      } else {
        const computed = await streamComputeChecksum(tempPath);
        if (computed !== storedChecksum) {
          logger.error({ tusId }, "Checksum mismatch - not finalizing");
          return;
        }
      }

      const mimeType = validateFileMagicBytes(
        await streamGetBuffer(tempPath),
        session.mimeType,
      );

      const buffer = await streamGetBuffer(tempPath);

      const result = await finalizeUpload({
        orgId: session.orgId,
        clientId: session.clientId,
        folderId: session.folderId,
        uploaderId: session.uploaderId,
        name: session.fileName,
        originalName: session.fileName,
        mimeType,
        size: buffer.length,
        buffer,
        checksum: storedChecksum,
      });

      if (result.kind === "created") {
        await UploadSession.updateOne(
          { tusId },
          { status: "finalized", fileId: result.fileId, completedAt: new Date() },
        );
        socketIOManager.emitToOrg(session.orgId, "file:uploaded", {
          fileId: result.fileId, orgId: session.orgId,
          folderId: session.folderId, clientId: session.clientId,
        });
        logger.info({ tusId, fileId: result.fileId }, "TUS upload finalized");
      } else {
        await UploadSession.updateOne(
          { tusId },
          { status: "duplicate", fileId: result.fileId, completedAt: new Date() },
        );
        socketIOManager.emitToOrg(session.orgId, "file:uploaded", {
          fileId: result.fileId, orgId: session.orgId, duplicate: true,
        });
      }

      for (const p of [tempPath, infoPath]) {
        if (fs.existsSync(p)) fs.unlinkSync(p);
      }
    } catch (err: any) {
      logger.error({ err, tusId }, "TUS finalize failed");
    }
  });

  server = tus;
  return tus;
}

export { Metadata };
