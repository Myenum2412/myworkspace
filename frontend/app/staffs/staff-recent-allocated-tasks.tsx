"use client";

import { useMemo } from "react";
import Link from "next/link";
import { TaskDataTable } from "@/components/task-data-table";
import { Button } from "@/components/ui/button";
import { ChevronRight } from "lucide-react";

const MAX_ROWS = 8;

export function StaffRecentAllocatedTasks({ tasks }: { tasks: any[] }) {
  const visible = useMemo(() => tasks.slice(0, MAX_ROWS), [tasks]);

  return (
    <div className="space-y-2">
      <TaskDataTable
        data={visible}
        label="task"
        hideSearchBar
        hidePageSizeSelector
        pageSize={MAX_ROWS}
        emptyMessage="No tasks allocated yet"
      />
      {tasks.length > MAX_ROWS && (
        <Link href="/staffs/tasks">
          <Button variant="ghost" size="sm" className="w-full gap-1 text-sm font-medium">
            View More
            <ChevronRight className="size-4" />
          </Button>
        </Link>
      )}
    </div>
  );
}
