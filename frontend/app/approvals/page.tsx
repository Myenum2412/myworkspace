import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { collections } from "@/lib/db/schema";
import { getUserOrgId } from "@/lib/org";
import { redirect } from "next/navigation";
import ApprovalsClient from "./approvals-client";
import type { ApprovalItem } from "./columns";

export const dynamic = "force-dynamic";

function mapTask(t: Record<string, unknown>): ApprovalItem {
  return {
    _id: (t._id as { toString: () => string }).toString(),
    itemType: "task",
    title: (t.title as string) || "",
    status: (t.status as string) || "",
    priority: (t.priority as string) || "medium",
    dueDate: (t.dueDate as string) || undefined,
    assigneeId: (t.assigneeId as string) || undefined,
    assigneeName: (t.assignee as Record<string, string>)?.name || undefined,
    assigneeAvatar: (t.assignee as Record<string, string>)?.image || undefined,
    creatorId: (t.creatorId as string) || undefined,
    creatorName: (t.creator as Record<string, string>)?.name || undefined,
    description: (t.description as string) || undefined,
    createdAt: (t.createdAt as string) || undefined,
    approvedBy: (t.approvedBy as string) || undefined,
    approvedAt: (t.approvedAt as string) || undefined,
    approvalNote: (t.approvalNote as string) || undefined,
    rejectedBy: (t.rejectedBy as string) || undefined,
    rejectedAt: (t.rejectedAt as string) || undefined,
    rejectionReason: (t.rejectionReason as string) || undefined,
  };
}

function mapFileApproval(f: Record<string, unknown>): ApprovalItem {
  const uploader = f.uploader as Record<string, string> | undefined;
  return {
    _id: (f._id as { toString: () => string }).toString(),
    itemType: "file",
    title: (f.fileName as string) || "Untitled file",
    status: (f.status as string) || "pending",
    priority: "medium",
    createdAt: (f.createdAt as string) || undefined,
    uploaderId: (f.uploaderId as string) || undefined,
    uploaderName: uploader?.name || (f.uploaderId as string) || undefined,
    assigneeId: (f.uploaderId as string) || undefined,
    assigneeName: uploader?.name || undefined,
    fileName: (f.fileName as string) || undefined,
    fileSize: (f.fileSize as number) || undefined,
    mimeType: (f.mimeType as string) || undefined,
    approvedBy: (f.approvedBy as string) || undefined,
    approvedAt: (f.reviewedAt as string) || undefined,
    approvalNote: (f.approvalNote as string) || undefined,
    rejectedBy: (f.approvedBy as string) || undefined,
    rejectedAt: (f.reviewedAt as string) || undefined,
    rejectionReason: (f.rejectionReason as string) || undefined,
  };
}

export default async function ApprovalsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const orgId = await getUserOrgId(session.user.id, session.user.email);

  let pendingItems: ApprovalItem[] = [];
  let approvedItems: ApprovalItem[] = [];
  let rejectedItems: ApprovalItem[] = [];

  if (orgId) {
    // Query tasks pending approval: status "submitted" (team tasks awaiting approval) or "completed" (individual tasks done)
    const [rawPendingTasks, rawApprovedTasks, rawRejectedTasks, rawPendingFiles, rawApprovedFiles, rawRejectedFiles] = await Promise.all([
      // Tasks awaiting approval
      db.collection(collections.tasks)
        .find({ orgId, status: { $in: ["submitted", "completed"] }, approvedBy: null, rejectedBy: null })
        .sort({ createdAt: -1 })
        .limit(100)
        .toArray(),
      // Approved tasks
      db.collection(collections.tasks)
        .find({ orgId, status: { $in: ["approved", "done"] } })
        .sort({ createdAt: -1 })
        .limit(100)
        .toArray(),
      // Rejected/cancelled tasks
      db.collection(collections.tasks)
        .find({ orgId, status: { $in: ["cancelled", "rejected"] } })
        .sort({ createdAt: -1 })
        .limit(100)
        .toArray(),
      // File uploads awaiting approval
      db.collection(collections.uploadApprovals)
        .find({ orgId, status: "pending" })
        .sort({ createdAt: -1 })
        .limit(100)
        .toArray(),
      // Approved file uploads
      db.collection(collections.uploadApprovals)
        .find({ orgId, status: "approved" })
        .sort({ createdAt: -1 })
        .limit(100)
        .toArray(),
      // Rejected file uploads
      db.collection(collections.uploadApprovals)
        .find({ orgId, status: "rejected" })
        .sort({ createdAt: -1 })
        .limit(100)
        .toArray(),
    ]);

    pendingItems = [
      ...(rawPendingTasks as unknown as Record<string, unknown>[]).map(mapTask),
      ...(rawPendingFiles as unknown as Record<string, unknown>[]).map(mapFileApproval),
    ].sort((a, b) => {
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return dateB - dateA;
    });

    approvedItems = [
      ...(rawApprovedTasks as unknown as Record<string, unknown>[]).map(mapTask),
      ...(rawApprovedFiles as unknown as Record<string, unknown>[]).map(mapFileApproval),
    ].sort((a, b) => {
      const dateA = (a.approvedAt || a.createdAt) ? new Date(a.approvedAt || a.createdAt!).getTime() : 0;
      const dateB = (b.approvedAt || b.createdAt) ? new Date(b.approvedAt || b.createdAt!).getTime() : 0;
      return dateB - dateA;
    });

    rejectedItems = [
      ...(rawRejectedTasks as unknown as Record<string, unknown>[]).map(mapTask),
      ...(rawRejectedFiles as unknown as Record<string, unknown>[]).map(mapFileApproval),
    ].sort((a, b) => {
      const dateA = (a.rejectedAt || a.createdAt) ? new Date(a.rejectedAt || a.createdAt!).getTime() : 0;
      const dateB = (b.rejectedAt || b.createdAt) ? new Date(b.rejectedAt || b.createdAt!).getTime() : 0;
      return dateB - dateA;
    });
  }

  return <ApprovalsClient pendingItems={pendingItems} approvedItems={approvedItems} rejectedItems={rejectedItems} />;
}
