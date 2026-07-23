"use client";

import { useState, useMemo } from "react";
import { TaskDataTable, type TaskRow } from "@/components/task-data-table";
import { TaskDetailedView } from "@/components/task-detailed-view";

type Task = {
  _id: string;
  title: string;
  description?: string;
  status: string;
  priority: string;
  dueDate: string | null;
  assigneeId: string;
  assigneeName: string;
  assigneeAvatar?: string;
  creatorId?: string;
  creatorName?: string;
  createdAt: string;
};

export function StaffTasksView({
  tasks,
  sessionUserId,
}: {
  tasks: Task[];
  sessionUserId?: string;
}) {
  const [viewOpen, setViewOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [localTasks, setLocalTasks] = useState<Task[]>(tasks);

  const taskRows: TaskRow[] = useMemo(
    () =>
      localTasks.map((t) => ({
        _id: t._id,
        id: t._id,
        title: t.title,
        status: t.status,
        priority: t.priority,
        dueDate: t.dueDate,
        assigneeName: t.assigneeName,
        assigneeAvatar: t.assigneeAvatar,
        assigneeId: t.assigneeId,
        creatorName: t.creatorName,
        createdAt: t.createdAt,
      })),
    [localTasks]
  );

  return (
    <>
      <TaskDataTable
        data={taskRows}
        onView={(t) => {
          const task = localTasks.find((x) => x._id === t._id);
          if (task) {
            setSelectedTask(task);
            setViewOpen(true);
          }
        }}
        searchPlaceholder="Search tasks..."
        emptyMessage="No tasks found."
        label="task"
        hideSearchBar
      />

      {viewOpen && selectedTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="relative w-[95vw] h-[95vh] bg-card rounded-sm shadow-xl overflow-hidden flex flex-col">
            <TaskDetailedView
              task={selectedTask}
              sessionUserId={sessionUserId}
              editable
              onTaskUpdate={(updated) => {
                setLocalTasks((prev) =>
                  prev.map((t) =>
                    t._id === (updated as Task)._id ? (updated as Task) : t
                  )
                );
              }}
              onClose={() => {
                setViewOpen(false);
                setSelectedTask(null);
              }}
            />
          </div>
        </div>
      )}
    </>
  );
}
