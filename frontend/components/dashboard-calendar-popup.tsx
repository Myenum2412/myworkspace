"use client"

import * as React from "react"
import {
  RiArrowLeftSLine,
  RiArrowRightSLine,
  RiCalendarLine,
  RiMapPinLine,
  RiTimeLine,
} from "@remixicon/react"

import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

type EventStatus = "Pending" | "Confirmed" | "Completed" | "Cancelled"

interface CalEvent {
  time: string
  duration: string
  title: string
  location?: string
  status: EventStatus
  doctorName?: string
}

interface AgendaDay {
  label: string
  date: number
  month: number
  year: number
  isToday: boolean
  events: CalEvent[]
}

function getWeekDays(offset: number = 0): AgendaDay[] {
  const today = new Date()
  const startOfWeek = new Date(today)
  startOfWeek.setDate(today.getDate() - today.getDay() + 1 + offset * 7)

  const days: AgendaDay[] = []
  const dayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]

  for (let i = 0; i < 7; i++) {
    const date = new Date(startOfWeek)
    date.setDate(startOfWeek.getDate() + i)
    days.push({
      label: dayNames[i],
      date: date.getDate(),
      month: date.getMonth(),
      year: date.getFullYear(),
      isToday:
        date.getDate() === today.getDate() &&
        date.getMonth() === today.getMonth() &&
        date.getFullYear() === today.getFullYear(),
      events: [],
    })
  }

  return days
}

function getWeekRange(days: AgendaDay[]): string {
  const first = days[0]
  const last = days[6]
  const monthNames = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ]
  if (first.month === last.month) {
    return `${monthNames[first.month]} ${first.date} – ${last.date}, ${first.year}`
  }
  return `${monthNames[first.month]} ${first.date} – ${monthNames[last.month]} ${last.date}, ${first.year}`
}

const STATUS_ACCENT: Record<EventStatus, string> = {
  Pending: "bg-amber-500",
  Confirmed: "bg-primary",
  Completed: "bg-green-500",
  Cancelled: "bg-destructive",
}

const STATUS_LABEL: Record<EventStatus, string> = {
  Pending: "Pending",
  Confirmed: "Confirmed",
  Completed: "Completed",
  Cancelled: "Cancelled",
}

export default function DashboardCalendarPopup() {
  const [weekIdx, setWeekIdx] = React.useState(0)
  const [appointments, setAppointments] = React.useState<any[]>([])
  const [loading, setLoading] = React.useState(false)

  const fetchAppointments = React.useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/appointments")
      if (res.ok) {
        const data = await res.json()
        const raw = data.appointments ?? data;
        setAppointments(Array.isArray(raw) ? raw : [])
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => {
    fetchAppointments()
  }, [fetchAppointments])

  const weekDays = React.useMemo(() => {
    const days = getWeekDays(weekIdx)
    return days.map((day) => ({
      ...day,
      events: appointments
        .filter((appt) => {
          const apptDate = new Date(appt.appointmentDate || appt.bookingDatetime)
          return (
            apptDate.getDate() === day.date &&
            apptDate.getMonth() === day.month &&
            apptDate.getFullYear() === day.year
          )
        })
        .map((appt) => ({
          time: appt.preferredTime || "00:00",
          duration: "30 min",
          title: appt.patientName || "Appointment",
          location: appt.reasonForVisit || undefined,
          status: (appt.status || "Pending") as EventStatus,
          doctorName: appt.doctorName,
        })),
    }))
  }, [weekIdx, appointments])

  const weekRange = getWeekRange(weekDays)
  const totalEvents = weekDays.reduce((n, d) => n + d.events.length, 0)

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="h-9 w-9">
          <RiCalendarLine className="size-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[380px] p-0">
        <div className="border border-border bg-card rounded-lg">
          <div className="flex items-center justify-between gap-4 px-4 py-3.5">
            <div className="flex items-center gap-3">
              <span className="flex size-9 shrink-0 items-center justify-center bg-primary/10 text-primary">
                <RiCalendarLine className="size-5" aria-hidden="true" />
              </span>
              <div className="flex flex-col">
                <h1 className="text-sm font-semibold tracking-tight tabular-nums">
                  {weekRange}
                </h1>
                <p className="text-xs text-muted-foreground tabular-nums">
                  {totalEvents} {totalEvents === 1 ? "appointment" : "appointments"} this week
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Previous week"
                onClick={() => setWeekIdx((i) => i - 1)}
              >
                <RiArrowLeftSLine aria-hidden="true" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setWeekIdx(0)}
              >
                Today
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Next week"
                onClick={() => setWeekIdx((i) => i + 1)}
              >
                <RiArrowRightSLine aria-hidden="true" />
              </Button>
            </div>
          </div>

          <Separator />

          <div className="max-h-[400px] overflow-y-auto">
            {weekDays.map((day, dayIdx) => (
              <div key={day.date}>
                <div
                  className={cn(
                    "flex gap-4 px-4 py-3",
                    day.isToday && "bg-primary/5"
                  )}
                >
                  <div className="flex w-11 shrink-0 flex-col items-center gap-1 pt-1">
                    <span
                      className={cn(
                        "text-[10px] font-semibold tracking-widest uppercase",
                        day.isToday ? "text-primary" : "text-muted-foreground"
                      )}
                    >
                      {day.label}
                    </span>
                    <span
                      className={cn(
                        "flex size-8 items-center justify-center text-sm font-semibold tabular-nums",
                        day.isToday
                          ? "bg-primary text-primary-foreground"
                          : "text-foreground"
                      )}
                    >
                      {day.date}
                    </span>
                  </div>

                  <div className="flex min-w-0 flex-1 flex-col justify-center gap-1">
                    {day.events.length === 0 ? (
                      <p className="py-1.5 text-xs text-muted-foreground/70">
                        No appointments
                      </p>
                    ) : (
                      day.events.map((event) => (
                        <div
                          key={`${event.time}-${event.title}`}
                          className="flex items-stretch gap-3 px-2 py-1.5"
                        >
                          <span
                            className={cn(
                              "w-1 shrink-0",
                              STATUS_ACCENT[event.status]
                            )}
                            aria-label={STATUS_LABEL[event.status]}
                          />

                          <div className="flex w-14 shrink-0 flex-col">
                            <span className="text-xs font-medium text-foreground tabular-nums">
                              {event.time}
                            </span>
                            <span className="text-[10px] text-muted-foreground">
                              {event.duration}
                            </span>
                          </div>

                          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                            <span
                              className={cn(
                                "truncate text-sm leading-snug font-medium",
                                event.status === "Cancelled"
                                  ? "text-muted-foreground line-through"
                                  : "text-foreground"
                              )}
                            >
                              {event.title}
                            </span>
                            {event.doctorName && (
                              <span className="text-[10px] text-muted-foreground">
                                Dr. {event.doctorName}
                              </span>
                            )}
                            {event.location && (
                              <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                                <RiMapPinLine
                                  className="size-3 shrink-0"
                                  aria-hidden="true"
                                />
                                {event.location}
                              </span>
                            )}
                          </div>

                          <Badge
                            variant="secondary"
                            className={cn(
                              "text-[9px] px-1.5 py-0 h-5 self-start mt-0.5",
                              event.status === "Confirmed" && "bg-primary/10 text-primary",
                              event.status === "Completed" && "bg-green-500/10 text-green-600",
                              event.status === "Pending" && "bg-amber-500/10 text-amber-600",
                              event.status === "Cancelled" && "bg-destructive/10 text-destructive"
                            )}
                          >
                            {event.status}
                          </Badge>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {dayIdx < weekDays.length - 1 && <Separator />}
              </div>
            ))}
          </div>

          <Separator />

          <div className="flex items-center gap-4 px-4 py-3">
            {(
              [
                ["Pending", "Pending"],
                ["Confirmed", "Confirmed"],
                ["Completed", "Completed"],
                ["Cancelled", "Cancelled"],
              ] as [EventStatus, string][]
            ).map(([status, label]) => (
              <div key={status} className="flex items-center gap-1.5">
                <span
                  className={cn("size-1.5", STATUS_ACCENT[status])}
                  aria-hidden="true"
                />
                <span className="text-[10px] text-muted-foreground">
                  {label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
