import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { collections } from "@/lib/db/schema";
import { getUserOrgId } from "@/lib/org";
import { AttendanceTable } from "@/components/attendance/attendance-table";

export const metadata = {
  title: "Attendance",
};

export default async function StaffAttendancePage() {
  const session = await auth();
  const orgId = session?.user?.id ? await getUserOrgId(session.user.id) : null;

  let today: Array<{ name: string; checkIn: string | null; checkOut: string | null; status: string }> = [];

  try {
    if (orgId) {
      const members = await db.collection(collections.orgMembers).find({ orgId }).toArray();
      const userIds = members.map((m: Record<string, unknown>) => m.userId as string);
      if (userIds.length > 0) {
        const users = await db.collection(collections.users)
          .find({ id: { $in: userIds } })
          .project({ id: 1, name: 1, image: 1, status: 1, createdAt: 1 })
          .toArray();
        const userMap = new Map(users.map((u: Record<string, unknown>) => [u.id, u]));
        today = members.map((m: Record<string, unknown>) => {
          const user = userMap.get(m.userId as string) as Record<string, unknown> | undefined;
          const createdAt = user?.createdAt;
          const checkInTime = createdAt ? new Date(createdAt as string).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }) : null;
          return {
            name: (user?.name as string) || "Unknown",
            checkIn: checkInTime,
            checkOut: null,
            status: (user?.status as string) === "break" ? "late" : (user?.status as string) === "offline" ? "absent" : "present",
          };
        });
      }
    }
  } catch {
    // today stays empty on error
  }

  return (
    <main className="flex flex-1 flex-col gap-4 p-4">
      <div>
        <h1 className="text-2xl font-bold">Attendance</h1>
        <p className="text-sm text-muted-foreground mt-1">Today's attendance record</p>
      </div>
      <AttendanceTable data={today} />
    </main>
  );
}
