"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { PlusCircle, Tag, Calendar, Clock, List, Loader2 } from "lucide-react";
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

interface TimeTrackerProps {
  user: { name: string; email: string; avatar: string; id: string };
  orgId: string;
}

export default function TimeTracker({ user, orgId }: TimeTrackerProps) {
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [description, setDescription] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
        }),
      });
      if (res.ok) {
        setDescription("");
        setStartTime("");
        setEndTime("");
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <main className="flex flex-1 flex-col bg-background min-h-screen items-center justify-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
        <span className="ml-2 text-sm text-muted-foreground">Loading...</span>
      </main>
    );
  }

  if (error) {
    return (
      <main className="flex flex-1 flex-col bg-background min-h-screen items-center justify-center">
        <p className="text-sm text-destructive">{error}</p>
      </main>
    );
  }

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
                Project
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-[220px]">
              <DropdownMenuLabel className="text-xs text-gray-500 font-medium uppercase tracking-wider">Recent Projects</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="cursor-pointer">
                <div className="w-2 h-2 rounded-full bg-red-500 mr-2 shadow-sm"></div>
                Website Redesign
              </DropdownMenuItem>
              <DropdownMenuItem className="cursor-pointer">
                <div className="w-2 h-2 rounded-full bg-green-500 mr-2 shadow-sm"></div>
                Mobile App
              </DropdownMenuItem>
              <DropdownMenuItem className="cursor-pointer">
                <div className="w-2 h-2 rounded-full bg-blue-500 mr-2 shadow-sm"></div>
                Marketing Campaign
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="cursor-pointer text-primary font-medium hover:text-primary focus:text-primary focus:bg-secondary">
                <PlusCircle className="size-4 mr-2" />
                Create new project
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="h-6 w-px bg-gray-200"></div>

          <button className="hover:text-gray-800 transition-colors">
            <Tag className="size-[18px]" />
          </button>

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
            00:00:00
          </div>

          <Button
            className="bg-primary hover:bg-accent text-primary-foreground rounded-none h-[34px] px-[22px] font-semibold shadow-none tracking-wide text-[13px] disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={handleAdd}
            disabled={saving || !description.trim()}
          >
            {saving ? <Loader2 className="size-4 animate-spin" /> : null}
            {saving ? "SAVING" : "ADD"}
          </Button>

          <div className="h-6 w-px bg-gray-200"></div>

          <div className="flex flex-col items-center justify-center gap-[2px] opacity-60 hover:opacity-100 cursor-pointer transition-opacity px-1">
            <Clock className="size-[14px]" />
            <List className="size-[14px]" />
          </div>
        </div>
      </div>
    </main>
  );
}
