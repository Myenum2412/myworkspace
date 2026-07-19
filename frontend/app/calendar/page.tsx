"use client";

import { useEffect, useState, useCallback } from "react";
import {
  RiArrowLeftSLine, RiArrowRightSLine, RiCalendarLine,
  RiMapPinLine, RiTimeLine, RiGoogleLine, RiCheckLine,
} from "@remixicon/react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Popover, PopoverContent, PopoverDescription,
  PopoverHeader, PopoverTitle, PopoverTrigger,
} from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Loader2Icon } from "lucide-react";

type CalendarEvent = {
  id: string;
  title: string;
  start: string;
  end: string;
  allDay?: boolean;
  provider: string;
  calendarEmail?: string;
  htmlLink?: string;
};

type DayEvents = {
  label: string;
  date: Date;
  isToday: boolean;
  events: CalendarEvent[];
};

function getWeekDays(date: Date): Date[] {
  const start = new Date(date);
  start.setDate(start.getDate() - start.getDay());
  start.setHours(0, 0, 0, 0);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    return d;
  });
}

function formatTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatDuration(start: string, end: string) {
  const ms = new Date(end).getTime() - new Date(start).getTime();
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  if (h === 0) return `${m} min`;
  return `${h}h${m > 0 ? ` ${m}m` : ""}`;
}

function dayColor(d: Date): string | undefined {
  const day = d.getDay();
  if (day === 0) return "text-red-500";
  if (day === 6) return "text-yellow-500";
  return undefined;
}

function formatWeekRange(days: Date[]) {
  const start = days[0];
  const end = days[6];
  const opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
  if (start.getMonth() !== end.getMonth()) {
    return `${start.toLocaleDateString("en", opts)} – ${end.toLocaleDateString("en", opts)}, ${end.getFullYear()}`;
  }
  return `${start.toLocaleDateString("en", { month: "short" })} ${start.getDate()} – ${end.getDate()}, ${end.getFullYear()}`;
}

export default function CalendarPage() {
  const [weekStart, setWeekStart] = useState(() => {
    const now = new Date();
    now.setDate(now.getDate() - now.getDay());
    now.setHours(0, 0, 0, 0);
    return now;
  });
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);

  const days = getWeekDays(weekStart);

  const fetchEvents = useCallback(async (start: Date) => {
    const weekEnd = new Date(start);
    weekEnd.setDate(weekEnd.getDate() + 7);
    const timeMin = start.toISOString();
    const timeMax = weekEnd.toISOString();

    try {
      const res = await fetch(`/api/calendar/events?timeMin=${encodeURIComponent(timeMin)}&timeMax=${encodeURIComponent(timeMax)}`);
      if (res.ok) {
        const d = await res.json();
        setEvents(d.data || []);
      }
    } catch {
      // silent
    }
  }, []);

  const checkConnection = useCallback(async () => {
    try {
      const res = await fetch("/api/calendar/connections");
      if (res.ok) {
        const d = await res.json();
        setConnected((d.data || []).length > 0);
      }
    } catch {
      // silent
    }
  }, []);

  useEffect(() => {
    Promise.all([
      checkConnection(),
      fetchEvents(weekStart),
    ]).finally(() => setLoading(false));
  }, [weekStart, checkConnection, fetchEvents]);

  const handleConnect = () => {
    setConnecting(true);
    window.location.href = "/api/calendar/google";
  };

  const handleDisconnect = async () => {
    setConnecting(true);
    try {
      await fetch("/api/calendar/connections?provider=google", { method: "DELETE" });
      setConnected(false);
      setEvents([]);
    } catch {
      // silent
    } finally {
      setConnecting(false);
    }
  };

  const daysWithEvents: DayEvents[] = days.map((d) => {
    const dayEvents = events.filter((e) => {
      const eventStart = new Date(e.start);
      return eventStart.toDateString() === d.toDateString();
    });
    return {
      label: d.toLocaleDateString("en", { weekday: "short" }),
      date: d,
      isToday: d.toDateString() === new Date().toDateString(),
      events: dayEvents,
    };
  });

  const totalEvents = events.length;

  return (
    <main className="flex flex-1 flex-col gap-4 p-3 sm:p-4 md:p-6 min-w-0 max-w-full">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <RiCalendarLine className="size-6 shrink-0" />
          <h1 className="text-xl sm:text-2xl font-bold">Calendar</h1>
          {connected && (
            <Badge variant="secondary" className="gap-1">
              <RiCheckLine className="size-3" />
              Google Calendar
            </Badge>
          )}
        </div>
        <Button
          variant={connected ? "outline" : "default"}
          size="sm"
          onClick={connected ? handleDisconnect : handleConnect}
          disabled={connecting}
        >
          {connecting ? (
            <Loader2Icon className="size-4 animate-spin mr-1" />
          ) : (
            <RiGoogleLine className="size-4 mr-1" />
          )}
          {connected ? "Disconnect" : "Connect Google Calendar"}
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2Icon className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <h2 className="text-sm font-semibold tabular-nums">
                {formatWeekRange(days)}
              </h2>
              <span className="text-xs text-muted-foreground">
                {totalEvents} {totalEvents === 1 ? "event" : "events"}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Previous week"
                onClick={() => setWeekStart((prev) => {
                  const d = new Date(prev);
                  d.setDate(d.getDate() - 7);
                  return d;
                })}
              >
                <RiArrowLeftSLine />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const now = new Date();
                  now.setDate(now.getDate() - now.getDay());
                  now.setHours(0, 0, 0, 0);
                  setWeekStart(now);
                }}
              >
                Today
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Next week"
                onClick={() => setWeekStart((prev) => {
                  const d = new Date(prev);
                  d.setDate(d.getDate() + 7);
                  return d;
                })}
              >
                <RiArrowRightSLine />
              </Button>
            </div>
          </div>

          <Card className="border-border">
            <CardContent className="p-0">
              {daysWithEvents.map((day, idx) => (
                <div key={day.date.toISOString()}>
                  <div className={cn("flex gap-4 px-4 py-3", day.isToday && "bg-primary/5")}>
                    <div className="flex w-11 shrink-0 flex-col items-center gap-1 pt-1">
                      <span className={cn("text-[10px] font-semibold tracking-widest uppercase", day.isToday ? "text-primary" : dayColor(day.date) || "text-muted-foreground")}>
                        {day.label}
                      </span>
                      <span className={cn("flex size-8 items-center justify-center text-sm font-semibold tabular-nums", day.isToday ? "bg-primary text-primary-foreground" : dayColor(day.date) || "text-foreground")}>
                        {day.date.getDate()}
                      </span>
                    </div>

                    <div className="flex min-w-0 flex-1 flex-col justify-center gap-1">
                      {day.events.length === 0 ? (
                        <p className="py-1.5 text-xs text-muted-foreground/70">No events</p>
                      ) : (
                        day.events.map((event) => (
                          <Popover key={event.id}>
                            <PopoverTrigger asChild>
                              <button
                                type="button"
                                className="group flex w-full items-stretch gap-3 px-2 py-1.5 text-left transition-colors hover:bg-muted/60 focus-visible:bg-muted/60 focus-visible:outline-none"
                              >
                                <span className="w-1 shrink-0 bg-primary" />
                                <div className="flex w-14 shrink-0 flex-col">
                                  <span className="text-xs font-medium text-foreground tabular-nums">
                                    {event.allDay ? "All day" : formatTime(event.start)}
                                  </span>
                                  {!event.allDay && (
                                    <span className="text-[10px] text-muted-foreground">
                                      {formatDuration(event.start, event.end)}
                                    </span>
                                  )}
                                </div>
                                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                                  <span className="truncate text-sm leading-snug font-medium text-foreground">
                                    {event.title}
                                  </span>
                                  {event.calendarEmail && (
                                    <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                                      <RiGoogleLine className="size-3 shrink-0" />
                                      {event.calendarEmail}
                                    </span>
                                  )}
                                </div>
                                <RiArrowRightSLine className="size-4 shrink-0 self-center text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                              </button>
                            </PopoverTrigger>
                            <PopoverContent align="start" className="w-64">
                              <PopoverHeader>
                                <PopoverTitle>{event.title}</PopoverTitle>
                                <PopoverDescription>
                                  {day.label} {day.date.getDate()}
                                </PopoverDescription>
                              </PopoverHeader>
                              <Separator />
                              <div className="flex flex-col gap-1.5 text-muted-foreground">
                                <span className="flex items-center gap-1.5">
                                  <RiTimeLine className="size-3.5 shrink-0" />
                                  {event.allDay ? "All day" : `${formatTime(event.start)} (${formatDuration(event.start, event.end)})`}
                                </span>
                                {event.calendarEmail && (
                                  <span className="flex items-center gap-1.5">
                                    <RiGoogleLine className="size-3.5 shrink-0" />
                                    {event.calendarEmail}
                                  </span>
                                )}
                                {event.htmlLink && (
                                  <a href={event.htmlLink} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline">
                                    Open in Google Calendar
                                  </a>
                                )}
                              </div>
                            </PopoverContent>
                          </Popover>
                        ))
                      )}
                    </div>
                  </div>
                  {idx < daysWithEvents.length - 1 && <Separator />}
                </div>
              ))}
            </CardContent>
          </Card>
        </>
      )}
    </main>
  );
}
