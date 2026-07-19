import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { collections } from "@/lib/db/schema";
import { getUserOrgId } from "@/lib/org";
import { redirect } from "next/navigation";
import Rejected from "./rejected";
import type { ApprovalItem } from "../columns";

export const dynamic = "force-dynamic";

export default async function RejectedPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const orgId = await getUserOrgId(session.user.id, session.user.email);
  if (!orgId) {
    return <Rejected initialItems={[]} />;
  }

  const [rawTasks, rawFiles] = await Promise.all([
    db.collection(collections.tasks)
      .find({ orgId, status: { $in: ["cancelled", "rejected"] } })
      .sort({ createdAt: -1 })
      .toArray(),
    db.collection(collections.uploadApprovals)
      .find({ orgId, status: "rejected" })
      .sort({ createdAt: -1 })
      .toArray(),
  ]);

  const tasks: ApprovalItem[] = (rawTasks as unknown as Record<string, unknown>[]).map((t) => ({
    _id: (t._id as { toString: () => string }).toString(),
    itemType: "task" as const,
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

  const files: ApprovalItem[] = (rawFiles as unknown as Record<string, unknown>[]).map((f) => {
    const uploader = f.uploader as Record<string, string> | undefined;
    return {
      _id: (f._id as { toString: () => string }).toString(),
      itemType: "file" as const,
      title: (f.fileName as string) || "Untitled file",
      status: (f.status as string) || "rejected",
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
  });

  const items = [...tasks, ...files].sort((a, b) => {
    const dateA = (a.rejectedAt || a.createdAt) ? new Date(a.rejectedAt || a.createdAt!).getTime() : 0;
    const dateB = (b.rejectedAt || b.createdAt) ? new Date(b.rejectedAt || b.createdAt!).getTime() : 0;
    return dateB - dateA;
  });

  return <Rejected initialItems={items} />;
}
