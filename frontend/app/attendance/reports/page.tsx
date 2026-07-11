import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { collections } from "@/lib/db/schema";
import { ensureUserOrg } from "@/lib/org";
import { EmployeeReport } from "@/components/attendance/employee-report";

export const metadata = {
  title: "Employee Report",
};

export default async function EmployeeReportPage() {
  const session = await auth();
  const orgId = session?.user?.id ? await ensureUserOrg(session.user.id, session.user.email) : null;

  let employees: Record<string, unknown>[] = [];

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
      const userIds = members.map((m: any) => m.userId as string);
      if (userIds.length > 0) {
        const { ObjectId } = await import("mongodb");
        const objectIds = userIds.filter((id) => ObjectId.isValid(id)).map((id) => new ObjectId(id));
        const users = await db.collection(collections.users).find(
          { $or: [{ id: { $in: userIds } }, ...(objectIds.length > 0 ? [{ _id: { $in: objectIds } }] : [])] },
          { projection: { password: 0 } }
        ).sort({ createdAt: -1 }).toArray();

        employees = users.map((u: Record<string, unknown>) => ({
          ...u,
          _id: u._id ? String(u._id) : undefined,
        }));
      }
    }
  } catch {
    // employees stays empty on error
  }

  return (
    <main className="flex flex-1 flex-col gap-4 p-3 sm:p-4 md:p-6 min-w-0 max-w-full">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold">Employee Report</h1>
        <p className="text-sm text-muted-foreground mt-1">Comprehensive employee information report</p>
      </div>
      <EmployeeReport employees={employees} />
    </main>
  );
}
