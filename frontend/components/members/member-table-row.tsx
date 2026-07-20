"use client";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  MoreHorizontalIcon,
  UsersIcon,
  PencilIcon,
  Trash2Icon,
  CheckCircle2Icon,
  XCircleIcon,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { MemberData } from "./member-types";
import { statusConfig, getInitials, getAvatarColor } from "./member-types";

type MemberTableRowProps = {
  member: MemberData;
  selected: boolean;
  onToggleSelect: (id: string) => void;
  onView: (m: MemberData) => void;
  onEdit: (m: MemberData) => void;
  onDelete: (m: MemberData) => void;
  showOrgColumn?: boolean;
};

function fmt(d?: Date): string {
  if (!d) return "\u2014";
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function MemberTableRow({ member: m, selected, onToggleSelect, onView, onEdit, onDelete, showOrgColumn }: MemberTableRowProps) {
  const status = statusConfig[m.status] || statusConfig.offline;

  return (
    <tr
      className="group border-b bg-white hover:bg-slate-50 transition-colors cursor-pointer"
      onClick={() => onView(m)}
    >
      <td className="px-4 py-3 w-10" onClick={(e) => e.stopPropagation()}>
        <Checkbox checked={selected} onCheckedChange={() => onToggleSelect(m.id)} aria-label={`Select ${m.name}`} className="border-black" />
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          {m.avatar ? (
            <img
              src={m.avatar}
              alt={m.name}
              className="size-8 rounded-full object-cover ring-2 ring-background"
            />
          ) : (
            <div className={`size-8 rounded-full flex items-center justify-center text-xs font-semibold ${getAvatarColor(m.name)}`}>
              {getInitials(m.name)}
            </div>
          )}
          <span className="font-medium text-gray-900 whitespace-nowrap">
            {m.name}
          </span>
        </div>
      </td>

      <td className="px-4 py-3">
        <span className="text-gray-700">{m.email}</span>
      </td>

      <td className="px-4 py-3">
        <span className="inline-flex items-center rounded-md border border-gray-200 text-gray-700 px-2 py-0.5 text-xs font-medium capitalize">
          {m.role}
        </span>
      </td>

      <td className="px-4 py-3">
        <span className="text-xs capitalize text-gray-500">{m.provider}</span>
      </td>

      <td className="px-4 py-3">
        {m.emailVerified ? (
          <CheckCircle2Icon className="size-4 text-emerald-600" />
        ) : (
          <XCircleIcon className="size-4 text-gray-300" />
        )}
      </td>

      <td className="px-4 py-3">
        <span className="text-gray-500 text-xs">{fmt(m.createdAt || m.joinedAt)}</span>
      </td>

      <td className="px-4 py-3">
        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${status.bg} ${status.text}`}>
          <span className={`size-1.5 rounded-full ${status.dot}`} />
          {status.label}
        </span>
      </td>

      {showOrgColumn && (
        <td className="px-4 py-3">
          <span className="text-xs text-gray-500">{m.orgName}</span>
        </td>
      )}

      <td className="px-4 py-3 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-end gap-1">
          {selected && (
            <Button
              variant="ghost"
              size="icon"
              className="size-8 text-red-600 hover:text-red-700 hover:bg-red-50"
              onClick={() => onDelete(m)}
            >
              <Trash2Icon className="size-4" />
            </Button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="size-8">
                <MoreHorizontalIcon className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              <DropdownMenuItem onClick={() => onView(m)}>
                <UsersIcon className="size-3.5 mr-2" /> View
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onEdit(m)}>
                <PencilIcon className="size-3.5 mr-2" /> Edit
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => onDelete(m)}
                className="text-red-600 focus:text-red-600 focus:bg-red-50"
              >
                <Trash2Icon className="size-3.5 mr-2" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </td>
    </tr>
  );
}
