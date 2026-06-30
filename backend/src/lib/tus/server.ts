import path from "path";
import fs from "fs";
import os from "os";
import { Server as TusServer, FileStore, Metadata } from "tus-node-server";
import { env } from "../../config/env.js";
import { UploadSession } from "../db/models/UploadSession.js";
import { computeChecksum } from "../storage/providers.js";
import { finalizeUpload } from "../uploads/upload-orchestrator.js";
import { socketIOManager } from "../socketio/index.js";

const log = env.AUTH_DEBUG === "1" ? (...args: unknown[]) => console.log("[TUS]", ...args) : () => {};

const TUS_DIR = path.resolve(process.cwd(), "data", "tus-uploads");

let server: TusServer | null = null;

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

// Resolve org/client/folder + user from the base64 Upload-Metadata the client
// attached at POST time. Auth is enforced in the route handler before the PATCH
// body arrives, and the resulting UploadSession carries uploaderId, so we trust
// the persisted session for the assemble step.
function parseMetadata(raw: string): Record<string, string> {
  // tus Metadata.parse returns { filename, mimeType, ... } from "key base64val" lines
  try {
    return Metadata.parse(raw) as Record<string, string>;
  } catch {
    return {};
  }
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

  // On session create, the TUS id exists and the POST has been authorized by the
  // route handler. Persist an UploadSession so the finalize hook can resolve the
  // org/folder/client/user. We read the Upload-Metadata the client attached via
  // the store's configstore (FileStore persists it in-memory keyed by tusId).
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
        log(`session created for ${event.file.id} (org ${meta.orgId})`);
      } else {
        console.warn(`[TUS] UploadSession skipped for ${event.file.id}: missing orgId/uploaderId in metadata`);
      }
    } catch (err: any) {
      console.warn(`[TUS] failed to create UploadSession for ${event.file.id}: ${err?.message || err}`);
    }
  });

  // When the last PATCH lands and the upload offset meets length, the store
  // emits EVENT_UPLOAD_COMPLETE with the File descriptor + already-persisted
  // Upload-Metadata. We assemble the bytes, run our shared orchestrator
  // (dedup + quota + R2 persist + ActivityLog), finalize the UploadSession,
  // and broadcast via Socket.IO.
  tus.on("EVENT_UPLOAD_COMPLETE", async (event: { file: { id: string; upload_length: string; upload_metadata: string } }) => {
    const { id: tusId, upload_length, upload_metadata } = event.file;
    try {
      const session = await UploadSession.findOne({ tusId });
      if (!session) {
        log(`No UploadSession for ${tusId}, skipping finalize`);
        return;
      }
      if (session.status !== "pending") {
        // Idempotent: finalized/duplicate already handled.
        return;
      }

      const tempPath = path.join(TUS_DIR, tusId);
      const infoPath = `${tempPath}.info`;
      if (!fs.existsSync(tempPath)) {
        console.error(`[TUS] temp file missing for ${tusId}`);
        return;
      }

      const buffer = fs.readFileSync(tempPath);
      const declaredLen = Number(upload_length) || session.size;
      if (buffer.length !== declaredLen) {
        console.warn(`[TUS] size mismatch for ${tusId}: got ${buffer.length}, expected ${declaredLen}`);
      }

      // Server-side checksum verification if client supplied one in metadata.
      const storedChecksum = session.checksum;
      if (storedChecksum) {
        const computed = await computeChecksum(buffer);
        if (computed !== storedChecksum) {
          console.error(`[TUS] checksum mismatch for ${tusId}`);
          // Leave session pending so the client can re-attempt; do not finalize garbage.
          return;
        }
      }

      const result = await finalizeUpload({
        orgId: session.orgId,
        clientId: session.clientId,
        folderId: session.folderId,
        uploaderId: session.uploaderId,
        name: session.fileName,
        originalName: session.fileName,
        mimeType: session.mimeType,
        size: buffer.length,
        buffer,
        checksum: storedChecksum,
      });

      if (result.kind === "created") {
        await UploadSession.updateOne(
          { tusId },
          { status: "finalized", fileId: result.fileId, completedAt: new Date() },
        );
        // Reuse the realtime path the rest of the app already uses (files-enhanced.ts:294).
        socketIOManager.emitToOrg(session.orgId, "file:uploaded", {
          fileId: result.fileId, orgId: session.orgId,
          folderId: session.folderId, clientId: session.clientId,
        });
        log(`finalized ${tusId} -> fileId ${result.fileId}`);
      } else {
        await UploadSession.updateOne(
          { tusId },
          { status: "duplicate", fileId: result.fileId, completedAt: new Date() },
        );
        // Still notify so the UI can mark it "Duplicate" and skip.
        socketIOManager.emitToOrg(session.orgId, "file:uploaded", {
          fileId: result.fileId, orgId: session.orgId, duplicate: true,
        });
      }

      // Cleanup local TUS temp files (the data is now in R2 / deduped).
      for (const p of [tempPath, infoPath]) {
        if (fs.existsSync(p)) fs.unlinkSync(p);
      }
    } catch (err: any) {
      console.error(`[TUS] finalize failed for ${tusId}: ${err?.message || err}`);
    }
  });

  server = tus;
  return tus;
}

export { Metadata };
