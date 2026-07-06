"use client"
import { useMemo, useState } from "react";
import {
  DndContext,
  DragOverlay,
  closestCorners,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GripVertical } from "lucide-react";

type Task = {
  _id: string;
  title: string;
  description?: string;
  status: string;
  priority: string;
  dueDate?: string | null;
  assigneeId?: string;
  assigneeName?: string;
  assigneeAvatar?: string;
};

const priorityStyles: Record<string, string> = {
  low: "bg-gray-100 text-gray-600",
  medium: "bg-gray-200 text-gray-800",
  high: "bg-orange-100 text-orange-700",
  urgent: "bg-red-100 text-red-700",
};

const statusGroups = ["todo", "assigned", "in_progress", "review", "done", "cancelled"];

type KanbanBoardProps = {
  tasks: Task[];
  onStatusChange: (taskId: string, newStatus: string) => void;
  onCardClick: (task: Task) => void;
};

function SortableCard({ task, onClick }: { task: Task; onClick: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task._id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="rounded-lg border bg-card p-3 space-y-2 shadow-sm cursor-pointer hover:ring-1 hover:ring-primary/40 transition-all"
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-1 min-w-0 flex-1">
          <button
            className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground shrink-0 -ml-1"
            {...attributes}
            {...listeners}
          >
            <GripVertical className="size-3.5" />
          </button>
          <p className="text-sm font-medium leading-tight truncate">{task.title}</p>
        </div>
        <Badge className={(priorityStyles[task.priority] || "") + " shrink-0 text-[10px] px-1.5"}>{task.priority}</Badge>
      </div>
      {task.description && (
        <p className="text-xs text-muted-foreground line-clamp-2">{task.description}</p>
      )}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <div className="size-5 rounded-full bg-muted flex items-center justify-center overflow-hidden">
            {task.assigneeAvatar ? (
              <img src={task.assigneeAvatar} alt={task.assigneeName} className="size-full object-cover" />
            ) : (
              <span className="text-[8px] font-medium text-muted-foreground">
                {(task.assigneeName || "U").split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
              </span>
            )}
          </div>
          <span className="text-[11px] text-muted-foreground">{task.assigneeName || "Unassigned"}</span>
        </div>
        {task.dueDate && (
          <span className="text-[10px] text-muted-foreground">{new Date(task.dueDate).toLocaleDateString()}</span>
        )}
      </div>
    </div>
  );
}

function Column({ status, tasks }: { status: string; tasks: Task[] }) {
  const ids = useMemo(() => tasks.map((t) => t._id), [tasks]);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold capitalize">{status.replace(/_/g, " ")}</h3>
        <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">{tasks.length}</span>
      </div>
      <div className="flex flex-col gap-2 min-h-[120px] rounded-lg bg-muted/30 p-2">
        {tasks.length === 0 ? (
          <p className="text-xs text-muted-foreground italic px-1">No tasks</p>
        ) : (
          <SortableContext items={ids} strategy={verticalListSortingStrategy}>
            {tasks.map((t) => (
              <SortableCard key={t._id} task={t} onClick={() => {}} />
            ))}
          </SortableContext>
        )}
      </div>
    </div>
  );
}

export function KanbanBoard({ tasks, onStatusChange, onCardClick }: KanbanBoardProps) {
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const activeTask = useMemo(
    () => (activeId ? tasks.find((t) => t._id === activeId) : null),
    [activeId, tasks]
  );

  function handleDragStart(event: DragStartEvent) {
    setActiveId(event.active.id as string);
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const taskId = active.id as string;
    const task = tasks.find((t) => t._id === taskId);
    if (!task) return;

    const overTask = tasks.find((t) => t._id === over.id);
    const targetStatus = overTask ? overTask.status : (over.id as string);

    if (targetStatus && targetStatus !== task.status) {
      onStatusChange(taskId, targetStatus);
    }
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="grid gap-4 md:grid-cols-6">
        {statusGroups.map((s) => {
          const items = tasks.filter((t) => t.status === s);
          return (
            <div
              key={s}
              id={s}
              className="flex flex-col gap-3"
              onDragOver={(e) => {
                const taskId = activeId;
                if (!taskId) return;
                const task = tasks.find((t) => t._id === taskId);
                if (task && task.status !== s) {
                  e.preventDefault();
                }
              }}
            >
              <Column status={s} tasks={items} />
            </div>
          );
        })}
      </div>

      <DragOverlay>
        {activeTask ? (
          <div className="rounded-lg border bg-card p-3 space-y-2 shadow-lg opacity-90">
            <p className="text-sm font-medium">{activeTask.title}</p>
            <Badge className={(priorityStyles[activeTask.priority] || "") + " text-[10px] px-1.5"}>{activeTask.priority}</Badge>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
