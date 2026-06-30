import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { collections } from "@/lib/db/schema";
import { getUserOrgId } from "@/lib/org";
import { redirect } from "next/navigation";
import OverviewInteractive from "./overview-interactive";

export const dynamic = "force-dynamic";

type Task = {
  _id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  dueDate: string | null;
  assigneeId: string;
  assigneeName: string;
  assigneeAvatar: string;
  creatorId: string;
  creatorName: string;
  createdAt: string;
  isBookmarked?: boolean;
};

export default async function OverviewPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const orgId = await getUserOrgId(session.user.id, session.user.email);
  const currentUserId = session.user.id;

  let tasks: Task[] = [];
  if (orgId) {
    const raw = await db.collection(collections.tasks).find({ orgId }).toArray();
    tasks = (raw as unknown as Record<string, unknown>[]).map((t) => ({
      _id: (t._id as { toString: () => string }).toString(),
      title: (t.title as string) || "",
      description: (t.description as string) || "",
      status: (t.status as string) || "",
      priority: (t.priority as string) || "",
      dueDate: t.dueDate ? new Date(t.dueDate as string).toISOString() : null,
      assigneeId: (t.assigneeId as string) || "",
      assigneeName: (t.assigneeName as string) || "",
      assigneeAvatar: (t.assigneeAvatar as string) || "",
      creatorId: (t.creatorId as string) || "",
      creatorName: (t.creatorName as string) || "",
      createdAt: t.createdAt ? new Date(t.createdAt as string).toISOString() : "",
      isBookmarked: (t.isBookmarked as boolean) || false,
    }));
  }

  return <OverviewInteractive tasks={tasks} currentUserId={currentUserId} />;
}
