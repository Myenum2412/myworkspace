"use client"
import { DataTable } from "@/app/appointments/data-table";
import { columns, makeActionsCell } from "@/app/appointments/columns";
import type { Appointment, AppointmentStats } from "./appointment-types";
import Stats07, { type Stats07Item } from "@/components/stats-07";

type AppointmentListProps = {
  appointments: Appointment[];
  stats: AppointmentStats;
  onView: (appt: Appointment) => void;
  onEdit: (appt: Appointment) => void;
  onCancel: (appt: Appointment) => void;
  onDelete: (appt: Appointment) => void;
};

export function AppointmentList({ appointments, stats, onView, onEdit, onCancel, onDelete }: AppointmentListProps) {
  const statItems: Stats07Item[] = [
    { name: "Total", value: stats.total, subtitle: "Appointments" },
    { name: "Today", value: stats.today, subtitle: "Today's appointments" },
    { name: "Pending", value: stats.pending, subtitle: "Pending", fill: "#f59e0b" },
    { name: "Confirmed", value: stats.confirmed, subtitle: "Confirmed", fill: "#3b82f6" },
    { name: "Completed", value: stats.completed, subtitle: "Completed", fill: "#22c55e" },
    { name: "Cancelled", value: stats.cancelled, subtitle: "Cancelled", fill: "#ef4444" },
  ];

  return (
    <>
      <Stats07 items={statItems} />

      <div className="flex-1 mt-4">
        <DataTable
          columns={[...columns, makeActionsCell(onView, onEdit, onCancel, onDelete)]}
          data={appointments}
          onRowClick={onView}
          searchPlaceholder="Search by name, phone, or ID..."
        />
      </div>
    </>
  );
}
