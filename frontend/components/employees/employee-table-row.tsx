"use client";

import { Button } from "@/components/ui/button";
import {
  MoreHorizontalIcon,
  UsersIcon,
  PencilIcon,
  UserXIcon,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Employee } from "@/app/employees/columns";
import { statusConfig, getInitials, getAvatarColor } from "./employee-types";

type EmployeeTableRowProps = {
  employee: Employee;
  onView: (emp: Employee) => void;
  onEdit: (emp: Employee) => void;
  onTerminate: (emp: Employee) => void;
};

export function EmployeeTableRow({ employee: emp, onView, onEdit, onTerminate }: EmployeeTableRowProps) {
  const status = statusConfig[emp.status] || statusConfig.offline;

  return (
    <tr
      className="group border-b bg-white hover:bg-slate-50 transition-colors cursor-pointer"
      onClick={() => onView(emp)}
    >
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          {emp.avatar ? (
            <img
              src={emp.avatar}
              alt={emp.name}
              className="size-8 rounded-full object-cover ring-2 ring-background"
            />
          ) : (
            <div className={`size-8 rounded-full flex items-center justify-center text-xs font-semibold ${getAvatarColor(emp.name)}`}>
              {getInitials(emp.name)}
            </div>
          )}
          <span className="font-medium text-gray-900 whitespace-nowrap">
            {emp.name}
          </span>
        </div>
      </td>

      <td className="px-4 py-3">
        <span className="font-mono text-xs text-gray-500">
          {emp.displayId || "—"}
        </span>
      </td>

      <td className="px-4 py-3">
        <span className="text-gray-700">{emp.email}</span>
      </td>

      <td className="px-4 py-3">
        {emp.department ? (
          <span className="inline-flex items-center rounded-md bg-blue-50 text-blue-700 px-2 py-0.5 text-xs font-medium">
            {emp.department}
          </span>
        ) : (
          <span className="text-gray-300">—</span>
        )}
      </td>

      <td className="px-4 py-3">
        <span className="text-gray-800">{emp.designation || <span className="text-gray-300">—</span>}</span>
      </td>

      <td className="px-4 py-3">
        <span className="inline-flex items-center rounded-md border border-gray-200 text-gray-700 px-2 py-0.5 text-xs font-medium capitalize">
          {emp.role}
        </span>
      </td>

      <td className="px-4 py-3">
        <span className="text-gray-500 text-xs">
          {emp.joiningDate
            ? new Date(emp.joiningDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
            : "—"}
        </span>
      </td>

      <td className="px-4 py-3">
        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${status.bg} ${status.text}`}>
          <span className={`size-1.5 rounded-full ${status.dot}`} />
          {status.label}
        </span>
      </td>

      <td className="px-4 py-3 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="size-8">
              <MoreHorizontalIcon className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            <DropdownMenuItem onClick={() => onView(emp)}>
              <UsersIcon className="size-3.5 mr-2" /> View
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onEdit(emp)}>
              <PencilIcon className="size-3.5 mr-2" /> Edit
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => onTerminate(emp)}
              className="text-red-600 focus:text-red-600 focus:bg-red-50"
            >
              <UserXIcon className="size-3.5 mr-2" /> Terminate
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </td>
    </tr>
  );
}
