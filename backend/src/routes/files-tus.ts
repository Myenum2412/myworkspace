import { Router, Response } from "express";
import { v4 as uuid } from "uuid";
import { AuthRequest, authenticate } from "../middleware/auth.js";
import { requireOrgMembershipFromRequest } from "../lib/org-utils.js";
import { UploadSession } from "../lib/db/models/UploadSession.js";
import { getTusServer, Metadata } from "../lib/tus/server.js";
import { env } from "../config/env.js";
import { checkUploadPermission } from "../lib/uploads/upload-auth.js";
import { logger } from "../lib/logger/index.js";

const router = Router();

// TUS client must send a context header on POST so the server can authorize
// the upload and persist an UploadSession BEFORE chunks flow. The header is
// base64(JSON(orgId,folderId,clientId,fileName,mimeType,checksum,uploaderId)).
const CONTEXT_HEADER = "x-upload-context";

interface UploadContext {
  orgId: string;
  folderId?: string | null;
  clientId?: string | null;
  projectId?: string | null;
  fileName: string;
  mimeType?: string;
  checksum?: string;
  uploaderId?: string;
}

function decodeContext(header: string | undefined): UploadContext | null {
  if (!header) return null;
  try {
    const json = Buffer.from(header, "base64").toString("utf8");
    const ctx = JSON.parse(json) as UploadContext;
    return ctx.orgId && ctx.fileName ? ctx : null;
  } catch {
    return null;
  }
}

// Validate context + auth + RBAC-lite, then persist an UploadSession and stash
// the org/folder/client back onto the upload's Upload-Metadata (which the TUS
// server already parsed) so the finalize hook can read it. We piggyback on the
// EVENT_FILE_CREATED hook by writing the UploadSession there — at that point
// the TUS id already exists.
//
// We attach the user-facing validate/transform on POST before handing off to
// the TUS server, and trust the persisted session for PATCH/PATCH/DELETE.
router.use(authenticate);

router.use(async (req: AuthRequest, res: Response) => {
  const tus = getTusServer();
  const userId = req.user?.userId;
  if (!userId) {
    res.status(401).json({ success: false, error: "Authentication required" });
    return;
  }

  if (req.method === "POST") {
    const ctx = decodeContext(req.headers[CONTEXT_HEADER] as string | undefined);
    if (!ctx) {
      res.status(400).json({ success: false, error: `Missing or invalid ${CONTEXT_HEADER} header` });
      return;
    }

    try {
      await requireOrgMembershipFromRequest(req, ctx.orgId);
    } catch {
      res.status(403).json({ success: false, error: "You don't have permission to upload to this organization" });
      return;
    }

    const role = (req.user?.role || "guest").toLowerCase();
    const permission = await checkUploadPermission({
      role,
      orgId: ctx.orgId,
      projectId: ctx.projectId || req.user?.projectId,
      clientId: ctx.clientId || req.user?.clientId,
    });

    if (!permission.allowed) {
      logger.warn({ userId, role, orgId: ctx.orgId }, "Upload permission denied by Casbin RBAC");
      res.status(403).json({ success: false, error: "You don't have permission to upload files." });
      return;
    }

    if (permission.needsApproval) {
      logger.info({ userId, role, fileName: ctx.fileName }, "Upload requires approval");
      const existingMeta = req.headers["upload-metadata"] || "";
      const needsApprovalEncoded = Buffer.from("true").toString("base64");
      const roleEncoded = Buffer.from(role).toString("base64");
      req.headers["upload-metadata"] = existingMeta
        ? `${existingMeta},needsApproval ${needsApprovalEncoded},uploaderRole ${roleEncoded}`
        : `needsApproval ${needsApprovalEncoded},uploaderRole ${roleEncoded}`;
    }

    const correlationId = uuid();
    res.locals.uploadCtx = { userId, ctx, correlationId, needsApproval: permission.needsApproval };
  }

  // Hand off to the TUS protocol server. Its handle() writes/resolves the response.
  return tus.handle(req, res);
});

// After the TUS server successfully POST-created an upload, capture its TUS id
// from the Location header and update the pre-registered UploadSession with it.
// We do this by hooking the EVENT_FILE_CREATED before this route runs — see
// getTusServer(): it writes the session inside the hook itself.

export { CONTEXT_HEADER };
export default router;
