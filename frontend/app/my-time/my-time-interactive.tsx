"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar as CalendarUI } from "@/components/ui/calendar";
import { Clock, Calendar, Loader2, Trash2 } from "lucide-react";

interface TimeEntry {
  id: string;
  userId: string;
  date: string;
  startTime?: string;
  endTime?: string;
  duration: number;
  description: string;
  billable: boolean;
  status: "pending" | "approved" | "rejected";
  createdAt: string;
}

interface MyTimeProps {
  initialEntries: TimeEntry[];
  user: { name: string; email: string; avatar: string; id: string };
}

export default function MyTime({ initialEntries, user }: MyTimeProps) {
  const [entries, setEntries] = useState<TimeEntry[]>(initialEntries);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [date, setDate] = useState<Date | undefined>(new Date());

  const filteredEntries = date
    ? entries.filter((e) => e.date === date.toISOString().slice(0, 10))
    : entries;

  const totalMinutes = filteredEntries.reduce((s, e) => s + e.duration, 0);
  const totalHours = (totalMinutes / 60).toFixed(1);

  const statusColors: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-800 border-yellow-200",
    approved: "bg-green-900 text-green-700 border-gray-300",
    rejected: "bg-red-100 text-red-800 border-red-200",
  };

  const handleDelete = async (id: string) => {
    const res = await fetch(`/api/time-entries/${id}`, { method: "DELETE", credentials: "include" });
    if (res.ok) setEntries((prev) => prev.filter((e) => e.id !== id));
  };

  return (
    <main className="flex flex-1 flex-col gap-4 p-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">My Time</h1>
          <p className="text-sm text-muted-foreground mt-1">Track your logged hours</p>
        </div>
        <Popover>
          <PopoverTrigger asChild>
            <button className="flex items-center gap-2 px-3 py-2 text-sm rounded-md border hover:bg-muted transition-colors">
              <Calendar className="size-4" />
              {date ? date.toDateString() === new Date().toDateString() ? "Today" : date.toLocaleDateString() : "Select date"}
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="end">
            <CalendarUI mode="single" selected={date} onSelect={setDate} />
          </PopoverContent>
        </Popover>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="size-4" />
            {totalHours}h logged
            <Badge variant="secondary">{filteredEntries.length} entries</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="size-6 animate-spin text-muted-foreground" />
            </div>
          ) : error ? (
            <div className="flex items-center justify-center py-12">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          ) : filteredEntries.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Clock className="size-10 mb-3 opacity-50" />
              <p>No time entries for this date</p>
              <p className="text-sm">Go to Time Tracker to log your hours</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-blue-50">
                  <tr className="border-b bg-blue-50 text-left text-sm text-blue-800 font-medium">
                    <th className="pb-3 font-medium">Description</th>
                    <th className="pb-3 font-medium">Time</th>
                    <th className="pb-3 font-medium">Duration</th>
                    <th className="pb-3 font-medium">Status</th>
                    <th className="pb-3 font-medium w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEntries.map((entry) => (
                    <tr key={entry.id} className="border-b last:border-0 hover:bg-blue-50/50 transition-colors bg-white">
                      <td className="py-3 pr-4">
                        <p className="text-sm font-medium">{entry.description || "No description"}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(entry.date).toLocaleDateString()}
                          {entry.startTime && entry.endTime && ` · ${entry.startTime} - ${entry.endTime}`}
                        </p>
                      </td>
                      <td className="py-3 pr-4">
                        <span className="text-sm">
                          {entry.startTime && entry.endTime
                            ? `${entry.startTime} - ${entry.endTime}`
                            : "—"}
                        </span>
                      </td>
                      <td className="py-3 pr-4">
                        <span className="text-sm font-mono font-medium">
                          {Math.floor(entry.duration / 60)}h {entry.duration % 60}m
                        </span>
                      </td>
                      <td className="py-3 pr-4">
                        <Badge className={statusColors[entry.status]}>
                          {entry.status}
                        </Badge>
                      </td>
                      <td className="py-3">
                        <button
                          onClick={() => handleDelete(entry.id)}
                          className="text-muted-foreground hover:text-red-600 transition-colors"
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
        </CardContent>
      </Card>
    </main>
  );
}
