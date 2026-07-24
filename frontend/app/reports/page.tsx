import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { collections } from "@/lib/db/schema";
import { getUserOrgId } from "@/lib/org";
import { redirect } from "next/navigation";
import ReportsClient from "./reports-client";

export const dynamic = "force-dynamic";

type Task = {
  _id: string;
  title: string;
  status: string;
  priority: string;
  dueDate?: string;
  createdAt: string;
};

export default async function ReportsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const orgId = await getUserOrgId(session.user.id, session.user.email);

  let tasks: Task[] = [];
  if (orgId) {
    const raw = await db.collection(collections.tasks).find({ orgId }).toArray();
    tasks = (raw as unknown as Record<string, unknown>[]).map((t) => ({
      _id: (t._id as { toString: () => string }).toString(),
      title: (t.title as string) || "",
      status: (t.status as string) || "",
      priority: (t.priority as string) || "",
      dueDate: (t.dueDate as string) || undefined,
      createdAt: t.createdAt ? new Date(t.createdAt as string).toISOString() : "",
    }));
  }

  return <ReportsClient tasks={tasks} />;
}
