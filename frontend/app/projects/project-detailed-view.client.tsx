"use client";
import type { ColumnDef } from "@tanstack/react-table";
import { useSession } from "next-auth/react";
import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { FileManagerClient } from "@/app/files/file-manager-client";
import { DataTable } from "@/components/data-table";
import type { Project } from "@/components/projects/project-types";
import { TaskDataTable } from "@/components/task-data-table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  ActivityIcon,
  AlertCircleIcon,
  ArrowDownIcon,
  BarChart3Icon,
  CalendarIcon,
  CheckCircle2Icon,
  CircleIcon,
  ClockIcon,
  FileTextIcon,
  InfoIcon,
  ListChecksIcon,
  RotateCcwIcon,
  SendIcon,
  TargetIcon,
  TimerIcon,
  UsersIcon,
} from "@/lib/icons";
import { cn } from "@/lib/utils";

const TABS = [
  { id: "overview", label: "Overview", icon: InfoIcon },
  { id: "team", label: "Team", icon: UsersIcon },
  { id: "timesheet", label: "Timesheet", icon: TimerIcon },
  { id: "activity", label: "Activity", icon: ActivityIcon },
  { id: "files", label: "Files", icon: FileTextIcon },
  { id: "tasks", label: "Tasks", icon: ListChecksIcon },
  { id: "submission", label: "Submission", icon: SendIcon },
  { id: "revision", label: "Revision", icon: RotateCcwIcon },
];

function FieldRow({ label, value }: { label: string; value: string | number | null | undefined }) {
  return (
    <div className="space-y-0.5">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium">{value ?? "\u2014"}</p>
    </div>
  );
}

function normalizeSubmissionStatus(value?: string): string {
  const status = String(value || "")
    .trim()
    .toUpperCase();
  if (!status) return "FFU";
  if (["FFU", "APP", "R&R"].includes(status)) return status;
  if (["TODO", "ASSIGNED", "PENDING", "IN_PROGRESS", "INPROGRESS", "NEW"].includes(status))
    return "FFU";
  if (["DONE", "COMPLETED", "APPROVED", "ACCEPTED", "SUCCESS"].includes(status)) return "APP";
  if (["REVIEW", "REJECTED", "REVISION", "REREVIEW", "REVISE"].includes(status)) return "R&R";
  return status;
}

function StatCard({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <Card className="gap-1 p-3 shadow-none">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
        {icon}
      </div>
      <p className="text-lg font-semibold text-black truncate">{value}</p>
    </Card>
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
  id: string;
  userId: string;
  date: string;
  startTime?: string;
  endTime?: string;
  duration: number;
  description: string;
  projectId?: string;
  projectName?: string;
}

interface RevisionRow {
  id: number | string;
  taskId?: string;
  description?: string;
  selectedFiles?: string;
  remarks?: string;
  status?: string;
  assignee?: string;
  dueDate?: string | null;
  project?: string;
}

interface ProjectTask {
  _id: string;
  id?: string;
  title: string;
  type?: string;
  status: string;
  priority: string;
  dueDate?: string | null;
  createdAt?: string;
  assigneeId?: string;
  assigneeName?: string;
  assigneeAvatar?: string;
  creatorName?: string;
  teamHeadName?: string;
  project?: string;
  description?: string;
  drawNo?: string;
}

interface AuditLogRow {
  id: string;
  action: string;
  userId: string;
  user: string;
  details: string;
  createdAt: string;
}

export function ProjectDetailedView({
  project,
  orgId: orgIdProp,
}: {
  project: Project;
  orgId?: string;
}) {
  const [tab, setTab] = useState(0);
  const [memberNames, setMemberNames] = useState<{ id: string; name: string; image?: string }[]>(
    [],
  );
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [userMap, setUserMap] = useState<Record<string, string>>({});
  const [projectTasks, setProjectTasks] = useState<ProjectTask[]>([]);
  const [revisions, setRevisions] = useState<RevisionRow[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogRow[]>([]);

  useEffect(() => {
    if (!project.members?.length && !orgIdProp) return;
    const controller = new AbortController();

    fetch("/api/employees", { credentials: "include", signal: controller.signal })
      .then((r) => r.json())
      .then((d) => {
        const all = (d?.employees || []) as {
          id?: string;
          _id?: string;
          name: string;
          image?: string;
        }[];
        const filtered = all.filter((e) => project.members?.includes(e.id || e._id || ""));
        setMemberNames(
          filtered.map((e) => ({ id: e.id || e._id || "", name: e.name, image: e.image })),
        );
        const map: Record<string, string> = {};
        all.forEach((u) => {
          const uid = u.id || u._id || "";
          if (uid) map[uid] = u.name;
        });
        setUserMap(map);
      })
      .catch(() => {});

    return () => controller.abort();
  }, [project.members, orgIdProp]);

  useEffect(() => {
    if (!orgIdProp) return;
    const controller = new AbortController();

    fetch(`/api/time-entries?orgId=${orgIdProp}&projectId=${project.id}`, {
      credentials: "include",
      signal: controller.signal,
    })
      .then((r) => r.json())
      .then((d) => setTimeEntries(d.data || []))
      .catch(() => {});

    return () => controller.abort();
  }, [project.id, orgIdProp]);

  useEffect(() => {
    if (!orgIdProp) return;
    const controller = new AbortController();

    fetch(`/api/tasks?orgId=${orgIdProp}`, { credentials: "include", signal: controller.signal })
      .then((r) => r.json())
      .then((d) => {
        const all = (d.data || []) as ProjectTask[];
        setProjectTasks(
          all.filter((t) => {
            const taskProject = t.project?.trim().toLowerCase();
            const projName = project.name?.trim().toLowerCase();
            const projId = project.id?.trim().toLowerCase();
            return taskProject && (taskProject === projName || taskProject === projId);
          }),
        );
      })
      .catch(() => {});

    return () => controller.abort();
  }, [orgIdProp, project.id, project.name]);

  useEffect(() => {
    if (!orgIdProp) return;
    const controller = new AbortController();

    fetch("/api/staffs/reworks", { credentials: "include", signal: controller.signal })
      .then((r) => r.json())
      .then((d) => {
        const all: RevisionRow[] = d.revisions || [];
        const projName = project.name?.trim().toLowerCase();
        const projId = project.id?.trim().toLowerCase();
        setRevisions(
          all.filter((r) => {
            const p = String(r.selectedFiles || r.project || "")
              .trim()
              .toLowerCase();
            return p === projName || p === projId;
          }),
        );
      })
      .catch(() => {});

    return () => controller.abort();
  }, [orgIdProp, project.id, project.name]);

  useEffect(() => {
    if (!orgIdProp) return;
    const controller = new AbortController();

    fetch("/api/orgmenu/audit", { credentials: "include", signal: controller.signal })
      .then((r) => r.json())
      .then((d) => {
        const logs = (d.logs || []) as AuditLogRow[];
        const memberIds = new Set((project.members || []).map((m) => m.trim()).filter(Boolean));
        if (memberIds.size > 0) {
          setAuditLogs(logs.filter((l) => memberIds.has(l.userId)));
        } else {
          setAuditLogs([]);
        }
      })
      .catch(() => {});

    return () => controller.abort();
  }, [orgIdProp, project.members]);

  const progressColor =
    project.progress >= 100
      ? "bg-green-500"
      : project.progress >= 50
        ? "bg-blue-500"
        : project.progress > 0
          ? "bg-amber-500"
          : "bg-muted-foreground/30";

  const health = (() => {
    if (project.health) return project.health;
    if (!project.deadline) return "on-track";
    const diff = new Date(project.deadline).getTime() - Date.now();
    if (diff < 0) return "delayed";
    if (diff < 7 * 24 * 60 * 60 * 1000) return "at-risk";
    return "on-track";
  })();

  const daysLeft = project.deadline
    ? Math.ceil((new Date(project.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;

  const healthIcon =
    health === "on-track" ? (
      <CheckCircle2Icon className="size-3 text-green-500" />
    ) : health === "at-risk" ? (
      <AlertCircleIcon className="size-3 text-amber-500" />
    ) : (
      <ArrowDownIcon className="size-3 text-red-500" />
    );

  const healthLabel =
    health === "on-track" ? "On Track" : health === "at-risk" ? "At Risk" : "Delayed";

  const submissionRows = useMemo(
    () =>
      projectTasks.map((t: ProjectTask, i: number) => ({
        id: t.id || t._id || `row-${i}`,
        drawNo: String(t.drawNo || t.id || t._id || `#${i + 1}`).replace(/^TASK-/, ""),
        title: t.title || "Untitled",
        workDescription: t.description || "\u2014",
        weight: t.priority || "\u2014",
        status: normalizeSubmissionStatus(t.status),
        assignee: t.assigneeName || "\u2014",
      })),
    [projectTasks],
  );

  const appSubmissionCount = submissionRows.filter((s) => s.status === "APP").length;
  const ffuCount = submissionRows.filter((s) => s.status === "FFU").length;
  const rrCount = submissionRows.filter((s) => s.status === "R&R").length;

  return (
    <div className="flex flex-1 min-h-0 flex-col">
      <div className="flex items-center gap-1 px-4 sm:px-6 pt-3 pb-3 shrink-0 overflow-x-auto border-b bg-muted/30">
        {TABS.map((t, i) => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(i)}
              className={cn(
                "flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-medium transition-all whitespace-nowrap",
                tab === i
                  ? "bg-white text-black shadow-sm ring-1 ring-border"
                  : "text-muted-foreground hover:bg-white/60 hover:text-foreground",
              )}
            >
              <Icon className="size-3.5" />
              {t.label}
            </button>
          );
        })}
      </div>

      {tab === 4 ? (
        <div className="flex-1 min-h-0 overflow-hidden">
          <ProjectFileManager orgId={orgIdProp || ""} />
        </div>
      ) : (
        <ScrollArea className="flex-1 px-4 sm:px-6 pb-6">
          {tab === 0 && (
            <div className="space-y-4">
              <div
                className="relative overflow-hidden rounded-xl border shadow-sm"
                style={{
                  background: `linear-gradient(115deg, ${project.color} 0%, color-mix(in srgb, ${project.color} 40%, white) 100%)`,
                }}
              >
                <div
                  className="absolute -right-8 -top-8 size-40 rounded-full bg-white/20 blur-2xl"
                  aria-hidden
                />
                <div className="relative flex flex-col sm:flex-row sm:items-center gap-4 p-4 sm:p-5">
                  <div className="size-14 shrink-0 rounded-xl bg-white/70 backdrop-blur flex items-center justify-center text-xl font-bold text-black shadow-sm">
                    {project.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-xl sm:text-2xl font-bold truncate text-black">
                        {project.name}
                      </h2>
                      <PriorityBadge priority={project.priority} />
                    </div>
                    <p className="mt-0.5 flex items-center gap-1.5 text-sm text-black/70">
                      <UsersIcon className="size-3.5" />
                      {project.client}
                    </p>
                    {project.category && (
                      <Badge className="mt-2 bg-white/60 text-black/80 border-transparent capitalize">
                        {project.category}
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge className="bg-black/80 text-white border-transparent">
                      {project.access}
                    </Badge>
                    <Badge
                      className={
                        project.status === "Active"
                          ? "bg-white/80 text-black border-transparent"
                          : "bg-black/60 text-white border-transparent"
                      }
                    >
                      {project.status}
                    </Badge>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                <StatCard
                  icon={<TargetIcon className="size-4 text-muted-foreground" />}
                  label="Progress"
                  value={`${project.progress}%`}
                />
                <StatCard
                  icon={<ClockIcon className="size-4 text-muted-foreground" />}
                  label="Tracked Hours"
                  value={`${project.tracked}h`}
                />
                <StatCard
                  icon={<CalendarIcon className="size-4 text-muted-foreground" />}
                  label="Deadline"
                  value={
                    daysLeft !== null
                      ? daysLeft < 0
                        ? "Overdue"
                        : `${daysLeft}d left`
                      : "No deadline"
                  }
                />
                <StatCard
                  icon={<RotateCcwIcon className="size-4 text-muted-foreground" />}
                  label="Revisions"
                  value={String(revisions.length)}
                />
                <StatCard
                  icon={<SendIcon className="size-4 text-muted-foreground" />}
                  label="Submissions Count"
                  value={String(submissionRows.length)}
                />
                <StatCard
                  icon={<CheckCircle2Icon className="size-4 text-green-500" />}
                  label="APP"
                  value={String(appSubmissionCount)}
                />
                <StatCard
                  icon={<CircleIcon className="size-4 text-blue-500" />}
                  label="FFU"
                  value={String(ffuCount)}
                />
                <StatCard
                  icon={<AlertCircleIcon className="size-4 text-amber-500" />}
                  label="R&R"
                  value={String(rrCount)}
                />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="space-y-4 lg:col-span-2">
                  <Card className="gap-3 shadow-none">
                    <CardHeader className="pb-0">
                      <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                        <BarChart3Icon className="size-4 text-muted-foreground" />
                        Progress
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="flex items-center gap-3">
                        <div className="flex-1 h-2.5 rounded-full bg-muted overflow-hidden">
                          <div
                            className={cn("h-full rounded-full transition-all", progressColor)}
                            style={{ width: `${project.progress}%` }}
                          />
                        </div>
                        <span className="text-sm font-semibold whitespace-nowrap">
                          {project.progress}%
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <ClockIcon className="size-3" />{" "}
                          {daysLeft !== null
                            ? daysLeft < 0
                              ? "Overdue"
                              : `${daysLeft} days left`
                            : "No deadline"}
                        </span>
                        <span className="flex items-center gap-1">
                          {healthIcon} {healthLabel}
                        </span>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="gap-3 shadow-none">
                    <CardHeader className="pb-0">
                      <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                        <FileTextIcon className="size-4 text-muted-foreground" />
                        About
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm leading-relaxed text-muted-foreground">
                        {project.description || "No description provided for this project."}
                      </p>
                    </CardContent>
                  </Card>
                </div>

                <Card className="gap-3 self-start shadow-none">
                  <CardHeader className="pb-0">
                    <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                      <InfoIcon className="size-4 text-muted-foreground" />
                      Details
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-2 gap-x-4 gap-y-4">
                    <FieldRow label="Project ID" value={project.id} />
                    <FieldRow label="Category" value={project.category || "\u2014"} />
                    <FieldRow label="Priority" value={project.priority || "medium"} />
                    <FieldRow label="Access" value={project.access} />
                    <FieldRow label="Status" value={project.status} />
                    <FieldRow
                      label="Start Date"
                      value={
                        project.startDate
                          ? new Date(project.startDate).toLocaleDateString()
                          : "\u2014"
                      }
                    />
                    <FieldRow
                      label="Deadline"
                      value={
                        project.deadline
                          ? new Date(project.deadline).toLocaleDateString()
                          : "No deadline"
                      }
                    />
                    <FieldRow
                      label="Team"
                      value={memberNames.length ? String(memberNames.length) : "\u2014"}
                    />
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {tab === 1 && (
            <div className="space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Team Members ({memberNames.length})
              </h3>
              {memberNames.length === 0 ? (
                <div className="flex items-center justify-center py-12 rounded-sm border border-dashed">
                  <div className="text-center space-y-2">
                    <UsersIcon className="size-8 mx-auto text-muted-foreground/40" />
                    <p className="text-sm text-muted-foreground">No team members assigned</p>
                  </div>
                </div>
              ) : (
                <div className="overflow-hidden rounded-lg border bg-white shadow-sm">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                      <thead className="bg-muted/50">
                        <tr>
                          <th className="px-4 py-3 font-semibold whitespace-nowrap">#</th>
                          <th className="px-4 py-3 font-semibold whitespace-nowrap">Member</th>
                          <th className="px-4 py-3 font-semibold whitespace-nowrap">Member ID</th>
                          <th className="px-4 py-3 font-semibold whitespace-nowrap">
                            Team Head Status
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {memberNames.map((m, i) => (
                          <tr
                            key={m.id}
                            className="border-t border-border hover:bg-muted/30 transition-colors"
                          >
                            <td className="px-4 py-3 text-muted-foreground">{i + 1}</td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-3">
                                <div className="size-8 rounded-lg bg-muted flex items-center justify-center text-[10px] font-medium shrink-0 overflow-hidden">
                                  {m.image ? (
                                    // biome-ignore lint/performance/noImgElement: user avatar from auth provider
                                    <img
                                      src={m.image}
                                      alt={m.name}
                                      className="size-full object-cover"
                                    />
                                  ) : (
                                    <span>
                                      {m.name
                                        .split(" ")
                                        .map((n) => n[0])
                                        .join("")
                                        .toUpperCase()
                                        .slice(0, 2)}
                                    </span>
                                  )}
                                </div>
                                <span className="font-medium">{m.name}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                              {m.id || "\u2014"}
                            </td>
                            <td className="px-4 py-3">
                              {m.id === project.headId || m.name === project.headName ? (
                                <Badge
                                  variant="outline"
                                  className="gap-1 border-green-300 bg-green-50 text-green-700"
                                >
                                  <CheckCircle2Icon className="size-2.5" />
                                  Team Head
                                </Badge>
                              ) : (
                                <Badge
                                  variant="outline"
                                  className="gap-1 border-muted bg-muted/40 text-muted-foreground"
                                >
                                  <UsersIcon className="size-2.5" />
                                  Member
                                </Badge>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {tab === 2 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Time Entries ({timeEntries.length})
                </h3>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <TimerIcon className="size-3.5" />
                  <span className="font-medium">
                    {Math.floor(timeEntries.reduce((s, e) => s + e.duration, 0) / 60)}h{" "}
                    {timeEntries.reduce((s, e) => s + e.duration, 0) % 60}m
                  </span>
                </div>
              </div>
              {timeEntries.length === 0 ? (
                <div className="flex items-center justify-center py-12 rounded-sm border border-dashed">
                  <div className="text-center space-y-2">
                    <TimerIcon className="size-8 mx-auto text-muted-foreground/40" />
                    <p className="text-sm text-muted-foreground">
                      No time entries for this project
                    </p>
                  </div>
                </div>
              ) : (
                <TimeEntriesTable timeEntries={timeEntries} userMap={userMap} />
              )}
            </div>
          )}

          {tab === 3 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Recent Activity ({auditLogs.length})
                </h3>
                <span className="text-[11px] text-muted-foreground">
                  Audit logs for this project's team &amp; users
                </span>
              </div>
              {auditLogs.length === 0 ? (
                <div className="rounded-lg border bg-white p-10 text-center text-sm text-muted-foreground shadow-sm">
                  No audit logs found for this project's team members.
                </div>
              ) : (
                <div className="overflow-hidden rounded-lg border bg-white shadow-sm">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                      <thead className="bg-muted/50">
                        <tr>
                          <th className="px-4 py-3 font-semibold whitespace-nowrap">#</th>
                          <th className="px-4 py-3 font-semibold whitespace-nowrap">User</th>
                          <th className="px-4 py-3 font-semibold whitespace-nowrap">Action</th>
                          <th className="px-4 py-3 font-semibold whitespace-nowrap">Details</th>
                          <th className="px-4 py-3 font-semibold whitespace-nowrap">
                            Date &amp; Time
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {auditLogs.map((log, logIndex) => (
                          <tr
                            key={log.id || `${log.userId}-${log.createdAt}`}
                            className="border-t border-border hover:bg-muted/30 transition-colors"
                          >
                            <td className="px-4 py-3 text-muted-foreground">{logIndex + 1}</td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2.5">
                                <div className="size-7 rounded-md bg-muted flex items-center justify-center shrink-0">
                                  <ActivityIcon className="size-3.5 text-muted-foreground" />
                                </div>
                                <span className="font-medium">{log.user}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              {log.action
                                .replace(/_/g, " ")
                                .replace(/\b\w/g, (c) => c.toUpperCase())}
                            </td>
                            <td className="px-4 py-3 text-muted-foreground">
                              {log.details || "\u2014"}
                            </td>
                            <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                              {log.createdAt
                                ? new Date(log.createdAt).toLocaleDateString() +
                                  " " +
                                  new Date(log.createdAt).toLocaleTimeString([], {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })
                                : "\u2014"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {tab === 5 && (
            <div className="space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Project Tasks ({projectTasks.length})
              </h3>
              {projectTasks.length === 0 ? (
                <div className="flex items-center justify-center py-12 rounded-sm border border-dashed">
                  <div className="text-center space-y-2">
                    <ListChecksIcon className="size-8 mx-auto text-muted-foreground/40" />
                    <p className="text-sm text-muted-foreground">No tasks linked to this project</p>
                  </div>
                </div>
              ) : (
                <TaskDataTable
                  data={projectTasks}
                  hideSearchBar
                  hidePageSizeSelector
                  pageSize={10}
                  label="task"
                  emptyMessage="No tasks linked to this project"
                />
              )}
            </div>
          )}

          {tab === 6 && (
            <div className="space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Submissions ({submissionRows.length})
              </h3>
              {submissionRows.length === 0 ? (
                <div className="flex items-center justify-center py-12 rounded-sm border border-dashed">
                  <div className="text-center space-y-2">
                    <SendIcon className="size-8 mx-auto text-muted-foreground/40" />
                    <p className="text-sm text-muted-foreground">No submissions for this project</p>
                  </div>
                </div>
              ) : (
                <div className="overflow-hidden rounded-lg border bg-white shadow-sm">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left min-w-[760px]">
                      <thead className="bg-muted/50">
                        <tr>
                          <th className="px-4 py-3 font-semibold whitespace-nowrap">#</th>
                          <th className="px-4 py-3 font-semibold whitespace-nowrap">Draw No</th>
                          <th className="px-4 py-3 font-semibold whitespace-nowrap">Title</th>
                          <th className="px-4 py-3 font-semibold whitespace-nowrap">
                            Work Description
                          </th>
                          <th className="px-4 py-3 font-semibold whitespace-nowrap">Weight</th>
                          <th className="px-4 py-3 font-semibold whitespace-nowrap">Assignee</th>
                          <th className="px-4 py-3 font-semibold whitespace-nowrap">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {submissionRows.map((s, i) => (
                          <tr
                            key={s.id}
                            className="border-t border-border hover:bg-muted/30 transition-colors"
                          >
                            <td className="px-4 py-3 text-muted-foreground">{i + 1}</td>
                            <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                              {s.drawNo}
                            </td>
                            <td className="px-4 py-3 font-medium">{s.title}</td>
                            <td className="px-4 py-3 text-muted-foreground">{s.workDescription}</td>
                            <td className="px-4 py-3 font-mono text-xs">{s.weight}</td>
                            <td className="px-4 py-3">{s.assignee}</td>
                            <td className="px-4 py-3">
                              <SubmissionStatusBadge status={s.status} />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {tab === 7 && (
            <div className="space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Revisions ({revisions.length})
              </h3>
              {revisions.length === 0 ? (
                <div className="flex items-center justify-center py-12 rounded-sm border border-dashed">
                  <div className="text-center space-y-2">
                    <RotateCcwIcon className="size-8 mx-auto text-muted-foreground/40" />
                    <p className="text-sm text-muted-foreground">No revisions for this project</p>
                  </div>
                </div>
              ) : (
                <div className="overflow-hidden rounded-lg border bg-white shadow-sm">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text min-w-[780px]">
                      <thead className="bg-muted/50">
                        <tr>
                          <th className="px-4 py-3 font-semibold whitespace-nowrap">#</th>
                          <th className="px-4 py-3 font-semibold whitespace-nowrap">Task</th>
                          <th className="px-4 py-3 font-semibold whitespace-nowrap">Description</th>
                          <th className="px-4 py-3 font-semibold whitespace-nowrap">Remarks</th>
                          <th className="px-4 py-3 font-semibold whitespace-nowrap">Project</th>
                          <th className="px-4 py-3 font-semibold whitespace-nowrap">Assignee</th>
                          <th className="px-4 py-3 font-semibold whitespace-nowrap">Due Date</th>
                          <th className="px-4 py-3 font-semibold whitespace-nowrap">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {revisions.map((r, i) => (
                          <tr
                            key={r.id}
                            className="border-t border-border hover:bg-muted/30 transition-colors"
                          >
                            <td className="px-4 py-3 text-muted-foreground">{i + 1}</td>
                            <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                              {r.taskId || r.id}
                            </td>
                            <td className="px-4 py-3 font-medium">{r.description || "\u2014"}</td>
                            <td className="px-4 py-3 text-muted-foreground">
                              {r.remarks || "\u2014"}
                            </td>
                            <td className="px-4 py-3 text-muted-foreground">
                              {r.selectedFiles || project.name}
                            </td>
                            <td className="px-4 py-3">{r.assignee || "\u2014"}</td>
                            <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                              {r.dueDate ? new Date(r.dueDate).toLocaleDateString() : "\u2014"}
                            </td>
                            <td className="px-4 py-3">
                              <Badge
                                variant="outline"
                                className={
                                  r.status === "Completed"
                                    ? "bg-green-100 text-green-700 border-transparent"
                                    : "bg-yellow-100 text-yellow-700 border-transparent"
                                }
                              >
                                {r.status || "InCompleted"}
                              </Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </ScrollArea>
      )}
    </div>
  );
}

function TimeEntriesTable({
  timeEntries,
  userMap,
}: {
  timeEntries: TimeEntry[];
  userMap: Record<string, string>;
}) {
  const columns = useMemo<ColumnDef<TimeEntry>[]>(
    () => [
      {
        id: "index",
        header: "#",
        cell: ({ row }) => (
          <span className="font-mono text-xs text-muted-foreground">#{row.index + 1}</span>
        ),
        size: 70,
      },
      {
        accessorKey: "userId",
        header: "User",
        cell: ({ row }) => (
          <span className="font-medium">
            {userMap[row.original.userId] || row.original.userId.slice(0, 8)}
          </span>
        ),
      },
      {
        accessorKey: "description",
        header: "Description",
        cell: ({ row }) => <span className="text-sm">{row.original.description}</span>,
      },
      {
        accessorKey: "date",
        header: "Date",
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">
            {new Date(row.original.date).toLocaleDateString()}
          </span>
        ),
      },
      {
        id: "time",
        header: "Time",
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">
            {row.original.startTime && row.original.endTime
              ? `${row.original.startTime} - ${row.original.endTime}`
              : "\u2014"}
          </span>
        ),
      },
      {
        id: "duration",
        header: "Duration",
        cell: ({ row }) => {
          const entry = row.original;
          const dur =
            entry.startTime && entry.endTime
              ? (() => {
                  const [sh, sm] = entry.startTime.split(":").map(Number);
                  const [eh, em] = entry.endTime.split(":").map(Number);
                  return Math.max(0, eh * 60 + em - (sh * 60 + sm));
                })()
              : entry.duration;
          return (
            <span className="text-sm font-mono font-medium">
              {Math.floor(dur / 60)}h {dur % 60}m
            </span>
          );
        },
      },
    ],
    [userMap],
  );

  return (
    <DataTable
      columns={columns}
      data={timeEntries}
      label="time entry(ies)"
      hideSearchBar
      hidePageSizeSelector
      pageSize={10}
    />
  );
}

function SubmissionStatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    FFU: "bg-blue-100 text-blue-700 border-transparent",
    APP: "bg-green-100 text-green-700 border-transparent",
    "R&R": "bg-amber-100 text-amber-700 border-transparent",
  };
  return (
    <Badge
      variant="outline"
      className={styles[status] || "bg-slate-100 text-slate-700 border-transparent"}
    >
      {status || "FFU"}
    </Badge>
  );
}

function ProjectFileManager({ orgId }: { orgId: string }) {
  const { data: session, status } = useSession();
  const user = session?.user as (Record<string, unknown> | undefined) | null;
  const resolvedOrg = orgId || (user?.orgId as string | undefined);
  const userId = user?.id as string | undefined;
  const userRole = (user?.role as string) || "staffs";

  if (status === "loading" || !userId || !resolvedOrg) {
    return (
      <div className="flex flex-1 items-center justify-center p-8">
        <div className="size-6 animate-spin rounded-full border-2 border-current border-t-transparent" />
      </div>
    );
  }

  return <FileManagerClient orgId={resolvedOrg} userId={userId} userRole={userRole} />;
}
