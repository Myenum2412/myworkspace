"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import type { Doctor, Appointment } from "./appointment-types";

interface AppointmentFormProps {
  doctors: Doctor[];
  onSubmit: (data: Partial<Appointment>) => Promise<void>;
  onCancel: () => void;
  initialData?: Appointment | null;
}

interface FormErrors {
  patientName?: string;
  mobileNumber?: string;
  doctorId?: string;
  appointmentDate?: string;
  preferredTime?: string;
  reasonForVisit?: string;
}

const TIME_SLOTS = [
  "09:00 AM", "09:30 AM", "10:00 AM", "10:30 AM",
  "11:00 AM", "11:30 AM", "12:00 PM", "12:30 PM",
  "01:00 PM", "01:30 PM", "02:00 PM", "02:30 PM",
  "03:00 PM", "03:30 PM", "04:00 PM", "04:30 PM",
  "05:00 PM", "05:30 PM",
];

function getTodayString(): string {
  return new Date().toISOString().split("T")[0];
}

export function AppointmentForm({ doctors, onSubmit, onCancel, initialData }: AppointmentFormProps) {
  const [patientName, setPatientName] = useState(initialData?.patientName || "");
  const [mobileNumber, setMobileNumber] = useState(initialData?.mobileNumber || "");
  const [email, setEmail] = useState(initialData?.email || "");
  const [doctorId, setDoctorId] = useState(initialData?.doctorId || "");
  const [appointmentDate, setAppointmentDate] = useState(initialData?.appointmentDate || "");
  const [preferredTime, setPreferredTime] = useState(initialData?.preferredTime || "");
  const [reasonForVisit, setReasonForVisit] = useState(initialData?.reasonForVisit || "");
  const [notes, setNotes] = useState(initialData?.notes || "");
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);

  function validate(): FormErrors {
    const e: FormErrors = {};
    if (!patientName.trim()) e.patientName = "Full name is required";
    if (!mobileNumber.trim()) e.mobileNumber = "Mobile number is required";
    else if (!/^\+?[\d\s-]{7,15}$/.test(mobileNumber.trim())) e.mobileNumber = "Enter a valid mobile number";
    if (!doctorId) e.doctorId = "Please select a doctor";
    if (!appointmentDate) e.appointmentDate = "Appointment date is required";
    else if (appointmentDate < getTodayString()) e.appointmentDate = "Date cannot be in the past";
    if (!preferredTime) e.preferredTime = "Preferred time is required";
    if (!reasonForVisit.trim()) e.reasonForVisit = "Reason for visit is required";
    return e;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const validationErrors = validate();
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;

    setSubmitting(true);
    try {
      await onSubmit({
        patientName: patientName.trim(),
        mobileNumber: mobileNumber.trim(),
        email: email.trim(),
        doctorId,
        appointmentDate,
        preferredTime,
        reasonForVisit: reasonForVisit.trim(),
        notes: notes.trim(),
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Patient Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="patientName">
              Full Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="patientName"
              value={patientName}
              onChange={(e) => setPatientName(e.target.value)}
              className={errors.patientName ? "border-red-500" : ""}
              placeholder="Enter patient name"
            />
            {errors.patientName && <p className="text-xs text-red-500">{errors.patientName}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="mobileNumber">
              Mobile Number <span className="text-destructive">*</span>
            </Label>
            <Input
              id="mobileNumber"
              value={mobileNumber}
              onChange={(e) => setMobileNumber(e.target.value)}
              className={errors.mobileNumber ? "border-red-500" : ""}
              placeholder="+1234567890"
            />
            {errors.mobileNumber && <p className="text-xs text-red-500">{errors.mobileNumber}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="patient@example.com"
            />
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Appointment Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="doctorId">
              Select Doctor <span className="text-destructive">*</span>
            </Label>
            <Select value={doctorId} onValueChange={setDoctorId}>
              <SelectTrigger className={errors.doctorId ? "border-red-500" : ""}>
                <SelectValue placeholder="Select a doctor" />
              </SelectTrigger>
              <SelectContent>
                {doctors.map((doc) => (
                  <SelectItem key={doc.id} value={doc.id}>
                    {doc.doctorName} - {doc.specialization}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.doctorId && <p className="text-xs text-red-500">{errors.doctorId}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="appointmentDate">
              Appointment Date <span className="text-destructive">*</span>
            </Label>
            <Input
              id="appointmentDate"
              type="date"
              value={appointmentDate}
              onChange={(e) => setAppointmentDate(e.target.value)}
              min={getTodayString()}
              className={errors.appointmentDate ? "border-red-500" : ""}
            />
            {errors.appointmentDate && <p className="text-xs text-red-500">{errors.appointmentDate}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="preferredTime">
              Preferred Time <span className="text-destructive">*</span>
            </Label>
            <Select value={preferredTime} onValueChange={setPreferredTime}>
              <SelectTrigger className={errors.preferredTime ? "border-red-500" : ""}>
                <SelectValue placeholder="Select time slot" />
              </SelectTrigger>
              <SelectContent>
                {TIME_SLOTS.map((slot) => (
                  <SelectItem key={slot} value={slot}>{slot}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.preferredTime && <p className="text-xs text-red-500">{errors.preferredTime}</p>}
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="reasonForVisit">
              Reason for Visit <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="reasonForVisit"
              value={reasonForVisit}
              onChange={(e) => setReasonForVisit(e.target.value)}
              className={errors.reasonForVisit ? "border-red-500" : ""}
              placeholder="Describe the reason for the visit"
              rows={3}
            />
            {errors.reasonForVisit && <p className="text-xs text-red-500">{errors.reasonForVisit}</p>}
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any additional notes"
              rows={2}
            />
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 pt-2">
        <Button type="submit" disabled={submitting}>
          {submitting && <Loader2 className="mr-2 size-4 animate-spin" />}
          {initialData ? "Update Appointment" : "Book Appointment"}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          {initialData ? "Cancel" : "Reset"}
        </Button>
      </div>
    </form>
  );
}
