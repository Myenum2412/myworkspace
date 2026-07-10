"use client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable } from "@/app/appointments/data-table";
import { columns, makeActionsCell, statusColorMap } from "@/app/appointments/columns";
import type { Appointment, AppointmentStats, AppointmentStatus } from "./appointment-types";

type AppointmentListProps = {
  appointments: Appointment[];
  stats: AppointmentStats;
  onView: (appt: Appointment) => void;
  onEdit: (appt: Appointment) => void;
  onCancel: (appt: Appointment) => void;
  onDelete: (appt: Appointment) => void;
};

const statCards = [
  { key: "total", label: "Total Appointments" },
  { key: "today", label: "Today's Appointments" },
  { key: "pending", label: "Pending" },
  { key: "confirmed", label: "Confirmed" },
  { key: "completed", label: "Completed" },
  { key: "cancelled", label: "Cancelled" },
] as const;

export function AppointmentList({ appointments, stats, onView, onEdit, onCancel, onDelete }: AppointmentListProps) {
  return (
    <>
      <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
        {statCards.map(({ key, label }) => {
          const value = stats[key as keyof AppointmentStats];
          const statusKey = key.charAt(0).toUpperCase() + key.slice(1);
          const isStatus = ["pending", "confirmed", "completed", "cancelled"].includes(key);
          return (
            <Card key={key}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">{label}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${isStatus ? statusColorMap[statusKey as AppointmentStatus]?.split(" ")[1] ? `text-${statusColorMap[statusKey as AppointmentStatus]?.split(" ")[1]?.split("-")[1]}` : "" : ""}`}>
                  {value}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

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
