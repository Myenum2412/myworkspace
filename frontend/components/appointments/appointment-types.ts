export interface Doctor {
  id: string;
  orgId: string;
  doctorName: string;
  specialization: string;
  department: string;
  consultationFee: number;
  phone: string;
  email: string;
  status: "active" | "inactive";
  createdAt: string;
  updatedAt: string;
}

export type AppointmentStatus = "Pending" | "Confirmed" | "Completed" | "Cancelled";

export interface Appointment {
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
  createdAt: string;
  updatedAt: string;
}

export interface AppointmentStats {
  total: number;
  today: number;
  pending: number;
  confirmed: number;
  completed: number;
  cancelled: number;
}

export type AppointmentPageView = "list" | "book";
