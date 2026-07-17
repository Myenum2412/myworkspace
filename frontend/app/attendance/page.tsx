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

  let today: Array<{ name: string; displayId: string; email: string; department: string; designation: string; checkIn: string | null; checkOut: string | null; status: string }> = [];

  try {
    if (orgId) {
      const [fromNextAuth, fromMongoose] = await Promise.all([
        db.collection(collections.orgMembers).find({ orgId }).toArray(),
        db.collection("orgmembers").find({ orgId }).toArray(),
      ]);
      const allMembers = [...fromNextAuth, ...fromMongoose];
      const seenUserIds = new Set<string>();
      const members = allMembers.filter((m: any) => {
        const uid = m.userId as string;
        if (!uid || seenUserIds.has(uid)) return false;
        seenUserIds.add(uid);
        return true;
      });
      const userIds = members.map((m: Record<string, unknown>) => m.userId as string);
      if (userIds.length > 0) {
        const { ObjectId } = await import("mongodb");
        const objectIds = userIds.filter((id) => ObjectId.isValid(id)).map((id) => new ObjectId(id));
        const users = await db.collection(collections.users).find(
          { $or: [{ id: { $in: userIds } }, ...(objectIds.length > 0 ? [{ _id: { $in: objectIds } }] : [])] },
          { projection: { _id: 1, id: 1, name: 1, email: 1, image: 1, department: 1, designation: 1, status: 1, displayId: 1, createdAt: 1 } }
        ).toArray();
        const userMap = new Map<string, Record<string, unknown>>();
        for (const u of users) {
          const uIdStr = u.id as string;
          const uObjIdStr = u._id ? String(u._id) : "";
          if (uIdStr) userMap.set(uIdStr, u);
          if (uObjIdStr) userMap.set(uObjIdStr, u);
        }
        today = members.map((m: Record<string, unknown>) => {
          const userId = m.userId as string;
          const user = userMap.get(userId) as Record<string, unknown> | undefined;
          const createdAt = user?.createdAt;
          const checkInTime = createdAt ? new Date(createdAt as string).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }) : null;
          return {
            name: (user?.name as string) || "Unknown",
            displayId: (user?.displayId as string) || "\u2014",
            email: (user?.email as string) || "\u2014",
            department: (user?.department as string) || "\u2014",
            designation: (user?.designation as string) || "\u2014",
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
    <main className="flex flex-1 flex-col gap-4 p-3 sm:p-4 md:p-6 min-w-0 max-w-full">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold">Attendance</h1>
        <p className="text-sm text-muted-foreground mt-1">Today's attendance record</p>
      </div>
      <AttendanceTable data={today} />
    </main>
  );
}
