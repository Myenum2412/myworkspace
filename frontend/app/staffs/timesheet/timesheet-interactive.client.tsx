"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PlusIcon, Trash2Icon, SaveIcon, ClockIcon, ChevronDownIcon } from "lucide-react";
import { toast } from "sonner";

type Task = {
  _id: string;
  title: string;
  projectId?: string;
};

type Project = {
  id: string;
  name: string;
  color: string;
};

type DayTimeEntry = {
  startTime: string;
  endTime: string;
};

type TimesheetRow = {
  id: string;
  projectId: string;
  taskId: string;
  remarks: string;
  monday: DayTimeEntry;
  tuesday: DayTimeEntry;
  wednesday: DayTimeEntry;
  thursday: DayTimeEntry;
  friday: DayTimeEntry;
  saturday: DayTimeEntry;
  sunday: DayTimeEntry;
};

type TimesheetInteractiveProps = {
  projects: Project[];
  tasks: Task[];
  orgId: string;
  userId: string;
  initialTimesheet?: TimesheetRow[];
};

const DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"] as const;
const DAY_LABELS: Record<string, string> = {
  monday: "Mon",
  tuesday: "Tue",
  wednesday: "Wed",
  thursday: "Thu",
  friday: "Fri",
  saturday: "Sat",
  sunday: "Sun",
};

const hours = Array.from({ length: 12 }, (_, i) => String(i + 1));
const minutes = Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, "0"));

function createEmptyDay(): DayTimeEntry {
  return { startTime: "", endTime: "" };
}

function createEmptyRow(): TimesheetRow {
  return {
    id: `row_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
    projectId: "",
    taskId: "",
    remarks: "",
    monday: createEmptyDay(),
    tuesday: createEmptyDay(),
    wednesday: createEmptyDay(),
    thursday: createEmptyDay(),
    friday: createEmptyDay(),
    saturday: createEmptyDay(),
    sunday: createEmptyDay(),
  };
}

function to24h(hour: number, period: "AM" | "PM"): number {
  if (period === "AM") return hour === 12 ? 0 : hour;
  return hour === 12 ? 12 : hour + 12;
}

function parseTime12h(time: string): { hour: string; minute: string; period: "AM" | "PM" } {
  if (!time) return { hour: "9", minute: "00", period: "AM" };
  const [h, m] = time.split(":").map(Number);
  if (isNaN(h) || isNaN(m)) return { hour: "9", minute: "00", period: "AM" };
  const period = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 || 12;
  return { hour: String(hour12), minute: String(m).padStart(2, "0"), period };
}

function to24hTime(hour: string, minute: string, period: "AM" | "PM"): string {
  const h = to24h(Number(hour), period);
  return `${String(h).padStart(2, "0")}:${minute}`;
}

function calcDuration(startTime: string, endTime: string): number {
  if (!startTime || !endTime) return 0;
  const [sh, sm] = startTime.split(":").map(Number);
  const [eh, em] = endTime.split(":").map(Number);
  if (isNaN(sh) || isNaN(sm) || isNaN(eh) || isNaN(em)) return 0;
  return Math.max(0, (eh * 60 + em) - (sh * 60 + sm));
}

function formatDuration(minutes: number): string {
  if (minutes === 0) return "";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

function TimeInputPopover({
  value,
  onChange,
  placeholder,
}: {
  value: DayTimeEntry;
  onChange: (val: DayTimeEntry) => void;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const startParsed = parseTime12h(value.startTime);
  const endParsed = parseTime12h(value.endTime);
  const duration = calcDuration(value.startTime, value.endTime);
  const displayValue = duration > 0 ? formatDuration(duration) : "";

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <Input
        value={displayValue}
        placeholder={placeholder || "0h"}
        readOnly
        onClick={() => setOpen(!open)}
        className="h-9 w-20 text-center cursor-pointer text-xs"
      />
      {open && (
        <div className="absolute top-full left-0 mt-1 bg-white border rounded-lg shadow-lg p-3 z-50 w-64">
          <div className="space-y-3">
            <div>
              <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1 block">Start Time</label>
              <div className="flex items-center gap-1">
                <select
                  value={startParsed.hour}
                  onChange={(e) => {
                    onChange({
                      startTime: to24hTime(e.target.value, startParsed.minute, startParsed.period),
                      endTime: value.endTime,
                    });
                  }}
                  className="border rounded px-2 py-1.5 text-xs w-14"
                >
                  {hours.map((h) => <option key={h} value={h}>{h}</option>)}
                </select>
                <span className="text-muted-foreground">:</span>
                <select
                  value={startParsed.minute}
                  onChange={(e) => {
                    onChange({
                      startTime: to24hTime(startParsed.hour, e.target.value, startParsed.period),
                      endTime: value.endTime,
                    });
                  }}
                  className="border rounded px-2 py-1.5 text-xs w-14"
                >
                  {minutes.map((m) => <option key={m} value={m}>{m}</option>)}
                </select>
                <button
                  type="button"
                  onClick={() => {
                    const newPeriod = startParsed.period === "AM" ? "PM" : "AM";
                    onChange({
                      startTime: to24hTime(startParsed.hour, startParsed.minute, newPeriod),
                      endTime: value.endTime,
                    });
                  }}
                  className="border rounded px-2 py-1.5 text-xs font-semibold w-12 bg-muted hover:bg-muted/80"
                >
                  {startParsed.period}
                </button>
              </div>
            </div>
            <div>
              <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1 block">End Time</label>
              <div className="flex items-center gap-1">
                <select
                  value={endParsed.hour}
                  onChange={(e) => {
                    onChange({
                      startTime: value.startTime,
                      endTime: to24hTime(e.target.value, endParsed.minute, endParsed.period),
                    });
                  }}
                  className="border rounded px-2 py-1.5 text-xs w-14"
                >
                  {hours.map((h) => <option key={h} value={h}>{h}</option>)}
                </select>
                <span className="text-muted-foreground">:</span>
                <select
                  value={endParsed.minute}
                  onChange={(e) => {
                    onChange({
                      startTime: value.startTime,
                      endTime: to24hTime(endParsed.hour, e.target.value, endParsed.period),
                    });
                  }}
                  className="border rounded px-2 py-1.5 text-xs w-14"
                >
                  {minutes.map((m) => <option key={m} value={m}>{m}</option>)}
                </select>
                <button
                  type="button"
                  onClick={() => {
                    const newPeriod = endParsed.period === "AM" ? "PM" : "AM";
                    onChange({
                      startTime: value.startTime,
                      endTime: to24hTime(endParsed.hour, endParsed.minute, newPeriod),
                    });
                  }}
                  className="border rounded px-2 py-1.5 text-xs font-semibold w-12 bg-muted hover:bg-muted/80"
                >
                  {endParsed.period}
                </button>
              </div>
            </div>
            {duration > 0 && (
              <div className="text-center text-xs font-semibold text-primary pt-1 border-t">
                Total: {formatDuration(duration)}
              </div>
            )}
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={() => {
                  onChange({ startTime: "", endTime: "" });
                  setOpen(false);
                }}
              >
                Clear
              </Button>
              <Button
                type="button"
                size="sm"
                className="flex-1"
                onClick={() => setOpen(false)}
              >
                Done
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function TimesheetInteractive({
  projects,
  tasks,
  orgId,
  userId,
  initialTimesheet = [],
}: TimesheetInteractiveProps) {
  const [rows, setRows] = useState<TimesheetRow[]>(initialTimesheet);
  const [saving, setSaving] = useState(false);

  const tasksByProject = useMemo(() => {
    const map: Record<string, Task[]> = {};
    for (const task of tasks) {
      if (task.projectId) {
        if (!map[task.projectId]) map[task.projectId] = [];
        map[task.projectId].push(task);
      }
    }
    return map;
  }, [tasks]);

  const totalMinutes = useMemo(() => {
    let total = 0;
    for (const row of rows) {
      for (const day of DAYS) {
        const entry = row[day];
        total += calcDuration(entry.startTime, entry.endTime);
      }
    }
    return total;
  }, [rows]);

  const updateRow = (id: string, field: keyof TimesheetRow, value: string) => {
    setRows((prev) =>
      prev.map((row) => {
        if (row.id !== id) return row;
        const updated = { ...row, [field]: value };
        if (field === "projectId") {
          updated.taskId = "";
        }
        return updated;
      })
    );
  };

  const updateDayTime = (id: string, day: typeof DAYS[number], value: DayTimeEntry) => {
    setRows((prev) =>
      prev.map((row) => {
        if (row.id !== id) return row;
        return { ...row, [day]: value };
      })
    );
  };

  const addRow = () => {
    setRows((prev) => [...prev, createEmptyRow()]);
  };

  const removeRow = (id: string) => {
    if (rows.length <= 1) return;
    setRows((prev) => prev.filter((row) => row.id !== id));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/timesheet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          orgId,
          userId,
          rows: rows.filter((r) => r.projectId || r.taskId || r.remarks || DAYS.some((d) => r[d].startTime || r[d].endTime)),
        }),
      });
      if (res.ok) {
        toast.success("Timesheet saved successfully");
      } else {
        toast.error("Failed to save timesheet");
      }
    } catch {
      toast.error("Failed to save timesheet");
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="flex flex-1 flex-col gap-4 p-4 min-h-0">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-2">
          <ClockIcon className="size-6" />
          <h1 className="text-2xl font-bold">Weekly Timesheet</h1>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="font-medium">Total: {formatDuration(totalMinutes)}</span>
          </div>
          <Button onClick={handleSave} disabled={saving} size="sm">
            <SaveIcon className="mr-2 size-4" />
            {saving ? "Saving..." : "Save"}
          </Button>
        </div>
      </div>

      <Card className="flex-1 min-h-0 flex flex-col">
        <CardHeader className="pb-3 shrink-0">
          <CardTitle className="text-sm flex items-center gap-2">
            <ClockIcon className="size-4" />
            Timesheet Entries
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0 overflow-auto flex-1">
          <table className="table-premium w-full text-sm text-left">
            <thead>
              <tr>
                <th className="px-4 py-3.5 font-semibold whitespace-nowrap text-left w-12">#</th>
                <th className="px-4 py-3.5 font-semibold whitespace-nowrap text-left min-w-[150px]">Project</th>
                <th className="px-4 py-3.5 font-semibold whitespace-nowrap text-left min-w-[150px]">Task</th>
                <th className="px-4 py-3.5 font-semibold whitespace-nowrap text-left min-w-[120px]">Remarks</th>
                {DAYS.map((day) => (
                  <th key={day} className="px-4 py-3.5 font-semibold whitespace-nowrap text-center w-24">
                    {DAY_LABELS[day]}
                  </th>
                ))}
                <th className="px-4 py-3.5 font-semibold whitespace-nowrap text-center w-20">Total</th>
                <th className="px-4 py-3.5 w-10" />
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => {
                const availableTasks = row.projectId ? tasksByProject[row.projectId] || [] : tasks;
                const rowTotal = DAYS.reduce((sum, day) => {
                  return sum + calcDuration(row[day].startTime, row[day].endTime);
                }, 0);

                return (
                  <tr key={row.id} className="border-b last:border-0 hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 text-muted-foreground">{index + 1}</td>
                    <td className="px-4 py-3">
                      <Select
                        value={row.projectId}
                        onValueChange={(value) => updateRow(row.id, "projectId", value)}
                      >
                        <SelectTrigger className="h-9">
                          <SelectValue placeholder="Select project" />
                        </SelectTrigger>
                        <SelectContent>
                          {projects.map((project) => (
                            <SelectItem key={project.id} value={project.id}>
                              <div className="flex items-center gap-2">
                                <span
                                  className="size-2 rounded-full"
                                  style={{ backgroundColor: project.color }}
                                />
                                {project.name}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="px-4 py-3">
                      <Select
                        value={row.taskId}
                        onValueChange={(value) => updateRow(row.id, "taskId", value)}
                      >
                        <SelectTrigger className="h-9">
                          <SelectValue placeholder="Select task" />
                        </SelectTrigger>
                        <SelectContent>
                          {availableTasks.map((task) => (
                            <SelectItem key={task._id} value={task._id}>
                              {task.title}
                            </SelectItem>
                          ))}
                          {availableTasks.length === 0 && (
                            <SelectItem value="none" disabled>
                              No tasks available
                            </SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="px-4 py-3">
                      <Input
                        value={row.remarks}
                        onChange={(e) => updateRow(row.id, "remarks", e.target.value)}
                        placeholder="Remarks"
                        className="h-9"
                      />
                    </td>
                    {DAYS.map((day) => (
                      <td key={day} className="px-4 py-3">
                        <TimeInputPopover
                          value={row[day]}
                          onChange={(val) => updateDayTime(row.id, day, val)}
                          placeholder="0h"
                        />
                      </td>
                    ))}
                    <td className="px-4 py-3 text-center font-medium text-sm">
                      {rowTotal > 0 ? formatDuration(rowTotal) : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => removeRow(row.id)}
                        disabled={rows.length <= 1}
                      >
                        <Trash2Icon className="size-4 text-muted-foreground" />
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CardContent>
        <div className="border-t p-3 shrink-0">
          <Button variant="outline" size="sm" onClick={addRow}>
            <PlusIcon className="mr-2 size-4" />
            Add Row
          </Button>
        </div>
      </Card>
    </main>
  );
}
