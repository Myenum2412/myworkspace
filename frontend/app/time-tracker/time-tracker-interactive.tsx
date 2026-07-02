"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, Loader2, Trash2, PlusCircle } from "lucide-react";
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
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [saving, setSaving] = useState(false);

  const totalMinutes = entries.reduce((s, e) => s + e.duration, 0);
  const totalHours = (totalMinutes / 60).toFixed(1);

  const handleAdd = async () => {
    if (!description.trim() || !orgId || !user.id) return;

    const startParts = startTime.split(":").map(Number);
    const endParts = endTime.split(":").map(Number);
    const duration = startParts.length === 2 && endParts.length === 2
      ? Math.max(0, (endParts[0] * 60 + endParts[1]) - (startParts[0] * 60 + startParts[1]))
      : 0;

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
          startTime: startTime || undefined,
          endTime: endTime || undefined,
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
        setStartTime("");
        setEndTime("");
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    const res = await fetch(`/api/time-entries/${id}`, { method: "DELETE", credentials: "include" });
    if (res.ok) setEntries((prev) => prev.filter((e) => e.id !== id));
  };

  return (
    <main className="flex flex-1 flex-col bg-background min-h-screen">
      <div className="flex items-center bg-white border-b border-border px-4 py-[10px] shadow-sm w-full relative z-10 h-16">
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

          <div className="flex items-center text-gray-800 font-medium text-[13px] tracking-wide">
            <input
              type="text"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              placeholder="00:00"
              className="w-[42px] text-center border-none outline-none focus:ring-0 bg-transparent p-0 m-0 cursor-text hover:text-gray-900 focus:text-gray-900"
            />
            <span className="mx-1 text-gray-600">-</span>
            <input
              type="text"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              placeholder="00:00"
              className="w-[42px] text-center border-none outline-none focus:ring-0 bg-transparent p-0 m-0 cursor-text hover:text-gray-900 focus:text-gray-900"
            />
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
          <div className="border border-gray-200 bg-white shadow-sm overflow-hidden rounded-lg">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="bg-[#f3f4f6]">
                  <th className="px-4 py-3.5 font-semibold whitespace-nowrap text-left">Description</th>
                  <th className="px-4 py-3.5 font-semibold whitespace-nowrap text-left">Project</th>
                  <th className="px-4 py-3.5 font-semibold whitespace-nowrap text-left">Time</th>
                  <th className="px-4 py-3.5 font-semibold whitespace-nowrap text-left">Duration</th>
                  <th className="px-4 py-3.5 font-semibold whitespace-nowrap text-left">Status</th>
                  <th className="px-4 py-3.5 font-semibold whitespace-nowrap text-left w-10"></th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => (
                  <tr key={entry.id} className="border-b last:border-0 hover:bg-slate-50 transition-colors bg-white">
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium">{entry.description}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(entry.date).toLocaleDateString()}
                        {entry.startTime && entry.endTime && ` · ${entry.startTime} - ${entry.endTime}`}
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
                      <Badge variant="secondary" className="text-xs">
                        {entry.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleDelete(entry.id)}
                        className="text-muted-foreground hover:text-black transition-colors"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}
