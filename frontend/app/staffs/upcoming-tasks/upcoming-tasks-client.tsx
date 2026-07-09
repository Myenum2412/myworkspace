"use client";

import { useState, useMemo, useEffect } from "react";
import {
  CalendarIcon,
  PlusIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ClockIcon,
  CheckCircle2Icon,
  AlertCircleIcon,
  XCircleIcon,
  ListTodoIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TaskAllocationModal } from "@/components/task-allocation/task-allocation-modal";
import { TaskDetailedView } from "@/components/task-detailed-view";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";

export type CalendarTask = {
  _id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  dueDate: string | null;
  assigneeId: string;
  assigneeName: string;
  assigneeAvatar: string;
  creatorId: string;
  creatorName: string;
  createdAt: string;
};

type ExternalEvent = {
  id: string;
  title: string;
  start: string;
  end: string;
  allDay: boolean;
  provider: "google" | "microsoft";
  calendarEmail: string;
};

const PRIORITY_COLORS: Record<string, string> = {
  urgent: "bg-red-500",
  high: "bg-orange-500",
  medium: "bg-blue-500",
  low: "bg-gray-400",
};

const STATUS_COLORS: Record<string, string> = {
  todo: "bg-gray-100 text-gray-700",
  in_progress: "bg-blue-100 text-blue-700",
  review: "bg-purple-100 text-purple-700",
  done: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-700",
};

const PROVIDER_COLORS: Record<string, string> = {
  google: "bg-emerald-500",
  microsoft: "bg-violet-500",
};

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

function isSameDay(d1: Date, d2: Date) {
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
}

function isToday(date: Date) {
  return isSameDay(date, new Date());
}

export default function UpcomingTasksClient({ initialTasks }: { initialTasks: CalendarTask[] }) {
  const [tasks] = useState<CalendarTask[]>(initialTasks);
  const [externalEvents, setExternalEvents] = useState<ExternalEvent[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState<CalendarTask | null>(null);
  const [taskDetailOpen, setTaskDetailOpen] = useState(false);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);

  // Fetch external calendar events
  useEffect(() => {
    const fetchEvents = async () => {
      const timeMin = new Date(year, month, 1).toISOString();
      const timeMax = new Date(year, month + 1, 0, 23, 59, 59).toISOString();
      try {
        const res = await fetch(`/api/calendar/events?timeMin=${timeMin}&timeMax=${timeMax}`);
        const data = await res.json();
        setExternalEvents(data.data || []);
      } catch {
        // Silently fail - calendar events are optional
      }
    };
    fetchEvents();
  }, [year, month]);

  const tasksByDate = useMemo(() => {
    const map = new Map<string, CalendarTask[]>();
    for (const task of tasks) {
      if (!task.dueDate) continue;
      const key = new Date(task.dueDate).toDateString();
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(task);
    }
    return map;
  }, [tasks]);

  const eventsByDate = useMemo(() => {
    const map = new Map<string, ExternalEvent[]>();
    for (const event of externalEvents) {
      if (!event.start) continue;
      const key = new Date(event.start).toDateString();
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(event);
    }
    return map;
  }, [externalEvents]);

  const selectedDateTasks = useMemo(() => {
    if (!selectedDate) return [];
    const key = selectedDate.toDateString();
    return tasksByDate.get(key) || [];
  }, [selectedDate, tasksByDate]);

  const selectedDateEvents = useMemo(() => {
    if (!selectedDate) return [];
    const key = selectedDate.toDateString();
    return eventsByDate.get(key) || [];
  }, [selectedDate, eventsByDate]);

  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
    setSelectedDate(null);
  };

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
    setSelectedDate(null);
  };

  const goToToday = () => {
    setCurrentDate(new Date());
    setSelectedDate(new Date());
  };

  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((t) => t.status === "done").length;
  const pendingTasks = tasks.filter((t) => t.status !== "done" && t.status !== "cancelled").length;
  const overdueTasks = tasks.filter((t) => {
    if (!t.dueDate || t.status === "done" || t.status === "cancelled") return false;
    return new Date(t.dueDate) < new Date();
  }).length;

  return (
    <div className="flex flex-1 flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-background">
        <div className="flex items-center gap-3">
          <CalendarIcon className="size-5 text-primary" />
          <h1 className="text-xl font-bold">Upcoming Tasks</h1>
          <Badge variant="secondary">{totalTasks} tasks</Badge>
          {externalEvents.length > 0 && (
            <Badge variant="outline" className="text-emerald-600 border-emerald-200">
              {externalEvents.length} calendar events
            </Badge>
          )}
        </div>
        <Button onClick={() => setShowTaskModal(true)}>
          <PlusIcon className="mr-2 size-4" />
          Allocate Task
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 px-4 py-3 border-b">
        <div className="flex items-center gap-2 text-sm">
          <ListTodoIcon className="size-4 text-muted-foreground" />
          <span className="text-muted-foreground">Total:</span>
          <span className="font-semibold">{totalTasks}</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <ClockIcon className="size-4 text-blue-500" />
          <span className="text-muted-foreground">Pending:</span>
          <span className="font-semibold text-blue-600">{pendingTasks}</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <CheckCircle2Icon className="size-4 text-green-500" />
          <span className="text-muted-foreground">Done:</span>
          <span className="font-semibold text-green-600">{completedTasks}</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <AlertCircleIcon className="size-4 text-red-500" />
          <span className="text-muted-foreground">Overdue:</span>
          <span className="font-semibold text-red-600">{overdueTasks}</span>
        </div>
      </div>

      {/* Calendar + Sidebar */}
      <div className="flex flex-1 min-h-0">
        {/* Calendar Grid */}
        <div className="flex-1 flex flex-col p-4">
          {/* Month Navigation */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" className="size-8" onClick={prevMonth}>
                <ChevronLeftIcon className="size-4" />
              </Button>
              <h2 className="text-lg font-semibold min-w-[180px] text-center">
                {MONTHS[month]} {year}
              </h2>
              <Button variant="outline" size="icon" className="size-8" onClick={nextMonth}>
                <ChevronRightIcon className="size-4" />
              </Button>
            </div>
            <Button variant="outline" size="sm" onClick={goToToday}>
              Today
            </Button>
          </div>

          {/* Legend */}
          <div className="flex items-center gap-4 mb-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-blue-500" /> Tasks
            </span>
            <span className="flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-emerald-500" /> Google
            </span>
            <span className="flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-violet-500" /> Outlook
            </span>
          </div>

          {/* Weekday Headers */}
          <div className="grid grid-cols-7 gap-1 mb-1">
            {WEEKDAYS.map((day) => (
              <div key={day} className="text-center text-xs font-medium text-muted-foreground py-2">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Days */}
          <div className="grid grid-cols-7 gap-1 flex-1">
            {/* Empty cells before first day */}
            {Array.from({ length: firstDay }).map((_, i) => (
              <div key={`empty-${i}`} className="min-h-[80px] rounded-lg bg-muted/30" />
            ))}

            {/* Day cells */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const date = new Date(year, month, day);
              const dateKey = date.toDateString();
              const dayTasks = tasksByDate.get(dateKey) || [];
              const dayEvents = eventsByDate.get(dateKey) || [];
              const isSelected = selectedDate ? isSameDay(date, selectedDate) : false;
              const today = isToday(date);
              const totalItems = dayTasks.length + dayEvents.length;

              return (
                <button
                  key={day}
                  onClick={() => setSelectedDate(date)}
                  className={`min-h-[80px] rounded-lg border p-1.5 text-left transition-all hover:border-primary/50 ${
                    isSelected
                      ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                      : today
                      ? "border-primary/30 bg-primary/5"
                      : "border-border hover:bg-accent/50"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span
                      className={`text-xs font-medium ${
                        today
                          ? "bg-primary text-primary-foreground rounded-full size-5 flex items-center justify-center"
                          : "text-muted-foreground"
                      }`}
                    >
                      {day}
                    </span>
                    {totalItems > 0 && (
                      <span className="text-[10px] text-muted-foreground">
                        {totalItems}
                      </span>
                    )}
                  </div>
                  <div className="space-y-0.5">
                    {/* Task items (blue/priority colored) */}
                    {dayTasks.slice(0, 2).map((task) => (
                      <div
                        key={task._id}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedTask(task);
                          setTaskDetailOpen(true);
                        }}
                        className={`text-[10px] leading-tight px-1 py-0.5 rounded truncate cursor-pointer hover:opacity-80 ${
                          PRIORITY_COLORS[task.priority] || "bg-gray-400"
                        } text-white`}
                        title={task.title}
                      >
                        {task.title}
                      </div>
                    ))}
                    {/* External events (green for Google, purple for Outlook) */}
                    {dayEvents.slice(0, 2).map((event) => (
                      <div
                        key={event.id}
                        className={`text-[10px] leading-tight px-1 py-0.5 rounded truncate ${
                          PROVIDER_COLORS[event.provider] || "bg-gray-400"
                        } text-white`}
                        title={`${event.title} (${event.provider})`}
                      >
                        {event.title}
                      </div>
                    ))}
                    {totalItems > 4 && (
                      <div className="text-[10px] text-muted-foreground px-1">
                        +{totalItems - 4} more
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected Date Sidebar */}
        {selectedDate && (
          <div className="w-80 border-l bg-background flex flex-col">
            <div className="px-4 py-3 border-b">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">
                  {selectedDate.toLocaleDateString("en-US", {
                    weekday: "long",
                    month: "long",
                    day: "numeric",
                  })}
                </h3>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-6"
                  onClick={() => setSelectedDate(null)}
                >
                  <XCircleIcon className="size-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                {selectedDateTasks.length} task{selectedDateTasks.length !== 1 ? "s" : ""}
                {selectedDateEvents.length > 0 && `, ${selectedDateEvents.length} event${selectedDateEvents.length !== 1 ? "s" : ""}`}
              </p>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {/* Tasks */}
              {selectedDateTasks.map((task) => (
                <div
                  key={task._id}
                  onClick={() => {
                    setSelectedTask(task);
                    setTaskDetailOpen(true);
                  }}
                  className="rounded-lg border p-3 hover:bg-accent/50 cursor-pointer transition-colors"
                >
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <h4 className="text-sm font-medium line-clamp-1">{task.title}</h4>
                    <div className={`size-2 rounded-full shrink-0 mt-1.5 ${PRIORITY_COLORS[task.priority] || "bg-gray-400"}`} />
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-1 mb-2">
                    {task.description || "No description"}
                  </p>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${STATUS_COLORS[task.status] || ""}`}>
                      {task.status.replace(/_/g, " ")}
                    </span>
                    {task.assigneeName && (
                      <span className="text-[10px] text-muted-foreground">
                        {task.assigneeName}
                      </span>
                    )}
                  </div>
                </div>
              ))}

              {/* External Events */}
              {selectedDateEvents.map((event) => (
                <div
                  key={event.id}
                  className="rounded-lg border p-3 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <h4 className="text-sm font-medium line-clamp-1">{event.title}</h4>
                    <div className={`size-2 rounded-full shrink-0 mt-1.5 ${PROVIDER_COLORS[event.provider] || "bg-gray-400"}`} />
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                      event.provider === "google" ? "bg-emerald-100 text-emerald-700" : "bg-violet-100 text-violet-700"
                    }`}>
                      {event.provider === "google" ? "Google" : "Outlook"}
                    </span>
                    {event.start && (
                      <span className="text-[10px] text-muted-foreground">
                        {new Date(event.start).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    )}
                  </div>
                </div>
              ))}

              {/* Empty state */}
              {selectedDateTasks.length === 0 && selectedDateEvents.length === 0 && (
                <div className="text-center py-8">
                  <CalendarIcon className="size-8 mx-auto text-muted-foreground/30 mb-2" />
                  <p className="text-sm text-muted-foreground">No items for this date</p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-3"
                    onClick={() => setShowTaskModal(true)}
                  >
                    <PlusIcon className="mr-1 size-3" />
                    Allocate Task
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Task Allocation Modal */}
      <TaskAllocationModal
        open={showTaskModal}
        onClose={() => setShowTaskModal(false)}
      />

      {/* Task Detail Dialog */}
      <Dialog open={taskDetailOpen} onOpenChange={(open) => { if (!open) { setTaskDetailOpen(false); setSelectedTask(null); } }}>
        <DialogContent className="p-0 flex flex-col sm:max-w-4xl" showCloseButton={false}>
          {selectedTask && (
            <TaskDetailedView
              task={selectedTask}
              editable
              onTaskUpdate={() => {}}
              onClose={() => { setTaskDetailOpen(false); setSelectedTask(null); }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
