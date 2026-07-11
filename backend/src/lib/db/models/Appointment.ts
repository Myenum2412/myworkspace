import { Schema, model, Document } from "mongoose";

export type AppointmentStatus = "Pending" | "Confirmed" | "Completed" | "Cancelled";

export interface IAppointment extends Document {
  id: string;
  orgId: string;
  appointmentId: string;
  patientName: string;
  mobileNumber: string;
  email: string;
  doctorId: string;
  doctorName?: string;
  appointmentDate: string;
  preferredTime: string;
  reasonForVisit: string;
  notes: string;
  status: AppointmentStatus;
  bookingDatetime: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  source: "web" | "whatsapp";
}

const appointmentSchema = new Schema<IAppointment>(
  {
    id: { type: String, required: true, unique: true },
    orgId: { type: String, required: true, index: true },
    appointmentId: { type: String, required: true, unique: true },
    patientName: { type: String, required: true },
    mobileNumber: { type: String, required: true },
    email: { type: String, default: "" },
    doctorId: { type: String, required: true },
    doctorName: { type: String, default: "" },
    appointmentDate: { type: String, required: true },
    preferredTime: { type: String, required: true },
    reasonForVisit: { type: String, required: true },
    notes: { type: String, default: "" },
    status: {
      type: String,
      enum: ["Pending", "Confirmed", "Completed", "Cancelled"],
      default: "Pending",
    },
    bookingDatetime: { type: String, required: true },
    createdBy: { type: String, required: true },
    source: { type: String, enum: ["web", "whatsapp"], default: "web" },
  },
  { timestamps: true }
);

appointmentSchema.index({ orgId: 1, appointmentDate: 1 });
appointmentSchema.index({ orgId: 1, status: 1 });
appointmentSchema.index({ orgId: 1, doctorId: 1, appointmentDate: 1, preferredTime: 1 });

export const Appointment = model<IAppointment>("Appointment", appointmentSchema);
