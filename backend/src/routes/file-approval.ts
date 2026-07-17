import { Router, Response } from "express";
import { AuthRequest, authenticate } from "../middleware/auth.js";
import { AppError } from "../middleware/error.js";
import { FileAttachment } from "../lib/db/models/FileAttachment.js";
import { UploadApproval } from "../lib/db/models/UploadApproval.js";
import { verifyOrgAccess } from "../lib/org-utils.js";
import { recordAuditLog } from "../services/audit.service.js";

const router = Router();

router.use(authenticate);

// List pending approvals for an org
router.get("/", async (req: AuthRequest, res: Response) => {
  const { orgId } = req.query;
  if (!orgId) throw new AppError(400, "orgId is required");

  const approvals = await UploadApproval.find({ orgId, status: "pending" })
    .sort({ createdAt: -1 })
    .select("orgId uploadId fileName fileSize mimeType uploadedBy uploadedAt status createdAt")
    .lean();

  res.json({ success: true, data: approvals });
});

// Approve a file upload
router.post("/:id/approve", async (req: AuthRequest, res: Response) => {
  const approval = await UploadApproval.findOne({ uploadId: req.params.id, status: "pending" }).select("orgId fileName").lean();
  if (!approval) throw new AppError(404, "Pending approval not found");

  await Promise.all([
    UploadApproval.updateOne(
      { uploadId: req.params.id },
      { status: "approved", approvedBy: req.user!.userId, reviewedAt: new Date() },
    ),
    FileAttachment.updateOne(
      { id: req.params.id },
      { approvalStatus: "approved", approvedBy: req.user!.userId },
    ),
  ]);

  await recordAuditLog({
    orgId: approval.orgId,
    userId: req.user!.userId,
    createdBy: req.user!.userId,
    action: "file.approved",
    entityType: "file",
    entityId: req.params.id,
    description: `File "${approval.fileName}" approved for upload`,
  });

  res.json({ success: true, message: "File approved" });
});

// Reject a file upload
router.post("/:id/reject", async (req: AuthRequest, res: Response) => {
  const { reason } = req.body;
  const approval = await UploadApproval.findOne({ uploadId: req.params.id, status: "pending" }).select("orgId fileName").lean();
  if (!approval) throw new AppError(404, "Pending approval not found");

  await Promise.all([
    UploadApproval.updateOne(
      { uploadId: req.params.id },
      { status: "rejected", approvedBy: req.user!.userId, reviewedAt: new Date(), rejectionReason: reason || "" },
    ),
    FileAttachment.updateOne(
      { id: req.params.id },
      { approvalStatus: "rejected", approvedBy: req.user!.userId, approvalNote: reason || "" },
    ),
  ]);

  await recordAuditLog({
    orgId: approval.orgId,
    userId: req.user!.userId,
    createdBy: req.user!.userId,
    action: "file.rejected",
    entityType: "file",
    entityId: req.params.id,
    description: `File "${approval.fileName}" rejected: ${reason || "No reason given"}`,
  });

  res.json({ success: true, message: "File rejected" });
});

export default router;
