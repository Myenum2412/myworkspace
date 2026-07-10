"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { PlusIcon, ChevronLeftIcon, Loader2 } from "lucide-react";
import { AppointmentForm } from "@/components/appointments/appointment-form";
import { AppointmentList } from "@/components/appointments/appointment-list";
import { AppointmentViewDialog } from "@/components/appointments/appointment-view-dialog";
import { AppointmentEditDialog } from "@/components/appointments/appointment-actions";
import { AppointmentCancelDialog } from "@/components/appointments/appointment-actions";
import { AppointmentDeleteDialog } from "@/components/appointments/appointment-actions";
import { AppointmentStatusDialog } from "@/components/appointments/appointment-status-actions";
import { getSocketIO } from "@/lib/socketio-client";
import type { Appointment, AppointmentStats, Doctor, AppointmentPageView } from "@/components/appointments/appointment-types";

export default function Appointments({ initialDoctors }: { initialDoctors: Doctor[] }) {
  const [doctors, setDoctors] = useState<Doctor[]>(initialDoctors);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [stats, setStats] = useState<AppointmentStats>({
    total: 0, today: 0, pending: 0, confirmed: 0, completed: 0, cancelled: 0,
  });
  const [loading, setLoading] = useState(true);
  const [pageView, setPageView] = useState<AppointmentPageView>("list");
  const [viewingAppt, setViewingAppt] = useState<Appointment | null>(null);
  const [editingAppt, setEditingAppt] = useState<Appointment | null>(null);
  const [cancellingAppt, setCancellingAppt] = useState<Appointment | null>(null);
  const [deletingAppt, setDeletingAppt] = useState<Appointment | null>(null);
  const [statusAppt, setStatusAppt] = useState<Appointment | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const [apptRes, statsRes] = await Promise.all([
        fetch("/api/appointments"),
        fetch("/api/appointments/stats"),
      ]);
      const apptJson = await apptRes.json();
      const statsJson = await statsRes.json();
      if (apptJson.success) setAppointments(apptJson.data || []);
      if (statsJson.success) setStats(statsJson.data);
    } catch {
      // silently handle
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchDoctors = useCallback(async () => {
    try {
      const res = await fetch("/api/doctors");
      const json = await res.json();
      if (json.success) setDoctors(json.data || []);
    } catch {
      // silently handle
    }
  }, []);

  const socketRef = useRef<ReturnType<typeof getSocketIO> | null>(null);

  useEffect(() => {
    fetchData();
    fetchDoctors();

    const socket = getSocketIO();
    socketRef.current = socket;

    const handleCreated = (appt: Appointment) => {
      setAppointments((prev) => {
        if (prev.some((a) => a.id === appt.id)) return prev;
        return [appt, ...prev];
      });
      fetchData();
    };

    const handleUpdated = (appt: Appointment) => {
      setAppointments((prev) => prev.map((a) => (a.id === appt.id ? appt : a)));
      fetchData();
    };

    const handleDeleted = (data: { id: string }) => {
      setAppointments((prev) => prev.filter((a) => a.id !== data.id));
      fetchData();
    };

    socket.on("appointment:created", handleCreated);
    socket.on("appointment:updated", handleUpdated);
    socket.on("appointment:deleted", handleDeleted);

    return () => {
      socket.off("appointment:created", handleCreated);
      socket.off("appointment:updated", handleUpdated);
      socket.off("appointment:deleted", handleDeleted);
    };
  }, [fetchData, fetchDoctors]);

  async function handleBookAppointment(data: Partial<Appointment>) {
    const res = await fetch("/api/appointments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.error || "Failed to book appointment");
    setPageView("list");
    fetchData();
  }

  function handleUpdated(appt: Appointment) {
    setAppointments((prev) => prev.map((a) => (a.id === appt.id ? appt : a)));
    setEditingAppt(null);
    fetchData();
  }

  function handleDeleted(id: string) {
    setAppointments((prev) => prev.filter((a) => a.id !== id));
    setDeletingAppt(null);
    fetchData();
  }

  function handleStatusChanged(appt: Appointment) {
    setAppointments((prev) => prev.map((a) => (a.id === appt.id ? appt : a)));
    setCancellingAppt(null);
    setStatusAppt(null);
    fetchData();
  }

  if (loading) {
    return (
      <main className="flex flex-1 flex-col gap-4 p-3 sm:p-4 md:p-6 min-w-0 max-w-full">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      </main>
    );
  }

  if (pageView === "book") {
    return (
      <main className="flex flex-1 flex-col h-full min-w-0 max-w-full">
        <div className="flex items-center gap-3 px-3 sm:px-4 md:px-6 py-4 border-b bg-background sticky top-0 z-10 shrink-0">
          <Button variant="ghost" size="sm" onClick={() => setPageView("list")} className="gap-1.5">
            <ChevronLeftIcon className="size-4" />
            Back
          </Button>
          <div className="h-5 w-px bg-border" />
          <h1 className="text-lg font-semibold">Book Appointment</h1>
        </div>
        <div className="flex-1 overflow-auto">
          <div className="max-w-3xl mx-auto py-6 px-3 sm:px-4 md:px-6">
            <AppointmentForm
              doctors={doctors}
              onSubmit={handleBookAppointment}
              onCancel={() => setPageView("list")}
            />
          </div>
        </div>
      </main>
    );
  }

  return (
    <>
      <main className="flex flex-1 flex-col gap-4 p-3 sm:p-4 md:p-6 min-w-0 max-w-full">
        <div className="flex items-center justify-between gap-2">
          <h1 className="text-xl sm:text-2xl font-bold">Booking Appointments</h1>
          <Button onClick={() => setPageView("book")}>
            <PlusIcon className="mr-2 size-4" />
            Book Appointment
          </Button>
        </div>

        <AppointmentList
          appointments={appointments}
          stats={stats}
          onView={(appt) => setViewingAppt(appt)}
          onEdit={(appt) => setEditingAppt(appt)}
          onCancel={(appt) => setCancellingAppt(appt)}
          onDelete={(appt) => setDeletingAppt(appt)}
        />
      </main>

      <AppointmentViewDialog
        appointment={viewingAppt}
        open={!!viewingAppt}
        onOpenChange={(open) => { if (!open) setViewingAppt(null); }}
      />

      <AppointmentEditDialog
        appointment={editingAppt}
        doctors={doctors}
        open={!!editingAppt}
        onOpenChange={(open) => { if (!open) setEditingAppt(null); }}
        onUpdated={handleUpdated}
      />

      <AppointmentCancelDialog
        appointment={cancellingAppt}
        open={!!cancellingAppt}
        onOpenChange={(open) => { if (!open) setCancellingAppt(null); }}
        onStatusChanged={handleStatusChanged}
      />

      <AppointmentDeleteDialog
        appointment={deletingAppt}
        open={!!deletingAppt}
        onOpenChange={(open) => { if (!open) setDeletingAppt(null); }}
        onDeleted={handleDeleted}
      />

      <AppointmentStatusDialog
        appointment={statusAppt}
        open={!!statusAppt}
        onOpenChange={(open) => { if (!open) setStatusAppt(null); }}
        onStatusChanged={handleStatusChanged}
      />
    </>
  );
}
