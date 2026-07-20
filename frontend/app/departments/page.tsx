import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { collections } from "@/lib/db/schema";
import { getUserOrgId } from "@/lib/org";
import { DepartmentsClient } from "@/components/departments/departments-client";

export const metadata = {
  title: "Departments",
};

const deptColors = [
  "bg-red-500", "bg-red-500", "bg-red-500", "bg-red-500",
  "bg-red-500", "bg-red-500", "bg-red-500", "bg-red-500",
];

export default async function DepartmentsPage() {
  const session = await auth();
  
  const orgId = session?.user?.id ? await getUserOrgId(session.user.id) : null;

  let departments: Array<{ name: string; head: string; headAvatar: string; memberCount: number; openPositions: number; budget: string; color: string }> = [];

  try {
    if (orgId) {
      const teamsData = await db.collection(collections.teams).find({ orgId }).toArray();
      const members = await db.collection(collections.orgMembers).find({ orgId }).toArray();
      const userIds = members.map((m: Record<string, unknown>) => m.userId as string);
      const usersData = userIds.length > 0
        ? await db.collection(collections.users).find({ id: { $in: userIds } }).project({ id: 1, name: 1, image: 1 }).toArray()
        : [];
      const userMap = new Map(usersData.map((u: Record<string, unknown>) => [u.id, u]));

      const adminMember = members.find((m: Record<string, unknown>) => m.role === "members");
      const headUser = adminMember ? userMap.get(adminMember.userId as string) as Record<string, unknown> | undefined : undefined;

      departments = teamsData.map((t: Record<string, unknown>, i: number) => ({
        name: (t.name as string) || "Unknown",
        head: (headUser?.name as string) || "Unassigned",
        headAvatar: (headUser?.image as string) || "",
        memberCount: members.length,
        openPositions: 0,
        budget: "$0",
        color: deptColors[i % deptColors.length],
      }));
    }
  } catch {
    // departments stays empty on error
  }

  const totalMembers = departments.reduce((s, d) => s + d.memberCount, 0);
  const totalOpen = departments.reduce((s, d) => s + d.openPositions, 0);

  return <DepartmentsClient departments={departments} totalMembers={totalMembers} totalOpen={totalOpen} />;
}
