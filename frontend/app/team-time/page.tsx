import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { collections } from "@/lib/db/schema";
import { getUserOrgId } from "@/lib/org";
import { redirect } from "next/navigation";
import TeamTime from "./team-time-interactive";

export const dynamic = "force-dynamic";

export default async function TeamTimePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const orgId = await getUserOrgId(session.user.id, session.user.email);
  if (!orgId) {
    return <TeamTime initialData={null} />;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setHours(23, 59, 59, 999);

  const TimeEntry = db.collection(collections.timeEntries);
  const pipeline = [
    { $match: { orgId, date: { $gte: today, $lt: tomorrow } } },
    {
      $group: {
        _id: "$userId",
        totalMinutes: { $sum: "$duration" },
        entryCount: { $sum: 1 },
        pendingEntries: {
          $sum: { $cond: [{ $eq: ["$status", "pending"] }, 1, 0] },
        },
        approvedEntries: {
          $sum: { $cond: [{ $eq: ["$status", "approved"] }, 1, 0] },
        },
      },
    },
    {
      $lookup: {
        from: "orgmembers",
        localField: "_id",
        foreignField: "userId",
        as: "membership",
      },
    },
    { $unwind: "$membership" },
    {
      $match: { "membership.orgId": orgId },
    },
    {
      $lookup: {
        from: "users",
        localField: "_id",
        foreignField: "id",
        as: "userData",
      },
    },
    { $unwind: { path: "$userData", preserveNullAndEmptyArrays: true } },
    {
      $project: {
        _id: 0,
        userId: "$_id",
        name: { $ifNull: ["$userData.name", "Unknown"] },
        email: { $ifNull: ["$userData.email", ""] },
        avatar: { $ifNull: ["$userData.image", ""] },
        status: { $ifNull: ["$userData.status", "offline"] },
        department: { $ifNull: ["$userData.department", ""] },
        designation: { $ifNull: ["$userData.designation", ""] },
        role: "$membership.role",
        totalMinutes: 1,
        entryCount: 1,
        pendingEntries: 1,
        approvedEntries: 1,
      },
    },
  ];

  const rawMembers = await TimeEntry.aggregate(pipeline).toArray();

  const members = (rawMembers as unknown as Record<string, unknown>[]).map((r) => ({
    userId: (r.userId as string) || "",
    name: (r.name as string) || "Unknown",
    email: (r.email as string) || "",
    avatar: (r.avatar as string) || "",
    status: (r.status as string) || "offline",
    department: (r.department as string) || "",
    designation: (r.designation as string) || "",
    role: (r.role as string) || "",
    totalMinutes: (r.totalMinutes as number) || 0,
    totalHours: ((r.totalMinutes as number) / 60).toFixed(1),
    entryCount: (r.entryCount as number) || 0,
    pendingEntries: (r.pendingEntries as number) || 0,
    approvedEntries: (r.approvedEntries as number) || 0,
  }));

  const totalMinutesAll = members.reduce((s, m) => s + m.totalMinutes, 0);
  const activeMembers = members.filter((m) => m.entryCount > 0).length;

  const data = {
    members,
    summary: {
      totalMembers: members.length,
      activeMembers,
      totalHoursAll: (totalMinutesAll / 60).toFixed(1),
      totalEntries: members.reduce((s, m) => s + m.entryCount, 0),
    },
  };

  return <TeamTime initialData={data} />;
}
