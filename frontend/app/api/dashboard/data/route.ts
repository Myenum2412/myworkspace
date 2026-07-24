import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { collections } from "@/lib/db/schema";
import { getUserOrgId } from "@/lib/org";

export async function GET() {
  let session;
  try {
    session = await auth();
  } catch {
    return NextResponse.json({ error: "Auth unavailable" }, { status: 503 });
  }
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let orgId: string | null = null;
  try {
    orgId = await getUserOrgId(session.user.id, session.user.email);
  } catch {}

  if (!orgId) {
    return NextResponse.json({
      totalTasks: 0, completedTasks: 0, inProgressTasks: 0,
      overdueTasks: 0, todayTasks: 0, pendingApproval: 0,
      projects: [], members: [], clients: [], pendingInvoices: [],
    });
  }

  try {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const pipeline = [
      { $match: { orgId } },
      { $group: {
          _id: null,
          total: { $sum: 1 },
          done: { $sum: { $cond: [{ $eq: ["$status", "done"] }, 1, 0] } },
          inProgress: { $sum: { $cond: [{ $eq: ["$status", "in_progress"] }, 1, 0] } },
          overdue: { $sum: { $cond: [{ $and: [{ $lt: ["$dueDate", now] }, { $ne: ["$status", "done"] }] }, 1, 0] } },
          today: { $sum: { $cond: [{ $gte: ["$createdAt", todayStart] }, 1, 0] } },
          review: { $sum: { $cond: [{ $eq: ["$status", "review"] }, 1, 0] } },
        },
      },
    ] as const;

    const [taskCounts, projDocs, clientDocs, orgMemberDocs, invoiceDocs] = await Promise.all([
      db.collection(collections.tasks).aggregate(pipeline as any).toArray(),
      db.collection(collections.projects).find({ orgId }).sort({ createdAt: -1 }).limit(10).project({ id: 1, name: 1, client: 1, status: 1, progress: 1, dueDate: 1, deadline: 1 }).toArray(),
      db.collection(collections.clients).find({ orgId }).sort({ createdAt: -1 }).limit(5).project({ id: 1, name: 1, company: 1, email: 1, status: 1 }).toArray(),
      db.collection(collections.orgMembers).find({ orgId }).project({ userId: 1, role: 1 }).toArray(),
      db.collection(collections.invoices).find({ orgId, status: "open" }).sort({ createdAt: -1 }).limit(10).project({ id: 1, number: 1, amountPaid: 1, currency: 1, status: 1, createdAt: 1, customerName: 1 }).toArray(),
    ]);

    const counts = (taskCounts as any)[0] || { total: 0, done: 0, inProgress: 0, overdue: 0, today: 0, review: 0 };

    const userIds = (orgMemberDocs as any[]).map((m: any) => m.userId).filter(Boolean);
    let userDocs: any[] = [];
    if (userIds.length > 0) {
      userDocs = await db.collection(collections.users).find({ id: { $in: userIds } }).project({ id: 1, name: 1, email: 1, image: 1, status: 1 }).toArray() as any;
    }
    const userMap = new Map(userDocs.map((u: any) => [u.id, u]));

    const projects = (projDocs as any[]).map((p: any) => ({
      id: p.id || String(p._id || ""),
      name: p.name || "",
      client: p.client || "",
      status: p.status || "Active",
      progress: Number(p.progress ?? 0),
      deadline: p.dueDate || p.deadline || null,
    }));

    const clients = (clientDocs as any[]).map((c: any) => ({
      id: c.id || String(c._id || ""),
      name: c.name || "",
      company: c.company || "",
      email: c.email || "",
      status: c.status || "",
    }));

    const members = (orgMemberDocs as any[]).map((m: any) => {
      const u = userMap.get(m.userId);
      return {
        name: u?.name || "Unknown",
        email: u?.email || "",
        role: m.role || "staffs",
        status: u?.status || "offline",
        avatar: u?.image || "",
      };
    });

    const pendingInvoices = (invoiceDocs as any[]).map((inv: any) => ({
      id: inv.id || String(inv._id || ""),
      number: inv.number || "",
      amountPaid: inv.amountPaid || 0,
      currency: inv.currency || "inr",
      status: inv.status || "open",
      createdAt: inv.createdAt ? new Date(inv.createdAt).toISOString() : "",
      customerName: inv.customerName || "",
    }));

    return NextResponse.json({
      totalTasks: counts.total, completedTasks: counts.done,
      inProgressTasks: counts.inProgress, overdueTasks: counts.overdue,
      todayTasks: counts.today, pendingApproval: counts.review,
      projects, members, clients, pendingInvoices,
    });
  } catch {
    return NextResponse.json({
      totalTasks: 0, completedTasks: 0, inProgressTasks: 0,
      overdueTasks: 0, todayTasks: 0, pendingApproval: 0,
      projects: [], members: [], clients: [], pendingInvoices: [],
    });
  }
}
