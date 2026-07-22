"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar as CalendarUI } from "@/components/ui/calendar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Clock, Calendar, Loader2, Trash2, EyeIcon, Plus, Save } from "lucide-react";
import { TimeEntryViewDialog } from "@/components/time-tracker/time-entry-view-dialog";

interface TimeEntry {
  id: string;
  userId: string;
  date: string;
  startTime?: string;
  endTime?: string;
  duration: number;
  description: string;
  billable: boolean;
  status: "pending" | "approved" | "rejected";
  createdAt: string;
}

interface Project {
  _id: string;
  name: string;
}

interface Task {
  _id: string;
  title: string;
  projectId?: string;
}

interface TimesheetRow {
  id: string;
  projectId: string;
  taskId: string;
  hours: Record<string, number>; // "mon" | "tue" | ... => hours
}

interface MyTimeProps {
  initialEntries: TimeEntry[];
  user: { name: string; email: string; avatar: string; id: string };
}

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

function getWeekDates(base: Date): { key: string; label: string; date: string }[] {
  const d = new Date(base);
  const day = d.getDay();
  const monday = new Date(d);
  monday.setDate(d.getDate() - ((day + 6) % 7));

  return DAYS.map((key, i) => {
    const dt = new Date(monday);
    dt.setDate(monday.getDate() + i);
    return {
      key,
      label: `${key} ${dt.getDate()}`,
      date: dt.toISOString().slice(0, 10),
    };
  });
}

export default function MyTime({ initialEntries, user }: MyTimeProps) {
  const [entries, setEntries] = useState<TimeEntry[]>(initialEntries);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [viewEntry, setViewEntry] = useState<TimeEntry | null>(null);

  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [timesheetRows, setTimesheetRows] = useState<TimesheetRow[]>([]);
  const [weekBase, setWeekBase] = useState(new Date());
  const [savingRow, setSavingRow] = useState<string | null>(null);

  const weekDates = getWeekDates(weekBase);

  const filteredEntries = date
    ? entries.filter((e) => e.date === date.toISOString().slice(0, 10))
    : entries;

  const totalMinutes = filteredEntries.reduce((s, e) => s + e.duration, 0);
  const totalHours = (totalMinutes / 60).toFixed(1);

  const statusColors: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-800 border-yellow-200",
    approved: "bg-green-900 text-green-700 border-gray-300",
    rejected: "bg-red-100 text-red-800 border-red-200",
  };

  useEffect(() => {
    Promise.all([
      fetch("/api/projects-list", { credentials: "include" }).then((r) => r.json()),
      fetch("/api/tasks?limit=100", { credentials: "include" }).then((r) => r.json()),
    ])
      .then(([projRes, taskRes]) => {
        setProjects(projRes.data || []);
        setTasks(taskRes.data || []);
      })
      .catch(() => {});
  }, []);

  const addTimesheetRow = () => {
    setTimesheetRows((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        projectId: "",
        taskId: "",
        hours: Object.fromEntries(DAYS.map((d) => [d, 0])),
      },
    ]);
  };

  const updateRow = (id: string, field: "projectId" | "taskId", value: string) => {
    setTimesheetRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, [field]: value } : r))
    );
  };

  const updateHour = (id: string, day: string, value: string) => {
    const num = parseFloat(value) || 0;
    setTimesheetRows((prev) =>
      prev.map((r) =>
        r.id === id ? { ...r, hours: { ...r.hours, [day]: num } } : r
      )
    );
  };

  const removeRow = (id: string) => {
    setTimesheetRows((prev) => prev.filter((r) => r.id !== id));
  };

  const getRowTotal = (hours: Record<string, number>) => {
    return Object.values(hours).reduce((s, h) => s + h, 0).toFixed(1);
  };

  const getWeekTotal = () => {
    return timesheetRows
      .reduce((s, r) => s + Object.values(r.hours).reduce((a, b) => a + b, 0), 0)
      .toFixed(1);
  };

  const prevWeek = () => {
    const d = new Date(weekBase);
    d.setDate(d.getDate() - 7);
    setWeekBase(d);
  };

  const nextWeek = () => {
    const d = new Date(weekBase);
    d.setDate(d.getDate() + 7);
    setWeekBase(d);
  };

  const handleDelete = async (id: string) => {
    const res = await fetch(`/api/time-entries/${id}`, { method: "DELETE", credentials: "include" });
    if (res.ok) setEntries((prev) => prev.filter((e) => e.id !== id));
  };

  const filteredTasks = (projectId: string) =>
    tasks.filter((t) => !projectId || t.projectId === projectId);

  return (
    <main className="flex flex-1 flex-col gap-4 p-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">My Time</h1>
          <p className="text-sm text-muted-foreground mt-1">Track your logged hours</p>
        </div>
        <Popover>
          <PopoverTrigger asChild>
            <button className="flex items-center gap-2 px-3 py-2 text-sm rounded-sm border hover:bg-muted transition-colors">
              <Calendar className="size-4" />
              {date ? date.toDateString() === new Date().toDateString() ? "Today" : date.toLocaleDateString() : "Select date"}
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="end">
            <CalendarUI mode="single" selected={date} onSelect={setDate} />
          </PopoverContent>
        </Popover>
      </div>

      {/* Weekly Timesheet Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Clock className="size-4" />
            Weekly Timesheet
          </CardTitle>
          <div className="flex items-center gap-2">
            <button onClick={prevWeek} className="px-2 py-1 text-sm rounded-sm border hover:bg-muted transition-colors">←</button>
            <span className="text-sm font-medium min-w-[160px] text-center">
              {weekDates[0].date} — {weekDates[6].date}
            </span>
            <button onClick={nextWeek} className="px-2 py-1 text-sm rounded-sm border hover:bg-muted transition-colors">→</button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="border rounded-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b">
                  <th className="px-4 py-3 font-semibold text-left min-w-[180px]">Project</th>
                  <th className="px-4 py-3 font-semibold text-left min-w-[180px]">Task</th>
                  {weekDates.map((d) => (
                    <th key={d.key} className="px-3 py-3 font-semibold text-center min-w-[90px]">{d.label}</th>
                  ))}
                  <th className="px-3 py-3 font-semibold text-center min-w-[80px]">Total</th>
                  <th className="w-10"></th>
                </tr>
              </thead>
              <tbody>
                {timesheetRows.map((row) => (
                  <tr key={row.id} className="border-b last:border-0 hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-2">
                      <Select value={row.projectId} onValueChange={(v) => updateRow(row.id, "projectId", v)}>
                        <SelectTrigger className="h-8">
                          <SelectValue placeholder="Select project" />
                        </SelectTrigger>
                        <SelectContent>
                          {projects.map((p) => (
                            <SelectItem key={p._id} value={p._id}>{p.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="px-4 py-2">
                      <Select value={row.taskId} onValueChange={(v) => updateRow(row.id, "taskId", v)}>
                        <SelectTrigger className="h-8">
                          <SelectValue placeholder="Select task" />
                        </SelectTrigger>
                        <SelectContent>
                          {filteredTasks(row.projectId).map((t) => (
                            <SelectItem key={t._id} value={t._id}>{t.title}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>
                    {DAYS.map((day) => (
                      <td key={day} className="px-2 py-2 text-center">
                        <input
                          type="number"
                          min="0"
                          max="24"
                          step="0.5"
                          value={row.hours[day] || ""}
                          onChange={(e) => updateHour(row.id, day, e.target.value)}
                          className="w-14 h-8 text-center border rounded-sm text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                        />
                      </td>
                    ))}
                    <td className="px-3 py-2 text-center font-mono font-medium text-sm">
                      {getRowTotal(row.hours)}h
                    </td>
                    <td className="px-2 py-2">
                      <button onClick={() => removeRow(row.id)} className="text-muted-foreground hover:text-red-600 transition-colors">
                        <Trash2 className="size-4" />
                      </button>
                    </td>
                  </tr>
                ))}
                {timesheetRows.length === 0 && (
                  <tr>
                    <td colSpan={10} className="px-4 py-8 text-center text-muted-foreground">
                      Click the button below to add a timesheet row
                    </td>
                  </tr>
                )}
              </tbody>
              {timesheetRows.length > 0 && (
                <tfoot>
                  <tr className="bg-slate-50 font-medium">
                    <td colSpan={2} className="px-4 py-2 text-right">Week Total</td>
                    {DAYS.map((day) => (
                      <td key={day} className="px-3 py-2 text-center font-mono text-sm">
                        {timesheetRows.reduce((s, r) => s + (r.hours[day] || 0), 0).toFixed(1)}h
                      </td>
                    ))}
                    <td className="px-3 py-2 text-center font-mono text-sm font-bold">
                      {getWeekTotal()}h
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
          <div className="mt-3 flex gap-2">
            <button onClick={addTimesheetRow} className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-sm border hover:bg-muted transition-colors">
              <Plus className="size-4" /> Add Row
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Daily Entries */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="size-4" />
            {totalHours}h logged
            <Badge variant="secondary">{filteredEntries.length} entries</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="size-6 animate-spin text-muted-foreground" />
            </div>
          ) : error ? (
            <div className="flex items-center justify-center py-12">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          ) : filteredEntries.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Clock className="size-10 mb-3 opacity-50" />
              <p>No time entries for this date</p>
              <p className="text-sm">Go to Time Tracker to log your hours</p>
            </div>
          ) : (
            <div className="border border-gray-200 bg-white shadow-sm overflow-hidden rounded-sm">
              <table className="table-premium w-full text-sm text-left">
                <thead>
                  <tr>
                    <th className="px-4 py-3.5 font-semibold whitespace-nowrap text-left">Description</th>
                    <th className="px-4 py-3.5 font-semibold whitespace-nowrap text-left">Time</th>
                    <th className="px-4 py-3.5 font-semibold whitespace-nowrap text-left">Duration</th>
                    <th className="px-4 py-3.5 font-semibold whitespace-nowrap text-left">Status</th>
                    <th className="px-4 py-3.5 font-semibold whitespace-nowrap text-left w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEntries.map((entry) => (
                    <tr key={entry.id} className="border-b last:border-0 hover:bg-slate-50 transition-colors bg-white cursor-pointer" onClick={() => setViewEntry(entry)}>
                      <td className="px-4 py-3">
                        <p className="text-sm font-medium">{entry.description || "No description"}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(entry.date).toLocaleDateString()}
                          {entry.startTime && entry.endTime && ` · ${entry.startTime} - ${entry.endTime}`}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm">
                          {entry.startTime && entry.endTime
                            ? `${entry.startTime} - ${entry.endTime}`
                            : "—"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm font-mono font-medium">
                          {Math.floor(entry.duration / 60)}h {entry.duration % 60}m
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <Badge className={statusColors[entry.status]}>
                          {entry.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={(e) => { e.stopPropagation(); setViewEntry(entry); }}
                            className="text-muted-foreground hover:text-black transition-colors"
                            title="View"
                          >
                            <EyeIcon className="size-4" />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDelete(entry.id); }}
                            className="text-muted-foreground hover:text-black transition-colors"
                          >
                            <Trash2 className="size-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <TimeEntryViewDialog
        entry={viewEntry}
        open={!!viewEntry}
        onOpenChange={(open) => { if (!open) setViewEntry(null); }}
      />
    </main>
  );
}
