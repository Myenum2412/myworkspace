// @ts-nocheck
import type { FastifyInstance } from "fastify";
import mongoose from "mongoose";
import { requireOrgMembership } from "../lib/org-utils.js";
import { type AuthRequest, authenticate } from "../middleware/auth.js";
import { AppError } from "../middleware/error.js";

export default async function plugin(fastify: FastifyInstance) {
interface DayTimeEntry {
  startTime: string;
  endTime: string;
}

interface TimesheetRow {
  id: string;
  projectId: string;
  taskId: string;
  remarks: string;
  monday: DayTimeEntry;
  tuesday: DayTimeEntry;
  wednesday: DayTimeEntry;
  thursday: DayTimeEntry;
  friday: DayTimeEntry;
  saturday: DayTimeEntry;
  sunday: DayTimeEntry;
}

interface TimesheetDoc {
  orgId: string;
  userId: string;
  week: string;
  rows: TimesheetRow[];
  createdAt: Date;
  updatedAt: Date;
}

const timesheetSchema = new mongoose.Schema<TimesheetDoc>({
  orgId: { type: String, required: true, index: true },
  userId: { type: String, required: true, index: true },
  week: { type: String, required: true },
  rows: { type: [Object], default: [] },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

timesheetSchema.index({ orgId: 1, userId: 1, week: 1 }, { unique: true });

const Timesheet =
  mongoose.models.Timesheet || mongoose.model<TimesheetDoc>("Timesheet", timesheetSchema);

// GET - Fetch timesheet for a user and week
fastify.get("/", async (req: AuthRequest, reply: any) => {
  try {
    const orgId = await requireOrgMembership(req.user!.userId);
    const userId = (req.query.userId as string) || req.user!.userId;
    const week = (req.query.week as string) || new Date().toISOString().slice(0, 10);

    const timesheet = (await Timesheet.findOne({ orgId, userId, week }).lean()) as
      | (TimesheetDoc & { _id: any })
      | null;

    reply.send({ success: true, data: timesheet?.rows || [] });
  } catch (err: any) {
    if (err instanceof AppError) throw err;
    throw new AppError(500, err.message || "Failed to fetch timesheet");
  }
});

// POST - Save timesheet
fastify.get("/", async (req: AuthRequest, reply: any) => {
  try {
    const orgId = await requireOrgMembership(req.user!.userId);
    const { userId, rows } = req.body;

    if (!userId) throw new AppError(400, "userId is required");
    if (!Array.isArray(rows)) throw new AppError(400, "rows must be an array");

    const week = new Date().toISOString().slice(0, 10);

    await Timesheet.updateOne(
      { orgId, userId, week },
      {
        $set: {
          orgId,
          userId,
          week,
          rows: rows as TimesheetRow[],
          updatedAt: new Date(),
        },
        $setOnInsert: {
          createdAt: new Date(),
        },
      },
      { upsert: true },
    );

    reply.send({ success: true });
  } catch (err: any) {
    if (err instanceof AppError) throw err;
    throw new AppError(500, err.message || "Failed to save timesheet");
  }
});
}
