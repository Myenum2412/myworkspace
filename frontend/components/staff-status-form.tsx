"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  CheckCircle2Icon,
  CircleSlash2Icon,
  ClockIcon,
  CoffeeIcon,
  VideoIcon,
  HomeIcon,
  SparklesIcon,
  RefreshCwIcon,
  HistoryIcon,
  AlertCircleIcon,
} from "lucide-react";

type StatusOption = {
  value: string;
  label: string;
  icon: any;
  color: string;
  bg: string;
  ring: string;
};

const STATUS_OPTIONS: StatusOption[] = [
  { value: "available", label: "Available", icon: CheckCircle2Icon, color: "text-green-600", bg: "bg-green-50", ring: "ring-green-500" },
  { value: "busy", label: "Busy", icon: ClockIcon, color: "text-red-600", bg: "bg-red-50", ring: "ring-red-500" },
  { value: "break", label: "On Break", icon: CoffeeIcon, color: "text-amber-600", bg: "bg-amber-50", ring: "ring-amber-500" },
  { value: "meeting", label: "In Meeting", icon: VideoIcon, color: "text-purple-600", bg: "bg-purple-50", ring: "ring-purple-500" },
  { value: "offline", label: "Offline", icon: CircleSlash2Icon, color: "text-gray-500", bg: "bg-gray-100", ring: "ring-gray-400" },
  { value: "remote", label: "Working Remotely", icon: HomeIcon, color: "text-blue-600", bg: "bg-blue-50", ring: "ring-blue-500" },
];

function formatTimeAgo(date: Date | string | null): string {
  if (!date) return "";
  const now = Date.now();
  const diff = now - new Date(date).getTime();
  if (diff < 60000) return "Just now";
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

export function StaffStatusForm({
  userId,
  onStatusUpdate,
  className,
}: {
  userId?: string;
  onStatusUpdate?: (status: string) => void;
  className?: string;
}) {
  const [selectedStatus, setSelectedStatus] = useState("available");
  const [statusNote, setStatusNote] = useState("");
  const [customStatus, setCustomStatus] = useState("");
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!userId) return;
    const qs = userId ? `?userId=${userId}` : "";
    fetch(`/api/user/status${qs}`, { credentials: "include" })
      .then((r) => r.json())
      .then((d) => {
        const data = d.data || d;
        setSelectedStatus(data.status || "available");
        setStatusNote(data.statusNote || "");
        setCustomStatus(data.customStatus || "");
        setLastUpdated(data.statusUpdatedAt || null);
      })
      .catch(() => {});
  }, [userId]);

  const handleUpdate = useCallback(async () => {
    setSaving(true);
    setError("");
    try {
      const body: Record<string, unknown> = {
        userId,
        status: selectedStatus === "custom" ? customStatus : selectedStatus,
        statusNote: statusNote || "",
      };
      if (selectedStatus === "custom") {
        body.customStatus = customStatus;
      }
      const res = await fetch("/api/user/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || "Failed to update status");
      }
      setLastUpdated(new Date().toISOString());
      onStatusUpdate?.(selectedStatus);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update status");
    } finally {
      setSaving(false);
    }
  }, [userId, selectedStatus, statusNote, customStatus, onStatusUpdate]);

  return (
    <div className={className}>
      <div className="px-5 pt-5 pb-3">
        <div className="flex items-center gap-2 mb-1">
          <RefreshCwIcon className="size-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold">Update Status</h3>
        </div>
        <p className="text-xs text-muted-foreground">Let your team know what you&apos;re up to</p>
      </div>

      <div className="px-5 pb-3">
        <div className="grid grid-cols-2 gap-2">
          {STATUS_OPTIONS.map((opt) => {
            const Icon = opt.icon;
            const isActive = selectedStatus === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => setSelectedStatus(opt.value)}
                className={`flex items-center gap-2.5 rounded-lg border px-3 py-2.5 text-left transition-all ${
                  isActive
                    ? `${opt.bg} ${opt.color} border-transparent ring-2 ${opt.ring}`
                    : "bg-card hover:bg-accent/50 border-border"
                }`}
              >
                <Icon className={`size-4 shrink-0 ${isActive ? opt.color : "text-muted-foreground"}`} />
                <span className={`text-sm font-medium ${isActive ? "" : "text-foreground"}`}>{opt.label}</span>
                {isActive && <CheckCircle2Icon className="size-3.5 ml-auto shrink-0" />}
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={() => setSelectedStatus("custom")}
          className={`flex items-center gap-2.5 rounded-lg border px-3 py-2.5 text-left transition-all w-full mt-2 ${
            selectedStatus === "custom"
              ? "bg-muted text-foreground border-transparent ring-2 ring-muted-foreground/30"
              : "bg-card hover:bg-accent/50 border-border"
          }`}
        >
          <SparklesIcon className={`size-4 shrink-0 ${selectedStatus === "custom" ? "text-foreground" : "text-muted-foreground"}`} />
          <span className={`text-sm font-medium ${selectedStatus === "custom" ? "" : "text-foreground"}`}>Custom Status</span>
          {selectedStatus === "custom" && <CheckCircle2Icon className="size-3.5 ml-auto shrink-0" />}
        </button>
      </div>

      {selectedStatus === "custom" && (
        <div className="px-5 pb-3">
          <input
            value={customStatus}
            onChange={(e) => setCustomStatus(e.target.value)}
            placeholder=""
            className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:border-ring"
            maxLength={60}
            autoFocus
          />
        </div>
      )}

      <div className="px-5 pb-3">
        <Textarea
          value={statusNote}
          onChange={(e) => setStatusNote(e.target.value)}
          placeholder=""
          className="min-h-[60px] resize-none text-sm"
          maxLength={200}
        />
      </div>

      {error && (
        <div className="px-5 pb-2">
          <div className="flex items-center gap-1.5 text-xs text-red-600">
            <AlertCircleIcon className="size-3" />
            {error}
          </div>
        </div>
      )}

      <div className="px-5 pb-5">
        <Button
          onClick={handleUpdate}
          disabled={saving || (selectedStatus === "custom" && !customStatus.trim())}
          className="w-full gap-2"
          size="lg"
        >
          {saving ? (
            <>
              <RefreshCwIcon className="size-4 animate-spin" />
              Updating...
            </>
          ) : (
            <>
              <CheckCircle2Icon className="size-4" />
              Update Status
            </>
          )}
        </Button>
      </div>

      {lastUpdated && (
        <div className="border-t px-5 py-3 flex items-center gap-2 text-xs text-muted-foreground">
          <HistoryIcon className="size-3" />
          Last updated: {formatTimeAgo(lastUpdated)}
        </div>
      )}
    </div>
  );
}
