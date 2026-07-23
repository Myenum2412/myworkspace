import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { collections } from "@/lib/db/schema";
import { getUserOrgId } from "@/lib/org";
import { redirect } from "next/navigation";
import TimeTrackerClient from "./time-tracker-client";

export const dynamic = "force-dynamic";

function entryMinutes(e: Record<string, unknown>): number {
  const dur = (e.duration as number) || 0;
  if (dur > 0) return dur;
  const st = e.startTime as string | undefined;
  const et = e.endTime as string | undefined;
  if (st && et) {
    const [sh, sm] = st.split(":").map(Number);
    const [eh, em] = et.split(":").map(Number);
    if (!isNaN(sh) && !isNaN(sm) && !isNaN(eh) && !isNaN(em)) return Math.max(0, (eh * 60 + em) - (sh * 60 + sm));
  }
  return 0;
}

export default async function TimeTrackerPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const orgId = await getUserOrgId(session.user.id, session.user.email);

  if (!orgId) {
    return <TimeTrackerClient overviewData={null} myTimeData={null} reportsData={null} />;
  }

  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const oneWeekAgo = new Date(now.getTime() - 7 * 86400000);
  const twoWeeksAgo = new Date(now.getTime() - 14 * 86400000);

  // Fetch overview data (last 7 days entries)
  const rawOverview = await db.collection(collections.timeEntries)
    .find({ orgId, userId: session.user.id, date: { $gte: oneWeekAgo.toISOString().slice(0, 10) } })
    .sort({ date: -1, createdAt: -1 })
    .toArray() as unknown as Record<string, unknown>[];

  const overviewEntries = rawOverview.map((e) => ({
    id: (e.id as string) || String(e._id || ""),
    userId: (e.userId as string) || "",
    date: (e.date as string) || "",
    startTime: (e.startTime as string) || undefined,
    endTime: (e.endTime as string) || undefined,
    duration: (e.duration as number) || 0,
    description: (e.description as string) || "",
    projectId: (e.projectId as string) || undefined,
    projectName: (e.projectName as string) || undefined,
    billable: (e.billable as boolean) ?? true,
    status: (e.status as string) || "pending",
    createdAt: (e.createdAt as string) || "",
  }));

  // Fetch my-time data (today's entries + projects + tasks)
  const [myTimeRaw, rawProjects, rawTasks] = await Promise.all([
    db.collection(collections.timeEntries)
      .find({ orgId, userId: session.user.id, date: today })
      .sort({ createdAt: -1 })
      .toArray(),
    db.collection(collections.projects)
      .find({ orgId })
      .sort({ name: 1 })
      .toArray(),
    db.collection(collections.tasks)
      .find({ orgId })
      .sort({ title: 1 })
      .toArray(),
  ]);

  const myTimeEntries = (myTimeRaw as unknown as Record<string, unknown>[]).map((e) => ({
    id: (e.id as string) || String(e._id ?? ""),
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

  const tasks = (rawTasks as unknown as Record<string, unknown>[]).map((t) => ({
    _id: (t._id as { toString: () => string }).toString(),
    title: (t.title as string) || "",
    projectId: (t.projectId as string) || (t.project as string) || undefined,
  }));

  // Fetch reports data (weekly stats)
  const [thisWeekEntries, lastWeekEntries, orgMembers] = await Promise.all([
    db.collection(collections.timeEntries)
      .find({ orgId, date: { $gte: oneWeekAgo, $lte: now } }).toArray(),
    db.collection(collections.timeEntries)
      .find({ orgId, date: { $gte: twoWeeksAgo, $lt: oneWeekAgo } }).toArray(),
    db.collection(collections.orgMembers).find({ orgId }).toArray(),
  ]);

  const thisWeekTotalMinutes = (thisWeekEntries as unknown as Record<string, unknown>[]).reduce((s, e) => s + entryMinutes(e), 0);
  const lastWeekTotalMinutes = (lastWeekEntries as unknown as Record<string, unknown>[]).reduce((s, e) => s + entryMinutes(e), 0);
  const totalHours = thisWeekTotalMinutes / 60;
  const lastWeekHours = lastWeekTotalMinutes / 60;
  const weeklyChange = lastWeekHours > 0 ? ((totalHours - lastWeekHours) / lastWeekHours) * 100 : 0;

  const billableMinutes = (thisWeekEntries as unknown as Record<string, unknown>[]).filter((e) => e.billable === true).reduce((s, e) => s + entryMinutes(e), 0);
  const billableHours = billableMinutes / 60;
  const utilization = totalHours > 0 ? (billableHours / totalHours) * 100 : 0;

  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const weeklyData: { day: string; hours: number }[] = [];
  for (let i = 0; i < 7; i++) {
    const dayStart = new Date(oneWeekAgo);
    dayStart.setDate(oneWeekAgo.getDate() + i);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(dayStart);
    dayEnd.setHours(23, 59, 59, 999);
    const dayMinutes = (thisWeekEntries as unknown as Record<string, unknown>[]).filter((e) => {
      const d = new Date(e.date as string);
      return d >= dayStart && d <= dayEnd;
    }).reduce((s, e) => s + entryMinutes(e), 0);
    weeklyData.push({ day: dayNames[dayStart.getDay()], hours: dayMinutes / 60 });
  }

  const projectSet = new Set<string>();
  (thisWeekEntries as unknown as Record<string, unknown>[]).forEach((e) => {
    if (e.projectName && typeof e.projectName === "string") projectSet.add(e.projectName);
  });

  const userMinutesMap = new Map<string, number>();
  (thisWeekEntries as unknown as Record<string, unknown>[]).forEach((e) => {
    const uid = e.userId as string;
    userMinutesMap.set(uid, (userMinutesMap.get(uid) || 0) + ((e.duration as number) || 0));
  });

  const sortedUsers = [...userMinutesMap.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
  const topUserIds = sortedUsers.map(([uid]) => uid);
  const userDocs = topUserIds.length > 0
    ? await db.collection(collections.users).find({ id: { $in: topUserIds } }).project({ id: 1, name: 1 }).toArray() as unknown as Record<string, unknown>[]
    : [];
  const topUserMap = new Map(userDocs.map((u) => [u.id as string, (u.name as string) || "Unknown"]));
  const topMembers = sortedUsers.map(([uid, minutes], i) => ({
    rank: i + 1,
    name: topUserMap.get(uid) || "Unknown",
    hours: minutes / 60,
    billable: minutes / 60,
  }));

  const reportsData = {
    totalHours,
    billableHours,
    totalEntries: (thisWeekEntries as unknown[]).length,
    avgDailyHours: orgMembers.length > 0 ? totalHours / orgMembers.length : 0,
    activeProjects: projectSet.size,
    teamMembers: orgMembers.length,
    weeklyChange,
    utilization,
    weeklyData,
    topMembers,
  };

  const userData = {
    name: (session.user.name as string) || "",
    email: (session.user.email as string) || "",
    avatar: (session.user.image as string) || "",
    id: session.user.id,
  };

  return (
    <TimeTrackerClient
      overviewData={overviewEntries}
      myTimeData={{
        entries: myTimeEntries,
        projects,
        tasks,
        user: userData,
        orgId,
      }}
      reportsData={reportsData}
    />
  );
}
