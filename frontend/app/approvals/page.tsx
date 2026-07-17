import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { collections } from "@/lib/db/schema";
import { getUserOrgId } from "@/lib/org";
import { redirect } from "next/navigation";
import ApprovalsClient from "./approvals-client";
import type { ApprovalTask } from "./columns";

export const dynamic = "force-dynamic";

function mapTask(t: Record<string, unknown>): ApprovalTask {
  return {
    _id: (t._id as { toString: () => string }).toString(),
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

export default async function ApprovalsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const orgId = await getUserOrgId(session.user.id, session.user.email);

  let pendingTasks: ApprovalTask[] = [];
  let approvedTasks: ApprovalTask[] = [];
  let rejectedTasks: ApprovalTask[] = [];

  if (orgId) {
    const [rawPending, rawApproved, rawRejected] = await Promise.all([
      db.collection(collections.tasks)
        .find({ orgId, status: { $in: ["review", "postponed"] }, approvedBy: null, rejectedBy: null })
        .sort({ createdAt: -1 })
        .limit(100)
        .toArray(),
      db.collection(collections.tasks)
        .find({ orgId, status: "done" })
        .sort({ createdAt: -1 })
        .limit(100)
        .toArray(),
      db.collection(collections.tasks)
        .find({ orgId, status: "cancelled" })
        .sort({ createdAt: -1 })
        .limit(100)
        .toArray(),
    ]);

    pendingTasks = (rawPending as unknown as Record<string, unknown>[]).map(mapTask);
    approvedTasks = (rawApproved as unknown as Record<string, unknown>[]).map(mapTask);
    rejectedTasks = (rawRejected as unknown as Record<string, unknown>[]).map(mapTask);
  }

  return <ApprovalsClient pendingTasks={pendingTasks} approvedTasks={approvedTasks} rejectedTasks={rejectedTasks} />;
}
