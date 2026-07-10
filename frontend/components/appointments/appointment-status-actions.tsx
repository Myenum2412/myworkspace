"use client"

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import type { Appointment, AppointmentStatus } from "./appointment-types";

interface Props {
  appointment: Appointment | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStatusChanged: (appt: Appointment) => void;
}

export function AppointmentStatusDialog({ appointment: propAppointment, open, onOpenChange, onStatusChanged }: Props) {
  if (!propAppointment) return null;
  const appt = propAppointment;
  const [status, setStatus] = useState<AppointmentStatus>(appt.status);
  const [loading, setLoading] = useState(false);

  async function handleUpdate() {
    setLoading(true);
    try {
      const res = await fetch(`/api/appointments/${appt.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const json = await res.json();
      if (json.success) {
        onStatusChanged(json.data);
        onOpenChange(false);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Update Status</DialogTitle>
          <DialogDescription>
            Change status for {appt.patientName} ({appt.appointmentId})
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <Select value={status} onValueChange={(v) => setStatus(v as AppointmentStatus)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Pending">Pending</SelectItem>
              <SelectItem value="Confirmed">Confirmed</SelectItem>
              <SelectItem value="Completed">Completed</SelectItem>
              <SelectItem value="Cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleUpdate} disabled={loading}>
            {loading && <Loader2 className="mr-2 size-4 animate-spin" />}
            Update Status
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
