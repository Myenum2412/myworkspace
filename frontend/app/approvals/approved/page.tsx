import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { collections } from "@/lib/db/schema";
import { getUserOrgId } from "@/lib/org";
import { redirect } from "next/navigation";
import Approved from "./approved";
import type { ApprovalTask } from "../columns";

export const dynamic = "force-dynamic";

export default async function ApprovedPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const orgId = await getUserOrgId(session.user.id, session.user.email);
  if (!orgId) {
    return <Approved initialTasks={[]} />;
  }

  const raw = await db.collection(collections.tasks)
    .find({ orgId, status: "done" })
    .sort({ createdAt: -1 })
    .toArray();

  const tasks: ApprovalTask[] = (raw as unknown as Record<string, unknown>[]).map((t) => ({
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
  }));

  return <Approved initialTasks={tasks} />;
}
