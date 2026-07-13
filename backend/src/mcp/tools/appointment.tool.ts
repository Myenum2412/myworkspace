import { v4 as uuidv4 } from "uuid";
import { toolRegistry } from "./registry.js";
import { mcpMemoryManager } from "../memory/manager.js";
import { Appointment } from "../../lib/db/models/Appointment.js";

toolRegistry.register({
  name: "appointment.create",
  description: "Schedules a new appointment or follow-up meeting with a customer. Stores appointment details and notifies the assigned team member.",
  requiredRole: ["admin", "manager", "member"],
  handler: async (params: Record<string, unknown>, ctx) => {
    const { customerName, customerContact, date, time, notes } = params as Record<string, string>;

    if (!customerName?.trim() || !date) {
      throw new Error("customerName and date are required");
    }

    const appointmentId = `AP-${Date.now()}`;
    const doc = await Appointment.create({
      id: uuidv4(),
      orgId: ctx.org.id,
      appointmentId,
      patientName: customerName.trim(),
      mobileNumber: customerContact?.trim() || "0000000000",
      email: "",
      doctorId: "",
      doctorName: "",
      appointmentDate: date,
      preferredTime: time || "10:00",
      reasonForVisit: notes?.trim() || "Follow-up",
      notes: notes?.trim() || "",
      status: "Pending" as const,
      bookingDatetime: new Date().toISOString(),
      createdBy: ctx.user.userId,
      source: "web" as const,
    });

    const lean = doc.toObject();

    await mcpMemoryManager.addEntry({
      sessionId: ctx.user.sessionId,
      userId: ctx.user.userId,
      orgId: ctx.org.id,
      role: "system",
      content: `Created appointment for ${customerName} on ${date}`,
      metadata: { appointmentId: lean.appointmentId },
    });

    return {
      appointmentId: lean.appointmentId,
      id: lean.id,
      customerName: lean.patientName,
      date: lean.appointmentDate,
      time: lean.preferredTime,
      status: lean.status,
    };
  },
});
