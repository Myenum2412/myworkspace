"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronRight } from "lucide-react";

const statusStyles: Record<string, string> = {
  todo: "bg-gray-100 text-gray-700",
  assigned: "bg-blue-100 text-blue-700",
  pending: "bg-yellow-100 text-yellow-700",
  in_progress: "bg-blue-100 text-blue-700",
  review: "bg-purple-100 text-purple-700",
  submitted: "bg-purple-100 text-purple-700",
  approved: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
  completed: "bg-green-100 text-green-700",
  done: "bg-green-100 text-green-700",
  hold: "bg-orange-100 text-orange-700",
  cancelled: "bg-red-100 text-red-700",
};

const MAX_ROWS = 8;

export function StaffRecentAllocatedTasks({ tasks }: { tasks: any[] }) {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const visible = useMemo(() => tasks.slice(0, MAX_ROWS), [tasks]);

  const toggleTask = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="border border-gray-200 bg-white shadow-sm overflow-hidden rounded-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead>
            <tr className="border-b bg-muted/30">
              <th className="w-10 px-3 py-3">
                <Checkbox
                  checked={visible.length > 0 && selected.size === visible.length}
                  onCheckedChange={(checked) => {
                    if (checked) setSelected(new Set(visible.map((t) => t._id)));
                    else setSelected(new Set());
                  }}
                />
              </th>
              <th className="px-3 py-3 font-semibold">Task</th>
              <th className="px-3 py-3 font-semibold">Status</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((t) => (
              <tr
                key={t._id}
                className={`border-b last:border-0 transition-colors hover:bg-slate-50 ${selected.has(t._id) ? "bg-blue-50/50" : ""}`}
              >
                <td className="w-10 px-3 py-2.5">
                  <Checkbox
                    checked={selected.has(t._id)}
                    onCheckedChange={() => toggleTask(t._id)}
                  />
                </td>
                <td className="px-3 py-2.5 text-sm font-medium">{t.title}</td>
                <td className="px-3 py-2.5">
                  <Badge className={(statusStyles[t.status] || "bg-gray-100 text-gray-700") + ""}>
                    {t.status.replace(/_/g, " ")}
                  </Badge>
                </td>
              </tr>
            ))}
            {visible.length === 0 && (
              <tr>
                <td colSpan={3} className="px-3 py-8 text-center text-sm text-muted-foreground">
                  No tasks allocated yet
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {tasks.length > MAX_ROWS && (
        <div className="border-t px-3 py-2.5">
          <Link href="/staffs/tasks">
            <Button variant="ghost" size="sm" className="w-full gap-1 text-sm font-medium">
              View More
              <ChevronRight className="size-4" />
            </Button>
          </Link>
        </div>
      )}
    </div>
  );
}
