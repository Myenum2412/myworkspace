"use client"
import { useState, useEffect, useMemo } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  InfoIcon, UsersIcon, ActivityIcon, FileTextIcon, BarChart3Icon,
  CalendarIcon, ClockIcon, TargetIcon, AlertCircleIcon,
  CheckCircle2Icon, ArrowUpIcon, ArrowDownIcon, CircleIcon,
  DownloadIcon, EyeIcon, FileIcon, FileSpreadsheetIcon, FileImageIcon, FileArchiveIcon,
  TimerIcon,
} from "lucide-react";
import type { Project } from "@/components/projects/project-types";

const TABS = [
  { id: "overview", label: "Overview", icon: InfoIcon },
  { id: "team", label: "Team", icon: UsersIcon },
  { id: "timesheet", label: "Timesheet", icon: TimerIcon },
  { id: "activity", label: "Activity", icon: ActivityIcon },
  { id: "files", label: "Files", icon: FileTextIcon },
  { id: "budget", label: "Budget", icon: BarChart3Icon },
];

function FieldRow({ label, value }: { label: string; value: string | number | null | undefined }) {
  return (
    <div className="space-y-0.5">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium">{value ?? "\u2014"}</p>
    </div>
  );
}

function PriorityBadge({ priority }: { priority?: string }) {
  const config: Record<string, { color: string; icon: typeof CircleIcon }> = {
    low: { color: "bg-slate-100 text-slate-600 border-slate-300", icon: CircleIcon },
    medium: { color: "bg-blue-100 text-blue-600 border-blue-300", icon: CircleIcon },
    high: { color: "bg-amber-100 text-amber-600 border-amber-300", icon: AlertCircleIcon },
    critical: { color: "bg-red-100 text-red-600 border-red-300", icon: AlertCircleIcon },
  };
  const c = config[priority || "medium"];
  const Icon = c.icon;
  return (
    <Badge variant="outline" className={cn("gap-1", c.color)}>
      <Icon className="size-2.5" />
      {priority || "medium"}
    </Badge>
  );
}

interface TimeEntry {
  id: string; userId: string; date: string;
  startTime?: string; endTime?: string; duration: number;
  description: string; projectId?: string; projectName?: string;
}

export function ProjectDetailedView({ project, orgId: orgIdProp }: { project: Project; orgId?: string }) {
  const [tab, setTab] = useState(0);
  const [memberNames, setMemberNames] = useState<{ id: string; name: string; image?: string }[]>([]);
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [userMap, setUserMap] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!project.members?.length) return;
    fetch("/api/employees", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => {
        const all = (d?.data || []) as { id?: string; _id?: string; name: string; image?: string }[];
        const filtered = all.filter((e) => project.members!.includes(e.id || e._id || ""));
        setMemberNames(filtered.map((e) => ({ id: e.id || e._id || "", name: e.name, image: e.image })));
      })
      .catch(() => {});
  }, [project.members]);

  useEffect(() => {
    if (!orgIdProp) return;
    fetch(`/api/time-entries?orgId=${orgIdProp}&projectId=${project.id}`, { credentials: "include" })
      .then((r) => r.json())
      .then((d) => setTimeEntries(d.data || []))
      .catch(() => {});
  }, [project.id, orgIdProp]);

  useEffect(() => {
    fetch("/api/employees", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => {
        const all = (d?.data || []) as { id?: string; _id?: string; name: string }[];
        const map: Record<string, string> = {};
        all.forEach((u) => { if (u.id || u._id) map[u.id || u._id!] = u.name; });
        setUserMap(map);
      })
      .catch(() => {});
  }, []);

  const progressColor =
    project.progress >= 100 ? "bg-green-500" : project.progress >= 50 ? "bg-blue-500" : project.progress > 0 ? "bg-amber-500" : "bg-muted-foreground/30";

  const health = useMemo(() => {
    if (project.health) return project.health;
    if (!project.deadline) return "on-track";
    const diff = new Date(project.deadline).getTime() - Date.now();
    if (diff < 0) return "delayed";
    if (diff < 7 * 24 * 60 * 60 * 1000) return "at-risk";
    return "on-track";
  }, [project]);

  const budgetUtilization = project.budget && project.budget > 0
    ? Math.min(100, Math.round(((project.spent || 0) / project.budget) * 100))
    : 0;

  const daysLeft = project.deadline
    ? Math.ceil((new Date(project.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 px-4 sm:px-6 pt-2 pb-3 shrink-0 overflow-x-auto">
        {TABS.map((t, i) => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => setTab(i)}
              className={cn(
                "flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors whitespace-nowrap",
                tab === i
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted"
              )}
            >
              <Icon className="size-3.5" />
              {t.label}
            </button>
          );
        })}
      </div>

      <ScrollArea className="flex-1 px-4 sm:px-6 pb-6">
        {tab === 0 && (
          <div className="space-y-6">
            <div className="flex items-start gap-3 sm:gap-4 flex-wrap sm:flex-nowrap">
              <div
                className="size-12 sm:size-14 rounded-xl shrink-0 flex items-center justify-center text-black text-lg font-bold bg-gray-200"
                style={{ backgroundColor: project.color }}
              >
                {project.name.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1 w-full sm:w-auto">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-base sm:text-lg font-semibold truncate">{project.name}</h2>
                  <PriorityBadge priority={project.priority} />
                </div>
                <p className="text-sm text-muted-foreground">{project.client}</p>
                {project.category && (
                  <Badge variant="outline" className="mt-1 text-[10px] capitalize">{project.category}</Badge>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto justify-start sm:justify-end">
                <Badge variant={project.access === "Public" ? "default" : "secondary"}>{project.access}</Badge>
                <Badge variant={project.status === "Active" ? "default" : "outline"}>{project.status}</Badge>
              </div>
            </div>

            <div className="rounded-lg border p-4 space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Details</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                <FieldRow label="Project ID" value={project.id} />
                <FieldRow label="Progress" value={`${project.progress}%`} />
                <FieldRow label="Tracked Hours" value={`${project.tracked}h`} />
                <FieldRow label="Health" value={health === "on-track" ? "On Track" : health === "at-risk" ? "At Risk" : "Delayed"} />
                <FieldRow label="Priority" value={project.priority || "medium"} />
                <FieldRow label="Category" value={project.category || "\u2014"} />
                <FieldRow label="Deadline" value={project.deadline ? new Date(project.deadline).toLocaleDateString() : "No deadline"} />
                <FieldRow label="Start Date" value={project.startDate ? new Date(project.startDate).toLocaleDateString() : "\u2014"} />
                <FieldRow label="Description" value={project.description || "No description"} />
              </div>
            </div>

            <div className="rounded-lg border p-4 space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Progress</h3>
              <div className="flex items-center gap-3">
                <div className="flex-1 h-2.5 rounded-full bg-muted overflow-hidden">
                  <div className={cn("h-full rounded-full transition-all", progressColor)} style={{ width: `${project.progress}%` }} />
                </div>
                <span className="text-sm font-medium whitespace-nowrap">{project.progress}%</span>
              </div>
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><ClockIcon className="size-3" /> {daysLeft !== null ? (daysLeft < 0 ? "Overdue" : `${daysLeft} days left`) : "No deadline"}</span>
                <span className="flex items-center gap-1">
                  {health === "on-track" ? <CheckCircle2Icon className="size-3 text-green-500" /> :
                   health === "at-risk" ? <AlertCircleIcon className="size-3 text-amber-500" /> :
                   <ArrowDownIcon className="size-3 text-red-500" />}
                  {health === "on-track" ? "On Track" : health === "at-risk" ? "At Risk" : "Delayed"}
                </span>
              </div>
            </div>
          </div>
        )}

        {tab === 1 && (
          <div className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Team Members ({memberNames.length})</h3>
            {memberNames.length === 0 ? (
              <div className="flex items-center justify-center py-12">
                <p className="text-sm text-muted-foreground">No team members assigned</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {memberNames.map((m) => (
                  <div key={m.id} className="flex items-center gap-3 rounded-lg border p-3">
                    <div className="size-8 rounded-full bg-muted flex items-center justify-center text-[10px] font-medium shrink-0 overflow-hidden">
                      {m.image ? (
                        <img src={m.image} alt={m.name} className="size-full object-cover" />
                      ) : (
                        <span>{m.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)}</span>
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{m.name}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === 2 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Time Entries ({timeEntries.length})</h3>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <TimerIcon className="size-3.5" />
                <span className="font-medium">
                  {Math.floor(timeEntries.reduce((s, e) => s + e.duration, 0) / 60)}h {timeEntries.reduce((s, e) => s + e.duration, 0) % 60}m
                </span>
              </div>
            </div>
            {timeEntries.length === 0 ? (
              <div className="flex items-center justify-center py-12 rounded-lg border border-dashed">
                <div className="text-center space-y-2">
                  <TimerIcon className="size-8 mx-auto text-muted-foreground/40" />
                  <p className="text-sm text-muted-foreground">No time entries for this project</p>
                </div>
              </div>
            ) : (
              <>
                <div className="hidden sm:block border border-gray-200 bg-white shadow-sm overflow-hidden rounded-lg">
                  <table className="table w-full text-sm text-left">
                    <thead>
                      <tr className="bg-[#f3f4f6]">
                        <th className="px-3 py-2.5 font-semibold whitespace-nowrap">User</th>
                        <th className="px-3 py-2.5 font-semibold whitespace-nowrap">Description</th>
                        <th className="px-3 py-2.5 font-semibold whitespace-nowrap">Date</th>
                        <th className="px-3 py-2.5 font-semibold whitespace-nowrap">Time</th>
                        <th className="px-3 py-2.5 font-semibold whitespace-nowrap">Duration</th>
                      </tr>
                    </thead>
                    <tbody>
                      {timeEntries.map((entry) => {
                        const dur = entry.startTime && entry.endTime
                          ? (() => { const [sh,sm]=entry.startTime.split(":").map(Number); const [eh,em]=entry.endTime.split(":").map(Number); return Math.max(0,(eh*60+em)-(sh*60+sm)); })()
                          : entry.duration;
                        return (
                          <tr key={entry.id} className="border-b last:border-0 hover:bg-slate-50 transition-colors">
                            <td className="px-3 py-2.5 text-sm font-medium">{userMap[entry.userId] || entry.userId.slice(0, 8)}</td>
                            <td className="px-3 py-2.5 text-sm">{entry.description}</td>
                            <td className="px-3 py-2.5 text-sm text-muted-foreground">{new Date(entry.date).toLocaleDateString()}</td>
                            <td className="px-3 py-2.5 text-sm text-muted-foreground">
                              {entry.startTime && entry.endTime ? `${entry.startTime} - ${entry.endTime}` : "\u2014"}
                            </td>
                            <td className="px-3 py-2.5 text-sm font-mono font-medium">{Math.floor(dur / 60)}h {dur % 60}m</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <div className="sm:hidden space-y-2">
                  {timeEntries.map((entry) => {
                    const dur = entry.startTime && entry.endTime
                      ? (() => { const [sh,sm]=entry.startTime.split(":").map(Number); const [eh,em]=entry.endTime.split(":").map(Number); return Math.max(0,(eh*60+em)-(sh*60+sm)); })()
                      : entry.duration;
                    return (
                      <div key={entry.id} className="rounded-lg border p-3 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">{userMap[entry.userId] || entry.userId.slice(0, 8)}</span>
                          <span className="text-xs font-mono font-medium">{Math.floor(dur / 60)}h {dur % 60}m</span>
                        </div>
                        <p className="text-sm text-muted-foreground">{entry.description}</p>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span>{new Date(entry.date).toLocaleDateString()}</span>
                          {entry.startTime && entry.endTime && <span>{entry.startTime} - {entry.endTime}</span>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        )}

        {tab === 3 && (
          <div className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Recent Activity</h3>
            <div className="space-y-3">
              {[
                { action: "Project created", user: "System", time: new Date().toISOString() },
                ...(project.status === "Active" ? [{ action: "Project marked as active", user: "System", time: new Date().toISOString() }] : []),
                ...(memberNames.length > 0 ? [{ action: `${memberNames.length} team member(s) assigned`, user: "System", time: new Date().toISOString() }] : []),
              ].map((activity, i) => (
                <div key={i} className="flex items-start gap-3 rounded-lg border p-3">
                  <div className="size-7 rounded-full bg-muted flex items-center justify-center shrink-0 mt-0.5">
                    <ActivityIcon className="size-3.5 text-muted-foreground" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{activity.action}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[11px] text-muted-foreground">{activity.user}</span>
                      <span className="text-[11px] text-muted-foreground">\u2022</span>
                      <span className="text-[11px] text-muted-foreground">
                        {new Date(activity.time).toLocaleDateString()} {new Date(activity.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === 4 && (
          <ProjectFiles projectId={project.id} orgId={orgIdProp || ""} />
        )}

        {tab === 5 && (
          <div className="space-y-6">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Budget & Resources</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="rounded-lg border p-4 space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <TargetIcon className="size-4" />
                  <span>Budget</span>
                </div>
                <p className="text-2xl font-bold">${(project.budget || 0).toLocaleString()}</p>
              </div>
              <div className="rounded-lg border p-4 space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <BarChart3Icon className="size-4" />
                  <span>Spent</span>
                </div>
                <p className="text-2xl font-bold">${(project.spent || 0).toLocaleString()}</p>
              </div>
            </div>
            {project.budget && project.budget > 0 && (
              <div className="rounded-lg border p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Budget Utilization</h3>
                  <span className={cn("text-sm font-medium", budgetUtilization > 80 ? "text-red-500" : budgetUtilization > 50 ? "text-amber-500" : "text-green-500")}>
                    {budgetUtilization}%
                  </span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className={cn("h-full rounded-full transition-all", budgetUtilization > 80 ? "bg-red-500" : budgetUtilization > 50 ? "bg-amber-500" : "bg-green-500")}
                    style={{ width: `${budgetUtilization}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground">${(project.spent || 0).toLocaleString()} of ${project.budget.toLocaleString()} used</p>
              </div>
            )}
            <div className="rounded-lg border p-4 space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Resource Allocation</h3>
              <div className="space-y-3">
                <div>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span>Tracked Hours</span>
                    <span className="font-medium">{project.tracked}h</span>
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span>Team Size</span>
                    <span className="font-medium">{memberNames.length} member{memberNames.length !== 1 ? "s" : ""}</span>
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span>Progress</span>
                    <span className="font-medium">{project.progress}%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </ScrollArea>
    </div>
  );
}

interface ProjectFile {
  id: string;
  name: string;
  originalName: string;
  mimeType: string;
  size: number;
  createdAt: string;
}

function ProjectFiles({ projectId, orgId }: { projectId: string; orgId: string }) {
  const [files, setFiles] = useState<ProjectFile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/files?projectId=${projectId}&orgId=${orgId}`, { credentials: "include" })
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setFiles(d.data || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [projectId]);

  function fileIcon(mimeType: string) {
    if (mimeType.startsWith("image/")) return <FileImageIcon className="size-4 text-muted-foreground" />;
    if (mimeType.includes("pdf") || mimeType.includes("document") || mimeType.includes("sheet") || mimeType.includes("presentation"))
      return <FileSpreadsheetIcon className="size-4 text-muted-foreground" />;
    if (mimeType.includes("zip") || mimeType.includes("rar") || mimeType.includes("tar"))
      return <FileArchiveIcon className="size-4 text-muted-foreground" />;
    return <FileIcon className="size-4 text-muted-foreground" />;
  }

  function formatSize(bytes: number) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  if (loading) {
    return (
      <div className="space-y-3">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Project Files</h3>
        <div className="flex items-center justify-center py-12">
          <p className="text-sm text-muted-foreground">Loading files...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Project Files ({files.length})</h3>
      {files.length === 0 ? (
        <div className="flex items-center justify-center py-12 rounded-lg border border-dashed">
          <div className="text-center space-y-2">
            <FileIcon className="size-8 mx-auto text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">No files attached to this project</p>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {files.map((file) => (
            <div key={file.id} className="flex items-center gap-3 rounded-lg border p-3 hover:bg-muted/50 transition-colors">
              <div className="size-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
                {fileIcon(file.mimeType)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate">{file.originalName}</p>
                <p className="text-[11px] text-muted-foreground">
                  {formatSize(file.size)} &middot; {new Date(file.createdAt).toLocaleDateString()}
                </p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8"
                  onClick={() => window.open(`/api/files/${file.id}/download?preview=true`, "_blank")}
                  title="View"
                >
                  <EyeIcon className="size-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8"
                  onClick={() => window.open(`/api/files/${file.id}/download`, "_blank")}
                  title="Download"
                >
                  <DownloadIcon className="size-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
