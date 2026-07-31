"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronRight } from "lucide-react";

const statusStyles: Record<string, string> = {
  Completed: "bg-green-100 text-green-700",
  InCompleted: "bg-yellow-100 text-yellow-700",
};

const MOCK_REVISIONS = [
  { id: 1, description: "Update dashboard UI colors", status: "InCompleted" },
  { id: 2, description: "Fix login redirect issue", status: "Completed" },
  { id: 3, description: "Add pagination to reports", status: "InCompleted" },
  { id: 4, description: "Refactor API error handling", status: "Completed" },
  { id: 5, description: "Optimize database queries", status: "InCompleted" },
  { id: 6, description: "Update user profile page", status: "Completed" },
  { id: 7, description: "Fix mobile responsive layout", status: "InCompleted" },
  { id: 8, description: "Add export to CSV feature", status: "Completed" },
  { id: 9, description: "Implement dark mode toggle", status: "InCompleted" },
  { id: 10, description: "Migrate to new auth system", status: "InCompleted" },
];

const MAX_ROWS = 8;

export function StaffRecentRevisions() {
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [revisions] = useState(MOCK_REVISIONS);

  const visible = useMemo(() => revisions.slice(0, MAX_ROWS), [revisions]);

  const toggle = (id: number) => {
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
                    if (checked) setSelected(new Set(visible.map((r) => r.id)));
                    else setSelected(new Set());
                  }}
                />
              </th>
              <th className="px-3 py-3 font-semibold">Description</th>
              <th className="px-3 py-3 font-semibold">Status</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((r) => (
              <tr
                key={r.id}
                className={`border-b last:border-0 transition-colors hover:bg-slate-50 ${selected.has(r.id) ? "bg-blue-50/50" : ""}`}
              >
                <td className="w-10 px-3 py-2.5">
                  <Checkbox
                    checked={selected.has(r.id)}
                    onCheckedChange={() => toggle(r.id)}
                  />
                </td>
                <td className="px-3 py-2.5 text-sm font-medium">{r.description}</td>
                <td className="px-3 py-2.5">
                  <Badge className={(statusStyles[r.status] || "") + ""}>
                    {r.status}
                  </Badge>
                </td>
              </tr>
            ))}
            {visible.length === 0 && (
              <tr>
                <td colSpan={3} className="px-3 py-8 text-center text-sm text-muted-foreground">
                  No revisions yet
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {revisions.length > MAX_ROWS && (
        <div className="border-t px-3 py-2.5">
          <Link href="/staffs/reworks">
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
