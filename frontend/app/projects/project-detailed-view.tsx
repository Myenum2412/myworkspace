"use client"
import { useState, useEffect } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Project } from "./columns";

const TABS = ["Project Info", "Team", "Performance Report"];

function FieldRow({ label, value }: { label: string; value: string | number | null | undefined }) {
  return (
    <div className="space-y-0.5">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium">{value ?? "\u2014"}</p>
    </div>
  );
}

export function ProjectDetailedView({ project, onEdit }: { project: Project; onEdit?: (p: Project) => void }) {
  const [tab, setTab] = useState(0);
  const [memberNames, setMemberNames] = useState<{ id: string; name: string; image?: string }[]>([]);

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

  const progressColor =
    project.progress >= 100 ? "bg-red-500" : project.progress >= 50 ? "bg-red-500" : project.progress > 0 ? "bg-red-500" : "bg-muted-foreground/30";

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 px-6 pt-2 pb-3 shrink-0">
        {TABS.map((t, i) => (
          <button
            key={t}
            onClick={() => setTab(i)}
            className={cn(
              "rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors",
              tab === i
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted"
            )}
          >
            {t}
          </button>
        ))}
        {onEdit && (
          <button
            onClick={() => onEdit(project)}
            className="ml-auto rounded-md px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted transition-colors"
          >
            Edit
          </button>
        )}
      </div>

      <ScrollArea className="flex-1 px-6 pb-6">
        {tab === 0 && (
          <div className="space-y-6">
            <div className="flex items-start gap-4">
              <div
                className="size-14 rounded-xl shrink-0 flex items-center justify-center text-black text-lg font-bold bg-gray-200"
                style={{ backgroundColor: project.color }}
              >
                {project.name.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="text-lg font-semibold truncate">{project.name}</h2>
                <p className="text-sm text-muted-foreground">{project.client}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Badge variant={project.access === "Public" ? "default" : "secondary"}>{project.access}</Badge>
                <Badge variant={project.status === "Active" ? "default" : "outline"}>{project.status}</Badge>
              </div>
            </div>

            <div className="rounded-lg border p-4 space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Details</h3>
              <div className="grid grid-cols-3 gap-4">
                <FieldRow label="Project ID" value={project.id} />
                <FieldRow label="Progress" value={`${project.progress}%`} />
                <FieldRow label="Tracked Hours" value={`${project.tracked}h`} />
                <FieldRow label="Deadline" value={project.deadline ? new Date(project.deadline).toLocaleDateString() : "No deadline"} />
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
            </div>
          </div>
        )}

        {tab === 1 && (
          <div className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Team Members</h3>
            {memberNames.length === 0 ? (
              <div className="flex items-center justify-center py-12">
                <p className="text-sm text-muted-foreground">No team members available</p>
              </div>
            ) : (
              <div className="space-y-2">
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
          <div className="space-y-5">
            {/* Summary Cards */}
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-lg border p-3.5 space-y-1">
                <p className="text-xs text-muted-foreground">Hours Tracked</p>
                <p className="text-2xl font-bold">{project.tracked}h</p>
              </div>
              <div className="rounded-lg border p-3.5 space-y-1">
                <p className="text-xs text-muted-foreground">Tasks Completed</p>
                <p className="text-2xl font-bold">
                  {Math.round((project.progress / 100) * 24)} / 24
                </p>
              </div>
              <div className="rounded-lg border p-3.5 space-y-1">
                <p className="text-xs text-muted-foreground">Completion</p>
                <p className="text-2xl font-bold">{project.progress}%</p>
              </div>
            </div>

            {/* Timeline / Milestone */}
            <div className="rounded-lg border p-4 space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Timeline</h3>
              <div className="space-y-3">
                {[
                  { label: "Kickoff", date: "Jan 15", done: true },
                  { label: "Design Phase", date: "Feb 28", done: project.progress >= 25 },
                  { label: "Development", date: "Apr 10", done: project.progress >= 50 },
                  { label: "Testing", date: "May 20", done: project.progress >= 75 },
                  { label: "Delivery", date: project.deadline ? new Date(project.deadline).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "TBD", done: project.progress >= 100 },
                ].map((m, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className={cn(
                      "size-3 rounded-full shrink-0 ring-2 ring-offset-1",
                      m.done ? "bg-red-500 ring-red-300" : "bg-muted ring-muted"
                    )} />
                    <div className="flex-1 flex items-center justify-between">
                      <span className={cn("text-sm", m.done ? "font-medium" : "text-muted-foreground")}>{m.label}</span>
                      <span className="text-xs text-muted-foreground">{m.date}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Weekly Activity */}
            <div className="rounded-lg border p-4 space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Weekly Activity</h3>
              <div className="flex items-end gap-1.5 h-20">
                {[40, 65, 25, 80, 55, 70, 30].map((v, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <div
                      className="w-full rounded-sm bg-primary/60 hover:bg-primary transition-colors"
                      style={{ height: `${v}%` }}
                    />
                    <span className="text-[10px] text-muted-foreground">
                      {["M","T","W","T","F","S","S"][i]}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Team Performance */}
            <div className="rounded-lg border p-4 space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Team Performance</h3>
              <div className="flex items-center justify-center py-8">
                <p className="text-sm text-muted-foreground">No performance data available</p>
              </div>
            </div>
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
