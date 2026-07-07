"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, Loader2, Trash2, PlusCircle, EyeIcon } from "lucide-react";
import { TimeEntryViewDialog } from "@/components/time-tracker/time-entry-view-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar as CalendarUI } from "@/components/ui/calendar";

const hours = Array.from({ length: 12 }, (_, i) => String(i + 1));
const minutes = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, "0"));

function to24h(hour: number, period: "AM" | "PM"): number {
  if (period === "AM") return hour === 12 ? 0 : hour;
  return hour === 12 ? 12 : hour + 12;
}

function to12h(time: string): string {
  const parts = time.split(":").map(Number);
  if (parts.length < 2 || parts.some(isNaN)) return time;
  const [h, m] = parts;
  const period = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 || 12;
  return `${hour12}:${String(m).padStart(2, "0")} ${period}`;
}

function calcDuration(startTime?: string, endTime?: string): number {
  if (!startTime || !endTime) return 0;
  const [sh, sm] = startTime.split(":").map(Number);
  const [eh, em] = endTime.split(":").map(Number);
  if (isNaN(sh) || isNaN(sm) || isNaN(eh) || isNaN(em)) return 0;
  return Math.max(0, (eh * 60 + em) - (sh * 60 + sm));
}

interface TimeEntry {
  id: string;
  userId: string;
  date: string;
  startTime?: string;
  endTime?: string;
  duration: number;
  description: string;
  projectId?: string;
  projectName?: string;
  billable: boolean;
  status: "pending" | "approved" | "rejected";
  createdAt: string;
}

interface Project {
  id: string;
  name: string;
  color: string;
}

interface TimeTrackerProps {
  user: { name: string; email: string; avatar: string; id: string };
  orgId: string;
  initialEntries: TimeEntry[];
  projects: Project[];
}

export default function TimeTracker({ user, orgId, initialEntries, projects }: TimeTrackerProps) {
  const [entries, setEntries] = useState<TimeEntry[]>(initialEntries);
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [description, setDescription] = useState("");
  const [startHour, setStartHour] = useState("9");
  const [startMinute, setStartMinute] = useState("00");
  const [startPeriod, setStartPeriod] = useState<"AM" | "PM">("AM");
  const [endHour, setEndHour] = useState("5");
  const [endMinute, setEndMinute] = useState("00");
  const [endPeriod, setEndPeriod] = useState<"AM" | "PM">("PM");
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [saving, setSaving] = useState(false);
  const [viewEntry, setViewEntry] = useState<TimeEntry | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const totalMinutes = entries.reduce((s, e) => s + calcDuration(e.startTime, e.endTime), 0);
  const totalHours = (totalMinutes / 60).toFixed(1);

  function get24hTime(hour: string, minute: string, period: "AM" | "PM"): string {
    const h = to24h(Number(hour), period);
    return `${String(h).padStart(2, "0")}:${minute}`;
  }

  const handleAdd = async () => {
    if (!description.trim() || !orgId || !user.id) return;

    const startTime24 = get24hTime(startHour, startMinute, startPeriod);
    const endTime24 = get24hTime(endHour, endMinute, endPeriod);
    const duration = calcDuration(startTime24, endTime24);

    setSaving(true);
    try {
      const res = await fetch("/api/time-entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          orgId,
          userId: user.id,
          date: date?.toISOString().slice(0, 10),
          startTime: startTime24,
          endTime: endTime24,
          duration,
          description,
          projectId: selectedProject?.id || undefined,
          projectName: selectedProject?.name || undefined,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setEntries((prev) => [data.entry, ...prev]);
        setDescription("");
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    const res = await fetch(`/api/time-entries/${id}`, { method: "DELETE", credentials: "include" });
    if (res.ok) {
      setEntries((prev) => prev.filter((e) => e.id !== id));
      setSelectedIds((prev) => { const next = new Set(prev); next.delete(id); return next; });
    }
  };

  const handleBulkDelete = async () => {
    const ids = [...selectedIds];
    const results = await Promise.allSettled(
      ids.map((id) => fetch(`/api/time-entries/${id}`, { method: "DELETE", credentials: "include" }))
    );
    const deleted = ids.filter((_, i) => results[i].status === "fulfilled");
    setEntries((prev) => prev.filter((e) => !deleted.includes(e.id)));
    setSelectedIds(new Set());
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === entries.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(entries.map((e) => e.id)));
    }
  };

  return (
    <main className="flex flex-1 flex-col bg-background min-h-screen">
      {/* Mobile: stacked toolbar */}
      <div className="sm:hidden bg-white border-b border-border px-3 py-3 space-y-3 shadow-sm w-full relative z-10">
        <input
          type="text"
          placeholder="What have you worked on?"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:ring-1 focus:ring-primary focus:border-primary outline-none bg-transparent"
        />
        <div className="flex items-center flex-wrap gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-1.5 text-primary font-medium text-xs border border-gray-200 rounded-md px-2.5 py-2 transition-colors outline-none">
                <PlusCircle className="size-3.5" />
                <span className="max-w-[80px] truncate">{selectedProject ? selectedProject.name : "Project"}</span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-[200px]">
              {selectedProject && (
                <>
                  <DropdownMenuItem className="text-muted-foreground text-xs cursor-pointer" onClick={() => setSelectedProject(null)}>
                    Clear selection
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                </>
              )}
              <DropdownMenuLabel className="text-xs text-gray-500 font-medium uppercase tracking-wider">
                {projects.length > 0 ? "Recent Projects" : "No projects"}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {projects.length === 0 ? (
                <div className="px-3 py-4 text-sm text-muted-foreground text-center">No projects yet</div>
              ) : (
                projects.map((project) => (
                  <DropdownMenuItem key={project.id} className="cursor-pointer" onClick={() => setSelectedProject(project)}>
                    <div className="w-2 h-2 rounded-full mr-2 shadow-sm shrink-0" style={{ backgroundColor: project.color }} />
                    {project.name}
                  </DropdownMenuItem>
                ))
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem className="cursor-pointer text-primary font-medium hover:text-primary focus:text-primary focus:bg-secondary">
                <PlusCircle className="size-4 mr-2" />
                <a href="/projects">Create new project</a>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Popover>
            <PopoverTrigger asChild>
              <button className="flex items-center gap-1.5 text-gray-600 font-medium text-xs border border-gray-200 rounded-md px-2.5 py-2 transition-colors outline-none">
                <Calendar className="size-3.5" />
                {date ? date.toDateString() === new Date().toDateString() ? "Today" : date.toLocaleDateString().slice(0, 6) : "Today"}
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="center">
              <CalendarUI mode="single" selected={date} onSelect={setDate} autoFocus />
            </PopoverContent>
          </Popover>

          <div className="flex items-center gap-1 text-gray-800 font-medium text-xs">
            <select value={startHour} onChange={(e) => setStartHour(e.target.value)} className="border border-gray-200 rounded px-1.5 py-2 outline-none text-xs bg-transparent appearance-none">
              {hours.map((h) => <option key={h} value={h}>{h}</option>)}
            </select>
            <span className="text-gray-400">:</span>
            <select value={startMinute} onChange={(e) => setStartMinute(e.target.value)} className="border border-gray-200 rounded px-1.5 py-2 outline-none text-xs bg-transparent appearance-none">
              {minutes.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
            <button onClick={() => setStartPeriod(startPeriod === "AM" ? "PM" : "AM")} className="text-[10px] font-semibold uppercase text-muted-foreground hover:text-gray-800 w-6 text-center">
              {startPeriod}
            </button>
            <span className="text-gray-300 mx-0.5">-</span>
            <select value={endHour} onChange={(e) => setEndHour(e.target.value)} className="border border-gray-200 rounded px-1.5 py-2 outline-none text-xs bg-transparent appearance-none">
              {hours.map((h) => <option key={h} value={h}>{h}</option>)}
            </select>
            <span className="text-gray-400">:</span>
            <select value={endMinute} onChange={(e) => setEndMinute(e.target.value)} className="border border-gray-200 rounded px-1.5 py-2 outline-none text-xs bg-transparent appearance-none">
              {minutes.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
            <button onClick={() => setEndPeriod(endPeriod === "AM" ? "PM" : "AM")} className="text-[10px] font-semibold uppercase text-muted-foreground hover:text-gray-800 w-6 text-center">
              {endPeriod}
            </button>
          </div>

          <Button
            className="bg-primary hover:bg-accent text-primary-foreground rounded-lg h-9 px-4 font-semibold text-xs flex-1"
            onClick={handleAdd}
            disabled={saving || !description.trim()}
          >
            {saving ? <Loader2 className="size-3.5 animate-spin" /> : null}
            {saving ? "SAVING" : "ADD"}
          </Button>
        </div>
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{totalHours}h logged today</span>
          <span className="font-mono font-bold text-gray-800">
            {String(Math.floor(totalMinutes / 60)).padStart(2, "0")}:
            {String(totalMinutes % 60).padStart(2, "0")}:00
          </span>
        </div>
      </div>

      {/* Desktop toolbar */}
      <div className="hidden sm:flex items-center bg-white border-b border-border px-4 py-[10px] shadow-sm w-full relative z-10 h-16">
        <div className="flex-1 h-full flex items-center">
          <input
            type="text"
            placeholder="What have you worked on?"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full border-none focus:ring-0 shadow-none text-[14px] placeholder:text-gray-600 outline-none bg-transparent h-full"
          />
        </div>

        <div className="flex items-center gap-4 text-gray-500 h-full">
          <div className="h-6 w-px bg-gray-200"></div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-[6px] text-primary hover:text-accent font-medium text-[14px] transition-colors outline-none">
                <PlusCircle className="size-[15px]" />
                {selectedProject ? selectedProject.name : "Project"}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-[220px]">
              {selectedProject && (
                <>
                  <DropdownMenuItem
                    className="text-muted-foreground text-xs cursor-pointer"
                    onClick={() => setSelectedProject(null)}
                  >
                    Clear selection
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                </>
              )}
              <DropdownMenuLabel className="text-xs text-gray-500 font-medium uppercase tracking-wider">
                {projects.length > 0 ? "Recent Projects" : "No projects"}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {projects.length === 0 ? (
                <div className="px-3 py-4 text-sm text-muted-foreground text-center">
                  No projects yet
                </div>
              ) : (
                projects.map((project) => (
                  <DropdownMenuItem
                    key={project.id}
                    className="cursor-pointer"
                    onClick={() => setSelectedProject(project)}
                  >
                    <div
                      className="w-2 h-2 rounded-full mr-2 shadow-sm shrink-0"
                      style={{ backgroundColor: project.color }}
                    />
                    {project.name}
                  </DropdownMenuItem>
                ))
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem className="cursor-pointer text-primary font-medium hover:text-primary focus:text-primary focus:bg-secondary">
                <PlusCircle className="size-4 mr-2" />
                <a href="/projects">Create new project</a>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="h-6 w-px bg-gray-200"></div>

          <div className="flex items-center gap-1.5 text-gray-800 font-medium text-[13px] tracking-wide">
            <select
              value={startHour}
              onChange={(e) => setStartHour(e.target.value)}
              className="border-none outline-none focus:ring-0 bg-transparent p-0 m-0 cursor-pointer text-center font-medium text-[13px] appearance-none"
            >
              {hours.map((h) => <option key={h} value={h}>{h}</option>)}
            </select>
            <span className="text-gray-600">:</span>
            <select
              value={startMinute}
              onChange={(e) => setStartMinute(e.target.value)}
              className="border-none outline-none focus:ring-0 bg-transparent p-0 m-0 cursor-pointer text-center font-medium text-[13px] appearance-none"
            >
              {minutes.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
            <button
              onClick={() => setStartPeriod(startPeriod === "AM" ? "PM" : "AM")}
              className="text-[11px] font-semibold uppercase text-muted-foreground hover:text-gray-800 transition-colors w-7 text-center"
            >
              {startPeriod}
            </button>
            <span className="mx-1.5 text-gray-400">-</span>
            <select
              value={endHour}
              onChange={(e) => setEndHour(e.target.value)}
              className="border-none outline-none focus:ring-0 bg-transparent p-0 m-0 cursor-pointer text-center font-medium text-[13px] appearance-none"
            >
              {hours.map((h) => <option key={h} value={h}>{h}</option>)}
            </select>
            <span className="text-gray-600">:</span>
            <select
              value={endMinute}
              onChange={(e) => setEndMinute(e.target.value)}
              className="border-none outline-none focus:ring-0 bg-transparent p-0 m-0 cursor-pointer text-center font-medium text-[13px] appearance-none"
            >
              {minutes.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
            <button
              onClick={() => setEndPeriod(endPeriod === "AM" ? "PM" : "AM")}
              className="text-[11px] font-semibold uppercase text-muted-foreground hover:text-gray-800 transition-colors w-7 text-center"
            >
              {endPeriod}
            </button>
          </div>

          <div className="h-6 w-px bg-gray-200"></div>

          <Popover>
            <PopoverTrigger asChild>
              <button className="flex items-center gap-[6px] hover:text-gray-800 transition-colors text-[13px] font-medium text-gray-600 outline-none">
                <Calendar className="size-[16px]" />
                {date ? date.toDateString() === new Date().toDateString() ? "Today" : date.toLocaleDateString() : "Today"}
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="center">
              <CalendarUI
                mode="single"
                selected={date}
                onSelect={setDate}
                autoFocus
              />
            </PopoverContent>
          </Popover>

          <div className="h-6 w-px bg-gray-200"></div>

          <div className="font-bold text-gray-800 text-[19px] w-24 text-center tracking-tight font-mono">
            {String(Math.floor(totalMinutes / 60)).padStart(2, "0")}:
            {String(totalMinutes % 60).padStart(2, "0")}:00
          </div>

          <Button
            className="bg-primary hover:bg-accent text-primary-foreground rounded-none h-[34px] px-[22px] font-semibold shadow-none tracking-wide text-[13px] disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={handleAdd}
            disabled={saving || !description.trim()}
          >
            {saving ? <Loader2 className="size-4 animate-spin" /> : null}
            {saving ? "SAVING" : "ADD"}
          </Button>
        </div>
      </div>

      <div className="p-4">
        <div className="flex items-center gap-2 mb-4">
          <Clock className="size-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">
            {totalHours}h logged today
          </span>
          <Badge variant="secondary" className="text-xs">{entries.length} entries</Badge>
        </div>

        {entries.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <Clock className="size-10 mb-3 opacity-50" />
            <p>No time entries for today</p>
            <p className="text-sm">Add your first entry above</p>
          </div>
        ) : (
          <div>
            {selectedIds.size > 0 && (
              <div className="flex items-center justify-between mb-3 rounded-lg border bg-muted/50 px-4 py-2.5">
                <span className="text-sm text-muted-foreground">
                  {selectedIds.size} entry{selectedIds.size > 1 ? "ies" : "y"} selected
                </span>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => setSelectedIds(new Set())}>
                    Cancel
                  </Button>
                  <Button variant="destructive" size="sm" onClick={handleBulkDelete}>
                    <Trash2 className="size-3.5 mr-1.5" />
                    Delete
                  </Button>
                </div>
              </div>
            )}
            <div className="border border-gray-200 bg-white shadow-sm overflow-hidden rounded-lg">
              {/* Desktop table */}
              <table className="hidden sm:table w-full text-sm text-left">
                <thead>
                  <tr className="bg-[#f3f4f6]">
                    <th className="px-4 py-3.5 w-10">
                      <input
                        type="checkbox"
                        checked={selectedIds.size === entries.length && entries.length > 0}
                        onChange={toggleSelectAll}
                        className="size-4 rounded border-gray-300 cursor-pointer"
                      />
                    </th>
                    <th className="px-4 py-3.5 font-semibold whitespace-nowrap text-left">Description</th>
                    <th className="px-4 py-3.5 font-semibold whitespace-nowrap text-left">Project</th>
                    <th className="px-4 py-3.5 font-semibold whitespace-nowrap text-left">Time</th>
                    <th className="px-4 py-3.5 font-semibold whitespace-nowrap text-left">Duration</th>
                    <th className="px-4 py-3.5 font-semibold whitespace-nowrap text-left w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((entry) => (
                    <tr key={entry.id} className={`border-b last:border-0 hover:bg-slate-50 transition-colors bg-white cursor-pointer ${selectedIds.has(entry.id) ? "bg-blue-50/50" : ""}`} onClick={() => setViewEntry(entry)}>
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(entry.id)}
                          onChange={(e) => { e.stopPropagation(); toggleSelect(entry.id); }}
                          onClick={(e) => e.stopPropagation()}
                          className="size-4 rounded border-gray-300 cursor-pointer"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm font-medium">{entry.description}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(entry.date).toLocaleDateString()}
                          {entry.startTime && entry.endTime && ` · ${to12h(entry.startTime)} - ${to12h(entry.endTime)}`}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        {entry.projectName ? (
                          <span className="text-sm">{entry.projectName}</span>
                        ) : (
                          <span className="text-sm text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm">
                          {entry.startTime && entry.endTime
                            ? `${to12h(entry.startTime)} - ${to12h(entry.endTime)}`
                            : "—"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm font-mono font-medium">
                          {(() => {
                            const dur = calcDuration(entry.startTime, entry.endTime) || entry.duration || 0;
                            return `${Math.floor(dur / 60)}h ${dur % 60}m`;
                          })()}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={(e) => { e.stopPropagation(); setViewEntry(entry); }}
                            className="text-muted-foreground hover:text-black transition-colors p-1"
                            title="View"
                          >
                            <EyeIcon className="size-4" />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDelete(entry.id); }}
                            className="text-muted-foreground hover:text-black transition-colors p-1"
                            title="Delete"
                          >
                            <Trash2 className="size-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Mobile cards */}
              <div className="sm:hidden space-y-2 p-2">
                {entries.map((entry) => {
                  const dur = calcDuration(entry.startTime, entry.endTime) || entry.duration || 0;
                  return (
                    <div
                      key={entry.id}
                      className={`border rounded-lg p-3 space-y-2 cursor-pointer ${selectedIds.has(entry.id) ? "bg-blue-50/50 border-blue-200" : "bg-white border-gray-200"}`}
                      onClick={() => setViewEntry(entry)}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <input
                            type="checkbox"
                            checked={selectedIds.has(entry.id)}
                            onChange={(e) => { e.stopPropagation(); toggleSelect(entry.id); }}
                            onClick={(e) => e.stopPropagation()}
                            className="size-4 rounded border-gray-300 cursor-pointer shrink-0"
                          />
                          <p className="text-sm font-medium truncate">{entry.description}</p>
                        </div>
                        <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                          <button onClick={() => setViewEntry(entry)} className="text-muted-foreground hover:text-black p-1" title="View">
                            <EyeIcon className="size-4" />
                          </button>
                          <button onClick={() => handleDelete(entry.id)} className="text-muted-foreground hover:text-red-500 p-1" title="Delete">
                            <Trash2 className="size-4" />
                          </button>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted-foreground">
                        <span>Project: <span className="font-medium text-gray-700">{entry.projectName || "—"}</span></span>
                        <span>Date: <span className="font-medium text-gray-700">{new Date(entry.date).toLocaleDateString()}</span></span>
                        <span>Time: <span className="font-medium text-gray-700">{entry.startTime && entry.endTime ? `${to12h(entry.startTime)} - ${to12h(entry.endTime)}` : "—"}</span></span>
                        <span>Duration: <span className="font-medium text-gray-700 font-mono">{Math.floor(dur / 60)}h {dur % 60}m</span></span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      <TimeEntryViewDialog
        entry={viewEntry}
        open={!!viewEntry}
        onOpenChange={(open) => { if (!open) setViewEntry(null); }}
      />
    </main>
  );
}
