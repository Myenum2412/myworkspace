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
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { AppointmentForm } from "./appointment-form";
import type { Appointment, Doctor, AppointmentStatus } from "./appointment-types";

interface EditProps {
  appointment: Appointment | null;
  doctors: Doctor[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdated: (appt: Appointment) => void;
}

export function AppointmentEditDialog({ appointment: propAppointment, doctors, open, onOpenChange, onUpdated }: EditProps) {
  if (!propAppointment) return null;
  const appt = propAppointment;

  async function handleSubmit(data: Partial<Appointment>) {
    const res = await fetch(`/api/appointments/${appt.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (json.success) {
      onUpdated(json.data);
      onOpenChange(false);
    } else {
      throw new Error(json.error || "Failed to update");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Appointment</DialogTitle>
          <DialogDescription>
            Appointment ID: {appt.appointmentId}
          </DialogDescription>
        </DialogHeader>
        <AppointmentForm
          doctors={doctors}
          initialData={appt}
          onSubmit={handleSubmit}
          onCancel={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}

interface DeleteProps {
  appointment: Appointment | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDeleted: (id: string) => void;
}

export function AppointmentDeleteDialog({ appointment: propAppointment, open, onOpenChange, onDeleted }: DeleteProps) {
  if (!propAppointment) return null;
  const appt = propAppointment;
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    setDeleting(true);
    try {
      const res = await fetch(`/api/appointments/${appt.id}`, { method: "DELETE" });
      const json = await res.json();
      if (json.success) {
        onDeleted(appt.id);
        onOpenChange(false);
      }
    } finally {
      setDeleting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Delete Appointment</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete appointment <strong>{appt.appointmentId}</strong> for <strong>{appt.patientName}</strong>? This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
            {deleting && <Loader2 className="mr-2 size-4 animate-spin" />}
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface CancelProps {
  appointment: Appointment | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStatusChanged: (appt: Appointment) => void;
}

export function AppointmentCancelDialog({ appointment: propAppointment, open, onOpenChange, onStatusChanged }: CancelProps) {
  if (!propAppointment) return null;
  const appt = propAppointment;
  const [loading, setLoading] = useState(false);

  async function handleCancel() {
    setLoading(true);
    try {
      const res = await fetch(`/api/appointments/${appt.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "Cancelled" }),
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
          <DialogTitle>Cancel Appointment</DialogTitle>
          <DialogDescription>
            Are you sure you want to cancel the appointment for <strong>{appt.patientName}</strong> on <strong>{new Date(appt.appointmentDate).toLocaleDateString()}</strong> at <strong>{appt.preferredTime}</strong>?
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>No, Keep It</Button>
          <Button variant="destructive" onClick={handleCancel} disabled={loading}>
            {loading && <Loader2 className="mr-2 size-4 animate-spin" />}
            Yes, Cancel Appointment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
