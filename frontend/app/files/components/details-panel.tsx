"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useFileSystemStore } from "@/lib/file-system/store";
import { formatSize, type FileItem } from "@/lib/file-system/types";
import * as api from "@/lib/file-system/api";
import { cn } from "@/lib/utils";
import { DriveTile } from "./drive-menu";
import { XIcon, HistoryIcon, ActivityIcon, InfoIcon, UserIcon, ClockIcon, HardDriveIcon, ShieldIcon, TagIcon } from "@/lib/icons";

type Tab = "details" | "activity" | "versions";

function SectionLabel({ icon: Icon, children }: { icon: React.ElementType; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
      <Icon className="size-3.5" />
      {children}
    </div>
  );
}

function Field({ label, value }: { label: string; value?: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 py-2">
      <span className="shrink-0 text-xs text-muted-foreground">{label}</span>
      <span className="truncate text-right text-xs font-medium text-foreground">{value ?? <span className="text-muted-foreground/50">—</span>}</span>
    </div>
  );
}

export function DetailsPanel({ file, onClose }: { file: FileItem | null; onClose: () => void }) {
  const orgId = useFileSystemStore((s) => s.orgId);
  const [tab, setTab] = useState<Tab>("details");

  const versions = useQuery({
    queryKey: ["versions", file?.id],
    queryFn: () => (file ? api.listVersions(file.id) : Promise.resolve([])),
    enabled: !!file && tab === "versions",
  });

  const activity = useQuery({
    queryKey: ["activity", orgId, file?.id],
    queryFn: () => api.listAuditLogs({ orgId, entityType: "file", search: file?.originalName }),
    enabled: !!file && !!orgId && tab === "activity" && file?.id != null,
  });

  if (!file) {
    return (
      <div className="hidden w-[320px] shrink-0 lg:flex flex-col items-center justify-center gap-2 border-l border-border/70 bg-card/40 p-6 text-center">
        <InfoIcon className="size-8 text-muted-foreground/30" />
        <p className="text-sm text-muted-foreground">Select a file to see details</p>
      </div>
    );
  }

  const tabs: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: "details", label: "Details", icon: InfoIcon },
    { id: "activity", label: "Activity", icon: ActivityIcon },
    { id: "versions", label: "Versions", icon: HistoryIcon },
  ];

  return (
    <div className="flex w-[340px] shrink-0 flex-col border-l border-border/70 bg-card/40">
      <div className="flex items-center justify-between gap-2 border-b border-border/70 px-4 py-3">
        <div className="flex items-center gap-1 rounded-full bg-muted p-0.5">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                "flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium transition-colors",
                tab === t.id ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <t.icon className="size-3.5" />
              <span className="hidden sm:inline">{t.label}</span>
            </button>
          ))}
        </div>
        <button onClick={onClose} className="grid size-7 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground">
          <XIcon className="size-4" />
        </button>
      </div>

      <div className="no-scrollbar flex-1 overflow-y-auto p-4">
        <div className="mb-4 aspect-[4/3] w-full overflow-hidden rounded-xl border border-border/60">
          <DriveTile file={file} />
        </div>
        <p className="text-sm font-semibold leading-snug text-foreground">{file.originalName}</p>
        <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
          <UserIcon className="size-3" />
          {file.uploaderName || "Unknown owner"}
        </p>

        {tab === "details" && (
          <div className="mt-4 space-y-1 border-t border-border/60 pt-2">
            <Field label="Size" value={formatSize(file.size)} />
            <Field label="Type" value={file.mimeType} />
            <Field label="Version" value={file.currentVersion ? `v${file.currentVersion}` : "v1"} />
            <Field label="Modified" value={file.updatedAt ? new Date(file.updatedAt).toLocaleString() : "—"} />
            <Field label="Created" value={file.createdAt ? new Date(file.createdAt).toLocaleString() : "—"} />
            <div className="border-t border-border/60 pt-2">
              <SectionLabel icon={ShieldIcon}>Permissions</SectionLabel>
              <div className="mt-1 rounded-lg bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
                {file.isLocked ? `Locked${file.lockedBy ? ` by ${file.lockedBy}` : ""}` : "Available to you"}
                {file.approvalStatus && file.approvalStatus !== "none" ? ` · Approval: ${file.approvalStatus}` : ""}
              </div>
            </div>
            {file.tags && file.tags.length > 0 && (
              <div className="border-t border-border/60 pt-2">
                <SectionLabel icon={TagIcon}>Tags</SectionLabel>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {file.tags.map((t) => (
                    <span key={t} className="rounded-full bg-muted px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground">{t}</span>
                  ))}
                </div>
              </div>
            )}
            {file.description && (
              <div className="border-t border-border/60 pt-2">
                <SectionLabel icon={TagIcon}>Description</SectionLabel>
                <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{file.description}</p>
              </div>
            )}
          </div>
        )}

        {tab === "activity" && (
          <div className="mt-4 border-t border-border/60 pt-3">
            {activity.isLoading && <ActivitySkeleton />}
            {!activity.isLoading && (!activity.data || activity.data.length === 0) && (
              <div className="py-8 text-center text-xs text-muted-foreground">No activity recorded</div>
            )}
            <div className="relative ml-1.5 space-y-4 border-l-2 border-border/50 pl-4">
              {(activity.data || []).map((entry, i) => (
                <div key={entry.id || i} className="relative">
                  <span className="absolute -left-[21px] top-1 size-2.5 rounded-full bg-primary/60 ring-4 ring-background" />
                  <p className="text-xs font-medium text-foreground">{entry.description}</p>
                  <p className="mt-0.5 flex items-center gap-1 text-[11px] text-muted-foreground">
                    <ClockIcon className="size-3" />
                    {new Date(entry.createdAt).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === "versions" && (
          <div className="mt-4 border-t border-border/60 pt-3">
            <div className="flex items-center justify-between">
              <SectionLabel icon={HardDriveIcon}>Version history</SectionLabel>
            </div>
            {versions.isLoading && <ActivitySkeleton />}
            {!versions.isLoading && (!versions.data || versions.data.length === 0) && (
              <div className="py-8 text-center text-xs text-muted-foreground">No prior versions</div>
            )}
            <div className="mt-3 space-y-2">
              {(versions.data || []).sort((a, b) => b.versionNumber - a.versionNumber).map((v) => (
                <div key={v.id} className="flex items-center gap-2.5 rounded-lg border border-border/60 bg-card px-3 py-2">
                  <div className="grid size-7 shrink-0 place-items-center rounded-full bg-muted text-[10px] font-bold text-foreground">
                    v{v.versionNumber}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="truncate text-xs font-medium text-foreground">Version {v.versionNumber}</span>
                      {v.versionNumber === file.currentVersion && (
                        <span className="rounded-full bg-primary/10 px-1.5 py-px text-[9px] font-semibold text-primary">current</span>
                      )}
                    </div>
                    <p className="flex items-center gap-1 text-[10px] text-muted-foreground">
                      <ClockIcon className="size-3" />
                      {new Date(v.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <span className="shrink-0 text-[10px] text-muted-foreground">{formatSize(v.size)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}


function ActivitySkeleton() {
  return (
    <div className="space-y-3 py-2">
      {[0, 1, 2].map((i) => (
        <div key={i} className="space-y-1.5">
          <div className="h-3 w-3/4 animate-pulse rounded bg-muted" />
          <div className="h-2.5 w-1/3 animate-pulse rounded bg-muted" />
        </div>
      ))}
    </div>
  );
}