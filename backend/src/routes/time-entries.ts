import { Router, Response } from "express";
import { TimeEntry } from "../lib/db/models/TimeEntry.js";
import { OrgMember } from "../lib/db/models/OrgMember.js";
import { User } from "../lib/db/models/User.js";
import { AuthRequest, authenticate } from "../middleware/auth.js";
import { AppError } from "../middleware/error.js";

const router = Router();

router.use(authenticate);

async function getUserOrgId(userId: string): Promise<string> {
  const member = await OrgMember.findOne({ userId }).lean();
  if (!member) throw new AppError(403, "User is not a member of any organization");
  return member.orgId.toString();
}

// Get team summary - aggregated time entries per org member
router.get("/team-summary", async (req: AuthRequest, res: Response) => {
  const orgId = (req.query.orgId as string) || await getUserOrgId(req.user!.userId);
  const date = req.query.date as string;

  const members = await OrgMember.find({ orgId }).lean();
  const userIds = members.map((m) => m.userId);
  const users = await User.find({ _id: { $in: userIds } }).select("name email image status department designation").lean();
  const userMap = new Map(users.map((u) => [u._id.toString(), u]));

  const dateFilter: Record<string, unknown> = { orgId };
  if (date) {
    const d = new Date(date);
    dateFilter.date = {
      $gte: new Date(d.setHours(0, 0, 0, 0)),
      $lt: new Date(d.setHours(23, 59, 59, 999)),
    };
  }

  const entries = await TimeEntry.find(dateFilter).lean();
  const aggMap = new Map<string, { totalMinutes: number; count: number; pending: number; approved: number }>();

  for (const entry of entries) {
    const uid = entry.userId.toString();
    if (!aggMap.has(uid)) {
      aggMap.set(uid, { totalMinutes: 0, count: 0, pending: 0, approved: 0 });
    }
    const a = aggMap.get(uid)!;
    a.totalMinutes += entry.duration;
    a.count += 1;
    if (entry.status === "pending") a.pending += 1;
    if (entry.status === "approved") a.approved += 1;
  }

  const result = members.map((m) => {
    const uid = m.userId.toString();
    const u = userMap.get(uid) as Record<string, unknown> || {};
    const agg = aggMap.get(uid) || { totalMinutes: 0, count: 0, pending: 0, approved: 0 };
    return {
      userId: uid,
      name: (u.name as string) || "Unknown",
      email: (u.email as string) || "",
      avatar: (u.image as string) || "",
      status: (u.status as string) || "offline",
      department: (u.department as string) || "",
      designation: (u.designation as string) || "",
      role: m.role,
      totalMinutes: agg.totalMinutes,
      totalHours: (agg.totalMinutes / 60).toFixed(1),
      entryCount: agg.count,
      pendingEntries: agg.pending,
      approvedEntries: agg.approved,
    };
  });

  const totalMinutesAll = result.reduce((s, r) => s + r.totalMinutes, 0);
  const activeMembers = result.filter((r) => r.entryCount > 0).length;

  res.json({
    success: true,
    data: {
      members: result,
      summary: {
        totalMembers: result.length,
        activeMembers,
        totalHoursAll: (totalMinutesAll / 60).toFixed(1),
        totalEntries: entries.length,
      },
    },
  });
});

// Get time entries for a specific user
router.get("/", async (req: AuthRequest, res: Response) => {
  const orgId = (req.query.orgId as string) || await getUserOrgId(req.user!.userId);
  const userId = req.query.userId as string;
  const date = req.query.date as string;

  const filter: Record<string, unknown> = { orgId };
  if (userId) filter.userId = userId;
  if (date) {
    const d = new Date(date);
    filter.date = {
      $gte: new Date(d.setHours(0, 0, 0, 0)),
      $lt: new Date(d.setHours(23, 59, 59, 999)),
    };
  }

  const entries = await TimeEntry.find(filter).sort({ date: -1 }).lean();

  const result = entries.map((e) => ({
    id: e._id.toString(),
    userId: e.userId.toString(),
    date: e.date,
    startTime: e.startTime,
    endTime: e.endTime,
    duration: e.duration,
    description: e.description,
    billable: e.billable,
    status: e.status,
    createdAt: e.createdAt,
  }));

  res.json({ success: true, data: result });
});

// Create time entry
router.post("/", async (req: AuthRequest, res: Response) => {
  const { orgId: bodyOrgId, userId, date, startTime, endTime, duration, description, billable, status } = req.body;

  const orgId = bodyOrgId || await getUserOrgId(req.user!.userId);

  const membership = await OrgMember.findOne({ userId: userId || req.user!.userId, orgId }).lean();
  if (!membership) throw new AppError(403, "Not authorized");

  const entry = await TimeEntry.create({
    orgId,
    userId: userId || req.user!.userId,
    date: date ? new Date(date) : new Date(),
    startTime,
    endTime,
    duration: duration || 0,
    description: description || "",
    billable: billable !== undefined ? billable : true,
    status: status || "pending",
  });

  res.status(201).json({ success: true, data: { id: entry._id.toString() } });
});

// Update time entry
router.put("/:id", async (req: AuthRequest, res: Response) => {
  const entry = await TimeEntry.findById(req.params.id).lean();
  if (!entry) throw new AppError(404, "Time entry not found");

  const membership = await OrgMember.findOne({ userId: req.user!.userId, orgId: entry.orgId.toString() }).lean();
  if (!membership) throw new AppError(403, "Not authorized");

  const updates: Record<string, unknown> = {};
  const allowed = ["date", "startTime", "endTime", "duration", "description", "billable", "status"];
  for (const field of allowed) {
    if (req.body[field] !== undefined) {
      updates[field] = field === "date" ? new Date(req.body[field]) : req.body[field];
    }
  }

  await TimeEntry.findByIdAndUpdate(req.params.id, updates);
  res.json({ success: true });
});

// Delete time entry
router.delete("/:id", async (req: AuthRequest, res: Response) => {
  const entry = await TimeEntry.findById(req.params.id).lean();
  if (!entry) throw new AppError(404, "Time entry not found");

  const membership = await OrgMember.findOne({ userId: req.user!.userId, orgId: entry.orgId.toString() }).lean();
  if (!membership) throw new AppError(403, "Not authorized");

  await TimeEntry.findByIdAndDelete(req.params.id);
  res.json({ success: true });
});

export default router;
