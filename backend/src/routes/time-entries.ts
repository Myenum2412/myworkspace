import { Router, Response } from "express";
import { TimeEntry } from "../lib/db/models/TimeEntry.js";
import { OrgMember } from "../lib/db/models/OrgMember.js";
import { User } from "../lib/db/models/User.js";
import { AuthRequest, authenticate } from "../middleware/auth.js";
import { AppError } from "../middleware/error.js";
import { requireOrgMembership } from "../lib/org-utils.js";
import type { PipelineStage } from "mongoose";

const router = Router();

router.use(authenticate);

// Get team summary - aggregated time entries per org member using aggregation pipeline
router.get("/team-summary", async (req: AuthRequest, res: Response) => {
  try {
    const orgId = (req.query.orgId as string) || await requireOrgMembership(req.user!.userId);
    const date = req.query.date as string;

    const dateFilter: Record<string, unknown> = {};
    if (date) {
      const d = new Date(date);
      dateFilter.date = {
        $gte: new Date(d.setHours(0, 0, 0, 0)),
        $lt: new Date(d.setHours(23, 59, 59, 999)),
      };
    }

    const pipeline: PipelineStage[] = [
      { $match: { orgId, ...dateFilter } },
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
          totalHours: { $toString: { $divide: ["$totalMinutes", 60] } },
          entryCount: 1,
          pendingEntries: 1,
          approvedEntries: 1,
        },
      },
    ];

    const result = await TimeEntry.aggregate(pipeline).exec();

    // Fix totalHours to be a fixed-decimal string
    for (const r of result) {
      r.totalHours = (r.totalMinutes / 60).toFixed(1);
    }

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
          totalEntries: result.reduce((s, r) => s + r.entryCount, 0),
        },
      },
    });
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError(500, "Failed to fetch team summary");
  }
});

// Get time entries with pagination, filtering, and sorting
router.get("/", async (req: AuthRequest, res: Response) => {
  try {
    const orgId = (req.query.orgId as string) || await requireOrgMembership(req.user!.userId);

    // Pagination
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
    const skip = (page - 1) * limit;

    // Filtering
    const matchStage: Record<string, unknown> = { orgId };

    const userId = req.query.userId as string;
    if (userId) {
      matchStage.userId = userId;
    }

    const status = req.query.status as string;
    if (status) {
      matchStage.status = status;
    }

    // Date range filtering
    const startDate = req.query.startDate as string;
    const endDate = req.query.endDate as string;
    if (startDate || endDate) {
      const dateRange: Record<string, Date> = {};
      if (startDate) {
        dateRange.$gte = new Date(startDate);
        dateRange.$gte.setHours(0, 0, 0, 0);
      }
      if (endDate) {
        dateRange.$lte = new Date(endDate);
        dateRange.$lte.setHours(23, 59, 59, 999);
      }
      matchStage.date = dateRange;
    }

    // Sorting
    const allowedSortFields = ["date", "startTime", "endTime", "duration", "status", "createdAt", "description"];
    const sortBy = allowedSortFields.includes(req.query.sortBy as string)
      ? (req.query.sortBy as string)
      : "date";
    const sortOrder = req.query.sortOrder === "asc" ? 1 : -1;

    const pipeline: PipelineStage[] = [
      { $match: matchStage },
      { $sort: { [sortBy]: sortOrder } },
      { $skip: skip },
      { $limit: limit },
      {
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "id",
          as: "user",
        },
      },
      { $unwind: { path: "$user", preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: 1,
          userId: 1,
          date: 1,
          startTime: 1,
          endTime: 1,
          duration: 1,
          description: 1,
          billable: 1,
          status: 1,
          createdAt: 1,
          userName: { $ifNull: ["$user.name", "Unknown"] },
          userEmail: { $ifNull: ["$user.email", ""] },
          userAvatar: { $ifNull: ["$user.image", ""] },
        },
      },
    ];

    const countPipeline: PipelineStage[] = [
      { $match: matchStage },
      { $count: "total" },
    ];

    const [entries, countResult] = await Promise.all([
      TimeEntry.aggregate(pipeline).exec(),
      TimeEntry.aggregate(countPipeline).exec(),
    ]);

    const total = countResult.length > 0 ? countResult[0].total : 0;
    const totalPages = Math.ceil(total / limit);

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
      user: {
        name: e.userName,
        email: e.userEmail,
        avatar: e.userAvatar,
      },
    }));

    res.json({
      success: true,
      data: result,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    });
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError(500, "Failed to fetch time entries");
  }
});

// Create time entry
router.post("/", async (req: AuthRequest, res: Response) => {
  try {
    const { orgId: bodyOrgId, userId, date, startTime, endTime, duration, description, billable, status } = req.body;

    const orgId = bodyOrgId || await requireOrgMembership(req.user!.userId);

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
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError(500, "Failed to create time entry");
  }
});

// Update time entry
router.put("/:id", async (req: AuthRequest, res: Response) => {
  try {
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
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError(500, "Failed to update time entry");
  }
});

// Delete time entry
router.delete("/:id", async (req: AuthRequest, res: Response) => {
  try {
    const entry = await TimeEntry.findById(req.params.id).lean();
    if (!entry) throw new AppError(404, "Time entry not found");

    const membership = await OrgMember.findOne({ userId: req.user!.userId, orgId: entry.orgId.toString() }).lean();
    if (!membership) throw new AppError(403, "Not authorized");

    await TimeEntry.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError(500, "Failed to delete time entry");
  }
});

export default router;
