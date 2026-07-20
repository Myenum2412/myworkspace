import { Router, Response } from "express";
import { AuthRequest, authenticate } from "../middleware/auth.js";
import { AppError } from "../middleware/error.js";
import { isAdminRole } from "../lib/rbac/index.js";
import { requireOrgMembership } from "../lib/org-utils.js";
import { Appointment, IAppointment } from "../lib/db/models/Appointment.js";
import { socketIOManager } from "../lib/socketio/index.js";
import { v4 as uuid } from "uuid";
import { logger } from "../lib/logger/index.js";

const router = Router();

router.use(authenticate);

function generateAppointmentId(): string {
  const prefix = "APT";
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}-${timestamp}-${random}`;
}

router.get("/", async (req: AuthRequest, res: Response) => {
  const orgId = req.user!.orgId || (req.query.orgId as string) || await requireOrgMembership(req.user!.userId);
  const { status, doctorId, dateFrom, dateTo, search, sort, order, page: pageStr, limit: limitStr } = req.query as Record<string, string>;

  const filter: Record<string, unknown> = { orgId };

  if (status) filter.status = status;
  if (doctorId) filter.doctorId = doctorId;

  if (dateFrom || dateTo) {
    filter.appointmentDate = {};
    if (dateFrom) (filter.appointmentDate as Record<string, string>).$gte = dateFrom;
    if (dateTo) (filter.appointmentDate as Record<string, string>).$lte = dateTo;
  }

  if (search) {
    filter.$or = [
      { patientName: { $regex: search, $options: "i" } },
      { mobileNumber: { $regex: search, $options: "i" } },
      { appointmentId: { $regex: search, $options: "i" } },
    ];
  }

  const sortField = sort || "createdAt";
  const sortOrder = order === "asc" ? 1 : -1;
  const page = Math.max(1, parseInt(pageStr || "1"));
  const limit = Math.min(100, Math.max(1, parseInt(limitStr || "50")));
  const skip = (page - 1) * limit;

  const [appointments, total] = await Promise.all([
    Appointment.find(filter)
      .sort({ [sortField]: sortOrder })
      .skip(skip)
      .limit(limit)
      .select("id orgId appointmentId patientName mobileNumber email doctorId doctorName appointmentDate preferredTime reasonForVisit notes status bookingDatetime createdBy source createdAt updatedAt")
      .lean(),
    Appointment.countDocuments(filter),
  ]);

  const serialized = appointments.map((a) => {
    const { _id, __v, ...rest } = a as any;
    return { ...rest, id: rest.id || rest._id?.toString() };
  });

  res.json({
    success: true,
    data: serialized,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  });
});

router.get("/stats", async (req: AuthRequest, res: Response) => {
  const orgId = req.user!.orgId || (req.query.orgId as string) || await requireOrgMembership(req.user!.userId);
  const today = new Date().toISOString().split("T")[0];

  const [total, todayCount, pending, confirmed, completed, cancelled] = await Promise.all([
    Appointment.countDocuments({ orgId }),
    Appointment.countDocuments({ orgId, appointmentDate: today }),
    Appointment.countDocuments({ orgId, status: "Pending" }),
    Appointment.countDocuments({ orgId, status: "Confirmed" }),
    Appointment.countDocuments({ orgId, status: "Completed" }),
    Appointment.countDocuments({ orgId, status: "Cancelled" }),
  ]);

  res.json({
    success: true,
    data: { total, today: todayCount, pending, confirmed, completed, cancelled },
  });
});

router.get("/:id", async (req: AuthRequest, res: Response) => {
  const orgId = req.user!.orgId || await requireOrgMembership(req.user!.userId);
  const appointment = await Appointment.findOne({ id: req.params.id, orgId }).select("id orgId appointmentId patientName mobileNumber email doctorId doctorName appointmentDate preferredTime reasonForVisit notes status bookingDatetime createdBy source createdAt updatedAt").lean();
  if (!appointment) throw new AppError(404, "Appointment not found");
  const { _id, __v, ...rest } = appointment as any;
  res.json({ success: true, data: { ...rest, id: rest.id } });
});

router.post("/", async (req: AuthRequest, res: Response) => {
  if (!isAdminRole(req.user!.role)) throw new AppError(403, "Only admins can create appointments");
  const orgId = req.user!.orgId || await requireOrgMembership(req.user!.userId);
  const userId = req.user!.userId;
  const body = req.body;

  if (!body.patientName) throw new AppError(400, "Patient name is required");
  if (!body.mobileNumber) throw new AppError(400, "Mobile number is required");
  if (!body.doctorId) throw new AppError(400, "Doctor selection is required");
  if (!body.appointmentDate) throw new AppError(400, "Appointment date is required");
  if (!body.preferredTime) throw new AppError(400, "Preferred time is required");
  if (!body.reasonForVisit) throw new AppError(400, "Reason for visit is required");

  if (body.appointmentDate < new Date().toISOString().split("T")[0]) {
    throw new AppError(400, "Appointment date cannot be in the past");
  }

  const duplicate = await Appointment.findOne({
    orgId,
    doctorId: body.doctorId,
    appointmentDate: body.appointmentDate,
    preferredTime: body.preferredTime,
    status: { $ne: "Cancelled" },
  }).select("_id").lean();

  if (duplicate) {
    throw new AppError(409, "This time slot is already booked for this doctor");
  }

  const appointment = await Appointment.create({
    id: uuid(),
    orgId,
    appointmentId: generateAppointmentId(),
    patientName: body.patientName,
    mobileNumber: body.mobileNumber,
    email: body.email || "",
    doctorId: body.doctorId,
    doctorName: body.doctorName || "",
    appointmentDate: body.appointmentDate,
    preferredTime: body.preferredTime,
    reasonForVisit: body.reasonForVisit,
    notes: body.notes || "",
    status: "Pending",
    bookingDatetime: new Date().toISOString(),
    createdBy: body.createdBy || userId,
    source: body.source || "web",
  });

  const doc = appointment.toObject();
  const { _id, __v, ...rest } = doc as any;

  socketIOManager.emitToUser(userId, "appointment:created", { ...rest, id: rest.id });

  socketIOManager.getIO()?.to(`org:${orgId}`).emit("appointment:created", { ...rest, id: rest.id });

  logger.info({ appointmentId: rest.appointmentId, orgId }, "Appointment created");

  res.status(201).json({ success: true, data: { ...rest, id: rest.id } });
});

router.put("/:id", async (req: AuthRequest, res: Response) => {
  if (!isAdminRole(req.user!.role)) throw new AppError(403, "Only admins can update appointments");
  const orgId = req.user!.orgId || await requireOrgMembership(req.user!.userId);
  const userId = req.user!.userId;

  const existing = await Appointment.findOne({ id: req.params.id, orgId }).lean();
  if (!existing) throw new AppError(404, "Appointment not found");

  const allowed = ["patientName", "mobileNumber", "email", "doctorId", "doctorName", "appointmentDate", "preferredTime", "reasonForVisit", "notes", "status"];
  const updates: Record<string, unknown> = {};
  for (const field of allowed) {
    if (req.body[field] !== undefined) updates[field] = req.body[field];
  }
  updates.updatedAt = new Date();

  const updated = await Appointment.findOneAndUpdate(
    { id: req.params.id, orgId },
    { $set: updates },
    { returnDocument: "after" }
  ).lean();

  if (!updated) throw new AppError(500, "Failed to update appointment");
  const { _id, __v, ...rest } = updated as any;

  socketIOManager.emitToUser(userId, "appointment:updated", { ...rest, id: rest.id });
  socketIOManager.getIO()?.to(`org:${orgId}`).emit("appointment:updated", { ...rest, id: rest.id });

  res.json({ success: true, data: { ...rest, id: rest.id } });
});

router.delete("/:id", async (req: AuthRequest, res: Response) => {
  if (!isAdminRole(req.user!.role)) throw new AppError(403, "Only admins can delete appointments");
  const orgId = req.user!.orgId || await requireOrgMembership(req.user!.userId);
  const userId = req.user!.userId;

  const deleted = await Appointment.findOneAndDelete({ id: req.params.id, orgId });
  if (!deleted) throw new AppError(404, "Appointment not found");

  socketIOManager.emitToUser(userId, "appointment:deleted", { id: req.params.id });
  socketIOManager.getIO()?.to(`org:${orgId}`).emit("appointment:deleted", { id: req.params.id });

  res.json({ success: true, data: { id: req.params.id } });
});

export default router;
