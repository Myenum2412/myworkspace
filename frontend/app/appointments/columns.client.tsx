"use client"
import { ColumnDef } from "@tanstack/react-table";
import { MoreHorizontal, Eye, Pencil, Trash2, XCircle, CheckCircle, Ban } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Appointment, AppointmentStatus } from "@/components/appointments/appointment-types";

export const statusColorMap: Record<AppointmentStatus, string> = {
  Pending: "bg-yellow-50 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  Confirmed: "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  Completed: "bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  Cancelled: "bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

export const columns: ColumnDef<Appointment>[] = [
  {
    id: "sno",
    header: "S.No",
    cell: ({ row }) => <span className="text-muted-foreground">{row.index + 1}</span>,
    enableSorting: false,
  },
  {
    accessorKey: "appointmentId",
    header: "Appointment ID",
    cell: ({ row }) => (
      <span className="font-mono text-xs font-medium">{row.getValue("appointmentId")}</span>
    ),
  },
  {
    accessorKey: "patientName",
    header: "Patient Name",
    cell: ({ row }) => <span className="font-medium">{row.getValue("patientName")}</span>,
  },
  {
    accessorKey: "mobileNumber",
    header: "Mobile Number",
    cell: ({ row }) => <span className="text-muted-foreground">{row.getValue("mobileNumber")}</span>,
  },
  {
    accessorKey: "doctorName",
    header: "Doctor",
    cell: ({ row }) => <span>{row.getValue("doctorName")}</span>,
  },
  {
    accessorKey: "appointmentDate",
    header: "Appointment Date",
    cell: ({ row }) => {
      const date = row.getValue<string>("appointmentDate");
      return <span>{new Date(date).toLocaleDateString()}</span>;
    },
  },
  {
    accessorKey: "preferredTime",
    header: "Preferred Time",
    cell: ({ row }) => <span className="text-muted-foreground">{row.getValue("preferredTime")}</span>,
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const status = row.getValue<AppointmentStatus>("status");
      return (
        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColorMap[status] || ""}`}>
          {status}
        </span>
      );
    },
  },
  {
    accessorKey: "bookingDatetime",
    header: "Booking Date",
    cell: ({ row }) => {
      const date = row.getValue<string>("bookingDatetime");
      return <span className="text-muted-foreground text-xs">{new Date(date).toLocaleString()}</span>;
    },
  },
];

export function makeActionsCell(
  onView: (appt: Appointment) => void,
  onEdit: (appt: Appointment) => void,
  onCancel: (appt: Appointment) => void,
  onDelete: (appt: Appointment) => void,
): ColumnDef<Appointment> {
  return {
    id: "actions",
    header: "Actions",
    cell: ({ row }) => {
      const appt = row.original;
      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="size-8">
              <MoreHorizontal className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={() => onView(appt)}>
              <Eye className="mr-2 size-4" />
              View
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => onEdit(appt)}>
              <Pencil className="mr-2 size-4" />
              Edit
            </DropdownMenuItem>
            {appt.status !== "Cancelled" && (
              <DropdownMenuItem onSelect={() => onCancel(appt)}>
                <Ban className="mr-2 size-4" />
                Cancel Appointment
              </DropdownMenuItem>
            )}
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onSelect={() => onDelete(appt)}
            >
              <Trash2 className="mr-2 size-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
    enableSorting: false,
    enableHiding: false,
  };
}
