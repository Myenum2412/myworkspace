"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { apiCreateCall } from "@/lib/call-api";
import { cn } from "@/lib/utils";

export interface SchedulableMember {
  id: string;
  name: string;
  email: string;
  avatar?: string;
}

export default function CallScheduler({
  open,
  onOpenChange,
  channelId,
  type,
  channelName,
  media,
  members,
  currentUserId,
  onJoined,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  channelId?: string;
  type: "dm" | "group" | "channel";
  channelName?: string;
  media?: "video" | "audio";
  members: SchedulableMember[];
  currentUserId: string;
  onJoined?: (callId: string) => void;
}) {
  const [name, setName] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [scheduleTime, setScheduleTime] = useState("");
  const [busy, setBusy] = useState(false);

  const others = useMemo(
    () => members.filter((m) => m.id !== currentUserId),
    [members, currentUserId],
  );

  const start = async () => {
    setBusy(true);
    try {
      const invitees = type === "dm" ? others.map((o) => o.id) : [...selected];
      const { data } = await apiCreateCall({
        channelId,
        type,
        name: name.trim() || channelName,
        media: media || "video",
        invitees,
        scheduledAt: scheduleTime || undefined,
      });
      toast.success(scheduleTime ? "Call scheduled" : "Call started");
      onOpenChange(false);
      if (!scheduleTime) onJoined?.(data.id);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to start call");
    } finally {
      setBusy(false);
    }
  };

  const toggleMember = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{scheduleTime ? "Schedule a call" : "Start a call"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="call-name">Call name</Label>
            <Input
              id="call-name"
              placeholder={
                type === "dm"
                  ? "Direct call"
                  : channelName || (type === "group" ? "Group call" : "Channel call")
              }
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          {type !== "dm" && (
            <div className="space-y-1.5">
              <Label>Invite members (optional — channel members can join anyway)</Label>
              <ScrollArea className="h-40 rounded-md border">
                <div className="p-1.5">
                  {others.length === 0 && (
                    <p className="p-3 text-sm text-muted-foreground">No other members to invite</p>
                  )}
                  {others.map((m) => {
                    const active = selected.has(m.id);
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => toggleMember(m.id)}
                        className={cn(
                          "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent",
                          active && "bg-accent",
                        )}
                      >
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={m.avatar} />
                          <AvatarFallback>{m.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <span className="flex-1 truncate">{m.name}</span>
                        {active && (
                          <span className="text-xs font-medium text-primary">Selected</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </ScrollArea>
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="call-schedule">Schedule for (optional)</Label>
            <Input
              id="call-schedule"
              type="datetime-local"
              value={scheduleTime}
              onChange={(e) => setScheduleTime(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Leave empty to start the call immediately.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
            Cancel
          </Button>
          <Button
            onClick={start}
            disabled={
              busy || (type !== "dm" && others.length > 0 && selected.size === 0 && !scheduleTime)
            }
          >
            {scheduleTime ? "Schedule" : "Start call"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
