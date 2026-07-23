import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { collections } from "@/lib/db/schema";
import { getUserOrgId } from "@/lib/org";
import { redirect } from "next/navigation";
import TimesheetInteractive from "@/app/staffs/timesheet/timesheet-interactive.client";

export const dynamic = "force-dynamic";

export default async function TimesheetPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const orgId = await getUserOrgId(session.user.id, session.user.email);
  if (!orgId || !session.user.id) {
    return <TimesheetInteractive projects={[]} tasks={[]} orgId="" userId="" />;
  }

  const week = new Date().toISOString().slice(0, 10);

  const [rawProjects, rawTasks, timesheetData] = await Promise.all([
    db.collection(collections.projects)
      .find({ orgId })
      .sort({ name: 1 })
      .toArray(),
    db.collection(collections.tasks)
      .find({ orgId })
      .sort({ title: 1 })
      .toArray(),
    db.collection("timesheets")
      .findOne({ orgId, userId: session.user.id, week })
      .then((doc) => doc?.rows || []),
  ]);

  const projects = (rawProjects as unknown as Record<string, unknown>[]).map((p) => ({
    id: (p.id as string) || String(p._id || ""),
    name: (p.name as string) || "",
    color: (p.color as string) || "#93c5fd",
  }));

  const tasks = (rawTasks as unknown as Record<string, unknown>[]).map((t) => ({
    _id: (t._id as { toString: () => string }).toString(),
    title: (t.title as string) || "",
    projectId: (t.projectId as string) || (t.project as string) || undefined,
  }));

  const initialTimesheet = Array.isArray(timesheetData) ? timesheetData : [];

  return (
    <TimesheetInteractive
      projects={projects}
      tasks={tasks}
      orgId={orgId}
      userId={session.user.id}
      initialTimesheet={initialTimesheet}
    />
  );
}
