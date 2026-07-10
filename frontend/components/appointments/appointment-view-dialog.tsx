"use client"

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { statusColorMap } from "@/app/appointments/columns";
import type { Appointment, AppointmentStatus } from "./appointment-types";

interface Props {
  appointment: Appointment | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AppointmentViewDialog({ appointment, open, onOpenChange }: Props) {
  if (!appointment) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Appointment Details</DialogTitle>
          <DialogDescription>
            Appointment ID: {appointment.appointmentId}
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground">Patient Name</p>
            <p className="font-medium">{appointment.patientName}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Mobile Number</p>
            <p className="font-medium">{appointment.mobileNumber}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Email</p>
            <p className="font-medium">{appointment.email || "—"}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Doctor</p>
            <p className="font-medium">{appointment.doctorName}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Appointment Date</p>
            <p className="font-medium">{new Date(appointment.appointmentDate).toLocaleDateString()}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Preferred Time</p>
            <p className="font-medium">{appointment.preferredTime}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Status</p>
            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColorMap[appointment.status as AppointmentStatus] || ""}`}>
              {appointment.status}
            </span>
          </div>
          <div>
            <p className="text-muted-foreground">Booking Date</p>
            <p className="font-medium">{new Date(appointment.bookingDatetime).toLocaleString()}</p>
          </div>
          <div className="col-span-2">
            <p className="text-muted-foreground">Reason for Visit</p>
            <p className="font-medium">{appointment.reasonForVisit}</p>
          </div>
          {appointment.notes && (
            <div className="col-span-2">
              <p className="text-muted-foreground">Notes</p>
              <p className="font-medium">{appointment.notes}</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
