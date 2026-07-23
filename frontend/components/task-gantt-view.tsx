"use client";

import {
  GanttFeatureItem,
  GanttFeatureList,
  GanttFeatureListGroup,
  GanttHeader,
  GanttMarker,
  GanttProvider,
  GanttSidebar,
  GanttSidebarGroup,
  GanttSidebarItem,
  GanttTimeline,
  GanttToday,
} from "@/components/kibo-ui/gantt";
import type { GanttFeature, GanttStatus } from "@/components/kibo-ui/gantt";
import groupBy from "lodash.groupby";
import { EyeIcon, TrashIcon } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { TaskRow } from "./task-data-table";

const statusStyles: Record<string, { name: string; color: string }> = {
  todo: { name: "Todo", color: "#9CA3AF" },
  assigned: { name: "Assigned", color: "#3B82F6" },
  pending: { name: "Pending", color: "#EAB308" },
  in_progress: { name: "In Progress", color: "#F59E0B" },
  review: { name: "Review", color: "#A855F7" },
  submitted: { name: "Submitted", color: "#8B5CF6" },
  approved: { name: "Approved", color: "#10B981" },
  rejected: { name: "Rejected", color: "#EF4444" },
  completed: { name: "Completed", color: "#22C55E" },
  done: { name: "Done", color: "#10B981" },
  hold: { name: "Hold", color: "#F97316" },
  cancelled: { name: "Cancelled", color: "#6B7280" },
  reopened: { name: "Reopened", color: "#A855F7" },
  published: { name: "Published", color: "#14B8A6" },
  accepted: { name: "Accepted", color: "#22C55E" },
  scheduled: { name: "Scheduled", color: "#3B82F6" },
  activated: { name: "Activated", color: "#10B981" },
};

const defaultStatus: GanttStatus = { id: "default", name: "Unknown", color: "#6B7280" };

function getStatus(task: TaskRow): GanttStatus {
  const key = task.status?.toLowerCase() || "default";
  const found = statusStyles[key];
  if (found) return { id: key, name: found.name, color: found.color };
  return { ...defaultStatus, id: key, name: task.status || "Unknown" };
}

function toGanttFeature(task: TaskRow): GanttFeature {
  const startAt = task.createdAt ? new Date(task.createdAt) : new Date();
  const endAt = task.dueDate
    ? new Date(task.dueDate)
    : new Date(startAt.getTime() + 7 * 24 * 60 * 60 * 1000);
  return {
    id: task._id,
    name: task.title,
    startAt,
    endAt,
    status: getStatus(task),
  };
}

interface TaskGanttViewProps {
  tasks: TaskRow[];
  onViewTask?: (task: TaskRow) => void;
}

const TaskGanttView = ({ tasks, onViewTask }: TaskGanttViewProps) => {
  const features = useMemo(() => tasks.map(toGanttFeature), [tasks]);
  const [localFeatures, setLocalFeatures] = useState(features);

  useEffect(() => {
    setLocalFeatures(features);
  }, [features]);

  const groupedFeatures = groupBy(localFeatures, "status.name");
  const sortedGroupedFeatures = Object.fromEntries(
    Object.entries(groupedFeatures).sort(([nameA], [nameB]) =>
      nameA.localeCompare(nameB)
    )
  );

  const handleViewFeature = (id: string) => {
    const task = tasks.find((t) => t._id === id);
    if (task && onViewTask) onViewTask(task);
  };

  const handleRemoveFeature = (id: string) =>
    setLocalFeatures((prev) => prev.filter((feature) => feature.id !== id));

  const handleMoveFeature = (id: string, startAt: Date, endAt: Date | null) => {
    if (!endAt) return;
    setLocalFeatures((prev) =>
      prev.map((feature) =>
        feature.id === id ? { ...feature, startAt, endAt } : feature
      )
    );
  };

  return (
    <GanttProvider className="border" range="monthly" zoom={100}>
      <GanttSidebar>
        {Object.entries(sortedGroupedFeatures).map(([group, features]) => (
          <GanttSidebarGroup key={group} name={group}>
            {features.map((feature) => (
              <GanttSidebarItem
                feature={feature}
                key={feature.id}
                onSelectItem={handleViewFeature}
              />
            ))}
          </GanttSidebarGroup>
        ))}
      </GanttSidebar>
      <GanttTimeline>
        <GanttHeader />
        <GanttFeatureList>
          {Object.entries(sortedGroupedFeatures).map(([group, features]) => (
            <GanttFeatureListGroup key={group}>
              {features.map((feature) => (
                <div className="flex" key={feature.id}>
                  <ContextMenu>
                    <ContextMenuTrigger asChild>
                      <button
                        onClick={() => handleViewFeature(feature.id)}
                        type="button"
                      >
                        <GanttFeatureItem
                          onMove={handleMoveFeature}
                          {...feature}
                        >
                          <p className="flex-1 truncate text-xs">
                            {feature.name}
                          </p>
                        </GanttFeatureItem>
                      </button>
                    </ContextMenuTrigger>
                    <ContextMenuContent>
                      <ContextMenuItem
                        className="flex items-center gap-2"
                        onClick={() => handleViewFeature(feature.id)}
                      >
                        <EyeIcon className="text-muted-foreground" size={16} />
                        View task
                      </ContextMenuItem>
                      <ContextMenuItem
                        className="flex items-center gap-2 text-destructive"
                        onClick={() => handleRemoveFeature(feature.id)}
                      >
                        <TrashIcon size={16} />
                        Remove
                      </ContextMenuItem>
                    </ContextMenuContent>
                  </ContextMenu>
                </div>
              ))}
            </GanttFeatureListGroup>
          ))}
        </GanttFeatureList>
        <GanttToday />
      </GanttTimeline>
    </GanttProvider>
  );
};

export default TaskGanttView;
