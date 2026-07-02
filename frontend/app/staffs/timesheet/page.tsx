import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { collections } from "@/lib/db/schema";
import { getUserOrgId } from "@/lib/org";
import { redirect } from "next/navigation";
import TimeTracker from "@/app/time-tracker/time-tracker-interactive";

export const dynamic = "force-dynamic";

export default async function StaffTimesheetPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const orgId = await getUserOrgId(session.user.id, session.user.email);
  if (!orgId || !session.user.id) {
    return <TimeTracker initialEntries={[]} projects={[]} user={{ name: "", email: "", avatar: "", id: "" }} orgId="" />;
  }

  const today = new Date().toISOString().slice(0, 10);

  const [rawEntries, rawProjects] = await Promise.all([
    db.collection(collections.timeEntries)
      .find({ orgId, userId: session.user.id, date: today })
      .sort({ createdAt: -1 })
      .toArray(),
    db.collection(collections.projects)
      .find({ orgId })
      .sort({ name: 1 })
      .toArray(),
  ]);

  const entries = (rawEntries as unknown as Record<string, unknown>[]).map((e) => ({
    id: (e._id as { toString: () => string }).toString(),
    userId: (e.userId as string) || "",
    date: (e.date as string) || "",
    startTime: (e.startTime as string) || undefined,
    endTime: (e.endTime as string) || undefined,
    duration: (e.duration as number) || 0,
    description: (e.description as string) || "",
    projectId: (e.projectId as string) || undefined,
    projectName: (e.projectName as string) || undefined,
    billable: (e.billable as boolean) ?? true,
    status: (e.status as "pending" | "approved" | "rejected") || "pending",
    createdAt: (e.createdAt as string) || "",
  }));

  const projects = (rawProjects as unknown as Record<string, unknown>[]).map((p) => ({
    id: (p.id as string) || String(p._id || ""),
    name: (p.name as string) || "",
    color: (p.color as string) || "#93c5fd",
  }));

  return (
    <TimeTracker
      initialEntries={entries}
      projects={projects}
      user={{
        name: (session.user.name as string) || "",
        email: (session.user.email as string) || "",
        avatar: (session.user.image as string) || "",
        id: session.user.id,
      }}
      orgId={orgId}
    />
  );
}
