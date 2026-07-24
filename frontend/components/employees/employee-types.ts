import type { Employee } from "@/app/employees/columns";

export type UserInfo = {
  name: string;
  email: string;
  avatar: string;
};

export type SortField = "name" | "email" | "department" | "designation" | "role" | "status" | "joiningDate";
export type SortDir = "asc" | "desc";
export type PageView = "list" | "add" | "view" | "edit" | "teams";

export const statusConfig: Record<string, { label: string; dot: string; bg: string; text: string }> = {
  active:     { label: "Active",     dot: "bg-emerald-500", bg: "bg-emerald-50 dark:bg-emerald-950/30", text: "text-emerald-700 dark:text-emerald-400" },
  online:     { label: "Online",     dot: "bg-emerald-500", bg: "bg-emerald-50 dark:bg-emerald-950/30", text: "text-emerald-700 dark:text-emerald-400" },
  inactive:   { label: "Inactive",   dot: "bg-slate-400",   bg: "bg-slate-50 dark:bg-slate-900/30",     text: "text-slate-600 dark:text-slate-400" },
  offline:    { label: "Offline",    dot: "bg-slate-400",   bg: "bg-slate-50 dark:bg-slate-900/30",     text: "text-slate-600 dark:text-slate-400" },
  on_leave:   { label: "On Leave",   dot: "bg-amber-500",   bg: "bg-amber-50 dark:bg-amber-950/30",     text: "text-amber-700 dark:text-amber-400" },
  break:      { label: "Break",      dot: "bg-amber-500",   bg: "bg-amber-50 dark:bg-amber-950/30",     text: "text-amber-700 dark:text-amber-400" },
  terminated: { label: "Terminated", dot: "bg-red-500",     bg: "bg-red-50 dark:bg-red-950/30",         text: "text-red-700 dark:text-red-400" },
};

export function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function getAvatarColor(name: string) {
  const colors = [
    "bg-violet-100 text-violet-700",
    "bg-sky-100 text-sky-700",
    "bg-rose-100 text-rose-700",
    "bg-amber-100 text-amber-700",
    "bg-emerald-100 text-emerald-700",
    "bg-indigo-100 text-indigo-700",
    "bg-teal-100 text-teal-700",
    "bg-pink-100 text-pink-700",
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

