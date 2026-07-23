import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { collections } from "@/lib/db/schema";
import { getUserOrgId } from "@/lib/org";
import { redirect } from "next/navigation";
import { CreateTaskPageInteractive } from "./page-interactive";
import { OverdueTasksCard, type OverdueTask } from "@/components/overdue-tasks-card";

export const metadata = {
  title: "Create Task",
};
export const dynamic = "force-dynamic";

export default async function CreateTaskPage() {
  let session;
  try {
    session = await auth();
  } catch {
    redirect("/login");
  }

  if (!session?.user) {
    redirect("/login");
  }

  const orgId = await getUserOrgId(session.user.id, session.user.email);

  let overdueTasks: OverdueTask[] = [];

  if (orgId) {
    const now = new Date();
    const overdueRaw = (await db
      .collection(collections.tasks)
      .find({
        orgId,
        dueDate: { $lt: now },
        status: { $nin: ["done", "cancelled", "completed", "closed", "rejected"] },
      })
      .project({ title: 1, dueDate: 1 })
      .sort({ dueDate: 1 })
      .limit(10)
      .toArray()) as unknown as Record<string, unknown>[];

    overdueTasks = overdueRaw.map((t) => ({
      _id: (t._id as { toString: () => string }).toString(),
      title: (t.title as string) || "",
      dueDate: t.dueDate ? new Date(t.dueDate as string).toISOString() : null,
    }));
  }

  return (
    <main className="flex flex-1 flex-col h-[calc(100vh-4rem)]">
      <div className="p-4">
        <OverdueTasksCard tasks={overdueTasks} />
      </div>
      <CreateTaskPageInteractive />
    </main>
  );
}
